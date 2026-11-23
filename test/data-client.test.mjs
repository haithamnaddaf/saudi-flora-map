import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DEFAULT_DATA_URL, getDataBase, isUuid, safeSourceUrl, loadRegions, loadCatalog, loadPlant,
  allowedRecords, validatePlant, validateCatalog, validateRegions } from '../src/data-client.js'

const root = new URL('../', import.meta.url)
const regions = JSON.parse(await readFile(new URL('public/data/regions.v1.json', root)))
const actualFetch = globalThis.fetch
test.afterEach(() => { globalThis.fetch = actualFetch })
const UUID = 'f009a176-94e3-4387-b682-0f416bf31afd'
const otherUuid = 'c120f1d4-0878-4d01-9757-07422c6b9459'
const source = () => ({id: 'E-TEST', regionId: 'SA-02', place: 'منطقة مكة المكرمة', sourceId: 'S-TEST',
  sourceTitle: 'مرجع اختبار', sourceUrl: 'https://example.org/reference', sourceKind: 'regional_checklist',
  locator: 'قسم الانتشار', evidence: 'ملخص اختبار للمعلومة', sourceScientificName: 'Salvadora persica',
  accessedOn: '2026-11-23', status: 'verified'})
const plant = (uuid = UUID) => ({schemaVersion: 2, version: '2.0.0', uuid, senseId: 'sense-test',
  name: 'أراكة', scientificName: 'Salvadora persica', status: 'documented_for_supplied_taxon',
  statusLabel: 'انتشار موثق للاسم العلمي المعطى', records: [source()]})
const catalog = () => {
  const {schemaVersion, version, records, ...identity} = plant()
  return {schemaVersion, version, released: '2026-11-23', country: 'SA', plants: [{...identity, regionIds: ['SA-02']}]}
}
const response = value => ({ok: true, status: 200, json: async () => structuredClone(value)})
const hasCode = code => error => error.code === code

test('data client imports without DOM and preserves UUID spelling', () => {
  assert.equal(DEFAULT_DATA_URL, new URL('../data/', new URL('../src/data-client.js', import.meta.url)).href)
  assert.equal(isUuid(UUID), true)
  assert.equal(isUuid(UUID.toUpperCase()), true)
  for (const value of ['', null, 123, '../plant', UUID + '/other', ' ' + UUID]) assert.equal(isUuid(value), false)
  assert.equal(getDataBase('https://example.org/maps/data'), 'https://example.org/maps/data/')
  assert.equal(getDataBase('http://127.0.0.1:4173/data/'), 'http://127.0.0.1:4173/data/')
  for (const base of ['file:///tmp/data/', 'javascript:alert(1)', 'https://u:p@example.org/data',
    'https://example.org/data?q=1', 'https://example.org/data#x']) {
    assert.throws(() => getDataBase(base), hasCode('invalid_data'))
  }
})

test('source links require HTTPS and never accept credentials or script schemes', () => {
  assert.equal(safeSourceUrl('https://example.org/reference'), 'https://example.org/reference')
  for (const value of ['http://example.org', 'javascript:alert(1)', '//example.org', 'https://u:p@example.org',
    ' https://example.org', 'https://example.org/a b', null]) assert.equal(safeSourceUrl(value), null)
})

test('concurrent consumers share one UUID request without downloading the catalog', async () => {
  const urls = []
  let finish
  globalThis.fetch = url => { urls.push(url); return new Promise(resolve => { finish = resolve }) }
  const first = loadPlant(UUID, 'https://shared.example/data/')
  const second = loadPlant(UUID, 'https://shared.example/data/')
  assert.equal(first, second)
  assert.deepEqual(urls, [`https://shared.example/data/plants/${UUID}.json`])
  finish(response(plant()))
  assert.equal((await first).uuid, UUID)
  assert.equal((await second).uuid, UUID)
  assert.equal((await loadPlant(UUID, 'https://shared.example/data/')).uuid, UUID)
  assert.equal(urls.length, 1)
})

test('invalid UUIDs never issue requests and a case-mismatched response is rejected', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return response(plant()) }
  assert.throws(() => loadPlant('../wrong', 'https://identity.example/data/'), hasCode('invalid_uuid'))
  assert.equal(calls, 0)
  await assert.rejects(loadPlant(UUID.toUpperCase(), 'https://identity.example/data/'), hasCode('invalid_data'))
  assert.equal(calls, 1)
})

