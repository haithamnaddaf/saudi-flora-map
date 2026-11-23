import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { allowedRecords, validateCatalog, validatePlant } from '../src/data-client.js'

const script = fileURLToPath(new URL('../scripts/apply-updates.mjs', import.meta.url))
const geometry = await readFile(new URL('../public/data/regions.v1.json', import.meta.url))
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

test('CLI prepares an independent release with delete/update, pending retained and unaffected plant preserved', async t => {
  const f = await setup(t)
  const originals = await Promise.all(['catalog.v2.json', 'regions.v1.json', 'BOUNDARIES.txt', `plants/${first}.json`, `plants/${second}.json`]
    .map(async path => [path, await readFile(join(f.data, path))]))
  const result = run(f)
  assert.equal(result.status, 0, result.stderr)
  const updated = validatePlant(await readJson(join(f.output, 'plants', first + '.json')))
  const untouched = validatePlant(await readJson(join(f.output, 'plants', second + '.json')))
  const catalog = validateCatalog(await readJson(join(f.output, 'catalog.v2.json')))
  assert.equal(updated.version, '2.0.1')
  assert.equal(updated.records.some(record => record.id === 'delete-me'), false)
  assert.equal(updated.records.find(record => record.id === 'change-me').regionId, 'SA-09')
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
  const manifest = await readJson(join(f.output, 'release-manifest.json'))
  assert.equal(manifest.published, false)
  assert.deepEqual(manifest.changes, {added: 1, updated: 1, deleted: 1, affectedPlants: 1, unaffectedPlants: 1, rows: 3})
  assert.equal(manifest.after.pending, 1)
  assert.equal(manifest.inputs.patchSha256, digest(await readFile(f.patchPath)))
  for (const [path, details] of Object.entries(manifest.files)) {
    const content = await readFile(join(f.output, path))
    assert.equal(digest(content), details.sha256)
    assert.equal(content.length, details.bytes)
  }
  assert.equal((await readdir(f.directory)).some(name => name.includes('.stage-') || name.endsWith('.release-lock')), false)
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
