import './style.css'
import { RELEASE, REGION_IDS, arabicNumber as n, verifiedRecords, validateAtlas, resolveContext } from './catalog.js'
import { mountMap } from './map.js'
import { setupImport } from './importer.js'

const el = id => document.getElementById(id)
const asset = path => import.meta.env.BASE_URL + path
const node = (tag, value, cls) => {
  const item = document.createElement(tag)
  item.textContent = value
  if (cls) item.className = cls
  return item
}
function setOptions(select, entries, title, selected) {
  select.replaceChildren(new Option(title, ''), ...entries.map(([v,label]) => new Option(label,v)))
  select.value = selected
}
const normalise = text => text.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').toLowerCase().trim()

async function loadJSON(name) {
  const res = await fetch(asset('data/' + name))
  if (!res.ok) throw Error('Dataset unavailable')
  return res.json()
}

async function start() {
  const [data,regions,bindings] = await Promise.all([
    loadJSON('distribution.v' + RELEASE + '.json'),loadJSON('regions.v1.json'),loadJSON('bindings.v1.json')
  ])
  validateAtlas(data, regions, bindings)
  const params = new URLSearchParams(location.search)
  const plantId = resolveContext(params,bindings,data.plants[0].id)
  el('species-count').textContent = n(data.plants.length)
  el('version').replaceChildren('إصدار البيانات ', node('bdi',data.version), ' · ', node('bdi',data.released))
  el('app-status').textContent = ''
  if (!plantId) { el('unbound').hidden = false; return }
  const state = { plant: data.plants.find(p => p.id === plantId), region: '', place: '' }
  const byId = new Map(regions.map(r => [r.id,r.name]))
  const regionSelect = el('region'), placeSelect = el('place')
  const picker = el('picker')
  const updateMap = mountMap(el('regions'),regions,selectRegion)
  const allRegions = REGION_IDS.map(id => [id, byId.get(id)])

  function selectRegion(id) {
    state.region = id
    state.place = ''
    renderDistribution()
  }
  function renderDistribution() {
    const records = verifiedRecords(data, state.plant.id)
    const inRegion = verifiedRecords(data, state.plant.id,state.region)
    const visible = verifiedRecords(data, state.plant.id,state.region,state.place)
    const known = new Set(records.map(r => r.regionId))
    updateMap(known, state.region)
    el('map-summary').textContent = state.plant.name + ' · مناطق ذات شواهد ميدانية: ' + n(known.size) + ' من ' + n(regions.length)
    setOptions(regionSelect,allRegions,'جميع المناطق',state.region)
    const places = [...new Set(inRegion.map(r => r.place))]
    setOptions(placeSelect,places.map(p => [p,p]),places.length ? 'جميع المواقع' : 'لا مواقع موثّقة',state.place)
    placeSelect.disabled = !places.length
    el('reset').disabled = !state.region && !state.place
    const area = [byId.get(state.region),state.place].filter(Boolean).join('، ')
    el('evidence-summary').textContent = visible.length
      ? state.plant.name + (area ? ' في ' + area : ' في المملكة') + ' · عدد الشواهد: ' + n(visible.length)
      : 'لا يتضمن هذا الإصدار شاهدًا على وجود ' + state.plant.name + ' في ' + (area || 'المملكة') + '.'
    el('records').replaceChildren(...visible.map(r => {
      const li = document.createElement('li')
      const heading = node('div','','record-head')
      heading.append(node('h3',r.place),node('span',byId.get(r.regionId),'region-tag'))
      const link = node('a',r.sourceTitle + ' ↗','source-link')
      link.href = r.sourceUrl
      link.setAttribute('aria-label',r.sourceTitle + '، مصدر خارجي')
      li.append(heading,node('p',r.evidence),node('span',r.locator,'locator'),link)
      return li
    }))
  }
  function renderPlant() {
    const p = state.plant
    el('plant-name').textContent = p.name
    el('latin').textContent = p.scientificName
    el('photo').src = asset('images/' + p.image)
    el('photo').alt = p.alt
    el('plate-id').textContent = p.photoPlace
    for (const field of ['family','habitat','description']) el(field).textContent = p[field]
    renderDistribution()
  }
  function matches() {
    const q = normalise(el('query').value)
    const results = data.plants.filter(p => normalise(p.name + ' ' + p.scientificName).includes(q))
    el('search-count').textContent = results.length ? 'عدد النباتات المطابقة: ' + n(results.length) : 'لا توجد نتائج. جرّب جزءًا من الاسم العربي أو العلمي.'
    el('matches').replaceChildren(...results.map(p => {
      const li = document.createElement('li'), button = node('button','')
      button.type = 'button'
      const img = document.createElement('img')
      img.src = asset('images/' + p.image); img.alt = ''
      const latin = node('i',p.scientificName)
      latin.lang = 'la'; latin.dir = 'ltr'
      button.append(img,node('strong',p.name),latin)
      button.addEventListener('click', () => {
        state.plant = p; state.region = ''; state.place = ''
        renderPlant(); picker.close()
      })
      li.append(button)
      return li
    }))
    return results.length
  }
  el('choose').addEventListener('click', () => {
    el('query').value = ''; matches(); picker.showModal(); el('query').focus()
  })
  el('query').addEventListener('input',matches)
  el('query').addEventListener('keydown', e => {
    if (e.key === 'Escape' && e.target.value) {
      e.preventDefault(); e.stopPropagation(); e.target.value = ''; matches()
    }
  })
  el('search').addEventListener('submit', e => {
    e.preventDefault()
    if (matches()) el('matches').querySelector('button').focus()
  })
  regionSelect.addEventListener('change', () => selectRegion(regionSelect.value))
  placeSelect.addEventListener('change', () => {
    state.place = placeSelect.value
    if (!state.region && state.place) {
      const matches = verifiedRecords(data,state.plant.id,'',state.place)
      const regionIds = new Set(matches.map(r => r.regionId))
      if (regionIds.size === 1) state.region = matches[0].regionId
    }
    renderDistribution()
  })
  el('reset').addEventListener('click', () => { selectRegion(''); regionSelect.focus() })
  for (const close of document.querySelectorAll('.close')) close.addEventListener('click', () => close.closest('dialog').close())
  setupImport(data)
  renderPlant()
  el('explorer').hidden = false
  if (params.get('embed') === '1') {
    document.body.classList.add('embedded')
    if (params.has('entryId')) el('choose').hidden = true
  }
}

start().catch(error => {
  console.error(error)
  const retry = node('button','إعادة تحميل الأطلس')
  retry.addEventListener('click',() => location.reload())
  el('app-status').replaceChildren('تعذّر تحميل بيانات الأطلس. تحقق من الاتصال ثم أعد المحاولة. ',retry)
})