test('failed and mismatched requests are evicted so a retry can load corrected data', async () => {
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    if (calls === 1) throw Error('offline')
    if (calls === 2) return response(plant(otherUuid))
    return response(plant())
  }
  const base = 'https://retry.example/data/'
  await assert.rejects(loadPlant(UUID, base), hasCode('network'))
  await assert.rejects(loadPlant(UUID, base), hasCode('invalid_data'))
  assert.equal((await loadPlant(UUID, base)).uuid, UUID)
  await loadPlant(UUID, base)
  assert.equal(calls, 3)
})

test('404, server failure and malformed JSON use stable error codes', async () => {
  globalThis.fetch = async () => ({ok: false, status: 404})
  await assert.rejects(loadPlant(UUID, 'https://missing.example/data/'), hasCode('not_found'))
  globalThis.fetch = async () => ({ok: false, status: 503})
  await assert.rejects(loadPlant(UUID, 'https://unavailable.example/data/'), hasCode('network'))
  globalThis.fetch = async () => ({ok: true, status: 200, json: async () => { throw SyntaxError('bad json') }})
  await assert.rejects(loadPlant(UUID, 'https://malformed.example/data/'), hasCode('invalid_data'))
})

test('plant cache evicts old entries after 48 settled UUID assets', async () => {
  const hits = new Map()
  globalThis.fetch = async url => {
    hits.set(url, (hits.get(url) || 0) + 1)
    const id = url.match(/plants\/([a-f0-9-]+)\.json$/)[1]
    return response(plant(id))
  }
  const base = 'https://lru.example/data/'
  const ids = Array.from({length: 49}, (_, index) => `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`)
  for (const id of ids) await loadPlant(id, base)
  await loadPlant(ids.at(-1), base)
  await loadPlant(ids[0], base)
  assert.equal(hits.get(`${base}plants/${ids.at(-1)}.json`), 1)
  assert.equal(hits.get(`${base}plants/${ids[0]}.json`), 2)
})

test('catalog and geography are independently validated and share cached requests', async () => {
  const hits = []
  globalThis.fetch = async url => { hits.push(url); return response(url.endsWith('regions.v1.json') ? regions : catalog()) }
  const base = 'https://indexes.example/data/'
  assert.equal((await loadRegions(base)).length, 13)
  assert.equal((await loadCatalog(base)).plants.length, 1)
  await Promise.all([loadRegions(base), loadCatalog(base)])
  assert.equal(hits.length, 2)
  assert.equal(hits.some(url => url.includes('/plants/')), false)
})

test('held identities and pending source rows remain hidden without changing the input', () => {
  const value = plant()
  value.records.push({...source(), id: 'E-PENDING', status: 'pending'})
  validatePlant(value)
  assert.equal(allowedRecords(value).length, 1)
  assert.equal(value.records[1].status, 'pending')
  assert.deepEqual(allowedRecords({...value, status: 'identity_review_required'}), [])
  assert.deepEqual(allowedRecords(null), [])
  assert.throws(() => validatePlant({...value, status: 'identity_review_required'}), hasCode('invalid_data'))
})

test('unknown regions, duplicate evidence and broken source metadata fail validation', () => {
  for (const mutate of [
    value => { value.records[0].regionId = 'SA-13' },
    value => { value.records.push(structuredClone(value.records[0])) },
    value => { value.records[0].sourceUrl = 'javascript:alert(1)' },
    value => { value.records[0].sourceTitle = '' },
    value => { value.records[0].sourceScientificName = '' },
    value => { value.records[0].recordUrls = ['https://example.org/one', 'https://example.org/one'] },
    value => { value.version = 'latest' },
  ]) {
    const value = plant()
    mutate(value)
    assert.throws(() => validatePlant(value), hasCode('invalid_data'))
  }
  const unmapped = plant()
  unmapped.records[0].regionId = null
  assert.equal(validatePlant(unmapped).records[0].regionId, null)
  const badCatalog = catalog()
  badCatalog.plants[0].regionIds = ['SA-13']
  assert.throws(() => validateCatalog(badCatalog), hasCode('invalid_data'))
  assert.throws(() => validateRegions(regions.slice(1)), hasCode('invalid_data'))
})

test('a printed book can be cited without a URL when bibliographic details are present', () => {
  const value = plant()
  Object.assign(value.records[0], {sourceKind: 'كتاب', sourceUrl: '', sourceAuthor: 'مؤلف اختبار',
    year: '2020', locator: 'صفحة 12', accessedOn: ''})
  assert.equal(validatePlant(value), value)
  for (const field of ['sourceAuthor', 'year', 'locator']) {
    const missing = structuredClone(value)
    missing.records[0][field] = ''
    assert.throws(() => validatePlant(missing), hasCode('invalid_data'))
  }
})
