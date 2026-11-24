// Exercises the emitted production widget in a DOM, not a browser rendering engine.
// Layout, pointer hit-testing, screenshots and assistive-technology checks require
// separate real-browser verification; these tests are not visual or cross-browser QA.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM, VirtualConsole } from 'jsdom'
import { UPDATE_COLUMNS, STORAGE_KEY, UPDATE_EVENT, validateUpdateRows, mergePatch } from '../src/updates.js'

const ARAK = 'f009a176-94e3-4387-b682-0f416bf31afd'
const JUNIPER = 'c1c50e15-45ff-42ba-8973-3d4a74aa0724'
const TALH = 'c120f1d4-0878-4d01-9757-07422c6b9459'
const HELD = '6574cd14-d824-4862-8a29-2ae880461085'
const script = (await readFile(new URL('../dist/assets/flora-map.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.url', '"https://maps.test/assets/flora-map.js"')
  .replace(/export\{[^}]+\};?\s*$/, '')
const json = async file => JSON.parse(await readFile(new URL('../public/data/' + file, import.meta.url), 'utf8'))
const governorates = await json('governorates.v1.json')
const governorateId = name => {
  const place = governorates.find(place => place.name === name)
  assert.ok(place, 'Expected a published boundary for ' + name)
  return place.id
}
const WAJH = governorateId('الوجه'), UMLUJ = governorateId('أملج'), ALULA = governorateId('العلا')
const pause = () => new Promise(resolve => setTimeout(resolve, 0))

async function fixture({ delays = {}, failures = {} } = {}) {
  const requests = [], errors = []
  const console = new VirtualConsole()
  console.on('jsdomError', error => { if (error.type !== 'css parsing') errors.push(error.message) })
  const dom = new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body></body></html>', {
    url: 'https://maps.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
  })
  const { window } = dom
  window.structuredClone = structuredClone
  window.HTMLElement.prototype.scrollIntoView = function () {}
  window.fetch = async url => {
    const path = new URL(url).pathname.replace('/data/', '')
    requests.push(path)
    if (delays[path]) await delays[path]
    if (failures[path]) return { ok: false, status: failures[path] }
    try { const value = await json(path); return { ok: true, status: 200, json: async () => value } }
    catch { return { ok: false, status: 404 } }
  }
  window.eval(script)
  function mount(uuid, local = false) {
    const map = window.document.createElement('saudi-flora-map')
    if (uuid) map.setAttribute('uuid', uuid)
    if (local) map.setAttribute('local-preview', '')
    window.document.body.append(map)
    return map
  }
  async function ready(map) {
    for (let i = 0; i < 150; i++) {
      await pause()
      if (map.shadowRoot.querySelector('.flora-widget').getAttribute('aria-busy') === 'false') return
    }
    throw Error('Widget did not settle')
  }
  return { dom, window, mount, ready, requests, errors, failures }
}
const root = map => map.shadowRoot
const mapped = map => root(map).querySelectorAll('.flora-map-area.is-documented').length
const area = (map, id) => root(map).querySelector(`[data-area="${id}"]`)
const shortcut = (map, id) => root(map).querySelector(`[data-region-button="${id}"]`)
const sourceLinks = map => [...root(map).querySelectorAll('.source-card a')].map(link => link.href)

test('production widget resolves one UUID into named governorates and regional fallback without pins or bulk data', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    assert.equal(root(map).querySelector('#flora-heading').textContent, 'أراكة')
    assert.ok(mapped(map) > 0)
    assert.ok(area(map, WAJH).classList.contains('is-documented'))
    assert.ok(area(map, 'SA-04').classList.contains('is-documented'))
    assert.equal(root(map).querySelectorAll('[data-point]').length, 0)
    assert.equal(root(map).querySelector('.precision-note, .place-browser, .view-modes'), null)
    assert.equal(map.mapAvailable, true)
    assert.equal(map.getAttribute('data-map-available'), 'true')
    assert.equal(root(map).querySelector('.map-stage').hidden, false)
    assert.deepEqual(f.requests.sort(), ['plants/' + ARAK + '.json', 'spatial/' + ARAK + '.json', 'regions.v1.json', 'governorates.v1.json'].sort())
    root(map).querySelector('[data-region-button="SA-02"]').click()
    assert.equal(root(map).querySelector('.source-card').hidden, false)
    assert.ok([...root(map).querySelectorAll('.source-card a')].some(a => a.href === 'https://ncvc.gov.sa/ar/digitalKnowledge/PlantDiversity/Pages/Salvadora-Persica-L.aspx'))
    assert.ok(!root(map).querySelector('iframe'))
    assert.deepEqual(f.errors, [])
  } finally { f.dom.window.close() }
})

