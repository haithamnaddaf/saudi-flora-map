import { safeSourceUrl, validatePlant, validateRecord } from './data-client.js'

export const STORAGE_KEY = 'saudi-flora-map:overrides:v2'
export const UPDATE_EVENT = 'flora-map:data-changed'
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export const MAX_IMPORT_ROWS = 500
export const UPDATE_COLUMNS = [
  'uuid', 'scientificName', 'recordId', 'action', 'regionId', 'place',
  'sourceKind', 'sourceTitle', 'sourceUrl', 'sourceAuthor', 'sourceYear',
  'sourceEdition', 'locator', 'evidence', 'reviewStatus'
]

const REGION_IDS = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '14'].map(n => 'SA-' + n))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RECORD_ID = /^[A-Za-z0-9._:-]{1,180}$/
const SAFE_STATUS = 'documented_for_supplied_taxon'
const normalizedName = text => typeof text === 'string' ? text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase() : ''
const text = (value, limit = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit
const keyOf = change => JSON.stringify([change.uuid, change.recordId])
const blank = value => value == null || value === ''

function isSafeUrl(value) {
  return text(value, 3000) && safeSourceUrl(value) !== null
}

function sourceErrors(record) {
  const errors = []
  for (const key of ['place', 'sourceKind', 'sourceTitle', 'locator', 'evidence']) {
    if (!text(record[key])) errors.push('أكمل الحقل ' + key + ' بنص لا يتجاوز ٢٠٠٠ حرف.')
  }
  if (record.regionId != null && !REGION_IDS.has(record.regionId)) {
    errors.push('استخدم رمز منطقة من الدليل، أو اتركه فارغًا إذا لم يُحسم الإسناد الإداري.')
  }
  if (!['verified', 'pending'].includes(record.status)) errors.push('استخدم verified أو pending في reviewStatus.')
  if (record.sourceUrl) {
    if (!isSafeUrl(record.sourceUrl)) errors.push('أدخل رابط HTTPS صالحًا للمصدر دون اسم مستخدم أو كلمة مرور.')
  } else {
    const book = /book|encyclop|dictionary|كتاب|موسوع|معجم/i.test(record.sourceKind || '')
    if (!book || !text(record.sourceAuthor, 500) || !text(record.year, 100) || !text(record.locator)) {
      errors.push('المصدر بلا رابط يحتاج نوع كتاب/معجم/موسوعة مع المؤلف أو الجهة والسنة والصفحة أو القسم.')
    }
  }
  for (const key of ['sourceAuthor', 'sourceEdition', 'year']) {
    if (record[key] != null && record[key] !== '' && !text(record[key], 500)) errors.push('راجع الحقل ' + key + '.')
  }
  if (record.recordUrls && (!Array.isArray(record.recordUrls) || record.recordUrls.some(url => !isSafeUrl(url)))) {
    errors.push('توجد إحالة رصد برابط غير صالح.')
  }
  // The public map and the import path share the same final record contract.
  // Field-specific messages above help an editor repair an Excel row.
  try { validateRecord(record) } catch (error) { errors.push(error.message) }
  return errors
}

function assertPatch(patch, baseVersion) {
  if (!patch || patch.schemaVersion !== 2 || patch.baseVersion !== baseVersion ||
      typeof patch.updatedAt !== 'string' || !Number.isFinite(Date.parse(patch.updatedAt)) ||
      !Array.isArray(patch.changes) || patch.changes.length > 10000) {
    throw Error('ملف التغييرات غير صالح أو يعود إلى إصدار بيانات مختلف.')
  }
  const seen = new Set()
  for (const c of patch.changes) {
    if (!c || !UUID.test(c.uuid) || !text(c.scientificName, 1000) || !text(c.recordId, 180) || !RECORD_ID.test(c.recordId) ||
        !['upsert', 'delete'].includes(c.action) || seen.has(keyOf(c))) {
      throw Error('ملف التغييرات يتضمن علاقة غير صالحة أو مكررة.')
    }
    seen.add(keyOf(c))
    if (c.action === 'upsert' && (!c.record || c.record.id !== c.recordId || sourceErrors(c.record).length)) {
      throw Error('إحدى علاقات المصدر في ملف التغييرات غير مكتملة.')
    }
    if (!c.provenance || !text(c.provenance.file, 300) || c.provenance.sheet !== 'Records' ||
        !Number.isInteger(c.provenance.row) || c.provenance.row < 2) {
      throw Error('إسناد صف Excel مفقود في ملف التغييرات.')
    }
    if (c.provenance.importedAt !== undefined && (typeof c.provenance.importedAt !== 'string' ||
        !Number.isFinite(Date.parse(c.provenance.importedAt)))) {
      throw Error('تاريخ استيراد صف Excel غير صالح.')
    }
  }
  return patch
}

function lookup(collection, uuid) {
  return collection instanceof Map ? collection.get(uuid) : collection?.[uuid]
}

// Non-cryptographic stable key. It identifies a citation; it grants no authority.
function sourceKey(record) {
  const value = JSON.stringify([record.sourceTitle, record.sourceUrl, record.sourceAuthor, record.year, record.sourceEdition])
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.codePointAt(0), 16777619)
  return 'EXCEL-SOURCE-' + (hash >>> 0).toString(16)
}

