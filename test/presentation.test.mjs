import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { presentSource, presentEvidence, presentLocation } from '../src/presentation.js'

const data = new URL('../public/data/', import.meta.url)
const uuid = 'f009a176-94e3-4387-b682-0f416bf31afd'
const arak = JSON.parse(await readFile(new URL(`plants/${uuid}.json`, data)))
const spatial = JSON.parse(await readFile(new URL(`spatial/${uuid}.json`, data)))
const byId = id => arak.records.find(record => record.id === id)
const observation = id => spatial.observations.find(item => item.id === id)
const eastern = byId('E-TEXT-d461e9c59fe2257b')
const dhahran = byId('E-OBS-c9dcfdc22190c634')
const automated = byId('E-OBS-28ef52323c1ba8f5')

test('all 73 released sources have editorial Arabic titles while preserving their originals', async () => {
  const sources = new Map()
  for (const name of await readdir(new URL('plants/', data))) {
    if (!name.endsWith('.json')) continue
    const plant = JSON.parse(await readFile(new URL('plants/' + name, data)))
    for (const record of plant.records) sources.set(record.sourceId, record)
  }
  assert.equal(sources.size, 73)
  for (const record of sources.values()) {
    const source = presentSource(record)
    assert.equal(source.originalTitle, record.sourceTitle)
    assert.match(source.titleAr, /[\u0621-\u064a]/)
    assert.notEqual(source.titleAr, source.kindLabel, record.sourceId + ' needs an editorial title')
    assert.equal(typeof source.automated, 'boolean')
  }
})

test('the Eastern checklist explains the plant and region without Latin identity or extraction metadata', () => {
  const source = presentSource(eastern)
  assert.equal(source.titleAr, 'نباتات المنطقة الشرقية — موقع نباتات السعودية')
  assert.equal(source.kindLabel, 'قائمة نباتات المنطقة')
  assert.equal(source.actionLabel, 'فتح قائمة النباتات')
  const sentence = presentEvidence(eastern, arak.name)
  assert.match(sentence, /أراكة/)
  assert.match(sentence, /المنطقة الشرقية/)
  assert.doesNotMatch(sentence, /Salvadora|source line|1336|HUMAN|[A-Za-z]/)
})

test('Dhahran uses the explicit publisher locality without its postal or English metadata', () => {
  const item = observation('5908868424')
  const location = presentLocation(item, dhahran, 'الشرقية')
  assert.equal(location.label, 'الظهران')
  assert.match(location.levelLabel, /مذكور في المصدر/)
  assert.match(location.provenanceLabel, /ناشر السجل/)
  assert.equal(location.originalLabel, '34472, الظهران, Eastern Region, SA')
  assert.doesNotMatch(location.label, /34472|Eastern|مدينة|محافظة/)
  assert.equal(item.eventDate, '2025-11-27T15:32:02')
})

test('Qatif and Hafar Al Batin remain derived administrative names, never city claims', () => {
  for (const [id, expected] of [['5109281449', 'القطيف'], ['5109997348', 'حفر الباطن']]) {
    const item = observation(id)
    const location = presentLocation(item, byId(item.recordId), 'الشرقية')
    assert.equal(location.label, expected)
    assert.equal(location.levelLabel, 'محافظة بحسب موقع السجل')
    assert.equal(location.provenanceLabel, 'ربطت قاعدة البيانات السجل بهذا النطاق من موقعه الجغرافي.')
    assert.doesNotMatch(location.provenanceLabel, /GADM|GBIF|رسمي|مدينة/)
    assert.equal(location.originalLabel, item.governorateOriginal)
    assert.doesNotMatch(location.levelLabel, /مدينة/)
  }
  assert.equal(observation('5109281449').pointEligible, false)
  assert.equal(observation('5109281449').latitude, null)
})

test('Nuayriyah is a derived governorate and its automatic identification stays explicit', () => {
  const location = presentLocation(observation('3998612534'), automated, 'الشرقية')
  assert.equal(location.label, 'النعيرية')
  assert.match(location.levelLabel, /محافظة/)
  const source = presentSource(automated)
  assert.equal(source.automated, true)
  assert.equal(source.kindLabel, 'مشاهدة مسجّلة')
  assert.match(source.titleAr, /التحديد الآلي/)
  assert.match(presentEvidence(automated, arak.name), /تحديد آلي/)
  assert.doesNotMatch(presentEvidence(automated, arak.name), /راجعها خبير|[A-Za-z]/)
})

