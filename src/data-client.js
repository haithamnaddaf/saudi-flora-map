// This module intentionally has no DOM dependency. A map requests one UUID;
// only the separate explorer/import screens need the catalog.
export const DEFAULT_DATA_URL = new URL('../data/', import.meta.url).href

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VERSION = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/
const REGION_IDS = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '14'].map(id => 'SA-' + id))
const DISPLAY_STATUS = 'documented_for_supplied_taxon'
const STATUSES = new Set([DISPLAY_STATUS, 'identity_review_required', 'taxonomic_review_required',
  'cultivar_or_form_review_required', 'geographic_evidence_review_required', 'country_only', 'no_evidence_in_examined_sources'])
const plantCache = new Map()
const indexCache = new Map()
const pendingRequests = new Map()
const PLANT_CACHE_LIMIT = 48
const INDEX_CACHE_LIMIT = 4

function dataError(code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined)
  error.code = code
  return error
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value, maximum = 20000) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum
const requireData = (condition, message) => {
  if (!condition) throw dataError('invalid_data', message)
}

export function isUuid(value) {
  return typeof value === 'string' && UUID.test(value)
}

export function safeSourceUrl(value) {
  if (typeof value !== 'string' || !value || value !== value.trim() || /\s/.test(value)) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function getDataBase(explicit = DEFAULT_DATA_URL) {
  if (typeof explicit !== 'string' || !explicit.trim()) {
    throw dataError('invalid_data', 'رابط بيانات الخريطة غير صالح.')
  }
  let url
  try { url = new URL(explicit, DEFAULT_DATA_URL) } catch (cause) {
    throw dataError('invalid_data', 'رابط بيانات الخريطة غير صالح.', cause)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw dataError('invalid_data', 'استخدم رابط HTTP أو HTTPS لمجلد البيانات دون بيانات دخول أو معاملات إضافية.')
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url.href
}

function validateIdentity(plant) {
  requireData(object(plant) && isUuid(plant.uuid), 'معرّف النبات في البيانات غير صالح.')
  for (const key of ['senseId', 'name', 'scientificName', 'statusLabel']) {
    requireData(text(plant[key]), 'حقل هوية النبات غير مكتمل: ' + key)
  }
  requireData(STATUSES.has(plant.status), 'حالة مراجعة النبات غير معروفة.')
}

export function validateRecord(record) {
  requireData(object(record), 'سجل المصدر غير صالح.')
  for (const key of ['id', 'place', 'sourceId', 'sourceTitle', 'sourceKind', 'locator', 'evidence', 'sourceScientificName']) {
    requireData(text(record[key]), 'بيانات المصدر غير مكتملة: ' + key)
  }
  requireData(record.regionId === null || REGION_IDS.has(record.regionId), 'رمز المنطقة غير معروف.')
  requireData(['verified', 'pending'].includes(record.status), 'حالة مراجعة المصدر غير معروفة.')
  requireData(typeof record.accessedOn === 'string' &&
    (record.accessedOn === '' || /^\d{4}-\d{2}-\d{2}$/.test(record.accessedOn)), 'تاريخ الاطلاع غير صالح.')
  if (record.sourceUrl) {
    requireData(safeSourceUrl(record.sourceUrl) !== null, 'رابط المصدر غير آمن أو غير صالح.')
  } else {
    const book = /book|encyclop|dictionary|كتاب|موسوع|معجم/i.test(record.sourceKind)
    requireData(book && text(record.sourceAuthor) && text(record.year), 'المصدر الورقي يحتاج المؤلف والسنة والصفحة أو القسم.')
    requireData(record.sourceUrl === '' || record.sourceUrl == null, 'رابط المصدر غير صالح.')
  }
  for (const key of ['sourceAuthor', 'sourceEdition', 'year']) {
    requireData(record[key] == null || record[key] === '' || text(record[key]), 'حقل المرجع غير صالح: ' + key)
  }
  if (record.recordUrls !== undefined) {
    requireData(Array.isArray(record.recordUrls) && record.recordUrls.every(url => safeSourceUrl(url) !== null), 'إحدى إحالات الرصد غير صالحة.')
    requireData(new Set(record.recordUrls).size === record.recordUrls.length, 'إحالات الرصد مكررة في المصدر.')
  }
}

export function validatePlant(plant, expectedUuid) {
  requireData(object(plant) && plant.schemaVersion === 2 && VERSION.test(plant.version), 'إصدار بيانات النبات غير مدعوم.')
  validateIdentity(plant)
  if (expectedUuid !== undefined) {
    requireData(plant.uuid === expectedUuid, 'بيانات النبات لا تطابق UUID المطلوب.')
  }
  requireData(Array.isArray(plant.records), 'قائمة المصادر غير صالحة.')
  const ids = new Set()
  for (const record of plant.records) {
    validateRecord(record)
    requireData(!ids.has(record.id), 'معرّف المصدر مكرر داخل النبات.')
    ids.add(record.id)
  }
  requireData(plant.status === DISPLAY_STATUS || plant.records.length === 0, 'مدخل معلق يحتوي مصادر منشورة.')
  return plant
}

export function validateCatalog(catalog) {
  requireData(object(catalog) && catalog.schemaVersion === 2 && VERSION.test(catalog.version) &&
    catalog.country === 'SA' && /^\d{4}-\d{2}-\d{2}$/.test(catalog.released) && Array.isArray(catalog.plants), 'دليل النباتات غير صالح.')
  const ids = new Set()
  for (const plant of catalog.plants) {
    validateIdentity(plant)
    requireData(!ids.has(plant.uuid), 'UUID مكرر في دليل النباتات.')
    ids.add(plant.uuid)
    requireData(Array.isArray(plant.regionIds) && plant.regionIds.every(id => REGION_IDS.has(id)) &&
      new Set(plant.regionIds).size === plant.regionIds.length, 'مناطق النبات في الدليل غير صالحة.')
    requireData(plant.status === DISPLAY_STATUS || plant.regionIds.length === 0, 'مدخل معلق يحتوي مناطق منشورة.')
  }
  return catalog
}

export function validateRegions(regions) {
  requireData(Array.isArray(regions) && regions.length === 13, 'يجب توفير حدود المناطق السعودية الثلاث عشرة.')
  const ids = new Set()
  for (const region of regions) {
    requireData(object(region) && REGION_IDS.has(region.id) && !ids.has(region.id), 'معرّف منطقة مكرر أو غير معروف.')
    requireData(text(region.name) && text(region.path, 1_000_000) &&
      /^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/.test(region.path), 'شكل المنطقة أو اسمها غير صالح.')
    requireData(Array.isArray(region.label) && region.label.length === 2 && region.label.every(Number.isFinite), 'موضع تسمية المنطقة غير صالح.')
    ids.add(region.id)
  }
  return regions
}

export function allowedRecords(plant) {
  if (!plant || plant.status !== DISPLAY_STATUS || !Array.isArray(plant.records)) return []
  return plant.records.filter(record => record && record.status === 'verified')
}

function remember(cache, key, value, limit) {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > limit) cache.delete(cache.keys().next().value)
}

function loadJSON(url, validate, cache, limit) {
  if (cache.has(url)) {
    const value = cache.get(url)
    remember(cache, url, value, limit)
    return Promise.resolve(value)
  }
  if (pendingRequests.has(url)) return pendingRequests.get(url)
  const request = (async () => {
    let response
    try { response = await fetch(url) } catch (cause) {
      throw dataError('network', 'تعذّر تحميل بيانات الخريطة. أعد المحاولة.', cause)
    }
    if (response.status === 404) throw dataError('not_found', 'لا توجد بيانات لهذا المعرّف في هذا الإصدار.')
    if (!response.ok) throw dataError('network', 'تعذّر تحميل بيانات الخريطة. أعد المحاولة.')
    let value
    try { value = await response.json() } catch (cause) {
      throw dataError('invalid_data', 'ملف بيانات الخريطة غير قابل للقراءة.', cause)
    }
    const validated = validate(value)
    remember(cache, url, validated, limit)
    return validated
  })()
  pendingRequests.set(url, request)
  // Failed requests never poison the cache. Concurrent consumers share the same
  // in-flight request; only settled values count toward the bounded LRU cache.
  request.then(() => pendingRequests.delete(url), () => pendingRequests.delete(url))
  return request
}

export function loadRegions(base = DEFAULT_DATA_URL) {
  return loadJSON(new URL('regions.v1.json', getDataBase(base)).href, validateRegions, indexCache, INDEX_CACHE_LIMIT)
}

export function loadCatalog(base = DEFAULT_DATA_URL) {
  return loadJSON(new URL('catalog.v2.json', getDataBase(base)).href, validateCatalog, indexCache, INDEX_CACHE_LIMIT)
}

export function loadPlant(uuid, base = DEFAULT_DATA_URL) {
  if (!isUuid(uuid)) throw dataError('invalid_uuid', 'معرّف النبات UUID غير صالح.')
  return loadJSON(new URL(`plants/${uuid}.json`, getDataBase(base)).href,
    plant => validatePlant(plant, uuid), plantCache, PLANT_CACHE_LIMIT)
}
