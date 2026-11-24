import './style.css'
import './widget.js'
import { loadCatalog } from './data-client.js'

const el = id => document.getElementById(id)
const map = el('plant-map')
const dialog = el('picker')
const normalise = value => value.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').toLowerCase().trim()
const number = value => new Intl.NumberFormat('ar-SA-u-nu-arab').format(value)
let catalog
let searchSequence = 0

function readContext() {
  const params = new URLSearchParams(location.search)
  const embed = params.get('embed') === '1'
  document.body.classList.toggle('embedded', embed)
  if (embed) map.removeAttribute('local-preview')
  else map.setAttribute('local-preview', '')
  const ids = [...params.getAll('uuid'), ...params.getAll('entryId')]
  const senses = params.getAll('senseId')
  const uuid = ids.length > 1 || senses.length > 1 || (!ids.length && senses.length) ? 'invalid-context' : ids[0] || ''
  map.setPlant(uuid, senses[0] || null)
  el('examples').hidden = Boolean(uuid) || embed
}

function selectPlant(uuid) {
  const url = new URL(location.href)
  for (const key of ['entryId', 'senseId', 'uuid']) url.searchParams.delete(key)
  url.searchParams.set('uuid', uuid)
  history.replaceState(null, '', url)
  map.setPlant(uuid)
  el('examples').hidden = true
  dialog.close()
}

function showMatches() {
  if (!catalog) return 0
  const q = normalise(el('query').value)
  const matches = catalog.plants.filter(plant => normalise(plant.name + ' ' + plant.scientificName + ' ' + plant.uuid).includes(q))
  el('search-count').textContent = matches.length ? number(matches.length) + ' نتائج' + (matches.length > 30 ? '؛ تظهر أول ٣٠ نتيجة. أضف جزءًا من الاسم لتضييق البحث.' : '')
    : 'لم نجد نباتًا مطابقًا. جرّب جزءًا من الاسم العربي أو العلمي.'
  el('matches').replaceChildren(...matches.slice(0, 30).map(plant => {
    const li = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    const name = document.createElement('strong')
    name.textContent = plant.name
    const latin = document.createElement('bdi')
    latin.textContent = plant.scientificName
    latin.dir = 'ltr'
    const status = document.createElement('span')
    status.className = 'match-status'
    status.textContent = plant.status === 'documented_for_supplied_taxon' ? 'عرض الأماكن المتاحة ومصادرها' : 'الانتشار غير متوفر'
    button.append(name, latin, status)
    button.addEventListener('click', () => selectPlant(plant.uuid))
    li.append(button)
    return li
  }))
  return matches.length
}

el('choose').addEventListener('click', async () => {
  dialog.showModal()
  el('query').value = ''
  el('query').focus()
  el('matches').replaceChildren()
  el('search-count').textContent = 'جارٍ تحميل دليل النباتات…'
  const request = ++searchSequence
  try {
    catalog ||= await loadCatalog()
    if (request === searchSequence) showMatches()
  } catch {
    if (request === searchSequence) el('search-count').textContent = 'تعذر تحميل دليل النباتات. أغلق النافذة ثم افتحها للمحاولة مجددًا.'
  }
})
el('close-picker').addEventListener('click', () => dialog.close())
dialog.addEventListener('close', () => ++searchSequence)
el('query').addEventListener('input', showMatches)
el('search').addEventListener('submit', event => {
  event.preventDefault()
  if (showMatches()) el('matches').querySelector('button').focus()
})
for (const button of document.querySelectorAll('[data-uuid]')) button.addEventListener('click', () => selectPlant(button.dataset.uuid))
window.addEventListener('popstate', readContext)
readContext()