test('human observation, preserved specimen and material citation have distinct actions', () => {
  const specimen = byId('E-OBS-8c0d613208995a1a')
  const citation = {...dhahran, locator: 'MATERIAL_CITATION'}
  assert.equal(presentSource(dhahran).kindLabel, 'مشاهدة مسجّلة')
  assert.equal(presentSource(dhahran).actionLabel, 'عرض سجل المشاهدة')
  assert.equal(presentSource(specimen).kindLabel, 'عينة محفوظة')
  assert.equal(presentSource(specimen).actionLabel, 'عرض سجل العينة')
  assert.match(presentEvidence(specimen, arak.name), /عينة محفوظة/)
  assert.equal(presentSource(citation).kindLabel, 'استشهاد بعينة')
  assert.equal(presentSource(citation).actionLabel, 'عرض سجل الاستشهاد')
  assert.match(presentEvidence(citation, arak.name), /استشهاد بعينة/)
  assert.doesNotMatch(presentEvidence(citation, arak.name), /مشاهدة/)
})

test('machine observation is separate from automatic species identification', () => {
  const record = {...dhahran, sourceId: 'future-machine-source', basisOfRecord: 'MACHINE_OBSERVATION'}
  const result = presentSource(record)
  assert.equal(result.kindLabel, 'رصد آلي')
  assert.equal(result.automated, false)
  assert.match(presentEvidence(record, arak.name), /رصد آلي/)
})

test('official cards describe a cited distribution without declaring the whole map official', () => {
  const record = byId('E-TEXT-778c0ef2ad0c7af8')
  assert.equal(presentSource(record).titleAr, 'بطاقة الأراك — مركز الغطاء النباتي')
  assert.equal(presentSource(record).kindLabel, 'بطاقة من جهة رسمية')
  assert.equal(presentSource(record).actionLabel, 'فتح بطاقة النبات')
  const sentence = presentEvidence(record, arak.name)
  assert.match(sentence, /تذكر بطاقة/)
  assert.match(sentence, /منطقة مكة المكرمة/)
  assert.doesNotMatch(sentence, /مؤكد|معتمد|[A-Za-z]/)
})

test('clear research and book summaries retain their scope and do not manufacture dates', () => {
  const paper = {...eastern, sourceId: 'future-paper', sourceKind: 'research_paper',
    sourceTitle: 'دراسة نباتية', evidence: 'أخذت الدراسة عينات تربة من تجمعين للقرم على ساحل ثول.', year: '2025'}
  assert.equal(presentEvidence(paper, 'مانجروف أبيض'), paper.evidence)
  assert.doesNotMatch(presentEvidence(paper, 'مانجروف أبيض'), /2025|٢٠٢٥/)
  const book = {...paper, sourceKind: 'book', sourceTitle: 'معجم النبات', sourceUrl: '',
    sourceAuthor: 'مؤلف موثق', year: '1990', locator: 'الصفحة ١٢', evidence: 'يذكر المؤلف وجود النبات في أودية هذا الموضع.'}
  assert.equal(presentSource(book).kindLabel, 'كتاب')
  assert.equal(presentSource(book).actionLabel, 'عرض بيانات المرجع')
  assert.equal(presentEvidence(book, 'أراكة'), book.evidence)
})

test('unknown English sources stay available by original title without fake translations', () => {
  const record = {...eastern, sourceId: 'new-source', sourceTitle: 'A newly supplied flora'}
  const presented = presentSource(record)
  assert.equal(presented.titleAr, 'قائمة نباتات المنطقة')
  assert.equal(presented.originalTitle, record.sourceTitle)
  assert.equal(presented.automated, false)
})

test('unknown localities show an honest regional label and retain the unaltered original', () => {
  const original = 'Dar al Kudeimi.'
  const item = {...observation('5908868424'), localityOriginal: original}
  const location = presentLocation(item, dhahran, 'الشرقية')
  assert.equal(location.label, 'موقع رصد ضمن المنطقة الشرقية')
  assert.equal(location.originalLabel, original)
  assert.match(location.levelLabel, /يحتاج مراجعة/)
  assert.doesNotMatch(location.label, /مدينة|قرية/)
})

