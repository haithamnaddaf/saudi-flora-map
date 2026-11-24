import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSpatial, spatialForPlant, validateSpatial } from '../src/spatial-client.js'

const root = new URL('../', import.meta.url)
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const geometry = await readJson('public/data/regions.v1.json')
const report = await readJson('docs/spatial-build-report.json')
const releaseManifest = await readJson('public/data/release-manifest.json').catch(error => {
  if (error.code === 'ENOENT') return null
  throw error
})
const uuid = 'f009a176-94e3-4387-b682-0f416bf31afd'
const arak = await readJson('public/data/plants/' + uuid + '.json')
const arakSpatial = await readJson('public/data/spatial/' + uuid + '.json')
const record = {id: 'test-record', regionId: 'SA-04', place: 'موضع منشور', sourceId: 'test-source',
  sourceTitle: 'مرجع اختبار', sourceUrl: 'https://www.gbif.org/occurrence/123456789', sourceKind: 'occurrence_records',
  sourceScientificName: 'Example species', locator: 'HUMAN_OBSERVATION', evidence: 'خلاصة اختبار', accessedOn: '',
  status: 'verified', recordUrls: ['https://www.gbif.org/occurrence/123456789']}
const plant = {schemaVersion: 2, version: '2.0.0', uuid, scientificName: 'Example species',
  status: 'documented_for_supplied_taxon', records: [record]}
const occurrence = {occurrence_id: '123456789', source_id: 'test-source', source_url: record.sourceUrl,
  coordinates_interpreted_by_gbif: [50.128872, 26.295022], coordinate_uncertainty_m: 5,
  uncertainty_missing_or_invalid: false, point_display_policy: 'show_with_reported_uncertainty',
  information_withheld: null, data_generalizations: null, issues: ['COORDINATE_ROUNDED'],
  reported_region_conflict: false, taxonomic_record_usable: true, basis_usable_for_distribution: true,
  occurrence_status: 'PRESENT', gadm: {level0: {gid: 'SAU'}, level2: {gid: 'SAU.8.7_1', name: 'Al Qatif'}},
  locality_verbatim: 'موضع الناشر الأصلي', event_date_interpreted_by_gbif: '2025-11-27T15:32:02',
  basis_of_record: 'HUMAN_OBSERVATION', license: 'http://creativecommons.org/licenses/by-nc/4.0/legalcode'}

function compileFixture(items = [occurrence], changedPlant = plant) {
  const script = "import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('spatial',sys.argv[1])\nm=importlib.util.module_from_spec(s)\ns.loader.exec_module(m)\na=json.load(sys.stdin)\nprint(json.dumps(m.build_plant(a['plant'],{x['occurrence_id']:x for x in a['occurrences']},m.RegionGeometry(a['geometry']))))"
  return spawnSync('python3', ['-c', script, fileURLToPath(new URL('scripts/build-spatial.py', root))], {
    input: JSON.stringify({plant: changedPlant, occurrences: items, geometry}), encoding: 'utf8', maxBuffer: 1_000_000,
  })
}

