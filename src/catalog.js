export const REGION_IDS = ['01','02','03','04','05','06','07','08','09','10','11','12','14'].map(n => 'SA-' + n)
export const COLUMNS = ['plantId', 'regionId', 'place', 'sourceTitle', 'sourceUrl', 'locator', 'evidence']
export const RELEASE = '1.0.0'
const validText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 1500
const identity = record => JSON.stringify(['plantId','regionId','place','sourceUrl','locator'].map(key => record[key]?.normalize('NFC').trim()))
export const arabicNumber = n => new Intl.NumberFormat('ar-SA-u-nu-arab').format(n)

export function verifiedRecords(data, plantId, regionId = '', place = '') {
  return data.records.filter(r => r.status === 'verified' && r.plantId === plantId &&
    (!regionId || r.regionId === regionId) && (!place || r.place === place))
}

function recordErrors(record, plantIds) {
  const errors = []
  for (const key of COLUMNS) {
    if (!validText(record[key])) errors.push('أدخل نصًا في الحقل ' + key + ' بطول أقصاه ١٥٠٠ حرف.')
  }
  if (!plantIds.has(record.plantId)) errors.push('اختر معرّف نبات موجودًا في دليل الإدخال.')
  if (!REGION_IDS.includes(record.regionId)) errors.push('استخدم رمز منطقة سعودية من دليل الإدخال.')
  if (validText(record.sourceUrl)) {
    try {
      const url = new URL(record.sourceUrl)
      if (url.protocol !== 'https:' || url.username || url.password) throw Error()
    } catch { errors.push('أدخل رابط مصدر صالحًا يبدأ بـ https://.') }
  }
  return errors
}

export function validateDataset(data) {
  if (data?.schemaVersion !== 1 || data?.country !== 'SA' ||
      !/^\d+\.\d+\.\d+(?:-draft\.\d+)?$/.test(data.version) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.released) ||
      !Array.isArray(data.plants) || !data.plants.length || !Array.isArray(data.records)) {
    throw Error('Invalid distribution dataset header or collections')
  }
  const plants = new Set()
  for (const plant of data.plants) {
    if (!['id','name','scientificName','family','habitat','description','alt','image','photoPlace'].every(k => validText(plant[k])) ||
        !/^[a-z]+(?:-[a-z]+)+$/.test(plant.id) || plant.image !== plant.id + '.webp' || plants.has(plant.id)) {
      throw Error('Invalid or duplicate plant: ' + plant.id)
    }
    plants.add(plant.id)
  }
  const seen = new Set()
  for (const [i, r] of data.records.entries()) {
    const errors = recordErrors(r, plants)
    if (errors.length || !['verified','pending'].includes(r.status)) throw Error('Record ' + (i + 1) + ': ' + errors.join(' '))
    const id = identity(r)
    if (seen.has(id)) throw Error('Duplicate evidence in record ' + (i + 1))
    seen.add(id)
  }
  return data
}

export function validateAtlas(data, regions, bindings) {
  validateDataset(data)
  if (!Array.isArray(regions) || regions.length !== 13 ||
      REGION_IDS.some(id => !regions.some(r => r.id === id && validText(r.name) && /^M[\d., MZ-]+Z$/.test(r.path) &&
        r.label?.length === 2 && r.label.every(Number.isFinite)))) throw Error('Incomplete Saudi ADM1 geometry')
  const keyed = new Set()
  for (const b of bindings) {
    const key = JSON.stringify([b.entryId, b.senseId])
    if (![b.entryId,b.senseId].every(validText) || keyed.has(key) || !data.plants.some(p => p.id === b.plantId)) {
      throw Error('Invalid or ambiguous external binding')
    }
    keyed.add(key)
  }
}

// Opaque, case-sensitive IDs. Never infer a sense from a partially matching entry.
export function resolveContext(params, bindings, defaultPlantId) {
  if (!params.has('entryId') && !params.has('senseId')) return defaultPlantId
  if (params.getAll('entryId').length !== 1 || params.getAll('senseId').length !== 1) return null
  return bindings.find(b => b.entryId === params.get('entryId') && b.senseId === params.get('senseId'))?.plantId ?? null
}

export function stageRows(rows, data) {
  const errors = []
  const pending = []
  if (!rows.length || rows[0].length !== COLUMNS.length || COLUMNS.some(k => !rows[0].includes(k))) {
    return { errors: ['تحقق من أسماء الأعمدة السبعة في ورقة Records باستخدام النموذج.'], pending: [] }
  }
  if (rows.length > 501) return { errors: ['قسّم الملف إلى دفعات من ٥٠٠ صف أو أقل.'], pending: [] }
  const plantIds = new Set(data.plants.map(p => p.id))
  const seen = new Set(data.records.map(identity))
  rows.slice(1).forEach((cells, i) => {
    if (cells.every(v => v == null || v === '')) return
    const r = Object.fromEntries(rows[0].map((key, j) => [key, typeof cells[j] === 'string' ? cells[j].trim() : '']))
    const problems = recordErrors(r, plantIds)
    if (cells.slice(COLUMNS.length).some(v => v != null)) problems.push('احذف الخلايا الزائدة خارج الأعمدة المحددة.')
    const id = identity(r)
    if (seen.has(id)) problems.push('الشاهد مكرر. راجع الموقع والمصدر وموضع الشاهد.')
    problems.forEach(msg => errors.push('الصف ' + arabicNumber(i + 2) + ' — ' + msg))
    seen.add(id)
    pending.push({ ...r, status: 'pending' })
  })
  if (!pending.length) errors.push('أضف صف بيانات واحدًا على الأقل إلى ورقة Records.')
  return { errors, pending: errors.length ? [] : pending }
}

export function makeDraft(data, pending) {
  if (!pending.length) throw Error('Empty draft')
  const [major, minor, patch] = data.version.split('.').map(Number)
  return validateDataset({ ...data, version: [major,minor,patch + 1].join('.') + '-draft.1',
    records: [...data.records, ...pending.map(r => ({ ...r, status: 'pending' }))] })
}
