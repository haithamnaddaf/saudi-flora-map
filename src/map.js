const NS = 'http://www.w3.org/2000/svg'
function svg(tag, attributes, text) {
  const node = document.createElementNS(NS, tag)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value)
  if (text) node.textContent = text
  return node
}

// Compact-map callouts reserve separate, finger-sized targets around small provinces.
// Positions are drawing units, the same coordinate system as the boundary asset.
const compactLabels = {
  'SA-12':[250,-8], 'SA-08':[440,-8],
  'SA-07':[145,104], 'SA-06':[300,104], 'SA-05':[465,104],
  'SA-03':[160,220], 'SA-01':[390,220], 'SA-04':[612,220],
  'SA-11':[147,344], 'SA-02':[278,344], 'SA-14':[423,344],
  'SA-09':[243,466], 'SA-10':[488,466],
}
const anchors = { 'SA-11':[313,368], 'SA-09':[343.2,453.7] }

export function mountMap(layer, regions, onSelect) {
  const map = layer.ownerSVGElement
  const labels = svg('g', {})
  map.append(labels)
  const nodes = regions.map(r => {
    const path = svg('path', {class:'boundary','data-geometry':r.id,d:r.path,'fill-rule':'evenodd','aria-hidden':'true'})
    layer.append(path)
    const group = svg('g', {class:'province',role:'button',tabindex:'0','data-region':r.id})
    const leader = svg('path',{class:'leader','aria-hidden':'true'})
    const hit = svg('rect',{fill:'transparent','aria-hidden':'true'})
    const label = svg('text',{'text-anchor':'middle','aria-hidden':'true'}, r.name)
    const dot = svg('circle',{r:4.5,class:'occurrence','aria-hidden':'true'})
    group.append(leader,hit,label,dot)
    labels.append(group)
    for (const element of [path,group]) {
      element.addEventListener('click', () => onSelect(r.id))
      element.addEventListener('pointerenter', () => path.classList.add('over'))
      element.addEventListener('pointerleave', () => path.classList.remove('over'))
    }
    group.addEventListener('focus',() => path.classList.add('key-focus'))
    group.addEventListener('blur',() => path.classList.remove('key-focus'))
    group.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id) }
    })
    return {group,path,leader,hit,label,dot,r}
  })

  function layout() {
    const width = map.getBoundingClientRect().width
    if (!width) return
    const compact = width < 600
    map.setAttribute('viewBox',compact ? '78 -75 640 620' : '70 -10 690 515')
    const scale = map.getScreenCTM().a
    const target = parseFloat(getComputedStyle(map).getPropertyValue('--uds-touch-target')) / scale
    const fontSize = parseFloat(getComputedStyle(map).getPropertyValue('--uds-text-xs-size'))
    for (const {group,leader,hit,label,dot,r} of nodes) {
      const [x,y] = compact ? compactLabels[r.id] : r.label
      const [ax,ay] = anchors[r.id] || [r.label[0],r.label[1] - 3]
      label.setAttribute('x',x); label.setAttribute('y',y)
      label.style.fontSize = compact ? fontSize / scale + 'px' : ''
      hit.setAttribute('width',target); hit.setAttribute('height',target)
      hit.setAttribute('x',x - target / 2); hit.setAttribute('y',y - target * .58)
      leader.setAttribute('d',compact || anchors[r.id] ? 'M' + x + ',' + (y-4) + 'L' + ax + ',' + ay : '')
      dot.setAttribute('cx',x); dot.setAttribute('cy',y - (compact ? fontSize * 1.22 / scale : 17))
      group.classList.toggle('compact',compact)
    }
  }
  new ResizeObserver(layout).observe(map)
  return (verified, selected) => {
    for (const {group,path,dot,r} of nodes) {
      const has = verified.has(r.id)
      for (const element of [group,path]) {
        element.classList.toggle('documented',has)
        element.classList.toggle('chosen',r.id === selected)
      }
      group.setAttribute('aria-pressed',String(r.id === selected))
      group.setAttribute('aria-label',r.name + (has ? '، وجود موثّق' : '، لا شاهد في الإصدار'))
      dot.style.display = has ? '' : 'none'
    }
  }
}
