import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {coverageByNamedPlace, resolveNamedPlace} from '../src/named-places.js'
import {validateSpatial} from '../src/spatial-client.js'

const read = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url)))
const governorates = await read('public/data/governorates.v1.json')
const regions = await read('public/data/regions.v1.json')
const uuid = 'f009a176-94e3-4387-b682-0f416bf31afd'
const arak = await read(`public/data/plants/${uuid}.json`)
const spatial = await read(`public/data/spatial/${uuid}.json`)
const observation = spatial.observations.find(item => item.id === '5087136007')
const record = arak.records.find(item => item.id === observation.recordId)
const plant = {...arak, records: [record]}
const resolve = (name, options) => resolveNamedPlace(name, governorates, regions, options)
const coverage = (currentPlant = plant, observations = [observation]) =>
  coverageByNamedPlace(currentPlant, observations, governorates, regions)

test('the actual Wajh source name wins over conflicting coordinates and GADM without changing the source', () => {
  const original = structuredClone({plant, observation})
  const result = coverage()
  assert.equal(observation.publisherRegionOriginal, 'Tabuk')
  assert.deepEqual(result.governorates.map(item => item.name), ['الوجه'])
  assert.equal(result.governorates[0].evidence[0].originalPlace, 'Al Wajh Saudi Arabia')
  assert.equal(result.governorates[0].evidence[0].observation.referenceUrl, 'https://www.gbif.org/occurrence/5087136007')
  const changed = coverage(plant, [{...observation, latitude: null, longitude: null,
    governorateOriginal: 'Riyadh', governorateId: 'SAU.7.1_1', regionId: 'SA-01'}])
  assert.equal(changed.governorates[0].id, result.governorates[0].id)
  assert.deepEqual({plant, observation}, original)
})

test('the optional publisher region field keeps old companions compatible and rejects non-text input', () => {
  const legacy = structuredClone(spatial)
  for (const item of legacy.observations) delete item.publisherRegionOriginal
  assert.equal(validateSpatial(legacy, uuid), legacy)
  const invalid = structuredClone(spatial)
  invalid.observations[0].publisherRegionOriginal = {name: 'Tabuk'}
  assert.throws(() => validateSpatial(invalid, uuid), /اسم المنطقة الأصلي/)
})

test('missing original names never promote old composite place text or coordinate-derived region IDs', () => {
  const result = coverage(plant, [{...observation, localityOriginal: '', publisherRegionOriginal: ''}])
  assert.deepEqual(result.governorates, [])
  assert.deepEqual(result.regions, [])
  assert.equal(result.unresolved[0].reason, 'source_place_missing')
  assert.deepEqual(coverage(plant, []).governorates, [])
})

test('a publisher region supplies a fallback; a unique published county name remains a county', () => {
  const regional = resolve('Untranslated named valley', {publisherRegionOriginal: 'Al Madinah'})
  assert.equal(regional.level, 'region')
  assert.equal(regional.id, 'SA-03')
  const county = resolve('Sharaan Nature Reserve', {publisherRegionOriginal: 'AlUla'})
  assert.equal(county.level, 'governorate')
  assert.equal(county.name, 'العلا')
  assert.equal(county.matchKind, 'source_administrative_name')
})

test('region names and regional capitals do not become a governorate of the same name', () => {
  for (const name of ['Riyadh Region', 'منطقة الرياض', 'Riyadh Saudi Arabia']) {
    assert.equal(resolve(name).level, 'region', name)
    assert.equal(resolve(name).id, 'SA-01', name)
  }
  assert.equal(resolve('منطقة تبوك').id, 'SA-07')
  assert.equal(resolve('المنطقة الشرقية').id, 'SA-04')
  assert.equal(resolve('الدمام').id, 'SA-04')
  assert.equal(resolve('المويه').id, 'SA-02')
})

test('a direction or route is not collapsed to the reference city; explicit region remains available', () => {
  assert.equal(resolve('40 km north of Al Lith').level, 'unresolved')
  assert.equal(resolve('40 km north of Al Lith', {publisherRegionOriginal: 'Makkah'}).id, 'SA-02')
  assert.equal(resolve('طريق الطائف في نطاق الباحة').id, 'SA-11')
  assert.equal(resolve('الطائف وما حولها').name, 'الطائف')
})

test('exact word boundaries, compound names and conflicting published places prevent false matching', () => {
  assert.equal(resolve('الوجهة').level, 'unresolved')
  assert.equal(resolve('املج').name, 'أملج')
  assert.equal(resolve('Badr Al Janub Saudi Arabia').name, 'بدر الجنوب')
  assert.equal(resolve('Al Wajh and Umluj').level, 'unresolved')
  assert.equal(resolve('Al Wajh Saudi Arabia', {publisherRegionOriginal: 'Makkah'}).reason, 'conflicting_published_names')
})

test('the trailing region of a published address does not compete with its named governorate', () => {
  assert.equal(resolve('القنفذة, Mecca, SA').name, 'القنفذة')
  assert.equal(resolve('Ghazal, Taif, Mecca, SA').name, 'الطائف')
  assert.equal(resolve('Al Wajh, Umluj, Tabuk, SA').level, 'region')
  assert.equal(resolve('Al Wajh, Makkah, SA').level, 'unresolved')
})

test('a verified, explicitly reviewed Excel name is used only when no current observation is bound', () => {
  const withProvenance = {...plant, records: [{...record, place: 'أملج', provenance: {reviewer: 'fixture'}}]}
  assert.equal(coverage(withProvenance, []).governorates.length, 0)
  withProvenance.records[0].provenance.placeNameReviewed = true
  assert.equal(coverage(withProvenance, []).governorates[0].name, 'أملج')
  assert.equal(coverage(withProvenance).governorates[0].name, 'الوجه')
  withProvenance.records[0].status = 'pending'
  assert.equal(coverage(withProvenance, []).governorates.length, 0)
})

test('plant status, current record identity, source and occurrence URLs stay gated', () => {
  assert.deepEqual(coverage({...plant, status: 'identity_review_required'}), {governorates: [], regions: [], unresolved: []})
  for (const patch of [{recordId: 'other'}, {sourceId: 'other'}, {referenceUrl: 'https://www.gbif.org/occurrence/999'}]) {
    assert.equal(coverage(plant, [{...observation, ...patch}]).governorates.length, 0)
  }
  assert.equal(coverage(plant, [observation, observation]).governorates[0].evidence.length, 1)
})

test('a book or checklist name has the same name-first rule independent of stored regionId', () => {
  const current = {...plant, records: [{...record, sourceKind: 'book', place: 'منطقة تبوك', regionId: 'SA-04'}]}
  const result = coverage(current, [])
  assert.deepEqual(result.governorates, [])
  assert.equal(result.regions[0].id, 'SA-07')
  assert.equal(result.regions[0].evidence[0].originalPlace, 'منطقة تبوك')
})
