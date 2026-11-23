// Exercises the emitted production widget in a DOM, not a browser rendering engine.
// Layout, pointer hit-testing, screenshots and assistive-technology checks remain
// in the Playwright suite; these tests must not be reported as visual QA.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { JSDOM, VirtualConsole } from 'jsdom'

const ARAK = 'f009a176-94e3-4387-b682-0f416bf31afd'
const JUNIPER = 'c1c50e15-45ff-42ba-8973-3d4a74aa0724'
const TALH = 'c120f1d4-0878-4d01-9757-07422c6b9459'
const HELD = '6574cd14-d824-4862-8a29-2ae880461085'
const script = (await readFile(new URL('../dist/assets/flora-map.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.url', '"https://maps.test/assets/flora-map.js"')
  .replace(/export\{[^}]+\};?\s*$/, '')
const json = async file => JSON.parse(await readFile(new URL('../public/data/' + file, import.meta.url), 'utf8'))
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
  return { dom, window, mount, ready, requests, errors }
}
const root = map => map.shadowRoot
const mapped = map => root(map).querySelectorAll('.flora-map-region.is-documented').length

test('production widget resolves one original UUID and exposes its real regional sources', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    assert.equal(root(map).querySelector('#flora-heading').textContent, 'أراكة')
    assert.equal(mapped(map), 8)
    assert.deepEqual(f.requests.sort(), ['plants/' + ARAK + '.json', 'regions.v1.json'].sort())
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

test('missing, invalid and mismatched identifiers never silently select another plant', async () => {
  const f = await fixture()
  try {
    const map = f.mount(); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.match(root(map).querySelector('.map-status').textContent, /اختر نباتًا/)
    map.setPlant('unknown-uuid'); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.match(root(map).querySelector('.map-status').textContent, /UUID/)
    map.setPlant(ARAK, 'wrong-sense'); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.match(root(map).querySelector('.map-status').textContent, /المعنى لا يطابق/)
  } finally { f.dom.window.close() }
})

test('held identities stay neutral and Najd is textual evidence without invented regions', async () => {
  const f = await fixture()
  try {
    const map = f.mount(HELD); await f.ready(map)
    assert.equal(mapped(map), 0)
    assert.equal(root(map).querySelectorAll('.region-chip').length, 0)
    map.setPlant(TALH); await f.ready(map)
    assert.equal(mapped(map), 0)
    root(map).querySelector('[data-region-button="unlocated"]').click()
    assert.match(root(map).querySelector('.source-list').textContent, /نجد/)
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
    a.remove(); f.window.document.body.append(a); await f.ready(a)
    assert.equal(root(a).querySelectorAll('svg.flora-regions-map').length, 1)
    assert.equal(mapped(a), 8)
    assert.deepEqual(f.errors, [])
  } finally { f.dom.window.close() }
})

test('source years remain attached to individual observations and Escape closes a pinned card', async () => {
  const f = await fixture()
  try {
    const map = f.mount(ARAK); await f.ready(map)
    root(map).querySelector('[data-region-button="SA-07"]').click()
    const text = root(map).querySelector('.source-list').textContent
    assert.match(text, /سنة أو سنوات الرصد: 2024/)
    assert.match(text, /سنة أو سنوات الرصد: 2025/)
    root(map).querySelector('.card-close').dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    assert.equal(root(map).querySelector('.source-card').hidden, true)
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
