import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { validatePlant, validateCatalog, validateGovernorates, validateRegions } from '../src/data-client.js'
import { validateSpatial, spatialForPlant } from '../src/spatial-client.js'

const root = new URL('../', import.meta.url)
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const readOptionalJson = async path => {
  try { return await readJson(path) } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
const sha256 = content => createHash('sha256').update(content).digest('hex')
const catalog = validateCatalog(await readJson('public/data/catalog.v2.json'))
const geometry = validateRegions(await readJson('public/data/regions.v1.json'))
const report = await readJson('docs/data-build-report.json')
const manifest = await readOptionalJson('public/data/release-manifest.json')
const knownRegions = new Set(geometry.map(region => region.id))
const filenames = (await readdir(new URL('public/data/plants/', root))).filter(name => name.endsWith('.json'))
const expected = catalog.plants.map(plant => plant.uuid + '.json')
assert.equal(catalog.plants.length, 1482, 'The audited release must retain all 1,482 original UUIDs')
assert.equal(report.inputEntries, catalog.plants.length)
assert.deepEqual([...filenames].sort(), [...expected].sort(), 'Missing or orphaned plant assets')
let records = 0, largest = 0, verified = 0, pending = 0
const plants = new Map()
const measuredFiles = new Map()
for (const item of catalog.plants) {
  const path = new URL(`public/data/plants/${item.uuid}.json`, root)
  const content = await readFile(path, 'utf8')
  const plant = validatePlant(JSON.parse(content), item.uuid)
  plants.set(item.uuid, plant)
  measuredFiles.set(`plants/${item.uuid}.json`, {bytes: Buffer.byteLength(content), sha256: sha256(content)})
  assert.equal(plant.version, catalog.version)
  for (const key of ['name', 'scientificName', 'senseId', 'status', 'statusLabel']) assert.equal(plant[key], item[key])
  const mapped = [...new Set(plant.records.filter(record => record.status === 'verified').map(record => record.regionId).filter(Boolean))].sort()
  assert.deepEqual(mapped, [...item.regionIds].sort())
  for (const record of plant.records) assert.ok(record.regionId === null || knownRegions.has(record.regionId))
  assert.doesNotMatch(content, /"(?:enricherEmail|enricherName|password|email)"\s*:/i)
  largest = Math.max(largest, Buffer.byteLength(content))
  records += plant.records.length
  verified += plant.records.filter(record => record.status === 'verified').length
  pending += plant.records.filter(record => record.status === 'pending').length
}

// A reviewed Excel release has its own complete manifest. Historical compiler
// counts remain provenance; they must not reject a later, valid source update.
// Require an exact asset set and check every byte/hash as well as all schema,
// identity and spatial-binding gates. Merely editing a report cannot pass this.
if (manifest) {
  assert.equal(manifest.schemaVersion, 2)
  assert.equal(manifest.version, catalog.version)
  assert.equal(manifest.released, catalog.released)
  assert.equal(manifest.country, catalog.country)
  assert.notEqual(manifest.baseVersion, manifest.version)
  assert.deepEqual(manifest.after, {
    plants: catalog.plants.length, records, verified, pending,
    plantsWithMappedRegions: catalog.plants.filter(plant => plant.regionIds.length).length,
  })
  const spatialFiles = (await readdir(new URL('public/data/spatial/', root))).filter(name => name.endsWith('.json'))
  assert.ok(manifest.files && !Array.isArray(manifest.files))
  // The original 2.0.1 manifest predates the governorate display assets. Newly
  // prepared releases hash both geometry and attribution as one required pair.
  const governorateFiles = ['governorates.v1.json', 'GOVERNORATE-BOUNDARIES.txt']
  const includesGovernorates = governorateFiles.some(path => Object.hasOwn(manifest.files, path))
  const releaseFiles = ['catalog.v2.json', 'regions.v1.json', 'BOUNDARIES.txt',
    ...(includesGovernorates ? governorateFiles : []),
    ...expected.map(filename => 'plants/' + filename),
    ...spatialFiles.map(filename => 'spatial/' + filename)]
  assert.deepEqual(Object.keys(manifest.files).sort(), releaseFiles.sort(), 'Release manifest has missing or unexpected assets')
  if (includesGovernorates) validateGovernorates(await readJson('public/data/governorates.v1.json'))
  for (const path of releaseFiles) {
    if (!measuredFiles.has(path)) {
      const content = await readFile(new URL('public/data/' + path, root))
      measuredFiles.set(path, {bytes: content.length, sha256: sha256(content)})
    }
    assert.deepEqual(manifest.files[path], measuredFiles.get(path), 'Release asset bytes/hash mismatch: ' + path)
  }
  assert.equal(manifest.inputs.geometrySha256, measuredFiles.get('regions.v1.json').sha256)
  let observations = 0, points = 0
  for (const filename of spatialFiles) {
    const uuid = filename.slice(0, -5)
    const plant = plants.get(uuid)
    assert.ok(plant, 'Orphaned spatial UUID: ' + uuid)
    const spatial = validateSpatial(await readJson('public/data/spatial/' + filename), uuid)
    assert.equal(spatial.baseVersion, catalog.version)
    assert.equal(spatialForPlant(plant, spatial).length, spatial.observations.length, 'Stale spatial binding: ' + uuid)
    observations += spatial.observations.length
    points += spatial.observations.filter(item => item.pointEligible).length
  }
  assert.equal(manifest.spatial.files, spatialFiles.length)
  assert.equal(manifest.spatial.afterObservations, observations)
  assert.equal(manifest.spatial.afterPoints, points)
} else {
  const baseline = report.initialBuild || report
  assert.equal(catalog.version, baseline.version, 'A later release requires its own validated release-manifest.json')
  assert.equal(catalog.released, baseline.released)
  assert.equal(records, baseline.counts.records)
  assert.equal(largest, baseline.sizesBytes.largestPlant)
}

async function inspectPublic(directory) {
  for (const item of await readdir(directory, {withFileTypes: true})) {
    const path = new URL(item.name + (item.isDirectory() ? '/' : ''), directory)
    if (item.isDirectory()) await inspectPublic(path)
    else {
      assert.ok(!/siwar_plant_distribution|integrated_(entries|evidence|sources)/i.test(item.name), 'Raw research must not be shipped: ' + fileURLToPath(path))
      const info = await stat(path)
      assert.ok(info.size < 10_000_000, 'Unexpected large public asset: ' + fileURLToPath(path))
    }
  }
}
await inspectPublic(new URL('public/', root))
console.log(`Validated v${catalog.version}: ${catalog.plants.length} original UUIDs, ${geometry.length} regions, ${records} evidence records; largest plant ${largest} bytes. ${manifest ? `${Object.keys(manifest.files).length} release asset hashes and all spatial bindings checked.` : 'Original compiler baseline checked.'} Raw research is not public.`)