test('a delayed earlier UUID cannot overwrite a more recent plant or retain its sources', async () => {
  let finish
  const delayed = new Promise(resolve => { finish = resolve })
  const f = await fixture({ delays: { ['plants/' + ARAK + '.json']: delayed } })
  try {
    const map = f.mount(ARAK); await pause()
    map.setPlant(JUNIPER); await f.ready(map)
    assert.equal(root(map).querySelector('#flora-heading').textContent, 'العرعر')
    finish(); await pause(); await pause()
    assert.equal(root(map).querySelector('#flora-heading').textContent, 'العرعر')
    assert.ok(!root(map).querySelector('.source-card').textContent.includes('NCVC'))
  } finally { finish(); f.dom.window.close() }
})

test('a delayed earlier locality payload cannot restore the previous plant governorates', async () => {
  let finish
  const delayed = new Promise(resolve => { finish = resolve })
  const f = await fixture({ delays: { ['spatial/' + ARAK + '.json']: delayed } })
  try {
    const map = f.mount(ARAK); await pause()
    map.setPlant(JUNIPER); await f.ready(map)
    assert.equal(root(map).querySelector('#flora-heading').textContent, 'العرعر')
    assert.equal(area(map, WAJH).classList.contains('is-documented'), false)
    finish(); await pause(); await pause()
    assert.equal(root(map).querySelector('#flora-heading').textContent, 'العرعر')
    assert.equal(area(map, WAJH).classList.contains('is-documented'), false)
    assert.equal(shortcut(map, WAJH), null)
  } finally { finish(); f.dom.window.close() }
})

test('missing, invalid and mismatched identifiers never silently select another plant', async () => {
  const f = await fixture()
  try {
    const map = f.mount(); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.match(root(map).querySelector('.map-status').textContent, /اختر نباتًا/)
    map.setPlant('unknown-uuid'); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.equal(root(map).querySelector('.map-status').textContent, 'غير متوفر')
    assert.equal(root(map).querySelector('.map-stage').hidden, true)
    assert.equal(root(map).querySelector('.map-bottom').hidden, true)
    assert.equal(map.mapAvailable, false)
    map.setPlant(ARAK, 'wrong-sense'); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.equal(root(map).querySelector('.map-status').textContent, 'غير متوفر')
    assert.equal(root(map).querySelector('.map-stage').hidden, true)
  } finally { f.dom.window.close() }
})

test('held identities and unresolved text-only geography hide the map without changing the evidence', async () => {
  const f = await fixture()
  try {
    const map = f.mount(HELD); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.equal(root(map).querySelectorAll('.region-chip').length, 0)
    assert.equal(root(map).querySelector('.map-stage').hidden, true)
    assert.equal(root(map).querySelector('.map-bottom').hidden, true)
    assert.equal(root(map).querySelector('.empty-state p').textContent, 'غير متوفر')
    assert.equal(root(map).querySelector('svg.flora-regions-map'), null)
    map.setPlant(TALH); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.equal(root(map).querySelector('.map-stage').hidden, true)
    assert.equal(root(map).querySelector('.empty-state p').textContent, 'غير متوفر')
    assert.ok(map.records.some(record => record.place === 'نجد'))
    assert.equal(map.mapAvailable, false)
  } finally { f.dom.window.close() }
})

