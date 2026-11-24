import { presentAreaName } from './presentation.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const OVERVIEW = [110, 0, 590, 500]
const MAX_ZOOM = 32
const LABEL_POSITIONS = { 'SA-09': [343.2, 453.7], 'SA-11': [313, 368] }
let instance = 0

// Administrative drawing geometry only. Observation coordinates are never read.
export function projectCoordinates(longitude, latitude) {
  return [130 + (longitude - 34.5) * 26, 10 + (32.5 - latitude) * 29]
}
function svg(document, tag, attributes = {}, text) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  if (text !== undefined) node.textContent = text
  return node
}
function pathBounds(path) {
  const numbers = path.match(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi)?.map(Number) || []
  const xs = numbers.filter((_, index) => index % 2 === 0), ys = numbers.filter((_, index) => index % 2 === 1)
  return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null
}
const intersects = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]

/** A single map of named administrative areas; the host owns evidence and cards. */
export function mountMap(container, areas, callbacks = {}) {
  if (!container?.ownerDocument || !Array.isArray(areas)) throw new TypeError('A DOM container and administrative areas are required')
  const ids = new Set()
  for (const area of areas) {
    if (!area?.id || ids.has(area.id) || typeof area.path !== 'string' || !Array.isArray(area.label) || area.label.length !== 2 || !area.label.every(Number.isFinite)) {
      throw new TypeError('Each administrative area requires a unique id, boundary and label anchor')
    }
    ids.add(area.id)
  }
  const document = container.ownerDocument, window = document.defaultView
  const patternId = 'flora-regional-evidence-' + ++instance
  const map = svg(document, 'svg', {
    class: 'flora-regions-map', viewBox: OVERVIEW.join(' '), preserveAspectRatio: 'xMidYMid meet',
    role: 'group', 'aria-label': 'الأماكن المذكورة للنبات في المملكة العربية السعودية',
    lang: 'ar', dir: 'rtl', focusable: 'false', 'data-mode': 'named-places',
  })
  const description = svg(document, 'desc', {}, 'التظليل المصمت لمحافظة مذكورة في المصدر، والمخطط لمنطقة لم يحدد مصدرها محافظة. اختر مكانًا لفتح مصادره. التظليل لا يعني انتشار النبات في كامل المساحة.')
  const definitions = svg(document, 'defs')
  const pattern = svg(document, 'pattern', { id: patternId, width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' })
  pattern.append(svg(document, 'rect', { width: 8, height: 8, class: 'flora-pattern-background' }), svg(document, 'path', { d: 'M0 0V8', class: 'flora-pattern-line' }))
  definitions.append(pattern)
  const regions = svg(document, 'g', { class: 'flora-map-geography' })
  const governorates = svg(document, 'g', { class: 'flora-map-governorates' })
  const outline = svg(document, 'g', { class: 'flora-map-outline', 'aria-hidden': 'true' })
  const halo = svg(document, 'path', { class: 'flora-map-outline-halo', 'fill-rule': 'evenodd' })
  const stroke = svg(document, 'path', { class: 'flora-map-outline-stroke', 'fill-rule': 'evenodd' })
  const labels = svg(document, 'g', { class: 'flora-map-labels', 'aria-hidden': 'true' })
  outline.append(halo, stroke)
  map.append(description, definitions, regions, governorates, outline, labels)
  const listeners = [], widths = new Map()
  let documented = new Set(), selected = null, hovered = null, focused = null, destroyed = false, view = [...OVERVIEW]
  const viewport = () => [view[0], view[1], view[0] + view[2], view[1] + view[3]]
  const visible = (x, y) => x >= view[0] && x <= view[0] + view[2] && y >= view[1] && y <= view[1] + view[3]
  const token = (name, fallback) => parseFloat(window.getComputedStyle(map).getPropertyValue(name)) || fallback
  function listen(node, type, handler) { node.addEventListener(type, handler); listeners.push(() => node.removeEventListener(type, handler)) }
  function notify(action, id, event) { if (!destroyed && documented.has(id)) callbacks['onPlace' + action]?.(id, event) }
  const nodes = new Map(areas.map(area => {
    const level = area.level === 'governorate' ? 'governorate' : 'region'
    const path = svg(document, 'path', { class: 'flora-map-area flora-map-' + level, 'data-area': area.id, 'data-level': level, d: area.path, 'fill-rule': 'evenodd', role: 'img', tabindex: '-1' })
    path.setAttribute(level === 'region' ? 'data-region' : 'data-governorate', area.id)
    const [x, y] = (level === 'region' && LABEL_POSITIONS[area.id]) || area.label
    const label = svg(document, 'text', { class: 'flora-map-label', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, area.name)
    ;(level === 'region' ? regions : governorates).append(path)
    labels.append(label)
    const entry = { area, level, path, label, x, y, bounds: pathBounds(area.path) }
    listen(path, 'pointerenter', event => {
      if (!documented.has(area.id) || event.pointerType === 'touch') return
      hovered = area.id; path.classList.add('is-hovered'); refreshOutline(); notify('Enter', area.id, event)
    })
    listen(path, 'pointermove', event => { if (event.pointerType !== 'touch') notify('Move', area.id, event) })
    listen(path, 'pointerleave', event => {
      if (event.pointerType === 'touch') return
      if (hovered === area.id) hovered = null
      path.classList.remove('is-hovered'); refreshOutline(); notify('Leave', area.id, event)
    })
    listen(path, 'click', event => notify('Select', area.id, event))
    listen(path, 'focus', event => {
      if (!documented.has(area.id)) return
      focused = area.id; path.classList.add('is-focused'); refreshOutline(); notify('Focus', area.id, event)
    })
    listen(path, 'blur', event => {
      if (focused === area.id) focused = null
      path.classList.remove('is-focused'); refreshOutline(); notify('Leave', area.id, event)
    })
    listen(path, 'keydown', event => {
      if (!documented.has(area.id)) return
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault(); if (!event.repeat) notify('Select', area.id, event)
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key), direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1
        const next = [...nodes.values()].filter(other => other !== entry && documented.has(other.area.id) && visible(other.x, other.y) && (horizontal ? other.x - x : other.y - y) * direction > 0)
          .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]
        if (next) { event.preventDefault(); next.path.focus() }
      }
    })
    return [area.id, entry]
  }))
  function refreshOutline() {
    const entry = nodes.get(focused || selected || hovered), show = entry && documented.has(entry.area.id)
    outline.classList.toggle('is-visible', Boolean(show))
    if (show) { halo.setAttribute('d', entry.area.path); stroke.setAttribute('d', entry.area.path) }
  }
  function scale() {
    const matrix = map.getScreenCTM?.()
    if (matrix && Math.hypot(matrix.a, matrix.b) > 0) return Math.hypot(matrix.a, matrix.b)
    const rect = map.getBoundingClientRect()
    return rect.width && rect.height ? Math.min(rect.width / view[2], rect.height / view[3]) : 1
  }
  function layout() {
    if (destroyed) return
    const ratio = scale(), fontPixels = token('--uds-text-sm-size', 14), font = fontPixels / ratio
    const gap = token('--uds-space-xs', 4) / ratio, bounds = viewport(), zoom = OVERVIEW[2] / view[2]
    const candidates = [], occupied = []
    map.classList.toggle('is-zoomed', zoom > 1.001)
    for (const [id, entry] of nodes) {
      entry.path.setAttribute('tabindex', documented.has(id) && (!entry.bounds || intersects(entry.bounds, bounds)) ? '0' : '-1')
      entry.label.style.visibility = 'hidden'; entry.label.setAttribute('font-size', font)
      if (!visible(entry.x, entry.y)) continue
      const active = id === selected || id === focused || id === hovered
      if (entry.level === 'governorate' && !active && !documented.has(id) && zoom < 3) continue
      const key = fontPixels + '|' + entry.label.getAttribute('class') + '|' + entry.area.name
      if (!widths.has(key)) {
        const measured = entry.label.getComputedTextLength?.()
        widths.set(key, measured > 0 ? measured * ratio : [...entry.area.name].length * fontPixels * .6)
      }
      const width = widths.get(key) / ratio
      if (!active && entry.bounds && entry.bounds[2] - entry.bounds[0] < width) continue
      candidates.push({ label: entry.label, box: [entry.x - width / 2 - gap, entry.y - font - gap, entry.x + width / 2 + gap, entry.y + font + gap], priority: active ? 4 : documented.has(id) ? 3 : entry.level === 'region' ? 1 : 0 })
    }
    candidates.sort((a, b) => b.priority - a.priority)
    for (const item of candidates) {
      const box = item.box
      if (box[0] < bounds[0] || box[1] < bounds[1] || box[2] > bounds[2] || box[3] > bounds[3] || occupied.some(other => intersects(box, other))) continue
      occupied.push(box); item.label.style.visibility = 'visible'
    }
  }
  function viewState() { const zoom = OVERVIEW[2] / view[2]; return { zoom, viewBox: [...view], canZoomIn: zoom < MAX_ZOOM - .001, canZoomOut: zoom > 1.001, isOverview: zoom <= 1.001 } }
  function setView(next) {
    if (destroyed) return
    const width = Math.min(OVERVIEW[2], Math.max(OVERVIEW[2] / MAX_ZOOM, next[2])), height = width * OVERVIEW[3] / OVERVIEW[2]
    const x = Math.min(OVERVIEW[0] + OVERVIEW[2] - width, Math.max(OVERVIEW[0], next[0] + next[2] / 2 - width / 2))
    const y = Math.min(OVERVIEW[1] + OVERVIEW[3] - height, Math.max(OVERVIEW[1], next[1] + next[3] / 2 - height / 2))
    view = [x, y, width, height]; map.setAttribute('viewBox', view.join(' ')); layout(); callbacks.onViewChange?.(viewState())
  }
  function fitAreas(areaIds) {
    const matched = [...areaIds].map(id => nodes.get(id)?.bounds).filter(Boolean)
    if (destroyed || !matched.length) return false
    const b = [Math.min(...matched.map(a => a[0])), Math.min(...matched.map(a => a[1])), Math.max(...matched.map(a => a[2])), Math.max(...matched.map(a => a[3]))]
    const width = Math.max(OVERVIEW[2] / MAX_ZOOM, (b[2] - b[0]) * 1.2, (b[3] - b[1]) * 1.2 * OVERVIEW[2] / OVERVIEW[3]), height = width * OVERVIEW[3] / OVERVIEW[2]
    setView([(b[0] + b[2] - width) / 2, (b[1] + b[3] - height) / 2, width, height]); return true
  }
  container.append(map)
  const resize = () => { layout(); if (!destroyed) callbacks.onViewChange?.(viewState()) }
  const observer = window.ResizeObserver ? new window.ResizeObserver(resize) : null
  if (observer) observer.observe(map); else listen(window, 'resize', resize)
  document.fonts?.ready.then(() => { if (!destroyed) { widths.clear(); layout() } })
  const api = {
    update(next = {}) {
      if (destroyed) return
      if ('documented' in next) documented = new Set([...(next.documented || [])].filter(id => nodes.has(id)))
      if ('selected' in next) selected = documented.has(next.selected) ? next.selected : null
      if (!documented.has(selected)) selected = null
      if (!documented.has(hovered)) hovered = null
      if (!documented.has(focused)) focused = null
      for (const [id, entry] of nodes) {
        const shown = documented.has(id)
        entry.path.classList.toggle('is-documented', shown); entry.label.classList.toggle('is-documented', shown)
        entry.path.classList.toggle('is-selected', id === selected); entry.path.classList.toggle('is-hovered', id === hovered); entry.path.classList.toggle('is-focused', id === focused)
        entry.label.classList.toggle('is-governorate', entry.level === 'governorate')
        entry.path.style.fill = shown && entry.level === 'region' ? 'url(#' + patternId + ')' : ''
        entry.path.setAttribute('role', shown ? 'button' : 'img')
        entry.path.setAttribute('aria-label', presentAreaName({ ...entry.area, level: entry.level }) + (shown ? '، مكان مذكور في المصدر، عرض المصادر' : '، لا بيانات معروضة لهذا النبات'))
        if (!shown && entry.level === 'governorate') entry.path.setAttribute('aria-hidden', 'true')
        else entry.path.removeAttribute('aria-hidden')
        if (shown) entry.path.setAttribute('aria-pressed', String(id === selected)); else entry.path.removeAttribute('aria-pressed')
      }
      refreshOutline(); layout()
    },
    zoomIn() { const width = view[2] / 1.6, height = view[3] / 1.6; setView([view[0] + (view[2] - width) / 2, view[1] + (view[3] - height) / 2, width, height]) },
    zoomOut() { setView([view[0] - view[2] * .3, view[1] - view[3] * .3, view[2] * 1.6, view[3] * 1.6]) },
    fitArea(id) { return fitAreas([id]) }, fitAreas,
    reset() { setView([...OVERVIEW]) }, getViewState: viewState,
    destroy() { if (destroyed) return; destroyed = true; observer?.disconnect(); listeners.forEach(remove => remove()); nodes.clear(); widths.clear(); map.remove() },
  }
  api.update()
  return api
}
