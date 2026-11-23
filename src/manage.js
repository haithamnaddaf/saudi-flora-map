import './manage.css'
import './widget.js'
import {
  STORAGE_KEY, UPDATE_EVENT, UPDATE_COLUMNS, MAX_IMPORT_BYTES, validateUpdateRows,
  applyOverrides, mergePatch, readStoredPatch, saveStoredPatch, clearStoredPatch
} from './updates.js'

const el = id => document.getElementById(id)
const asset = path => new URL('../' + path, import.meta.url).href
const number = value => new Intl.NumberFormat('ar-SA-u-nu-arab').format(value)
const normalize = value => value.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').toLowerCase().trim()
const node = (tag, value) => { const item = document.createElement(tag); item.textContent = value; return item }
const map = el('managed-map')
let catalog, draft = null, sequence = 0, selectedSequence = 0, stagedStorage = null, stagedUuids = []
const baseline = new Map()

async function json(path) {
  const response = await fetch(asset(path))
  if (!response.ok) throw Error('تعذّر تحميل ' + path)
  return response.json()
}

async function loadPlant(uuid) {
  if (!baseline.has(uuid)) baseline.set(uuid, await json('data/plants/' + encodeURIComponent(uuid) + '.json'))
  return baseline.get(uuid)
}

function notifyChanged(uuids = []) {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { baseVersion: catalog.version, uuids } }))
}

function renderSavedStatus() {
  try {
    const patch = readStoredPatch(localStorage, catalog.version)
    el('saved-status').textContent = patch
      ? 'توجد ' + number(patch.changes.length) + ' علاقة معدلة محفوظة في هذا المتصفح.'
      : 'تستخدم المعاينة بيانات الإصدار الأصلي حاليًا.'
    el('restore').disabled = !patch
    el('download-patch').disabled = !patch && !draft
  } catch (error) {
    el('saved-status').textContent = error.message
    el('restore').disabled = false
  }
}

function clearDraft(message = '') {
  ++sequence
  draft = null
  stagedStorage = null
  stagedUuids = []
  el('apply').disabled = true
  el('diff').hidden = true
  el('diff-list').replaceChildren()
  el('import-errors').replaceChildren()
  el('import-status').textContent = message
  el('workbook').removeAttribute('aria-invalid')
  el('workbook').setAttribute('aria-describedby', 'file-help import-status')
  if (catalog) renderSavedStatus()
}

function reject(message, errors = []) {
  el('import-status').textContent = message
  el('import-errors').replaceChildren(...errors.slice(0, 50).map(error => node('li', error)))
  if (errors.length > 50) el('import-errors').append(node('li', 'عُرض أول ٥٠ خطأ. صحّحها ثم أعد رفع الملف.'))
  el('workbook').setAttribute('aria-invalid', 'true')
  el('workbook').setAttribute('aria-describedby', 'file-help import-status import-errors')
}