test('every companion is bound to existing published UUID records and occurrence references', async () => {
  const files = (await readdir(new URL('public/data/spatial/', root))).filter(name => name.endsWith('.json'))
  const catalog = await readJson('public/data/catalog.v2.json')
  const known = new Set(catalog.plants.map(item => item.uuid))
  const snapshot = [report, report.initialBuild].find(item => item?.baseVersion === catalog.version)
  const unique = new Set(), uniquePoints = new Set()
  let count = 0, points = 0, largest = 0, allBytes = 0
  if (releaseManifest) {
    assert.equal(releaseManifest.version, catalog.version)
    assert.deepEqual(files.sort(), Object.keys(releaseManifest.files).filter(path => path.startsWith('spatial/'))
      .map(path => path.slice('spatial/'.length)).sort())
    assert.equal(files.length, releaseManifest.spatial.files)
  } else {
    assert.ok(snapshot, 'A non-baseline release needs its own manifest')
    assert.equal(files.length, snapshot.counts.plantCompanions)
  }
  for (const filename of files) {
    const id = filename.slice(0, -5)
    assert.ok(known.has(id))
    const bytes = await readFile(new URL('public/data/spatial/' + filename, root))
    const spatial = validateSpatial(JSON.parse(bytes), id)
    if (releaseManifest) assert.deepEqual(releaseManifest.files['spatial/' + filename], {
      bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    })
    const actual = await readJson('public/data/plants/' + filename)
    assert.equal(actual.status, 'documented_for_supplied_taxon')
    assert.equal(spatial.baseVersion, catalog.version)
    assert.equal(spatialForPlant(actual, spatial).length, spatial.observations.length)
    const usedUrls = actual.records.filter(item => item.status === 'verified').flatMap(item => item.recordUrls || [])
    assert.equal(spatial.observations.length, usedUrls.length)
    for (const item of spatial.observations) {
      assert.ok(usedUrls.includes(item.referenceUrl))
      unique.add(item.id)
      if (item.pointEligible) uniquePoints.add(item.id)
      count++
      points += Number(item.pointEligible)
    }
    assert.doesNotMatch(bytes.toString(), /"(?:email|enricherName|observerName|recordedBy|password)"\s*:/i)
    largest = Math.max(largest, bytes.length)
    allBytes += bytes.length
  }
  if (releaseManifest) {
    assert.equal(count, releaseManifest.spatial.afterObservations)
    assert.equal(points, releaseManifest.spatial.afterPoints)
    const sizes = Object.entries(releaseManifest.files).filter(([path]) => path.startsWith('spatial/')).map(([, file]) => file.bytes)
    assert.equal(largest, Math.max(0, ...sizes))
    assert.equal(allBytes, sizes.reduce((sum, size) => sum + size, 0))
  }
  if (snapshot) {
    assert.equal(count, snapshot.counts.plantOccurrenceRelationships)
    assert.equal(unique.size, snapshot.counts.uniqueOccurrenceIds)
    assert.equal(points, snapshot.counts.eligiblePointRelationships)
    assert.equal(uniquePoints.size, snapshot.counts.uniqueEligibleOccurrenceIds)
    assert.equal(largest, snapshot.sizesBytes.largestCompanion)
    assert.equal(allBytes, snapshot.sizesBytes.allCompanions)
  }
  assert.ok(largest < 250_000)
})

test('Arak distinguishes published Dhahran locality, derived governorates, missing accuracy and individual licenses', () => {
  const items = spatialForPlant(arak, arakSpatial).filter(item => item.regionId === 'SA-04')
  assert.equal(items.length, 4)
  const dhahran = items.find(item => item.id === '5908868424')
  assert.equal(dhahran.pointEligible, true)
  assert.equal(dhahran.localityOriginal, '34472, الظهران, Eastern Region, SA')
  assert.equal(dhahran.governorateDerived, false)
  assert.equal(dhahran.governorateOriginal, '')
  assert.equal(dhahran.license, 'http://creativecommons.org/licenses/by-nc/4.0/legalcode')
  assert.equal(dhahran.uncertaintyMeters, 5)
  const qatif = items.find(item => item.id === '5109281449')
  assert.equal(qatif.pointEligible, false)
  assert.equal(qatif.latitude, null)
  assert.equal(qatif.longitude, null)
  assert.equal(qatif.uncertaintyMeters, null)
  assert.equal(qatif.governorateOriginal, 'Al Qatif')
  assert.equal(qatif.governorateDerived, true)
  assert.equal(qatif.localityOriginal, '')
  assert.equal(qatif.referenceUrl, 'https://www.gbif.org/occurrence/5109281449')
})

test('deleted, pending, moved or recited Excel records cannot retain stale spatial observations', () => {
  const item = arakSpatial.observations.find(item => item.pointEligible)
  for (const mutation of [
    current => { current.records = current.records.filter(record => record.id !== item.recordId) },
    current => { current.records.find(record => record.id === item.recordId).status = 'pending' },
    ...['place', 'sourceId', 'sourceTitle', 'sourceUrl', 'sourceKind', 'sourceScientificName', 'locator']
      .map(key => current => { current.records.find(record => record.id === item.recordId)[key] += ' changed' }),
    current => { current.records.find(record => record.id === item.recordId).regionId = null },
    current => { current.records.find(record => record.id === item.recordId).recordUrls = [] },
  ]) {
    const current = structuredClone(arak)
    mutation(current)
    assert.equal(spatialForPlant(current, arakSpatial).some(observation => observation.recordId === item.recordId), false)
  }
  const differentVersion = arak.version === '0.0.0' ? '0.0.1' : '0.0.0'
  for (const patch of [{version: differentVersion}, {uuid: '11111111-1111-4111-8111-111111111111'},
    {scientificName: 'Another species'}, {status: 'identity_review_required'}]) {
    assert.deepEqual(spatialForPlant({...arak, ...patch}, arakSpatial), [])
  }
})

