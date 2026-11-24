import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { mountMap } from '../src/map.js'

const regions = JSON.parse(await readFile(new URL('../public/data/regions.v1.json', import.meta.url), 'utf8'))
const overview = [110, 0, 590, 500]
// Synthetic rectangles exercise rendering, not real Saudi geography or sightings.
const testAreas = [
  { id: 'fixture-region', name: 'إقليم الاختبار', level: 'region', path: 'M150 80L500 80L500 420L150 420Z', label: [400, 340] },
  { id: 'fixture-west', name: 'ألف', level: 'governorate', path: 'M180 120L240 120L240 190L180 190Z', label: [210, 155] },
  { id: 'fixture-east', name: 'باء', level: 'governorate', path: 'M270 120L330 120L330 190L270 190Z', label: [300, 155] },
  { id: 'fixture-far', name: 'جيم', level: 'governorate', path: 'M580 300L660 300L660 380L580 380Z', label: [620, 340] },
]

function fixture({ width = 640, callbacks = {}, areas = testAreas, resizeObserver = true } = {}) {
  const dom = new JSDOM('<!doctype html><html lang="ar" dir="rtl"><body><div id="map"></div><div id="other"></div></body></html>', { pretendToBeVisual: true })
  const observers = [], dimensions = { width }
  if (resizeObserver) dom.window.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this) }
    observe(target) { this.target = target }
    disconnect() { this.disconnected = true }
  }
  dom.window.SVGElement.prototype.getBoundingClientRect = function () {
    return { left: 24, top: 72, width: dimensions.width, height: dimensions.width * 500 / 590 }
  }
  const container = dom.window.document.querySelector('#map')
  const map = mountMap(container, areas, callbacks)
  const root = container.querySelector('svg')
  const node = id => root.querySelector(`[data-area="${id}"]`)
  const fire = (target, type, pointerType = 'mouse') => {
    const event = new dom.window.Event(type, { bubbles: false })
    Object.defineProperty(event, 'pointerType', { value: pointerType })
    target.dispatchEvent(event)
  }
  const key = (target, value, repeat = false) => {
    const event = new dom.window.KeyboardEvent('keydown', { key: value, repeat, bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event
  }
  return { dom, map, root, node, key, container, observers, dimensions, fire, close() { map.destroy(); dom.window.close() } }
}

test('administrative paths retain supplied geometry and never render observation pins', () => {
  const areas = [...regions.map(area => ({ ...area, level: 'region' })), ...testAreas.filter(area => area.level === 'governorate')]
  const f = fixture({ areas })
  try {
    f.map.update({ documented: new Set(areas.map(area => area.id)), points: [{ id: 'ignored-legacy-point', latitude: 25, longitude: 40 }] })
    assert.equal(f.root.querySelectorAll('[data-region]').length, 13)
    assert.equal(f.root.querySelectorAll('[data-governorate]').length, 3)
    assert.equal(f.root.querySelectorAll('[data-point], .flora-map-pin, .flora-map-point').length, 0)
    assert.equal(f.root.dataset.mode, 'named-places')
    for (const area of areas) assert.equal(f.node(area.id).getAttribute('d'), area.path)
    assert.match(f.root.querySelector('desc').textContent, /محافظة.*منطقة/)
    assert.match(f.root.querySelector('desc').textContent, /لا يعني انتشار النبات في كامل المساحة/)
  } finally { f.close() }
})

test('governorate evidence and regional fallback differ without making unknown areas interactive', () => {
  const f = fixture()
  try {
    f.map.update({ documented: new Set(['fixture-west', 'fixture-region', 'unrecognised-id']) })
    const county = f.node('fixture-west'), region = f.node('fixture-region'), unknown = f.node('fixture-east')
    assert.equal(county.dataset.level, 'governorate')
    assert.equal(region.dataset.level, 'region')
    assert.match(county.getAttribute('aria-label'), /^محافظة ألف.*عرض المصادر/)
    assert.match(region.getAttribute('aria-label'), /^منطقة إقليم الاختبار.*عرض المصادر/)
    for (const area of [county, region]) {
      assert.equal(area.getAttribute('role'), 'button')
      assert.equal(area.getAttribute('tabindex'), '0')
    }
    assert.match(region.style.fill, /^url\(#flora-regional-evidence-/)
    assert.equal(county.style.fill, '')
    assert.equal(unknown.getAttribute('role'), 'img')
    assert.equal(unknown.getAttribute('tabindex'), '-1')
    assert.equal(unknown.hasAttribute('aria-pressed'), false)
    assert.match(unknown.getAttribute('aria-label'), /لا بيانات معروضة/)
    assert.equal(f.root.querySelectorAll('.flora-map-area.is-documented').length, 2)
  } finally { f.close() }
})

test('coverage changes preserve DOM, geometry and focused controls while removing stale selection', () => {
  const f = fixture()
  try {
    const original = new Map(testAreas.map(area => [area.id, f.node(area.id)])), county = f.node('fixture-west')
    f.map.update({ documented: new Set(['fixture-west', 'fixture-region']) })
    county.focus()
    f.map.update({ selected: 'fixture-west' })
    assert.equal(f.dom.window.document.activeElement, county)
    assert.equal(county.getAttribute('aria-pressed'), 'true')
    f.map.update({ documented: new Set(['fixture-west', 'fixture-east']), selected: 'fixture-east' })
    assert.equal(f.dom.window.document.activeElement, county)
    for (const area of testAreas) {
      assert.equal(f.node(area.id), original.get(area.id))
      assert.equal(f.node(area.id).getAttribute('d'), area.path)
    }
    f.map.update({ documented: new Set(['fixture-region']) })
    assert.equal(county.getAttribute('tabindex'), '-1')
    assert.equal(county.getAttribute('role'), 'img')
    assert.equal(f.root.querySelectorAll('.is-selected, .is-focused, .is-hovered').length, 0)
    assert.equal(f.root.querySelector('.flora-map-outline').classList.contains('is-visible'), false)
  } finally { f.close() }
})

test('mouse, touch and keyboard callbacks preserve area identity and suppress repeated activation', () => {
  const events = [], callbacks = {}
  for (const action of ['Enter', 'Move', 'Leave', 'Focus', 'Select']) callbacks['onPlace' + action] = (id, event) => events.push({ action, id, target: event.currentTarget.dataset.area })
  const f = fixture({ callbacks })
  try {
    f.map.update({ documented: new Set(['fixture-west', 'fixture-region']) })
    for (const id of ['fixture-west', 'fixture-region']) {
      const target = f.node(id)
      f.fire(target, 'pointerenter'); f.fire(target, 'pointermove'); f.fire(target, 'pointerleave')
      target.focus()
      assert.equal(f.key(target, 'Enter').defaultPrevented, true)
      assert.equal(f.key(target, ' ').defaultPrevented, true)
      const count = events.length
      f.key(target, 'Enter', true)
      f.fire(target, 'pointerenter', 'touch'); f.fire(target, 'pointermove', 'touch'); f.fire(target, 'pointerleave', 'touch')
      assert.equal(events.length, count)
      f.fire(target, 'click', 'touch')
      assert.equal(events.length, count + 1)
      for (const action of ['Enter', 'Move', 'Leave', 'Focus', 'Select']) assert.ok(events.some(event => event.action === action && event.id === id && event.target === id))
    }
    const count = events.length
    for (const type of ['pointerenter', 'pointermove', 'pointerleave', 'click', 'focus']) f.fire(f.node('fixture-east'), type)
    f.key(f.node('fixture-east'), 'Enter')
    assert.equal(events.length, count, 'An area without evidence must not open a source card')
  } finally { f.close() }
})

test('arrow keys reach documented neighbours and keep geographic directions in RTL', () => {
  const f = fixture()
  try {
    f.map.update({ documented: new Set(['fixture-west', 'fixture-east']) })
    f.node('fixture-west').focus()
    assert.equal(f.key(f.node('fixture-west'), 'ArrowRight').defaultPrevented, true)
    assert.equal(f.dom.window.document.activeElement, f.node('fixture-east'))
    f.key(f.node('fixture-east'), 'ArrowLeft')
    assert.equal(f.dom.window.document.activeElement, f.node('fixture-west'))
    f.map.update({ documented: new Set(['fixture-west']) })
    assert.equal(f.key(f.node('fixture-west'), 'ArrowRight').defaultPrevented, false)
    assert.equal(f.dom.window.document.activeElement, f.node('fixture-west'))
  } finally { f.close() }
})

test('camera fitting preserves boundaries, clamps zoom and restores the Kingdom overview', () => {
  const views = [], f = fixture({ callbacks: { onViewChange: view => views.push(view) } })
  try {
    f.map.update({ documented: new Set(testAreas.map(area => area.id)) })
    assert.equal(f.map.fitArea('fixture-west'), true)
    assert.ok(f.map.getViewState().zoom > 1)
    assert.equal(f.node('fixture-far').getAttribute('tabindex'), '-1')
    assert.equal(f.map.fitArea('unknown'), false)
    assert.equal(f.map.fitAreas([]), false)
    assert.equal(f.map.fitAreas(['fixture-west', 'fixture-east']), true)
    const [x, y, width, height] = f.map.getViewState().viewBox
    assert.ok(x <= 180 && x + width >= 330 && y <= 120 && y + height >= 190)
    assert.equal(f.map.fitArea('fixture-region'), true)
    for (let index = 0; index < 20; index++) f.map.zoomIn()
    assert.equal(f.map.getViewState().canZoomIn, false)
    assert.equal(f.map.getViewState().zoom, 32)
    for (let index = 0; index < 20; index++) f.map.zoomOut()
    assert.deepEqual(f.map.getViewState().viewBox, overview)
    f.map.fitArea('fixture-east'); f.map.reset()
    assert.deepEqual(f.map.getViewState().viewBox, overview)
    assert.equal(views.at(-1).isOverview, true)
    for (const area of testAreas) assert.equal(f.node(area.id).getAttribute('d'), area.path)
    const wheel = new f.dom.window.WheelEvent('wheel', { deltaY: 100, cancelable: true })
    f.root.dispatchEvent(wheel)
    assert.equal(wheel.defaultPrevented, false, 'The map must not trap document scrolling')
  } finally { f.close() }
})

test('a selected outline remains stable while the pointer crosses another place', () => {
  const f = fixture()
  try {
    f.map.update({ documented: new Set(['fixture-west', 'fixture-east']), selected: 'fixture-west' })
    f.fire(f.node('fixture-east'), 'pointerenter')
    assert.equal(f.root.querySelector('.flora-map-outline-stroke').getAttribute('d'), testAreas[1].path)
    assert.equal(f.node('fixture-west').getAttribute('aria-pressed'), 'true')
    assert.equal(f.node('fixture-east').getAttribute('aria-pressed'), 'false')
    f.fire(f.node('fixture-east'), 'pointerleave')
    assert.equal(f.root.querySelector('.flora-map-outline-stroke').getAttribute('d'), testAreas[1].path)
  } finally { f.close() }
})

test('labels remain readable after resize and reveal local detail after zoom', () => {
  const f = fixture({ width: 280 })
  try {
    f.map.update({ documented: new Set(['fixture-west']) })
    const label = [...f.root.querySelectorAll('.flora-map-label')].find(node => node.textContent === 'ألف')
    const viewFontPixels = () => Number(label.getAttribute('font-size')) * f.dimensions.width / f.map.getViewState().viewBox[2]
    assert.ok(Math.abs(viewFontPixels() - 14) < .001)
    f.map.fitArea('fixture-west')
    assert.equal(label.style.visibility, 'visible')
    assert.ok(Math.abs(viewFontPixels() - 14) < .001)
    f.dimensions.width = 960
    f.observers[0].callback([])
    assert.ok(Math.abs(viewFontPixels() - 14) < .001)
    assert.equal(f.node('fixture-west').getAttribute('d'), testAreas[1].path)
  } finally { f.close() }
})

test('instances keep separate selections and pattern IDs and release events on destroy', () => {
  const events = [], f = fixture({ callbacks: { onPlaceSelect: id => events.push(id) } })
  const other = mountMap(f.dom.window.document.querySelector('#other'), testAreas)
  try {
    f.map.update({ documented: new Set(['fixture-west', 'fixture-region']), selected: 'fixture-west' })
    other.update({ documented: new Set(['fixture-east', 'fixture-region']), selected: 'fixture-east' })
    const otherRoot = f.dom.window.document.querySelector('#other svg')
    assert.notEqual(f.root.querySelector('pattern').id, otherRoot.querySelector('pattern').id)
    assert.equal(f.node('fixture-west').getAttribute('aria-pressed'), 'true')
    assert.equal(otherRoot.querySelector('[data-area="fixture-east"]').getAttribute('aria-pressed'), 'true')
    const oldTarget = f.node('fixture-west')
    f.map.destroy()
    assert.equal(f.container.children.length, 0)
    assert.equal(f.observers[0].disconnected, true)
    f.fire(oldTarget, 'click'); f.key(oldTarget, 'Enter'); f.observers[0].callback([])
    assert.deepEqual(events, [])
    assert.doesNotThrow(() => { f.map.update({ documented: new Set(['fixture-west']) }); f.map.reset(); f.map.destroy() })
    assert.equal(f.map.fitArea('fixture-west'), false)
    assert.ok(otherRoot.isConnected)
    assert.equal(otherRoot.querySelector('[data-area="fixture-east"]').getAttribute('aria-pressed'), 'true')
  } finally { other.destroy(); f.close() }
})

test('window resize listeners are removed when ResizeObserver is unavailable', () => {
  const views = [], f = fixture({ resizeObserver: false, callbacks: { onViewChange: view => views.push(view) } })
  try {
    f.dom.window.dispatchEvent(new f.dom.window.Event('resize'))
    assert.equal(views.length, 1)
    f.map.destroy()
    f.dom.window.dispatchEvent(new f.dom.window.Event('resize'))
    assert.equal(views.length, 1)
  } finally { f.close() }
})

test('invalid or duplicate area identity fails before mounting a misleading map', () => {
  const dom = new JSDOM('<div id="map"></div>')
  try {
    const container = dom.window.document.querySelector('#map')
    for (const areas of [null, [testAreas[0], testAreas[0]], [{ ...testAreas[0], label: [NaN, 20] }], [{ ...testAreas[0], path: null }]]) {
      assert.throws(() => mountMap(container, areas), TypeError)
      assert.equal(container.children.length, 0)
    }
  } finally { dom.window.close() }
})
