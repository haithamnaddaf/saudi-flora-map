import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const load = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const catalog = await load('public/data/catalog.v2.json')
const regions = await load('public/data/regions.v1.json')
const report = await load('docs/data-build-report.json')
const plants = await Promise.all(catalog.plants.map(plant => load(`public/data/plants/${plant.uuid}.json`)))
const byId = new Map(plants.map(plant => [plant.uuid, plant]))
const regionIds = new Set(regions.map(region => region.id))
const safeUrl = value => {
  const url = new URL(value)
  assert.ok(['https:', 'http:'].includes(url.protocol))
  assert.equal(url.username, '')
  assert.equal(url.password, '')
}

test('research assets preserve every backend UUID and sense without name-based lookup', () => {
  assert.equal(catalog.schemaVersion, 2)
  assert.equal(catalog.country, 'SA')
  assert.equal(catalog.plants.length, 1482)
  assert.equal(byId.size, 1482)
  for (const listed of catalog.plants) {
    assert.match(listed.uuid, /^[a-f0-9-]{36}$/)
    const actual = byId.get(listed.uuid)
    for (const key of ['uuid', 'senseId', 'name', 'scientificName', 'status', 'statusLabel']) {
      assert.equal(actual[key], listed[key])
    }
    assert.equal(actual.version, catalog.version)
    assert.equal(actual.schemaVersion, 2)
    assert.deepEqual(listed.regionIds, [...new Set(actual.records.map(record => record.regionId).filter(Boolean))].sort())
  }
})

test('identity, taxonomic, cultivar and geographic holds have no public evidence', () => {
  const withheld = plants.filter(plant => plant.status !== 'documented_for_supplied_taxon')
  assert.equal(withheld.length, 635)
  for (const plant of withheld) {
    assert.deepEqual(plant.records, [])
    assert.ok(plant.statusLabel)
  }
  // Real original identities with known conflicts must never inherit another taxon.
  assert.equal(byId.get('3791f886-295b-4fe5-aa08-fee2c80cfd09').status, 'identity_review_required')
  assert.equal(byId.get('6574cd14-d824-4862-8a29-2ae880461085').status, 'identity_review_required')
})

test('Najd evidence remains unmapped, while cited Farasan containment maps to Jazan', () => {
  const talh = byId.get('c120f1d4-0878-4d01-9757-07422c6b9459')
  assert.ok(talh.records.length)
  assert.ok(talh.records.every(record => record.regionId === null))
  assert.ok(talh.records.some(record => record.place === 'نجد'))
  const arak = byId.get('f009a176-94e3-4387-b682-0f416bf31afd')
  const farasan = arak.records.find(record => record.id === 'E-TEXT-3ac0c79093ae8e79')
  assert.equal(farasan.regionId, 'SA-09')
  assert.equal(farasan.place, 'جزر فرسان')
})

test('every rendered evidence record has a cited source and only known region IDs', () => {
  for (const plant of plants) {
    const ids = new Set()
    for (const record of plant.records) {
      assert.ok(!ids.has(record.id), `duplicate evidence ${plant.uuid}/${record.id}`)
      ids.add(record.id)
      assert.ok(record.regionId === null || regionIds.has(record.regionId))
      for (const key of ['place', 'sourceId', 'sourceTitle', 'locator', 'evidence', 'sourceScientificName']) {
        assert.equal(typeof record[key], 'string')
        assert.ok(record[key].length)
      }
      assert.equal(record.status, 'verified')
      assert.notEqual(record.sourceKind, 'regional_aggregate_candidate')
      safeUrl(record.sourceUrl)
      assert.ok(record.accessedOn === '' || /^\d{4}-\d{2}-\d{2}$/.test(record.accessedOn))
      if (record.year !== undefined) assert.equal(typeof record.year, 'string')
      assert.equal(record.geometry, undefined)
      assert.equal(record.coordinates, undefined)
      assert.equal(record.latitude, undefined)
      assert.equal(record.longitude, undefined)
    }
  }
})

test('GBIF links lead to actual records, with no duplicate occurrence per plant', () => {
  for (const plant of plants) {
    const occurrences = new Set()
    for (const record of plant.records.filter(record => record.sourceKind === 'occurrence_records')) {
      assert.ok(record.recordUrls.length)
      assert.equal(record.sourceUrl, record.recordUrls[0])
      for (const url of record.recordUrls) {
        assert.match(url, /^https:\/\/www\.gbif\.org\/occurrence\/\d+$/)
        assert.ok(!occurrences.has(url), `duplicate occurrence ${plant.uuid}/${url}`)
        occurrences.add(url)
      }
    }
  }
})

test('the existing six paper citations survive only on their unique scientific identities', () => {
  const preserved = plants.flatMap(plant => plant.records.filter(record => record.provenance === 'prototype-v1')
    .map(record => ({plant, record})))
  assert.equal(preserved.length, 6)
  const juniper = preserved.filter(({plant}) => plant.uuid === 'c1c50e15-45ff-42ba-8973-3d4a74aa0724')
  const mangrove = preserved.filter(({plant}) => plant.uuid === 'bcd2ef39-7f1c-457d-8aa2-ce422c96f17d')
  assert.equal(juniper.length, 4)
  assert.equal(mangrove.length, 2)
  assert.equal(mangrove[0].plant.name, 'مانجروف أبيض')
  assert.equal(new Set(preserved.map(({record}) => record.sourceId)).size, 3)
  for (const {plant, record} of preserved) {
    assert.match(record.id, /^v1-[a-f0-9]{16}$/)
    assert.equal(record.sourceScientificName, plant.scientificName)
    assert.equal(record.accessedOn, '') // v1 did not preserve an access date.
  }
})

