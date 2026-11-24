#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allowedRecords, validateCatalog, validateGovernorates, validatePlant, validateRegions } from '../src/data-client.js'
import { applyOverrides, readStoredPatch } from '../src/updates.js'
import { spatialForPlant, validateSpatial } from '../src/spatial-client.js'

const usage = `Prepare a standalone data release from a reviewed Excel JSON patch.

node scripts/apply-updates.mjs --patch /path/changes.json --version 2.0.1 --output /path/release-data [--data public/data]

The output must not exist and must be outside the source data directory.
Versions are stable SemVer releases (major.minor.patch), strictly increasing.
This command prepares files only; it does not publish or alter source data.`
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const encode = value => Buffer.from(JSON.stringify(value) + '\n')
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right)

function assert(condition, message) {
  if (!condition) throw Error(message)
}

function versionParts(value) {
  assert(typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value),
    'Use a stable SemVer version such as 2.0.1, without leading zeros or a prerelease suffix.')
  return value.split('.').map(BigInt)
}

function assertNewerVersion(next, previous) {
  const nextParts = versionParts(next), previousParts = versionParts(previous)
  for (let index = 0; index < 3; index++) {
    if (nextParts[index] > previousParts[index]) return
    assert(nextParts[index] === previousParts[index], 'The new version must be greater than the current version.')
  }
  throw Error('The new version must be greater than the current version.')
}

async function doesNotExist(path) {
  try { await lstat(path) } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
  throw Error('Output already exists; choose a new release directory: ' + path)
}

async function canonicalTarget(path) {
  try { return await realpath(path) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const parent = dirname(path)
    if (parent === path) throw error
    return join(await canonicalTarget(parent), basename(path))
  }
}

function isInside(directory, candidate) {
  const path = relative(directory, candidate)
  return path === '' || (!path.startsWith('..' + '/') && path !== '..' && !isAbsolute(path))
}

function releaseDate(now) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

function totals(plants) {
  const records = plants.flatMap(plant => plant.records)
  return {
    plants: plants.length,
    records: records.length,
    verified: records.filter(record => record.status === 'verified').length,
    pending: records.filter(record => record.status === 'pending').length,
    plantsWithMappedRegions: plants.filter(plant => allowedRecords(plant).some(record => record.regionId)).length,
  }
}