async function inspect(files) {
  clearDraft()
  const request = sequence
  if (!files?.length || !catalog) return
  const file = files[0]
  if (files.length !== 1 || !/\.xlsx$/i.test(file.name) || file.size > MAX_IMPORT_BYTES) {
    reject('اختر ملف .xlsx واحدًا لا يتجاوز ٥ م.ب.'); return
  }
  el('import-status').textContent = 'جارٍ فحص ' + file.name + '…'
  try {
    stagedStorage = localStorage.getItem(STORAGE_KEY)
    const patch = readStoredPatch(localStorage, catalog.version)
    const { readSheet } = await import('read-excel-file/browser')
    const rows = await readSheet(file, { sheet: 'Records' })
    if (request !== sequence) return
    if (rows.length > 501) { reject('الحد الأقصى ٥٠٠ صف بيانات في كل دفعة.'); return }
    const uuidColumn = rows[0]?.indexOf('uuid')
    const known = new Set(catalog.plants.map(p => p.uuid))
    const uuids = [...new Set(rows.slice(1).map(row => row[uuidColumn]).filter(id => typeof id === 'string' && known.has(id.trim())).map(id => id.trim()))]
    const current = new Map()
    // Bound concurrent requests when a workbook includes several plants.
    for (let i = 0; i < uuids.length; i += 8) {
      const batch = await Promise.all(uuids.slice(i, i + 8).map(async uuid => [uuid, applyOverrides(await loadPlant(uuid), patch)]))
      if (request !== sequence) return
      batch.forEach(([uuid, plant]) => current.set(uuid, plant))
    }
    if (stagedStorage !== localStorage.getItem(STORAGE_KEY)) {
      reject('تغيرت المعاينة في نافذة أخرى أثناء الفحص. اختر الملف مجددًا لحساب الفروق.'); return
    }
    const result = validateUpdateRows(rows, catalog, current, { fileName: file.name })
    if (result.errors.length) { reject('صحّح الصفوف التالية ثم ارفع الملف مجددًا.', result.errors); return }
    if (!result.changes.length) {
      el('import-status').textContent = 'الصفوف مطابقة للسجلات الحالية؛ لا توجد تغييرات لتطبيقها.'
      return
    }
    draft = mergePatch(patch, result.changes, catalog.version, new Date().toISOString(), baseline)
    stagedUuids = [...new Set(result.changes.map(change => change.uuid))]
    el('diff').hidden = false
    const s = result.summary
    el('diff-summary').textContent = 'إضافة: ' + number(s.added) + ' · تعديل: ' + number(s.updated) + ' · حذف: ' + number(s.deleted) + ' · دون تغيير: ' + number(s.unchanged) + ' · نباتات متأثرة: ' + number(s.plants)
    const names = new Map(catalog.plants.map(p => [p.uuid, p.name]))
    el('diff-list').replaceChildren(...result.changes.map(change => {
      const li = document.createElement('li')
      const action = change.action === 'delete' ? 'حذف' : current.get(change.uuid)?.records.some(r => r.id === change.recordId) ? 'تعديل' : 'إضافة'
      li.append(node('strong', action + ' — ' + names.get(change.uuid) + (change.record ? '، ' + change.record.place : '')))
      li.append(node('bdi', change.recordId))
      li.append(node('small', change.record ? change.record.sourceTitle + ' · ' + (change.record.status === 'verified' ? 'أقر المحرر مراجعته' : 'بانتظار المراجعة؛ لن يظهر على الخريطة') : 'حذف هذه العلاقة فقط من النبتة المحددة.'))
      return li
    }))
    el('import-status').textContent = draft.changes.length
      ? 'اكتمل فحص التنسيق والربط. راجع الفروق قبل تطبيقها.'
      : 'هذه التغييرات تلغي الإضافات المحلية السابقة. طبّقها لاستعادة بيانات الإصدار؛ لا يبقى تغيير صافٍ يحتاج إلى إصدار جديد.'
    el('apply').disabled = false
    el('download-patch').disabled = !draft.changes.length
  } catch (error) {
    if (request === sequence) reject('تعذّر إكمال الفحص. ' + (error?.message || 'تحقق من ورقة Records واحفظ المصنف بصيغة .xlsx.'))
  }
}

function tsvValue(value) {
  const clean = String(value ?? '').replace(/[\t\r\n]+/g, ' ')
  return /^[=+@-]/.test(clean) ? "'" + clean : clean
}

function recordCells(plant, record) {
  const values = { uuid: plant.uuid, scientificName: plant.scientificName, recordId: record.id, action: 'upsert',
    regionId: record.regionId || '', place: record.place, sourceKind: record.sourceKind, sourceTitle: record.sourceTitle,
    sourceUrl: record.sourceUrl || '', sourceAuthor: record.sourceAuthor || '', sourceYear: record.year || '',
    sourceEdition: record.sourceEdition || '', locator: record.locator, evidence: record.evidence, reviewStatus: record.status }
  return UPDATE_COLUMNS.map(column => tsvValue(values[column])).join('\t')
}

async function selectPlant() {
  const uuid = el('plant-select').value
  const request = ++selectedSequence
  el('copy-records').disabled = true
  el('records-copy').value = ''
  el('copy-status').textContent = ''
  const entry = catalog.plants.find(p => p.uuid === uuid)
  if (!entry) { map.removeAttribute('uuid'); el('plant-identity').replaceChildren(); return }
  map.setAttribute('uuid', uuid)
  const identity = el('plant-identity')
  identity.replaceChildren(node('strong', entry.name), node('bdi', entry.scientificName), node('bdi', entry.uuid), node('p', entry.statusLabel))
  try {
    const plant = applyOverrides(await loadPlant(uuid), readStoredPatch(localStorage, catalog.version))
    if (request !== selectedSequence) return
    el('records-copy').value = [UPDATE_COLUMNS.join('\t'), ...plant.records.map(r => recordCells(plant, r))].join('\n')
    el('copy-records').disabled = !plant.records.length
    el('copy-status').textContent = plant.records.length ? 'عدد السجلات: ' + number(plant.records.length) : 'لا توجد سجلات قابلة للنسخ لهذا المدخل في الإصدار الحالي.'
  } catch (error) {
    if (request === selectedSequence) el('copy-status').textContent = error.message
  }
}

