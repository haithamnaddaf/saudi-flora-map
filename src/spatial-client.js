import { DEFAULT_DATA_URL, allowedRecords, getDataBase, isUuid, safeSourceUrl } from './data-client.js'

const REGION_IDS = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '14'].map(code => 'SA-' + code))
const VERSION = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/
const BINDING_FIELDS = ['regionId', 'place', 'sourceId', 'sourceTitle', 'sourceUrl', 'sourceKind', 'sourceScientificName', 'locator']
const cache = new Map(), pending = new Map()
const CACHE_LIMIT = 48
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.length <= 20000
const requiredText = value => text(value) && value.trim().length > 0
const region = value => value === null || REGION_IDS.has(value)

function failure(code, message, cause) {
  const error = new Error(message, cause ? {cause} : undefined)
  error.code = code
  return error
}

function check(condition, message) {
  if (!condition) throw failure('invalid_data', message)
}

function licenseUrl(value) {
  if (value === '') return true
  if (!text(value) || /\s/.test(value)) return false
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

export function validateSpatial(spatial, expectedUuid) {
  check(object(spatial) && spatial.schemaVersion === 1 && isUuid(spatial.uuid) &&
    VERSION.test(spatial.baseVersion) && requiredText(spatial.scientificName), 'ملف تفاصيل المكان غير صالح.')
  if (expectedUuid !== undefined) check(spatial.uuid === expectedUuid, 'تفاصيل المكان لا تطابق UUID المطلوب.')
  check(object(spatial.bindings) && Array.isArray(spatial.observations), 'روابط تفاصيل المكان غير صالحة.')
  for (const [recordId, binding] of Object.entries(spatial.bindings)) {
    check(requiredText(recordId) && object(binding) && region(binding.regionId), 'رابط موضع غير صالح.')
    check(BINDING_FIELDS.filter(key => key !== 'regionId').every(key => requiredText(binding[key])), 'مرجع موضع غير مكتمل.')
    check(binding.sourceKind === 'occurrence_records' && safeSourceUrl(binding.sourceUrl) !== null &&
      Array.isArray(binding.recordUrls) && binding.recordUrls.length > 0 &&
      binding.recordUrls.every(url => safeSourceUrl(url) !== null) &&
      new Set(binding.recordUrls).size === binding.recordUrls.length, 'إحالات الموضع غير صالحة.')
  }
  const ids = new Set(), usedBindings = new Set()
  for (const item of spatial.observations) {
    check(object(item) && typeof item.id === 'string' && /^\d+$/.test(item.id) && !ids.has(item.id) &&
      requiredText(item.recordId), 'معرّف رصد مكرر أو غير صالح.')
    const binding = Object.hasOwn(spatial.bindings, item.recordId) && spatial.bindings[item.recordId]
    check(binding && region(item.regionId) && item.regionId === binding.regionId &&
      item.sourceId === binding.sourceId && item.referenceUrl === 'https://www.gbif.org/occurrence/' + item.id &&
      binding.recordUrls.includes(item.referenceUrl), 'سجل الرصد لا يطابق مرجعه.')
    check(['localityOriginal', 'governorateOriginal', 'governorateId', 'eventDate', 'basisOfRecord', 'license']
      .every(key => text(item[key])) && requiredText(item.basisOfRecord), 'تفاصيل سجل الرصد غير مكتملة.')
    check(item.publisherRegionOriginal === undefined || text(item.publisherRegionOriginal), 'اسم المنطقة الأصلي لدى الناشر غير صالح.')
    check(licenseUrl(item.license) && typeof item.governorateDerived === 'boolean' &&
      item.governorateDerived === Boolean(item.governorateId || item.governorateOriginal), 'إسناد المحافظة أو ترخيص الرصد غير صالح.')
    check(item.governorateId === '' || /^SAU\.\d+\.\d+_\d+$/.test(item.governorateId), 'إسناد المحافظة ليس معرّف GADM سعوديًا.')
    check(item.uncertaintyMeters === null || (Number.isFinite(item.uncertaintyMeters) && item.uncertaintyMeters > 0), 'هامش الموقع غير صالح.')
    check(typeof item.pointEligible === 'boolean' && Array.isArray(item.pointSuppressionReasons) &&
      item.pointSuppressionReasons.every(requiredText) && new Set(item.pointSuppressionReasons).size === item.pointSuppressionReasons.length,
    'حالة عرض النقطة غير صالحة.')
    if (item.pointEligible) {
      check(Number.isFinite(item.latitude) && item.latitude >= -90 && item.latitude <= 90 &&
        Number.isFinite(item.longitude) && item.longitude >= -180 && item.longitude <= 180 &&
        Number.isFinite(item.uncertaintyMeters) && item.uncertaintyMeters > 0 && item.uncertaintyMeters <= 1000 &&
        item.pointSuppressionReasons.length === 0, 'نقطة الرصد لا تستوفي شروط الدقة المنشورة.')
    } else {
      check(item.latitude === null && item.longitude === null && item.pointSuppressionReasons.length > 0,
        'سجل غير مؤهل يحتوي إحداثيات قابلة للرسم.')
    }
    ids.add(item.id)
    usedBindings.add(item.recordId)
  }
  check(usedBindings.size === Object.keys(spatial.bindings).length, 'ملف المكان يحتوي روابط غير مستخدمة.')
  return spatial
}

function bindingMatches(record, binding) {
  if (!binding || !BINDING_FIELDS.every(key => record[key] === binding[key])) return false
  const urls = [...(record.recordUrls || [])].sort()
  const boundUrls = [...binding.recordUrls].sort()
  return urls.length === boundUrls.length && urls.every((url, index) => url === boundUrls[index])
}

// This returns both drawable and text-only observations. Consumers draw only
// pointEligible === true; deleting/moving/reciting an Excel record invalidates
// its old observations without editing or guessing new coordinates.
export function spatialForPlant(plant, spatial) {
  if (!plant || !spatial || spatial.uuid !== plant.uuid || spatial.baseVersion !== plant.version ||
      spatial.scientificName !== plant.scientificName) return []
  validateSpatial(spatial, plant.uuid)
  const records = new Map(allowedRecords(plant).map(record => [record.id, record]))
  const matched = new Set([...records].filter(([id, record]) => bindingMatches(record, spatial.bindings[id])).map(([id]) => id))
  return spatial.observations.filter(item => matched.has(item.recordId))
}

function remember(url, value) {
  cache.delete(url)
  cache.set(url, value)
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
  return value
}

export function loadSpatial(uuid, base = DEFAULT_DATA_URL) {
  if (!isUuid(uuid)) throw failure('invalid_uuid', 'معرّف النبات UUID غير صالح.')
  const url = new URL('spatial/' + uuid + '.json', getDataBase(base)).href
  if (cache.has(url)) return Promise.resolve(remember(url, cache.get(url)))
  if (pending.has(url)) return pending.get(url)
  const request = (async () => {
    let response
    try { response = await fetch(url) } catch (cause) {
      throw failure('network', 'تعذّر تحميل تفاصيل المكان. أعد المحاولة.', cause)
    }
    if (response.status === 404) return remember(url, null)
    if (!response.ok) throw failure('network', 'تعذّر تحميل تفاصيل المكان. أعد المحاولة.')
    let spatial
    try { spatial = await response.json() } catch (cause) {
      throw failure('invalid_data', 'ملف تفاصيل المكان غير قابل للقراءة.', cause)
    }
    return remember(url, validateSpatial(spatial, uuid))
  })()
  pending.set(url, request)
  request.then(() => pending.delete(url), () => pending.delete(url))
  return request
}
