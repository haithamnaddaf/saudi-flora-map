import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { allowedRecords, validateCatalog, validatePlant } from '../src/data-client.js'
import { spatialForPlant, validateSpatial } from '../src/spatial-client.js'

const script = fileURLToPath(new URL('../scripts/apply-updates.mjs', import.meta.url))
const geometry = await readFile(new URL('../public/data/regions.v1.json', import.meta.url))
const governorates = await readFile(new URL('../public/data/governorates.v1.json', import.meta.url))
const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const unknown = '33333333-3333-4333-8333-333333333333'
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const json = (path, value) => writeFile(path, JSON.stringify(value))
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const record = (id, regionId = 'SA-02', status = 'verified') => ({id, regionId, place: 'موضع اختبار',
  sourceId: 'test-source', sourceTitle: 'مرجع اختبار', sourceKind: 'regional_checklist', sourceUrl: 'https://example.org/reference',
  sourceScientificName: 'Example species', locator: 'قسم الانتشار', evidence: 'خلاصة اختبارية', accessedOn: '', status})
const plant = uuid => ({schemaVersion: 2, version: '2.0.0', uuid, senseId: 'sense-' + uuid,
  name: 'نبات اختبار', scientificName: 'Example species', status: 'documented_for_supplied_taxon', statusLabel: 'مسموح وفق قواعد البحث',
  records: [record('delete-me'), record('change-me', 'SA-11')]})
const change = (recordId, action = 'upsert', source = record(recordId), uuid = first) => ({uuid,
  scientificName: 'Example species', recordId, action, ...(action === 'upsert' ? {record: source} : {}),
  provenance: {file: 'changes.xlsx', sheet: 'Records', row: 2}})

async function setup(t, {blocked = false} = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'flora-release-test-'))
  t.after(() => rm(directory, {recursive: true, force: true}))
  const data = join(directory, 'source-data'), output = join(directory, 'release-data'), patchPath = join(directory, 'changes.json')
  await mkdir(join(data, 'plants'), {recursive: true})
  const plants = [plant(first), plant(second)]
  if (blocked) Object.assign(plants[1], {status: 'identity_review_required', statusLabel: 'معلق لحسم الهوية', records: []})
  const catalog = {schemaVersion: 2, version: '2.0.0', released: '2026-11-23', country: 'SA',
    plants: plants.map(({schemaVersion, version, records, ...identity}) => ({...identity,
      regionIds: [...new Set(records.filter(record => record.status === 'verified').map(record => record.regionId))].sort()}))}
  await json(join(data, 'catalog.v2.json'), catalog)
  await writeFile(join(data, 'regions.v1.json'), geometry)
  await writeFile(join(data, 'BOUNDARIES.txt'), 'Fixture boundary attribution; retained exactly.\n')
  await writeFile(join(data, 'governorates.v1.json'), governorates)
  await writeFile(join(data, 'GOVERNORATE-BOUNDARIES.txt'), 'Fixture governorate attribution and license; retained exactly.\n')
  for (const item of plants) await json(join(data, 'plants', item.uuid + '.json'), item)
  const patch = {schemaVersion: 2, baseVersion: '2.0.0', updatedAt: '2026-11-23T12:00:00Z', changes: [
    change('delete-me', 'delete'),
    change('change-me', 'upsert', {...record('change-me', 'SA-09'), evidence: 'خلاصة معدلة'}),
    change('new-pending', 'upsert', record('new-pending', 'SA-14', 'pending')),
  ]}
  await json(patchPath, patch)
  return {directory, data, output, patchPath, patch, plants, catalog}
}

const run = (fixture, version = '2.0.1') => spawnSync(process.execPath, [script, '--patch', fixture.patchPath,
  '--version', version, '--output', fixture.output, '--data', fixture.data], {encoding: 'utf8'})
const missing = async path => { await assert.rejects(stat(path), error => error.code === 'ENOENT') }