test('all UUID files are lightweight and expose no private enrichment fields', async () => {
  const filenames = await readdir(new URL('public/data/plants/', root))
  assert.equal(filenames.filter(name => name.endsWith('.json')).length, catalog.plants.length)
  let largest = 0
  for (const plant of plants) {
    const content = await readFile(new URL(`public/data/plants/${plant.uuid}.json`, root))
    largest = Math.max(largest, content.length)
    assert.doesNotMatch(content.toString(), /"(?:enricherName|enricherEmail|email|phone|password)"\s*:/i)
  }
  assert.equal(largest, report.sizesBytes.largestPlant)
  assert.ok(largest < 100_000, 'a plant detail asset should remain below 100 kB')
  assert.equal(report.counts.entriesWithMappedRegions, 780)
  assert.equal(report.counts.entriesWithRecords, 847)
})

// Exercise the compiler gates with adversarial fixtures, so output checks alone
// cannot conceal a future accidental widening of the publication rules.
const fixture = () => {
  const place = {place_id: 'region-SA-01', display_name: 'منطقة الرياض', name_ar: 'منطقة الرياض',
    place_type: 'administrative_region', country_code: 'SA', parent_place_id: 'SA'}
  const evidence = {evidence_id: 'test-evidence', source_id: 'test-source', source_url: 'https://example.org/source',
    place_id: place.place_id, map_evidence_usable: true, source_taxonomy_usable: true,
    evidence_kind: 'regional_checklist', source_section: 'Section 1', evidence_summary_ar: 'ملخص اختباري',
    source_scientific_name: 'Example species', occurrence_ids: []}
  return {research_date: '2026-11-23', places: [
    {place_id: 'SA', display_name: 'السعودية', name_ar: 'السعودية', place_type: 'country', country_code: 'SA'},
    ...regions.map(region => ({...place, place_id: `region-${region.id}`, display_name: region.name, name_ar: region.name})),
  ], evidence: [evidence], sources: [{source_id: 'test-source', title: 'Test reference', accessed_on: '2026-11-23'}], occurrences: [],
  entries: [{entry_id: '11111111-1111-4111-8111-111111111111', sense_id: 'test-sense', lemma_ar: 'اختبار', scientific_name_original: 'Example species',
    distribution: {status: 'documented_for_supplied_taxon', status_ar: 'حالة اختبارية', public_display_allowed_under_current_rules: true,
      display_place_ids: [place.place_id], evidence_links: [{evidence_id: evidence.evidence_id, display_eligible: true, taxonomy_link_usable: true}]}}]}
}

const compileFixture = data => {
  const script = `import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('builder',sys.argv[1])\nm=importlib.util.module_from_spec(s)\ns.loader.exec_module(m)\na=json.load(sys.stdin)\nprint(json.dumps(m.build_release(a['data'],a['regions'])))`
  const result = spawnSync('python3', ['-c', script, fileURLToPath(new URL('scripts/build-research.py', root))], {
    input: JSON.stringify({data, regions}), encoding: 'utf8', maxBuffer: 2_000_000,
  })
  return result
}

test('compiler independently enforces publication, place, country and evidence gates', () => {
  const mutations = [
    data => { data.entries[0].distribution.public_display_allowed_under_current_rules = false },
    data => { data.entries[0].distribution.display_place_ids = [] },
    data => { data.entries[0].distribution.evidence_links[0].display_eligible = false },
    data => { data.entries[0].distribution.evidence_links[0].taxonomy_link_usable = false },
    data => { data.evidence[0].map_evidence_usable = false },
    data => { data.evidence[0].source_taxonomy_usable = false },
    data => { data.evidence[0].evidence_kind = 'regional_aggregate_candidate' },
    data => { data.evidence[0].place_id = 'SA'; data.entries[0].distribution.display_place_ids = ['SA'] },
  ]
  const valid = compileFixture(fixture())
  assert.equal(valid.status, 0, valid.stderr)
  assert.equal(Object.values(JSON.parse(valid.stdout)[1])[0].records.length, 1)
  for (const mutate of mutations) {
    const data = fixture()
    mutate(data)
    const result = compileFixture(data)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(Object.values(JSON.parse(result.stdout)[1])[0].records, [])
  }
})

test('compiler refuses fabricated access links, duplicate UUIDs and contradictory identity flags', () => {
  for (const mutate of [
    data => { data.evidence[0].source_url = 'javascript:alert(1)' },
    data => { data.evidence[0].source_url = 'https://user:secret@example.org' },
    data => { data.entries.push(structuredClone(data.entries[0])) },
    data => { data.entries[0].distribution.status = 'identity_review_required' },
  ]) {
    const data = fixture()
    mutate(data)
    assert.notEqual(compileFixture(data).status, 0)
  }
})

test('an uncited parent does not turn a named place into a map region', () => {
  const data = fixture()
  data.places.push({place_id: 'named-place', display_name: 'موضع نصي', place_type: 'locality',
    country_code: 'SA', parent_place_id: 'region-SA-01'})
  data.evidence[0].place_id = 'named-place'
  data.entries[0].distribution.display_place_ids = ['named-place']
  const result = compileFixture(data)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(Object.values(JSON.parse(result.stdout)[1])[0].records[0].regionId, null)
})