test('switching a mapped plant to an unavailable UUID hides the old map during loading and restores the next valid plant', async () => {
  let finish
  const delayed = new Promise(resolve => { finish = resolve })
  const f = await fixture({ delays: { ['plants/' + HELD + '.json']: delayed } })
  try {
    const map = f.mount(ARAK); await f.ready(map)
    const states = []
    map.addEventListener('flora-map:state', event => states.push({ ...event.detail }))
    root(map).querySelector('[data-region-button="SA-04"]').click()
    map.setPlant(HELD); await pause()
    assert.equal(root(map).querySelector('.map-stage').hidden, true)
    assert.equal(root(map).querySelector('.source-card').hidden, true)
    assert.equal(map.mapAvailable, false)
    assert.equal(mapped(map), 0)
    assert.deepEqual(states.at(-1), { uuid: HELD, state: 'loading', mapAvailable: false })
    finish(); await f.ready(map)
    assert.deepEqual(states.at(-1), { uuid: HELD, state: 'empty', mapAvailable: false })
    assert.equal(root(map).querySelector('.empty-state p').textContent, 'غير متوفر')
    map.setPlant(JUNIPER); await f.ready(map)
    assert.ok(mapped(map) > 0)
    assert.equal(area(map, WAJH).classList.contains('is-documented'), false)
    assert.equal(root(map).querySelector('.map-stage').hidden, false)
    assert.equal(root(map).querySelector('.map-bottom').hidden, false)
    assert.equal(root(map).querySelector('.empty-state').hidden, true)
    assert.deepEqual(states.at(-1), { uuid: JUNIPER, state: 'ready', mapAvailable: true })
    assert.deepEqual(f.errors, [])
  } finally { finish(); f.dom.window.close() }
})

test('a known unavailable plant does not become a boundary-load error', async () => {
  const f = await fixture({ failures: { 'regions.v1.json': 404 } })
  try {
    const map = f.mount(HELD); await f.ready(map)
    assert.equal(root(map).querySelector('.empty-state p').textContent, 'غير متوفر')
    assert.equal(root(map).querySelector('.retry').hidden, true)
    assert.equal(map.mapAvailable, false)
  } finally { f.dom.window.close() }
})

test('failed spatial details with no regional fallback remain retryable instead of claiming absence', async () => {
  const f = await fixture({ failures: { ['spatial/' + TALH + '.json']: 500 } })
  try {
    const map = f.mount(TALH); await f.ready(map)
    assert.match(root(map).querySelector('.empty-state p').textContent, /تعذر تحميل/)
    assert.equal(root(map).querySelector('.retry').hidden, false)
    assert.equal(root(map).querySelector('.map-stage').hidden, true)
    assert.equal(map.mapAvailable, false)
  } finally { f.dom.window.close() }
})

test('two components share immutable geometry while their selections and lifecycles remain separate', async () => {
  const f = await fixture()
  try {
    const a = f.mount(ARAK), b = f.mount(JUNIPER)
    await Promise.all([f.ready(a), f.ready(b)])
    root(a).querySelector('[data-region-button="SA-02"]').click()
    assert.equal(root(a).querySelector('.source-card').hidden, false)
    assert.equal(root(b).querySelector('.source-card').hidden, true)
    assert.equal(f.requests.filter(path => path === 'regions.v1.json').length, 1)
    assert.equal(f.requests.filter(path => path === 'governorates.v1.json').length, 1)
    a.remove(); f.window.document.body.append(a); await f.ready(a)
    assert.equal(root(a).querySelectorAll('svg.flora-regions-map').length, 1)
    assert.ok(area(a, WAJH).classList.contains('is-documented'))
    assert.deepEqual(f.errors, [])
  } finally { f.dom.window.close() }
})