async function attachSpatial(fixture) {
  await mkdir(join(fixture.data, 'spatial'))
  const companions = []
  for (const [plantIndex, item] of fixture.plants.entries()) {
    const observations = [], bindings = {}
    for (const [recordIndex, original] of item.records.entries()) {
      const id = String(100000000 + plantIndex * 100 + recordIndex)
      original.sourceKind = 'occurrence_records'
      original.sourceUrl = 'https://www.gbif.org/occurrence/' + id
      original.recordUrls = [original.sourceUrl]
      bindings[original.id] = Object.fromEntries(['regionId', 'place', 'sourceId', 'sourceTitle', 'sourceUrl',
        'sourceKind', 'sourceScientificName', 'locator', 'recordUrls'].map(key => [key, original[key]]))
      observations.push({id, recordId: original.id, regionId: original.regionId,
        latitude: original.regionId === 'SA-02' ? 21.4 : 20.0,
        longitude: original.regionId === 'SA-02' ? 39.8 : 41.47,
        uncertaintyMeters: 5, pointEligible: true, localityOriginal: '', governorateOriginal: '',
        governorateId: '', governorateDerived: false, eventDate: '2024-02-01', basisOfRecord: 'HUMAN_OBSERVATION',
        sourceId: original.sourceId, referenceUrl: original.sourceUrl,
        license: 'http://creativecommons.org/licenses/by-nc/4.0/legalcode', pointSuppressionReasons: []})
    }
    const spatial = validateSpatial({schemaVersion: 1, baseVersion: item.version, uuid: item.uuid,
      scientificName: item.scientificName, bindings, observations}, item.uuid)
    companions.push(spatial)
    await json(join(fixture.data, 'plants', item.uuid + '.json'), item)
    await json(join(fixture.data, 'spatial', item.uuid + '.json'), spatial)
  }
  return companions
}

test('CLI prepares an independent release with delete/update, pending retained and unaffected plant preserved', async t => {
  const f = await setup(t)
  const reviewed = f.patch.changes.find(change => change.recordId === 'change-me')
  reviewed.record.place = 'اسم مكان مصحح في المصنف'
  reviewed.provenance.placeNameReviewed = true
  reviewed.record.provenance = { ...reviewed.provenance }
  await json(f.patchPath, f.patch)
  const originals = await Promise.all(['catalog.v2.json', 'regions.v1.json', 'BOUNDARIES.txt',
    'governorates.v1.json', 'GOVERNORATE-BOUNDARIES.txt', `plants/${first}.json`, `plants/${second}.json`]
    .map(async path => [path, await readFile(join(f.data, path))]))
  const result = run(f)
  assert.equal(result.status, 0, result.stderr)
  const updated = validatePlant(await readJson(join(f.output, 'plants', first + '.json')))
  const untouched = validatePlant(await readJson(join(f.output, 'plants', second + '.json')))
  const catalog = validateCatalog(await readJson(join(f.output, 'catalog.v2.json')))
  assert.equal(updated.version, '2.0.1')
  assert.equal(updated.records.some(record => record.id === 'delete-me'), false)
  assert.equal(updated.records.find(record => record.id === 'change-me').regionId, 'SA-09')
  assert.equal(updated.records.find(record => record.id === 'change-me').provenance.placeNameReviewed, true)
  assert.equal(updated.records.find(record => record.id === 'new-pending').status, 'pending')
  assert.equal(allowedRecords(updated).length, 1)
  assert.deepEqual(catalog.plants[0].regionIds, ['SA-09'])
  assert.equal(updated.localOverrides, undefined)
  assert.equal(updated.localUpdatedAt, undefined)
  assert.deepEqual(untouched, {...f.plants[1], version: '2.0.1'})
  assert.equal(catalog.version, '2.0.1')
  for (const [path, original] of originals) assert.deepEqual(await readFile(join(f.data, path)), original)
  assert.deepEqual(await readFile(join(f.output, 'regions.v1.json')), geometry)
  assert.equal(await readFile(join(f.output, 'BOUNDARIES.txt'), 'utf8'), 'Fixture boundary attribution; retained exactly.\n')
  assert.deepEqual(await readFile(join(f.output, 'governorates.v1.json')), governorates)
  assert.equal(await readFile(join(f.output, 'GOVERNORATE-BOUNDARIES.txt'), 'utf8'), 'Fixture governorate attribution and license; retained exactly.\n')
  const manifest = await readJson(join(f.output, 'release-manifest.json'))
  assert.equal(manifest.published, false)
  assert.deepEqual(manifest.changes, {added: 1, updated: 1, deleted: 1, affectedPlants: 1, unaffectedPlants: 1, rows: 3})
  assert.equal(manifest.after.pending, 1)
  assert.equal(manifest.inputs.patchSha256, digest(await readFile(f.patchPath)))
  assert.deepEqual(manifest.files['governorates.v1.json'], {bytes: governorates.length, sha256: digest(governorates)})
  assert.ok(manifest.files['GOVERNORATE-BOUNDARIES.txt'].sha256)
  for (const [path, details] of Object.entries(manifest.files)) {
    const content = await readFile(join(f.output, path))
    assert.equal(digest(content), details.sha256)
    assert.equal(content.length, details.bytes)
  }
  assert.equal((await readdir(f.directory)).some(name => name.includes('.stage-') || name.endsWith('.release-lock')), false)
})