function filterPlants() {
  const query = normalize(el('plant-search').value)
  const matches = catalog.plants.filter(p => normalize([p.name, p.scientificName, p.uuid].join(' ')).includes(query))
  const previous = el('plant-select').value
  const visible = matches.slice(0, 100)
  el('plant-select').replaceChildren(new Option('اختر نبتة للمعاينة', ''), ...visible.map(p => new Option(p.name + ' — ' + p.scientificName, p.uuid)))
  if (visible.some(p => p.uuid === previous)) el('plant-select').value = previous
  el('matches-status').textContent = matches.length ? 'النتائج: ' + number(matches.length) + (matches.length > 100 ? '؛ يُعرض أول ١٠٠، ويمكن تضييق البحث.' : '') : 'لا توجد نتيجة مطابقة.'
}

function downloadPatch() {
  let value
  try { value = draft || readStoredPatch(localStorage, catalog.version) }
  catch (error) { el('import-status').textContent = error.message; return }
  if (!value || !value.changes.length) return
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'flora-map-updates-' + value.updatedAt.slice(0, 10) + '.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  el('import-status').textContent = 'جُهّز ملف التغييرات للتنزيل. يمكن مراجعته لاعتماده في إصدار مشترك.'
}

el('workbook').addEventListener('change', () => inspect(el('workbook').files))
el('dropzone').addEventListener('dragover', event => { event.preventDefault(); el('dropzone').classList.add('drag') })
el('dropzone').addEventListener('dragleave', () => el('dropzone').classList.remove('drag'))
el('dropzone').addEventListener('drop', event => {
  event.preventDefault(); el('dropzone').classList.remove('drag'); el('workbook').value = ''; inspect(event.dataTransfer.files)
})
el('updates-form').addEventListener('submit', event => {
  event.preventDefault()
  if (!draft) return
  try {
    if (stagedStorage !== localStorage.getItem(STORAGE_KEY)) {
      clearDraft('تغيرت التعديلات في نافذة أخرى. اختر الملف مجددًا لمراجعة الفروق قبل التطبيق.'); return
    }
    const applied = draft, affected = [...stagedUuids]
    if (applied.changes.length) saveStoredPatch(localStorage, applied)
    else clearStoredPatch(localStorage)
    clearDraft(applied.changes.length
      ? 'حُفظت التغييرات وحدثت الخريطة في هذه المعاينة. يمكنك تنزيل الملف للاحتفاظ به.'
      : 'أُلغيت الإضافات المحلية واستُعيدت بيانات الإصدار. لا توجد تغييرات صافية لإصدار جديد.')
    notifyChanged(affected)
    selectPlant()
  } catch (error) {
    el('import-status').textContent = 'لم تُطبّق التغييرات: ' + error.message + ' يمكنك تنزيل الملف للاحتفاظ به.'
  }
})
el('download-patch').addEventListener('click', downloadPatch)
el('restore').addEventListener('click', () => {
  try {
    clearStoredPatch(localStorage)
    clearDraft('استُعيدت بيانات الإصدار في هذه المعاينة.')
    notifyChanged()
    selectPlant()
  } catch (error) { el('saved-status').textContent = error.message }
})
el('plant-search').addEventListener('input', filterPlants)
el('plant-select').addEventListener('change', selectPlant)
el('copy-records').addEventListener('click', async () => {
  const field = el('records-copy')
  field.focus(); field.select()
  try {
    await navigator.clipboard.writeText(field.value)
    el('copy-status').textContent = 'نُسخت السجلات. الصقها في A1 من ورقة Records ثم عدّلها واحفظ المصنف.'
  } catch {
    el('copy-status').textContent = 'حُددت السجلات. استخدم أمر النسخ في جهازك، ثم الصقها في A1 من ورقة Records.'
  }
})
window.addEventListener('storage', event => {
  if (catalog && (event.key === STORAGE_KEY || event.key === null)) {
    clearDraft('تغيرت البيانات في نافذة أخرى؛ أعد فحص الملف إن كنت تُحضّر تحديثًا.')
    selectPlant()
  }
})

async function start() {
  catalog = await json('data/catalog.v2.json')
  if (catalog.schemaVersion !== 2 || !Array.isArray(catalog.plants)) throw Error('دليل النباتات غير صالح.')
  el('catalog-status').textContent = ''
  el('release-label').textContent = 'إصدار البيانات ' + catalog.version + ' · ' + catalog.released
  for (const id of ['workbook', 'plant-search', 'plant-select']) el(id).disabled = false
  renderSavedStatus()
  filterPlants()
  const requested = new URLSearchParams(location.search).get('uuid')
  const preferred = catalog.plants.find(p => p.uuid === requested) || catalog.plants.find(p => p.uuid === 'f009a176-94e3-4387-b682-0f416bf31afd')
  if (preferred) {
    el('plant-search').value = preferred.uuid
    filterPlants()
    el('plant-select').value = preferred.uuid
    await selectPlant()
  }
}
start().catch(error => { el('catalog-status').textContent = 'تعذّر تجهيز صفحة التحديث. ' + error.message })