test('Al Wajh owns its original observation references and does not borrow evidence from Umluj or the parent region', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    shortcut(map, WAJH).click()
    assert.equal(root(map).querySelector('#source-heading').textContent, 'محافظة الوجه')
    assert.match(root(map).querySelector('.location-level').textContent, /تبوك/)
    assert.ok(sourceLinks(map).includes('https://www.gbif.org/occurrence/5087136007'))
    assert.ok(sourceLinks(map).includes('https://www.gbif.org/occurrence/5062783847'))
    assert.ok(!sourceLinks(map).includes('https://www.gbif.org/occurrence/5844154136'))
    assert.equal(area(map, UMLUJ).classList.contains('is-documented'), false)
    assert.doesNotMatch(root(map).querySelector('.source-card').textContent, /GADM|هامش|رقم السجل|ترخيص بيانات|أملج/)
    const details = root(map).querySelector('.citation-details')
    assert.ok(details)
    details.open = true
    details.dispatchEvent(new f.window.Event('toggle'))
    assert.equal(map.pinned, true)
    root(map).querySelector('.card-close').dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    assert.equal(root(map).querySelector('.source-card').hidden, true)
    assert.equal(root(map).activeElement, shortcut(map, WAJH))
    shortcut(map, 'SA-07').click()
    assert.ok(!sourceLinks(map).includes('https://www.gbif.org/occurrence/5087136007'))
  } finally { f.dom.window.close() }
})

test('missing boundary assets expose a data retry instead of claiming the UUID is unknown', async () => {
  const f = await fixture({ failures: { 'regions.v1.json': 404 } })
  try {
    const map = f.mount(ARAK); await f.ready(map)
    assert.match(root(map).querySelector('.map-status').textContent, /تعذر تحميل/)
    assert.equal(root(map).querySelector('.retry').hidden, false)
    assert.doesNotMatch(root(map).querySelector('.map-status').textContent, /لم نعثر/)
  } finally { f.dom.window.close() }
})

test('missing or conflicting governorate boundary responses remain retryable and recover the same UUID', async () => {
  for (const status of [404, 409]) {
    const f = await fixture({ failures: { 'governorates.v1.json': status } })
    try {
      const map = f.mount(ARAK); await f.ready(map)
      assert.match(root(map).querySelector('.map-status').textContent, /تعذر تحميل/)
      assert.equal(root(map).querySelector('.retry').hidden, false)
      assert.equal(map.mapAvailable, false)
      delete f.failures['governorates.v1.json']
      root(map).querySelector('.retry').click(); await f.ready(map)
      assert.equal(map.uuid, ARAK)
      assert.equal(map.mapAvailable, true)
      assert.ok(area(map, WAJH).classList.contains('is-documented'))
      assert.equal(f.requests.filter(path => path === 'governorates.v1.json').length, 2)
      assert.deepEqual(f.errors, [])
    } finally { f.dom.window.close() }
  }
})

test('a failed plant request retries while a missing plant remains unavailable without borrowing another UUID', async () => {
  for (const status of [404, 409]) {
    const path = 'plants/' + ARAK + '.json'
    const f = await fixture({ failures: { [path]: status } })
    try {
      const map = f.mount(ARAK); await f.ready(map)
      assert.equal(map.mapAvailable, false)
      assert.equal(mapped(map), 0)
      if (status === 404) {
        assert.equal(root(map).querySelector('.map-status').textContent, 'غير متوفر')
        assert.equal(root(map).querySelector('.retry').hidden, true)
      } else {
        assert.equal(root(map).querySelector('.retry').hidden, false)
        delete f.failures[path]
        root(map).querySelector('.retry').click(); await f.ready(map)
        assert.equal(map.uuid, ARAK)
        assert.equal(map.mapAvailable, true)
        assert.ok(area(map, WAJH).classList.contains('is-documented'))
      }
    } finally { f.dom.window.close() }
  }
})

const pointer = (f, node, type, x = 200, y = 200) => node.dispatchEvent(new f.window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }))
const hoverWait = () => new Promise(resolve => setTimeout(resolve, 175))

test('hover source links stay stable while focused, and Escape from the document remains dismissed until re-entry', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    const eastern = root(map).querySelector('[data-region="SA-04"]')
    const riyadh = root(map).querySelector('[data-region="SA-01"]')
    pointer(f, eastern, 'pointerenter'); await hoverWait()
    const link = root(map).querySelector('.primary-source-link')
    const href = link.href
    link.focus()
    pointer(f, riyadh, 'pointerenter'); pointer(f, riyadh, 'pointermove'); await hoverWait()
    assert.match(root(map).querySelector('#source-heading').textContent, /الشرقية$/)
    assert.equal(root(map).querySelector('.primary-source-link'), link)
    assert.equal(link.href, href)
    f.window.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(root(map).querySelector('.source-card').hidden, true)
    pointer(f, eastern, 'pointermove'); await hoverWait()
    assert.equal(root(map).querySelector('.source-card').hidden, true)
    pointer(f, eastern, 'pointerleave'); pointer(f, eastern, 'pointerenter'); await hoverWait()
    assert.equal(root(map).querySelector('.source-card').hidden, false)
  } finally { f.dom.window.close() }
})