export function validateUpdateRows(rows, catalog, plantsByUuid, { fileName = 'import.xlsx', now = new Date().toISOString() } = {}) {
  const errors = [], changes = []
  const summary = { added: 0, updated: 0, deleted: 0, unchanged: 0, pending: 0, verified: 0, plants: 0 }
  const fail = message => ({ errors: [message], changes: [], summary })
  if (!Array.isArray(rows) || !Array.isArray(rows[0]) || rows[0].length !== UPDATE_COLUMNS.length ||
      new Set(rows[0]).size !== UPDATE_COLUMNS.length || UPDATE_COLUMNS.some(c => !rows[0].includes(c))) {
    return fail('استخدم أعمدة نموذج الإصدار الثاني كاملة في ورقة Records، دون تكرار أو تغيير أسماء الأعمدة.')
  }
  if (rows.length > MAX_IMPORT_ROWS + 1) return fail('الحد الأقصى ٥٠٠ صف في كل دفعة.')
  if (!catalog || !Array.isArray(catalog.plants)) return fail('تعذّر تحميل دليل UUID. أعد تحميل الصفحة ثم أعد المحاولة.')
  if (!text(fileName, 300) || !Number.isFinite(Date.parse(now))) return fail('تعذّر تحديد إسناد الملف وتاريخ استيراده.')
  const plants = new Map(catalog.plants.map(p => [p.uuid, p]))
  const seen = new Set(), affected = new Set()
  rows.slice(1).forEach((cells, i) => {
    if (!Array.isArray(cells)) { errors.push('الصف ' + (i + 2) + ': صف غير صالح.'); return }
    if (cells.every(blank)) return
    const problems = []
    const raw = Object.fromEntries(rows[0].map((column, j) => [column, typeof cells[j] === 'string' ? (column === 'sourceUrl' ? cells[j] : cells[j].trim()) :
      (column === 'sourceYear' && typeof cells[j] === 'number' && Number.isFinite(cells[j]) ? String(cells[j]) : '')]))
    if (cells.slice(UPDATE_COLUMNS.length).some(v => !blank(v))) problems.push('احذف الخلايا الزائدة خارج الأعمدة المحددة.')
    const entry = plants.get(raw.uuid), current = lookup(plantsByUuid, raw.uuid)
    if (!UUID.test(raw.uuid) || !entry) problems.push('UUID غير معروف. انسخ المعرف من دليل النباتات دون الاعتماد على الاسم العربي.')
    else {
      if (entry.status !== SAFE_STATUS) problems.push('هذا المدخل محجوب أو لم تجتز هويته قواعد العرض. يلزم حسم المراجعة خارج هذا المصنف.')
      if (normalizedName(raw.scientificName) !== normalizedName(entry.scientificName)) {
        problems.push('الاسم العلمي لا يطابق هوية UUID. لا تنقل دليل النوع القديم إلى هوية مصححة تلقائيًا.')
      }
      if (!current || current.uuid !== entry.uuid || normalizedName(current.scientificName) !== normalizedName(entry.scientificName)) {
        problems.push('تعذّر التحقق من بيانات النبات الحالية؛ أعد المحاولة بعد تحميلها.')
      }
    }
    if (!RECORD_ID.test(raw.recordId)) problems.push('recordId مطلوب: استخدم حروفًا لاتينية أو أرقامًا أو - _ . : وبحد أقصى ١٨٠ حرفًا.')
    if (!['upsert', 'delete'].includes(raw.action)) problems.push('اختر upsert للإضافة أو التعديل، أو delete للحذف الصريح.')
    const identity = keyOf({ uuid: raw.uuid, recordId: raw.recordId })
    if (seen.has(identity)) problems.push('العلاقة نفسها مكررة في هذا الملف. أبقِ إجراءً واحدًا لكل UUID وrecordId.')
    seen.add(identity)
    const previous = current?.records?.find(r => r.id === raw.recordId)
    if (raw.action === 'delete' && !previous) problems.push('العلاقة المراد حذفها غير موجودة لهذا UUID. لا يمكن حذف علاقة نبات آخر.')
    const provenance = { file: fileName, sheet: 'Records', row: i + 2, importedAt: now }
    const change = { uuid: raw.uuid, scientificName: entry?.scientificName || raw.scientificName,
      recordId: raw.recordId, action: raw.action, provenance }
    if (raw.action === 'upsert') {
      const record = {
        id: raw.recordId, regionId: raw.regionId || null, place: raw.place,
        sourceKind: raw.sourceKind, sourceTitle: raw.sourceTitle, sourceUrl: raw.sourceUrl,
        sourceAuthor: raw.sourceAuthor, year: raw.sourceYear, sourceEdition: raw.sourceEdition,
        locator: raw.locator, evidence: raw.evidence, sourceScientificName: entry?.scientificName || raw.scientificName,
        accessedOn: '', status: raw.reviewStatus, provenance
      }
      record.sourceId = sourceKey(record)
      if (previous && ['sourceTitle', 'sourceUrl', 'sourceKind'].every(key => record[key] === previous[key])) {
        record.sourceId = previous.sourceId || record.sourceId
        record.accessedOn = previous.accessedOn
        record.sourceScientificName = previous.sourceScientificName
        if (previous.recordUrls) record.recordUrls = [...previous.recordUrls]
      }
      problems.push(...sourceErrors(record))
      change.record = record
    }
    if (problems.length) { errors.push(...problems.map(problem => 'الصف ' + (i + 2) + ': ' + problem)); return }
    if (previous && change.record && ['regionId', 'place', 'sourceKind', 'sourceTitle', 'sourceUrl', 'sourceAuthor', 'year', 'sourceEdition', 'locator', 'evidence', 'status'].every(key =>
      String(previous[key] ?? '') === String(change.record[key] ?? ''))) {
      summary.unchanged++
      return
    }
    changes.push(change)
    affected.add(raw.uuid)
    if (raw.action === 'delete') summary.deleted++
    else {
      summary[previous ? 'updated' : 'added']++
      summary[change.record.status]++
    }
  })
  if (!changes.length && !errors.length && !summary.unchanged) errors.push('أضف صف بيانات واحدًا على الأقل إلى ورقة Records.')
  summary.plants = affected.size
  return { errors, changes: errors.length ? [] : changes, summary }
}

