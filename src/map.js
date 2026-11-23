const SVG_NS = 'http://www.w3.org/2000/svg'

// These are drawing coordinates in the existing boundary asset, not observations.
const VIEW_BOX = [110, 0, 590, 500]
const LABEL_POSITIONS = {
  'SA-09': [343.2, 453.7],
  'SA-11': [313, 368],
}

function svg(document, tag, attributes = {}, text) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Render immutable Saudi administrative geometry and update its evidence state.
 * The host owns data loading, the source card and equivalent 44px region buttons.
 * Include map.css inside the host's Shadow DOM; no styles are installed globally.
 */
export function mountMap(container, regions, callbacks = {}) {
  if (!container?.ownerDocument || !Array.isArray(regions)) {
    throw new TypeError('mountMap requires a DOM container and a regions array')
  }
  const ids = new Set()
  for (const region of regions) {
    if (!region?.id || ids.has(region.id) || typeof region.path !== 'string' || !Array.isArray(region.label)) {
      throw new TypeError('Each map region must have a unique id, path and label coordinates')
    }
    ids.add(region.id)
  }

  const document = container.ownerDocument
  const window = document.defaultView
  const map = svg(document, 'svg', {
    class: 'flora-regions-map',
    viewBox: VIEW_BOX.join(' '),
    preserveAspectRatio: 'xMidYMid meet',
    role: 'group',
    'aria-label': 'خريطة مناطق المملكة العربية السعودية ومصادر ذكر النبات فيها',
    lang: 'ar',
    dir: 'rtl',
    focusable: 'false',
  })
  map.append(svg(document, 'desc', {}, 'اختر منطقة لها مصادر لقراءة الأدلة. تظليل المنطقة لا يعني وجود النبات في كامل مساحتها، وعدم التظليل لا يعني غيابه.'))
  const geography = svg(document, 'g', { class: 'flora-map-geography' })
  const outline = svg(document, 'g', { class: 'flora-map-outline', 'aria-hidden': 'true' })
  const outlineHalo = svg(document, 'path', { class: 'flora-map-outline-halo', 'fill-rule': 'evenodd' })
  const outlineStroke = svg(document, 'path', { class: 'flora-map-outline-stroke', 'fill-rule': 'evenodd' })
  const labels = svg(document, 'g', { class: 'flora-map-labels', 'aria-hidden': 'true' })
  outline.append(outlineHalo, outlineStroke)
  map.append(geography, outline, labels)

  const listeners = []
  let documented = new Set()
  let selected = null
  let hovered = null
  let focused = null
  let destroyed = false

  function listen(node, type, handler) {
    node.addEventListener(type, handler)
    listeners.push(() => node.removeEventListener(type, handler))
  }

  function notify(name, id, event) {
    if (typeof callbacks[name] === 'function') callbacks[name](id, event)
  }

  const nodes = new Map(regions.map(region => {
    const path = svg(document, 'path', {
      class: 'flora-map-region',
      'data-region': region.id,
      d: region.path,
      'fill-rule': 'evenodd',
      role: 'img',
      tabindex: '-1',
      'aria-label': `${region.name}، لا تتوافر مصادر معروضة لهذا النبات`,
    })
    geography.append(path)
    const [x, y] = LABEL_POSITIONS[region.id] || region.label
    const label = svg(document, 'text', {
      class: 'flora-map-label',
      x,
      y,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }, region.name)
    labels.append(label)

    listen(path, 'pointerenter', event => {
      if (!documented.has(region.id) || event.pointerType === 'touch') return
      hovered = region.id
      path.classList.add('is-hovered')
      refreshOutline()
      notify('onRegionEnter', region.id, event)
    })
    listen(path, 'pointerleave', event => {
      if (event.pointerType === 'touch') return
      if (hovered === region.id) hovered = null
      path.classList.remove('is-hovered')
      refreshOutline()
      if (documented.has(region.id)) notify('onRegionLeave', region.id, event)
    })
    listen(path, 'click', event => {
      if (documented.has(region.id)) notify('onRegionSelect', region.id, event)
    })
    listen(path, 'focus', event => {
      if (!documented.has(region.id)) return
      focused = region.id
      path.classList.add('is-focused')
      refreshOutline()
      notify('onRegionFocus', region.id, event)
    })
    listen(path, 'blur', event => {
      if (focused === region.id) focused = null
      path.classList.remove('is-focused')
      refreshOutline()
      if (documented.has(region.id)) notify('onRegionLeave', region.id, event)
    })
    listen(path, 'keydown', event => {
      if (!documented.has(region.id) || (event.key !== 'Enter' && event.key !== ' ')) return
      event.preventDefault()
      if (!event.repeat) notify('onRegionSelect', region.id, event)
    })
    return [region.id, { path, label, region }]
  }))

  function refreshOutline() {
    // Keyboard focus remains visible even when a pointer moves over another region.
    const id = focused || hovered || selected
    const target = id && documented.has(id) ? nodes.get(id) : null
    outline.classList.toggle('is-visible', Boolean(target))
    if (target) {
      outlineHalo.setAttribute('d', target.region.path)
      outlineStroke.setAttribute('d', target.region.path)
    }
  }

  function layout() {
    if (destroyed) return
    const width = map.getBoundingClientRect().width
    if (!width) return
    // Match the audited 600px small/medium transition using component width.
    map.classList.toggle('is-compact', width < 600)
    const token = parseFloat(window.getComputedStyle(map).getPropertyValue('--uds-text-xs-size'))
    const scale = map.getScreenCTM()?.a || width / VIEW_BOX[2]
    if (Number.isFinite(token) && scale > 0) {
      map.style.setProperty('--flora-map-label-size', `${token / scale}px`)
    }
  }

  container.append(map)
  const observer = window.ResizeObserver ? new window.ResizeObserver(layout) : null
  if (observer) observer.observe(map)
  else listen(window, 'resize', layout)
  layout()

  return {
    update({ documented: nextDocumented = new Set(), selected: nextSelected = null } = {}) {
      if (destroyed) return
      documented = new Set([...nextDocumented].filter(id => nodes.has(id)))
      selected = documented.has(nextSelected) ? nextSelected : null
      if (!documented.has(hovered)) hovered = null
      if (!documented.has(focused)) focused = null
      for (const [id, { path, label, region }] of nodes) {
        const hasSources = documented.has(id)
        const isSelected = id === selected
        path.classList.toggle('is-documented', hasSources)
        path.classList.toggle('is-selected', isSelected)
        path.classList.toggle('is-hovered', id === hovered)
        path.classList.toggle('is-focused', id === focused)
        label.classList.toggle('is-documented', hasSources)
        path.setAttribute('role', hasSources ? 'button' : 'img')
        path.setAttribute('tabindex', hasSources ? '0' : '-1')
        path.setAttribute('aria-label', hasSources
          ? `${region.name}، ورد ذكر النبات في مصادر هذه المنطقة، عرض المصادر`
          : `${region.name}، لا تتوافر مصادر معروضة لهذا النبات`)
        if (hasSources) path.setAttribute('aria-pressed', String(isSelected))
        else path.removeAttribute('aria-pressed')
      }
      refreshOutline()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      observer?.disconnect()
      for (const remove of listeners) remove()
      map.remove()
      nodes.clear()
    },
  }
}