test('a governorate source card works through keyboard activation and returns focus to its boundary', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    const target = area(map, WAJH)
    target.focus()
    assert.equal(root(map).querySelector('.source-card').hidden, false)
    assert.equal(root(map).querySelector('#source-heading').textContent, 'محافظة الوجه')
    target.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    assert.equal(root(map).activeElement, root(map).querySelector('.card-close'))
    const link = root(map).querySelector('.primary-source-link')
    link.focus()
    assert.equal(link.target, '_blank')
    assert.match(link.rel, /noopener/)
    assert.match(link.getAttribute('aria-label'), /نافذة جديدة/)
    f.window.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert.equal(root(map).querySelector('.source-card').hidden, true)
    assert.equal(root(map).activeElement, target)
  } finally { f.dom.window.close() }
})

test('a named locality without a supported governorate falls back to the published region and keeps its source', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    shortcut(map, 'SA-04').click()
    assert.match(root(map).querySelector('#source-heading').textContent, /الشرقية$/)
    assert.match(root(map).querySelector('.location-context').textContent, /دون تحديد المحافظة/)
    assert.ok(sourceLinks(map).includes('https://www.gbif.org/occurrence/5908868424'))
    assert.match(area(map, 'SA-04').style.fill, /^url\(#/)
    assert.equal(root(map).querySelectorAll('[data-point]').length, 0)
    assert.equal(root(map).querySelector('.source-card .precision-note'), null)
    assert.equal(root(map).querySelectorAll('.source-card a[href*="creativecommons"]').length, 0)
    assert.ok([...root(map).querySelectorAll('.source-rights a')].some(link => link.href === 'https://creativecommons.org/licenses/by-nc/4.0/legalcode'))
  } finally { f.dom.window.close() }
})

test('zooming a named governorate retains its source card and resets to the Kingdom without introducing pins', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    shortcut(map, WAJH).click()
    const outline = area(map, WAJH).getAttribute('d')
    root(map).querySelector('.zoom-place').click()
    assert.ok(map.map.getViewState().zoom > 1)
    assert.equal(root(map).querySelector('.source-card').hidden, false)
    assert.equal(root(map).querySelector('#source-heading').textContent, 'محافظة الوجه')
    assert.equal(area(map, WAJH).getAttribute('d'), outline)
    root(map).querySelector('.fit-places').click()
    assert.equal(root(map).querySelector('.source-card').hidden, true)
    root(map).querySelector('.reset-map').click()
    assert.equal(map.map.getViewState().isOverview, true)
    assert.equal(root(map).querySelectorAll('[data-point]').length, 0)
  } finally { f.dom.window.close() }
})

test('missing spatial files fall back to cited regions without inventing points', async () => {
  const f = await fixture({ failures: { ['spatial/' + ARAK + '.json']: 404 } })
  try {
    const map = f.mount(ARAK); await f.ready(map)
    assert.ok(map.mapAvailable)
    assert.ok(area(map, 'SA-04').classList.contains('is-documented'))
    assert.ok(area(map, ALULA).classList.contains('is-documented'))
    assert.equal(area(map, WAJH).classList.contains('is-documented'), false)
    assert.equal(area(map, UMLUJ).classList.contains('is-documented'), false)
    assert.equal(root(map).querySelectorAll('[data-point]').length, 0)
    assert.equal(root(map).querySelector('.detail-notice').hidden, true)
  } finally { f.dom.window.close() }
})