test('release validation uses the current manifest, preserves baseline gates and detects altered assets', async t => {
  if (!releaseManifest) return // Original compiler-only releases use the existing baseline checks.
  const directory = await mkdtemp(join(tmpdir(), 'siwar-release-validation-'))
  t.after(() => rm(directory, {recursive: true, force: true}))
  await cp(new URL('public/data/', root), join(directory, 'public/data'), {recursive: true})
  for (const path of ['scripts', 'src', 'docs']) await mkdir(join(directory, path), {recursive: true})
  for (const path of ['scripts/validate-v2.mjs', 'src/data-client.js', 'src/spatial-client.js']) {
    await cp(new URL(path, root), join(directory, path))
  }
  await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
  const buildReport = await readJson('docs/data-build-report.json')
  // A later release must not need a rewritten historical compiler report.
  await writeFile(join(directory, 'docs/data-build-report.json'), JSON.stringify(buildReport.initialBuild || buildReport))
  const run = () => spawnSync(process.execPath, [join(directory, 'scripts/validate-v2.mjs')], {encoding: 'utf8'})
  const valid = run()
  assert.equal(valid.status, 0, valid.stderr)
  const filename = join(directory, 'public/data/plants/' + uuid + '.json')
  const original = await readFile(filename)
  const changed = JSON.parse(original)
  changed.records[0].evidence += ' altered'
  await writeFile(filename, JSON.stringify(changed) + '\n')
  const corrupt = run()
  assert.notEqual(corrupt.status, 0)
  assert.match(corrupt.stderr, /Release asset bytes\/hash mismatch/)
  await writeFile(filename, original)
  await rm(join(directory, 'public/data/release-manifest.json'))
  const missingManifest = run()
  assert.notEqual(missingManifest.status, 0)
  assert.match(missingManifest.stderr, /requires its own validated release-manifest/)
})

test('compiler preserves the original source detail and prevents every disqualifying point case', () => {
  const valid = compileFixture()
  assert.equal(valid.status, 0, valid.stderr)
  const spatial = validateSpatial(JSON.parse(valid.stdout), uuid)
  assert.equal(spatial.observations[0].pointEligible, true)
  assert.equal(spatial.observations[0].license, occurrence.license)
  assert.equal(spatial.observations[0].localityOriginal, occurrence.locality_verbatim)
  assert.equal(spatial.observations[0].governorateOriginal, 'Al Qatif')
  for (const change of [
    {coordinate_uncertainty_m: null}, {coordinate_uncertainty_m: 0}, {coordinate_uncertainty_m: -1},
    {coordinate_uncertainty_m: 1001}, {coordinates_interpreted_by_gbif: null},
    {coordinates_interpreted_by_gbif: [0, 0]}, {coordinates_interpreted_by_gbif: [200, 20]},
    {coordinates_interpreted_by_gbif: [46.7, 24.7]}, // Saudi point, but not the bound Eastern region.
    {issues: ['COUNTRY_MISMATCH']}, {issues: ['GEODETIC_DATUM_INVALID']},
    {information_withheld: 'Location withheld'}, {data_generalizations: 'Coordinates generalized'},
    {reported_region_conflict: true}, {taxonomic_record_usable: false},
    {gadm: {level0: {gid: 'BHR'}}},
  ]) {
    const result = compileFixture([{...occurrence, ...change}])
    assert.equal(result.status, 0, result.stderr)
    const observation = JSON.parse(result.stdout).observations[0]
    assert.equal(observation.pointEligible, false, JSON.stringify(change))
    assert.equal(observation.latitude, null)
    assert.equal(observation.longitude, null)
    assert.equal(observation.referenceUrl, occurrence.source_url)
    assert.ok(observation.pointSuppressionReasons.length)
  }
  const exactLimit = compileFixture([{...occurrence, coordinate_uncertainty_m: 1000}])
  assert.equal(JSON.parse(exactLimit.stdout).observations[0].pointEligible, true)
})