test('direction and distance descriptions are not collapsed into a nearby city', () => {
  const item = {...observation('5908868424'), regionId: 'SA-02', localityOriginal: '40 km north of Al Lith'}
  const record = {...dhahran, regionId: 'SA-02'}
  assert.notEqual(presentLocation(item, record, 'مكة المكرمة').label, 'الليث')
  const actual = byId('E-OBS-8c0d613208995a1a')
  const known = presentLocation(null, actual, '')
  assert.equal(known.label, 'جنوب الحجاز، ٤٠ كم شمال الليث')
  assert.equal(known.originalLabel, actual.place)
  assert.equal(actual.regionId, null)
})

test('an unlocated Arabic source remains unlocated after presentation', () => {
  const record = byId('E-TEXT-1a1eae07d37704df')
  const before = structuredClone(record)
  assert.equal(presentLocation(null, record, '').label, 'القنفذة')
  assert.equal(record.regionId, null)
  assert.deepEqual(record, before)
})

test('conflicting, unrecognised and not-derived governorate assignments do not invent a label', () => {
  const base = observation('3998612534')
  for (const changes of [
    {governorateOriginal: 'Unknown governorate'},
    {governorateDerived: false},
    {governorateId: 'SAU.7.6_1'},
    {governorateOriginal: 'Al Lith', governorateId: 'SAU.11.6_1'}
  ]) {
    assert.equal(presentLocation({...base, ...changes}, automated, 'الشرقية').label, 'موقع رصد ضمن المنطقة الشرقية')
  }
  const conflicting = {...base, regionId: 'SA-01', governorateOriginal: 'Ash Shimasiyah', governorateId: 'SAU.7.14_1'}
  assert.equal(presentLocation(conflicting, {...automated, regionId: 'SA-01'}, 'الرياض').label, 'موقع رصد ضمن منطقة الرياض')
})

test('derived administrative capitals are not relabelled as city observations', () => {
  const item = {...observation('3998612534'), regionId: 'SA-01', governorateOriginal: 'Riyadh', governorateId: 'SAU.7.20_1'}
  const location = presentLocation(item, {...automated, regionId: 'SA-01'}, 'الرياض')
  assert.equal(location.label, 'الرياض')
  assert.equal(location.levelLabel, 'نطاق إداري بحسب موقع السجل')
  assert.doesNotMatch(location.levelLabel, /مدينة/)
})

test('explicit locality wins over a derived governorate while both originals remain readable', () => {
  const item = {...observation('5908868424'), governorateOriginal: 'Al Khubar', governorateId: 'SAU.8.5_1', governorateDerived: true}
  const result = presentLocation(item, dhahran, 'الشرقية')
  assert.equal(result.label, 'الظهران')
  assert.match(result.provenanceLabel, /ناشر السجل/)
  assert.match(result.originalLabel, /الظهران.*Al Khubar/)
})

test('display normalisation leaves the original locality text intact', () => {
  const original = '  Dhahran Saudi Arabia  '
  const item = {...observation('5908868424'), localityOriginal: original}
  const result = presentLocation(item, dhahran, 'الشرقية')
  assert.equal(result.label, 'الظهران')
  assert.equal(result.originalLabel, original)
})

test('presentation never infers wild or cultivated context and keeps all input identities intact', () => {
  const record = structuredClone(automated)
  const point = structuredClone(observation('3998612534'))
  const originals = structuredClone([record, point])
  const sentence = presentEvidence(record, 'أراكة')
  presentSource(record)
  presentLocation(point, record, 'الشرقية')
  assert.doesNotMatch(sentence, /بري|مزروع|طبيعي|محلي|دخيل/)
  assert.deepEqual([record, point], originals)
})

test('missing values and prototype-like identifiers remain harmless plain presentation text', () => {
  for (const value of [null, undefined, {}]) {
    assert.equal(typeof presentSource(value).titleAr, 'string')
    assert.equal(typeof presentEvidence(value, 'Salvadora persica'), 'string')
    assert.equal(typeof presentLocation(null, value, '').label, 'string')
  }
  const record = {...eastern, sourceId: '__proto__', sourceTitle: 'constructor', regionId: 'constructor', place: 'unknown'}
  assert.equal(typeof presentSource(record).titleAr, 'string')
  assert.equal(typeof presentLocation(null, record, '').label, 'string')
  assert.doesNotMatch(presentEvidence(record, 'Salvadora persica'), /Salvadora|constructor/)
})