test('reviewed book evidence is readable first with its page, while original regional sources remain available', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    shortcut(map, ALULA).click()
    assert.equal(root(map).querySelector('#source-heading').textContent, 'محافظة العلا')
    const first = root(map).querySelector('.source-entry')
    assert.equal(first.hidden, false)
    assert.equal(first.querySelector('.source-kind').textContent, 'كتاب')
    assert.match(first.querySelector('.source-title').textContent, /نباتات العلا/)
    assert.match([...first.querySelectorAll('.source-locator')].map(node => node.textContent).join(' '), /ص 22/)
    assert.match(first.querySelector('.evidence-summary').textContent, /العلا/)
    assert.doesNotMatch(first.querySelector('.evidence-summary').textContent, /[A-Za-z]/)
    assert.match(first.querySelector('.primary-source-link').href, /^https:\/\/www\.rcu\.gov\.sa\//)
    assert.equal(root(map).querySelector('.more-sources').hidden, false)
    root(map).querySelector('.more-sources').click()
    assert.ok([...root(map).querySelectorAll('.source-entry')].some(entry => !entry.hidden && entry.querySelector('.source-kind').textContent !== 'كتاب'))
    assert.equal(root(map).querySelectorAll('[data-point]').length, 0)
  } finally { f.dom.window.close() }
})

test('a reviewed Excel name change updates only the opted-in map and clearing it restores original source names', async () => {
  // This is an import-contract fixture, not an editorial correction to real data.
  const original = await json('plants/' + ARAK + '.json')
  const record = original.records.find(record => record.id === 'E-OBS-783364b9aebdadb8')
  assert.ok(record)
  const row = { uuid: ARAK, scientificName: original.scientificName, recordId: record.id,
    action: 'upsert', regionId: record.regionId, place: 'أملج', sourceKind: record.sourceKind,
    sourceTitle: record.sourceTitle, sourceUrl: record.sourceUrl, sourceAuthor: record.sourceAuthor || '',
    sourceYear: record.year || '', sourceEdition: record.sourceEdition || '', locator: record.locator,
    evidence: record.evidence, reviewStatus: 'verified' }
  const now = '2026-11-24T08:00:00Z'
  const result = validateUpdateRows([UPDATE_COLUMNS, UPDATE_COLUMNS.map(column => row[column] ?? '')],
    { plants: [original] }, new Map([[ARAK, original]]), { fileName: 'name-review-test.xlsx', now })
  assert.deepEqual(result.errors, [])
  assert.equal(result.changes[0].record.provenance.placeNameReviewed, true)
  const patch = mergePatch(null, result.changes, original.version, now)
  const f = await fixture()
  try {
    f.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(patch))
    const local = f.mount(ARAK, true), embedded = f.mount(ARAK)
    await Promise.all([f.ready(local), f.ready(embedded)])
    assert.ok(area(local, UMLUJ).classList.contains('is-documented'))
    assert.equal(area(local, WAJH).classList.contains('is-documented'), false)
    assert.equal(root(local).querySelector('.local-notice').hidden, false)
    assert.ok(area(embedded, WAJH).classList.contains('is-documented'))
    assert.equal(area(embedded, UMLUJ).classList.contains('is-documented'), false)
    shortcut(local, UMLUJ).click()
    assert.ok(sourceLinks(local).includes('https://www.gbif.org/occurrence/5087136007'))
    f.window.localStorage.removeItem(STORAGE_KEY)
    f.window.dispatchEvent(new f.window.CustomEvent(UPDATE_EVENT, { detail: { uuids: [ARAK] } }))
    await f.ready(local)
    assert.ok(area(local, WAJH).classList.contains('is-documented'))
    assert.equal(area(local, UMLUJ).classList.contains('is-documented'), false)
    assert.equal(root(local).querySelector('.source-card').hidden, true)
    f.window.localStorage.setItem(STORAGE_KEY, '{broken')
    f.window.dispatchEvent(new f.window.CustomEvent(UPDATE_EVENT, { detail: { uuids: [ARAK] } }))
    await f.ready(local)
    assert.match(root(local).querySelector('.local-notice').textContent, /تعذر تطبيق/)
    assert.ok(area(local, WAJH).classList.contains('is-documented'))
    assert.deepEqual(f.errors, [])
  } finally { f.dom.window.close() }
})