test('release requires governorate boundaries and attribution and validates the geometry before writing output', async t => {
  for (const mutate of [
    f => rm(join(f.data, 'governorates.v1.json')),
    f => rm(join(f.data, 'GOVERNORATE-BOUNDARIES.txt')),
    f => json(join(f.data, 'governorates.v1.json'), [{id: 'invalid-governorate'}]),
  ]) {
    const f = await setup(t)
    await mutate(f)
    assert.notEqual(run(f).status, 0)
    await missing(f.output)
    assert.equal((await readdir(f.directory)).some(name => name.includes('.stage-') || name.endsWith('.release-lock')), false)
  }
})

test('unknown or blocked UUIDs fail before any output is visible', async t => {
  for (const blocked of [false, true]) {
    const f = await setup(t, {blocked})
    f.patch.changes = [change('new', 'upsert', record('new'), blocked ? second : unknown)]
    await json(f.patchPath, f.patch)
    const result = run(f)
    assert.notEqual(result.status, 0)
    await missing(f.output)
    assert.equal((await readdir(f.directory)).some(name => name.includes('.stage-') || name.endsWith('.release-lock')), false)
  }
})

test('wrong base version, changed identity and nonexistent deletes fail without an output', async t => {
  for (const mutate of [
    patch => { patch.baseVersion = '1.0.0' },
    patch => { patch.changes[0].scientificName = 'Different species' },
    patch => { patch.changes[0].recordId = 'record-of-another-plant' },
    patch => { patch.changes[1].record.sourceUrl = 'javascript:alert(1)' },
    patch => { patch.changes[1].record.regionId = 'SA-13' },
  ]) {
    const f = await setup(t)
    mutate(f.patch)
    await json(f.patchPath, f.patch)
    assert.notEqual(run(f).status, 0)
    await missing(f.output)
  }
})

test('release versions cannot repeat, downgrade or bypass stable SemVer parsing', async t => {
  const f = await setup(t)
  for (const version of ['2.0.0', '1.99.99', '2.0.0-alpha', '02.0.1', 'latest']) {
    assert.notEqual(run(f, version).status, 0, version)
    await missing(f.output)
  }
})

test('existing output and attempts to write into the source directory are refused', async t => {
  const f = await setup(t)
  await mkdir(f.output)
  await writeFile(join(f.output, 'keep.txt'), 'existing release')
  assert.notEqual(run(f).status, 0)
  assert.equal(await readFile(join(f.output, 'keep.txt'), 'utf8'), 'existing release')
  const inside = {...f, output: join(f.data, 'new-release')}
  assert.notEqual(run(inside).status, 0)
  await missing(inside.output)
})