export function mergePatch(existing, changes, baseVersion, now = new Date().toISOString(), baselinePlants) {
  if (existing) assertPatch(existing, baseVersion)
  if (!Array.isArray(changes) || !changes.length) throw Error('لا توجد تغييرات لتطبيقها.')
  // Validate every submitted change before any overwrite or cancellation can
  // remove it from the final patch.
  assertPatch({ schemaVersion: 2, baseVersion, updatedAt: now, changes }, baseVersion)
  const merged = new Map((existing?.changes || []).map(c => [keyOf(c), c]))
  for (const change of changes) {
    const key = keyOf(change), prior = merged.get(key)
    if (change.action === 'delete' && prior?.action === 'upsert') {
      const original = lookup(baselinePlants, change.uuid)
      if (original) {
        validatePlant(original, change.uuid)
        if (original.version !== baseVersion || original.status !== SAFE_STATUS ||
            [change, prior].some(c => normalizedName(c.scientificName) !== normalizedName(original.scientificName))) {
          throw Error('لا تتطابق بيانات الأساس مع هوية التغييرات وإصدارها.')
        }
        if (!original.records.some(record => record.id === change.recordId)) {
          // This removes a local addition, not a source-release record.
          merged.delete(key)
          continue
        }
      }
    }
    merged.set(key, change)
  }
  return assertPatch({ schemaVersion: 2, baseVersion, updatedAt: now, changes: [...merged.values()] }, baseVersion)
}

export function applyOverrides(plant, patch) {
  if (!patch) return plant
  assertPatch(patch, plant.version)
  const changes = patch.changes.filter(c => c.uuid === plant.uuid)
  if (!changes.length) return plant
  if (plant.status !== SAFE_STATUS || changes.some(c => normalizedName(c.scientificName) !== normalizedName(plant.scientificName))) {
    throw Error('لا تنطبق التغييرات المحفوظة على هوية هذا النبات أو حالة مراجعته.')
  }
  const records = new Map(plant.records.map(r => [r.id, r]))
  for (const change of changes) {
    if (change.action === 'delete') records.delete(change.recordId)
    else records.set(change.recordId, structuredClone(change.record))
  }
  return { ...plant, records: [...records.values()], localOverrides: true, localUpdatedAt: patch.updatedAt }
}

export function readStoredPatch(storage, baseVersion) {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw == null) return null
  let patch
  try { patch = JSON.parse(raw) } catch { throw Error('التغييرات المحفوظة غير قابلة للقراءة. نزّل نسخة إن أمكن ثم استعد بيانات الإصدار.') }
  return assertPatch(patch, baseVersion)
}

export function saveStoredPatch(storage, patch) {
  assertPatch(patch, patch?.baseVersion)
  const raw = JSON.stringify(patch)
  // Let quota/security errors propagate. A failed write must not update the map.
  storage.setItem(STORAGE_KEY, raw)
  if (storage.getItem(STORAGE_KEY) !== raw) throw Error('لم يثبت حفظ التغييرات في المتصفح.')
  return patch
}

export function clearStoredPatch(storage) {
  storage.removeItem(STORAGE_KEY)
  if (storage.getItem(STORAGE_KEY) != null) throw Error('تعذّر استعادة بيانات الإصدار في هذا المتصفح.')
}