export async function prepareRelease({patchPath, dataPath, outputPath, version}) {
  const source = await realpath(resolve(dataPath))
  const output = await canonicalTarget(resolve(outputPath))
  assert(!isInside(source, output), 'The output must be outside the source data directory.')
  await doesNotExist(output)

  // All input validation and transformations finish before any output is written.
  const [catalogBytes, geometryBytes, boundariesBytes, governoratesBytes, governorateBoundariesBytes, patchBytes] = await Promise.all([
    readFile(join(source, 'catalog.v2.json')),
    readFile(join(source, 'regions.v1.json')),
    readFile(join(source, 'BOUNDARIES.txt')),
    readFile(join(source, 'governorates.v1.json')),
    readFile(join(source, 'GOVERNORATE-BOUNDARIES.txt')),
    readFile(resolve(patchPath)),
  ])
  const catalog = validateCatalog(JSON.parse(catalogBytes))
  validateRegions(JSON.parse(geometryBytes))
  validateGovernorates(JSON.parse(governoratesBytes))
  assert(catalog.plants.length > 0, 'The source catalog has no plants.')
  assertNewerVersion(version, catalog.version)
  // Reuse the exact same patch validator as the Excel/browser workflow.
  const patch = readStoredPatch({getItem: () => patchBytes.toString('utf8')}, catalog.version)
  assert(patch && patch.changes.length > 0, 'The patch has no changes.')
  const known = new Map(catalog.plants.map(plant => [plant.uuid, plant]))
  const changesByUuid = new Map()
  for (const change of patch.changes) {
    assert(known.has(change.uuid), 'Unknown plant UUID in patch: ' + change.uuid)
    if (!changesByUuid.has(change.uuid)) changesByUuid.set(change.uuid, [])
    changesByUuid.get(change.uuid).push(change)
  }
  const sourceFiles = (await readdir(join(source, 'plants'))).filter(name => name.endsWith('.json')).sort()
  assert(same(sourceFiles, [...known.keys()].map(uuid => uuid + '.json').sort()), 'Plant files do not match the source catalog.')

  const previousPlants = [], nextPlants = []
  const counts = {added: 0, updated: 0, deleted: 0, affectedPlants: changesByUuid.size,
    unaffectedPlants: catalog.plants.length - changesByUuid.size}
  for (const listed of catalog.plants) {
    const original = validatePlant(JSON.parse(await readFile(join(source, 'plants', listed.uuid + '.json'))), listed.uuid)
    assert(original.version === catalog.version, 'A plant has a different source release version: ' + listed.uuid)
    for (const key of ['name', 'scientificName', 'senseId', 'status', 'statusLabel']) {
      assert(original[key] === listed[key], 'Plant identity or status differs from catalog: ' + listed.uuid)
    }
    const existingRegions = [...new Set(allowedRecords(original).map(record => record.regionId).filter(Boolean))].sort()
    assert(same(existingRegions, [...listed.regionIds].sort()), 'Plant regions differ from catalog: ' + listed.uuid)
    const changes = changesByUuid.get(listed.uuid) || []
    for (const change of changes) {
      const exists = original.records.some(record => record.id === change.recordId)
      assert(change.action !== 'delete' || exists, 'Cannot delete an unknown source record: ' + change.recordId)
      counts[change.action === 'delete' ? 'deleted' : exists ? 'updated' : 'added']++
    }
    // Each per-plant slice still runs the shared validator and identity/status gate.
    const adjusted = changes.length ? applyOverrides(original, {...patch, changes}) : original
    const {localOverrides, localUpdatedAt, ...clean} = adjusted
    const next = validatePlant({...clean, version}, listed.uuid)
    previousPlants.push(original)
    nextPlants.push(next)
  }

  const created = new Date()
  const nextCatalog = validateCatalog({...catalog, version, released: releaseDate(created),
    plants: catalog.plants.map((listed, index) => ({...listed,
      regionIds: [...new Set(allowedRecords(nextPlants[index]).map(record => record.regionId).filter(Boolean))].sort(),
    })),
  })
  const files = new Map([
    ['catalog.v2.json', encode(nextCatalog)],
    ['regions.v1.json', geometryBytes],
    ['BOUNDARIES.txt', boundariesBytes],
    ['governorates.v1.json', governoratesBytes],
    ['GOVERNORATE-BOUNDARIES.txt', governorateBoundariesBytes],
    ...nextPlants.map(plant => ['plants/' + plant.uuid + '.json', encode(plant)]),
  ])
  // Spatial companions are optional for older releases. Preserve their provenance
  // while discarding observations whose source/place binding the patch changed.
  // This requires no raw research package, geocoder, or new botanical analysis.
  let spatialNames
  try { spatialNames = await readdir(join(source, 'spatial')) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    spatialNames = []
  }
  const previousByUuid = new Map(previousPlants.map(plant => [plant.uuid, plant]))
  const nextByUuid = new Map(nextPlants.map(plant => [plant.uuid, plant]))
  const spatialCounts = {files: 0, beforeObservations: 0, afterObservations: 0, beforePoints: 0, afterPoints: 0}
  for (const filename of spatialNames.filter(name => name.endsWith('.json')).sort()) {
    const uuid = filename.slice(0, -5)
    assert(known.has(uuid), 'Spatial companion has an unknown plant UUID: ' + uuid)
    const original = validateSpatial(JSON.parse(await readFile(join(source, 'spatial', filename))), uuid)
    assert(original.baseVersion === catalog.version && original.scientificName === previousByUuid.get(uuid).scientificName,
      'Spatial companion has a different source version or identity: ' + uuid)
    const previousActive = spatialForPlant(previousByUuid.get(uuid), original)
    assert(previousActive.length === original.observations.length, 'Spatial companion has stale source/place bindings: ' + uuid)
    const observations = spatialForPlant(nextByUuid.get(uuid), {...original, baseVersion: version})
    const boundIds = new Set(observations.map(item => item.recordId))
    const nextSpatial = validateSpatial({...original, baseVersion: version, observations,
      bindings: Object.fromEntries([...boundIds].map(id => [id, original.bindings[id]])),
    }, uuid)
    files.set('spatial/' + filename, encode(nextSpatial))
    spatialCounts.files++
    spatialCounts.beforeObservations += original.observations.length
    spatialCounts.afterObservations += observations.length
    spatialCounts.beforePoints += original.observations.filter(item => item.pointEligible).length
    spatialCounts.afterPoints += observations.filter(item => item.pointEligible).length
  }
  const manifest = {
    schemaVersion: 2,
    baseVersion: catalog.version,
    version,
    createdAt: created.toISOString(),
    released: nextCatalog.released,
    country: 'SA',
    published: false,
    patchUpdatedAt: patch.updatedAt,
    inputs: {catalogSha256: sha256(catalogBytes), patchSha256: sha256(patchBytes), geometrySha256: sha256(geometryBytes)},
    changes: {...counts, rows: patch.changes.length},
    before: totals(previousPlants),
    after: totals(nextPlants),
    spatial: {...spatialCounts, removedByRecordChanges: spatialCounts.beforeObservations - spatialCounts.afterObservations},
    notes: [
      'Prepared data release only; no deployment or changes to the source directory.',
      'Original plant UUIDs, scientific identities and review statuses are preserved.',
      'Pending records are retained but excluded from mapped regionIds.',
      'No botanical re-analysis or geographic inference is performed.',
      'Region and governorate boundaries and their attribution files are retained byte-for-byte and included in the file hashes.',
      'Spatial companions retain only observations bound to unchanged verified source/place records; their baseVersion follows this release.',
    ],
    files: Object.fromEntries([...files].map(([name, content]) => [name, {bytes: content.length, sha256: sha256(content)}])),
  }
  files.set('release-manifest.json', encode(manifest))

  const parent = dirname(output)
  await mkdir(parent, {recursive: true})
  const lock = join(parent, '.' + basename(output) + '.release-lock')
  let staging
  await mkdir(lock) // Refuse concurrent writers using this release command.
  try {
    await doesNotExist(output)
    staging = await mkdtemp(join(parent, '.' + basename(output) + '.stage-'))
    await mkdir(join(staging, 'plants'))
    if (spatialCounts.files) await mkdir(join(staging, 'spatial'))
    for (const [name, content] of files) await writeFile(join(staging, name), content, {flag: 'wx'})
    await doesNotExist(output)
    await rename(staging, output)
    staging = undefined
  } finally {
    if (staging) await rm(staging, {recursive: true, force: true})
    await rm(lock, {recursive: true, force: true})
  }
  return {output, manifest}
}

async function main() {
  const argumentsList = process.argv.slice(2)
  if (argumentsList.length === 1 && argumentsList[0] === '--help') { console.log(usage); return }
  const flags = new Map()
  for (let index = 0; index < argumentsList.length; index += 2) {
    const key = argumentsList[index], value = argumentsList[index + 1]
    assert(['--patch', '--version', '--output', '--data'].includes(key) && value && !value.startsWith('--') && !flags.has(key), usage)
    flags.set(key, value)
  }
  for (const key of ['--patch', '--version', '--output']) assert(flags.has(key), usage)
  const result = await prepareRelease({patchPath: flags.get('--patch'), version: flags.get('--version'),
    outputPath: flags.get('--output'), dataPath: flags.get('--data') || fileURLToPath(new URL('../public/data/', import.meta.url))})
  console.log(`Prepared data release ${result.manifest.version}: ${result.output}`)
  console.table(result.manifest.changes)
  console.table({before: result.manifest.before, after: result.manifest.after})
  console.log('No deployment was performed. Review release-manifest.json before publishing.')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