test('release retains spatial companions with a new baseVersion and removes deleted or relocated source bindings', async t => {
  const f = await setup(t)
  const originals = await attachSpatial(f)
  f.patch.changes[1].record = {...f.plants[0].records.find(item => item.id === 'change-me'), regionId: 'SA-09', place: 'موضع معدّل'}
  await json(f.patchPath, f.patch)
  const result = run(f)
  assert.equal(result.status, 0, result.stderr)
  const changed = await readJson(join(f.output, 'plants', first + '.json'))
  const changedSpatial = validateSpatial(await readJson(join(f.output, 'spatial', first + '.json')))
  const unchangedSpatial = validateSpatial(await readJson(join(f.output, 'spatial', second + '.json')))
  assert.equal(changedSpatial.baseVersion, '2.0.1')
  assert.deepEqual(changedSpatial.observations, [])
  assert.deepEqual(changedSpatial.bindings, {})
  assert.deepEqual(spatialForPlant(changed, changedSpatial), [])
  assert.equal(changed.records.find(item => item.id === 'new-pending').status, 'pending')
  assert.deepEqual(unchangedSpatial, {...originals[1], baseVersion: '2.0.1'})
  assert.equal(unchangedSpatial.observations[0].license, originals[1].observations[0].license)
  assert.equal(spatialForPlant(await readJson(join(f.output, 'plants', second + '.json')), unchangedSpatial).length, 2)
  const manifest = await readJson(join(f.output, 'release-manifest.json'))
  assert.deepEqual(manifest.spatial, {files: 2, beforeObservations: 4, afterObservations: 2,
    beforePoints: 4, afterPoints: 2, removedByRecordChanges: 2})
  for (const item of originals) assert.deepEqual(await readJson(join(f.data, 'spatial', item.uuid + '.json')), item)
  assert.ok(manifest.files['spatial/' + second + '.json'].sha256)
})

test('release refuses unknown, malformed or mismatched spatial data before creating output', async t => {
  for (const mutate of [
    spatial => { spatial.baseVersion = '1.0.0' },
    spatial => { spatial.scientificName = 'Different species' },
    spatial => { spatial.bindings['delete-me'].place = 'موضع آخر' },
    spatial => { spatial.observations[0].uncertaintyMeters = null },
  ]) {
    const f = await setup(t)
    const [spatial] = await attachSpatial(f)
    mutate(spatial)
    await json(join(f.data, 'spatial', first + '.json'), spatial)
    assert.notEqual(run(f).status, 0)
    await missing(f.output)
  }
  const f = await setup(t)
  const [spatial] = await attachSpatial(f)
  await json(join(f.data, 'spatial', unknown + '.json'), {...spatial, uuid: unknown})
  assert.notEqual(run(f).status, 0)
  await missing(f.output)
})

test('release preserves an editorially clarified source but hides a source changed to pending', async t => {
  const f = await setup(t)
  await attachSpatial(f)
  f.patch.changes = [
    change('delete-me', 'upsert', {...f.plants[0].records[0], evidence: 'خلاصة أوضح للمصدر نفسه'}),
    change('change-me', 'upsert', {...f.plants[0].records[1], status: 'pending'}),
  ]
  await json(f.patchPath, f.patch)
  const result = run(f)
  assert.equal(result.status, 0, result.stderr)
  const updated = await readJson(join(f.output, 'plants', first + '.json'))
  const spatial = validateSpatial(await readJson(join(f.output, 'spatial', first + '.json')))
  assert.equal(updated.records.find(item => item.id === 'change-me').status, 'pending')
  assert.equal(spatial.observations.length, 1)
  assert.equal(spatial.observations[0].recordId, 'delete-me')
  assert.equal(spatialForPlant(updated, spatial).length, 1)
})