test('compiler rejects missing or duplicate references and never adds raw occurrences not in the plant pack', () => {
  const unrelated = {...occurrence, occurrence_id: '999999999', source_url: 'https://www.gbif.org/occurrence/999999999'}
  assert.equal(JSON.parse(compileFixture([occurrence, unrelated]).stdout).observations.length, 1)
  assert.notEqual(compileFixture([]).status, 0)
  assert.notEqual(compileFixture([{...occurrence, source_id: 'another-source'}]).status, 0)
  assert.notEqual(compileFixture([occurrence], {...plant, records: [record, {...record, id: 'duplicate-record'}]}).status, 0)
  assert.equal(JSON.parse(compileFixture([occurrence], {...plant, records: []}).stdout), null)
  assert.equal(JSON.parse(compileFixture([occurrence], {...plant, status: 'identity_review_required', records: []}).stdout), null)
})

test('client rejects malformed points, unsafe references, duplicate observations and wrong region IDs', () => {
  for (const mutate of [
    value => { value.observations[0].regionId = 'SA-13' },
    value => { value.observations[0].referenceUrl = 'javascript:alert(1)' },
    value => { value.observations.push(value.observations[0]) },
    value => { value.observations[0].license = 'javascript:alert(1)' },
    value => { value.observations[0].governorateDerived = 'yes' },
    value => { const item = value.observations.find(item => item.pointEligible); item.uncertaintyMeters = null },
    value => { const item = value.observations.find(item => !item.pointEligible); item.latitude = 26 },
  ]) {
    const invalid = structuredClone(arakSpatial)
    mutate(invalid)
    assert.throws(() => validateSpatial(invalid), error => error.code === 'invalid_data')
  }
})

test('spatial loading shares requests, treats 404 as absent and retries failures or UUID mismatches', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  let calls = 0
  globalThis.fetch = async () => { calls++; return {status: 200, ok: true, json: async () => arakSpatial} }
  const first = loadSpatial(uuid, 'https://spatial-cache.example/data/')
  const second = loadSpatial(uuid, 'https://spatial-cache.example/data/')
  assert.equal(first, second)
  assert.equal(await first, await second)
  await loadSpatial(uuid, 'https://spatial-cache.example/data/')
  assert.equal(calls, 1)
  globalThis.fetch = async () => { calls++; return {status: 404, ok: false} }
  assert.equal(await loadSpatial(uuid, 'https://spatial-absent.example/data/'), null)
  assert.equal(await loadSpatial(uuid, 'https://spatial-absent.example/data/'), null)
  assert.equal(calls, 2)
  let attempt = 0
  globalThis.fetch = async () => {
    attempt++
    if (attempt === 1) throw Error('offline')
    return {status: 200, ok: true, json: async () => attempt === 2 ? {...arakSpatial, uuid: '11111111-1111-4111-8111-111111111111'} : arakSpatial}
  }
  await assert.rejects(loadSpatial(uuid, 'https://spatial-retry.example/data/'), error => error.code === 'network')
  await assert.rejects(loadSpatial(uuid, 'https://spatial-retry.example/data/'), error => error.code === 'invalid_data')
  assert.equal(await loadSpatial(uuid, 'https://spatial-retry.example/data/'), arakSpatial)
  assert.equal(attempt, 3)
  assert.throws(() => loadSpatial('../escape'), error => error.code === 'invalid_uuid')
})

test('spatial settled cache is limited to 48 plant requests', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  let calls = 0
  globalThis.fetch = async url => {
    calls++
    const id = new URL(url).pathname.split('/').at(-1).slice(0, -5)
    return {status: 200, ok: true, json: async () => ({...arakSpatial, uuid: id})}
  }
  const ids = Array.from({length: 49}, (_, i) => '11111111-1111-4111-8111-' + String(i).padStart(12, '0'))
  for (const id of ids) await loadSpatial(id, 'https://spatial-lru.example/data/')
  await loadSpatial(ids.at(-1), 'https://spatial-lru.example/data/')
  assert.equal(calls, 49)
  await loadSpatial(ids[0], 'https://spatial-lru.example/data/')
  assert.equal(calls, 50)
})
