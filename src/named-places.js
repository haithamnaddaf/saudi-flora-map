import { allowedRecords } from './data-client.js'

// Source names decide coverage. Coordinates and coordinate-derived administrative
// fields deliberately have no role here. See docs/named-place-policy.md.
const REGION_NAMES = {
  'SA-01': ['الرياض', 'Riyadh', 'Ar Riyad', 'Ar Riyadh'],
  'SA-02': ['مكة المكرمة', 'مكة', 'Makkah', 'Mecca', 'Makkah Al Mukarramah', 'Makkah Al Mokarramah'],
  'SA-03': ['المدينة المنورة', 'المدينة', 'Al Madinah', 'Medina', 'Madinah'],
  'SA-04': ['الشرقية', 'Eastern', 'Ash Sharqiyah', 'Ash Sharquiyah'],
  'SA-05': ['القصيم', 'Qassim', 'Al Qassim', 'Al Quassim'],
  'SA-06': ['حائل', 'Hail', "Ha'il"],
  'SA-07': ['تبوك', 'Tabuk'],
  'SA-08': ['الحدود الشمالية', 'Northern Borders', 'Al Hudud ash Shamaliyah'],
  'SA-09': ['جازان', 'جيزان', 'Jazan', 'Jizan'],
  'SA-10': ['نجران', 'Najran'],
  'SA-11': ['الباحة', 'Al Bahah', 'Al Baha', 'Bahah', 'Baha'],
  'SA-12': ['الجوف', 'Al Jawf', 'Jawf'],
  'SA-14': ['عسير', 'Asir', "'Asir", '`Asir', 'Aseer'],
}
const REGION_ONLY_NAMES = new Set(['SA-04', 'SA-05', 'SA-08', 'SA-12', 'SA-14'])
const REVIEWED_REGIONAL_PLACES = [
  ['SA-04', ['الظهران', 'Dhahran', 'الدمام', 'Dammam', 'Ad Dammam']],
  ['SA-02', ['المويه', 'Al Muwayh', 'Al Muwayeh', 'Al Muwaih']],
  ['SA-11', ['جبال شدا', 'جبل شدا الأسفل']],
  ['SA-06', ['جبل أجا']],
  ['SA-14', ['جبال عسير', 'تهامة عسير', 'السودة']],
]
const SPELLINGS = {
  'الوجه': ['Al Wajh', 'Al Wejh'], 'أملج': ['Umluj', 'Umlaj'],
  'العلا': ['AlUla', 'Al Ula'], 'الطائف': ['Taif', 'At Taif', 'Al Taif'],
  'جدة': ['Jeddah', 'Jiddah', 'Djeddah'], 'الحناكية': ['Al Hanakiyah', 'Al Hinakiyah'],
  'خيبر': ['Khaybar', 'Khyber'], 'فيفا': ['فيفاء', 'Fayfa', 'Fayfaa', 'Faifa'],
  'حائل': ["Ha'il", 'Hail'], 'الرياض': ['Riyadh', 'Ar Riyad', 'Ar Riyadh'],
  'مكة المكرمة': ['Makkah', 'Mecca'], 'المدينة المنورة': ['Al Madinah', 'Medina', 'Madinah'],
  'فرسان': ['Farasan', 'جزر فرسان', 'أرخبيل فرسان', 'Farasan Islands', 'Farasan Alkabir Island'],
}
const indexCache = new WeakMap()
const valueText = value => typeof value === 'string' ? value.trim() : ''
export const normalizePlaceName = value => valueText(value).normalize('NFKD')
  .replace(/\p{M}/gu, '').replace(/[ـ'’`ʻʿ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
const bareName = value => normalizePlaceName(value)
  .replace(/^(?:محافظة|مدينة|امارة|بلدية) /u, '').replace(/ (?:governorate|municipality)$/u, '')
const containsName = (text, name) => name && (` ${text} `).includes(` ${name} `)
const removeName = (text, name) => (` ${text} `).split(` ${name} `).join(' ').trim()

function geographyIndex(governorates, regions) {
  if (!Array.isArray(governorates) || !Array.isArray(regions)) throw new TypeError('Place names require governorate and region arrays')
  let byRegions = indexCache.get(governorates)
  if (!byRegions) { byRegions = new WeakMap(); indexCache.set(governorates, byRegions) }
  if (byRegions.has(regions)) return byRegions.get(regions)
  const entries = governorates.map(item => ({ item, names: [...new Set([
    item.name, item.nameEn, ...(item.aliases || []), ...(Object.hasOwn(SPELLINGS, item.name) ? SPELLINGS[item.name] : []),
  ].map(bareName).filter(Boolean))].sort((a, b) => b.length - a.length) }))
  const regional = Object.entries(REGION_NAMES).map(([id, names]) => ({
    item: regions.find(region => region.id === id) || {id, name: names[0]},
    names: [...new Set(names.map(normalizePlaceName))],
    phrases: [...new Set(names.flatMap(name => {
      const plain = normalizePlaceName(name)
      return [`منطقة ${plain}`, `المنطقة ${plain}`, `في نطاق ${plain}`, `${plain} region`, `${plain} province`,
        `${plain} principality`, `province of ${plain}`, `region of ${plain}`]
    }))].sort((a, b) => b.length - a.length),
  }))
  const result = {entries, regional}
  byRegions.set(regions, result)
  return result
}

function namedRegions(text, index, dedicatedField = false) {
  return index.regional.filter(({item, names, phrases}) => phrases.some(name => containsName(text, name))
    || (dedicatedField ? names.includes(text) : REGION_ONLY_NAMES.has(item.id) && names.some(name => containsName(text, name))))
}

function regionMatch(entry, matchKind) {
  return {level: 'region', id: entry.item.id, name: entry.item.name, matchedName: entry.item.name, matchKind}
}

function addressRegion(originalPlace, index) {
  const parts = valueText(originalPlace).split(/[,،]/u).map(normalizePlaceName).filter(Boolean)
  while (parts.length && /^(?:sa|sau|ksa|saudi arabia|arabie saoudite|arabia saudita|السعودية|المملكة العربية السعودية|\d{4,6})$/u.test(parts.at(-1))) parts.pop()
  if (parts.length < 2) return null
  const name = parts.at(-1)
  const matches = namedRegions(name, index, true)
  return matches.length === 1 ? {entry: matches[0], name} : null
}

function governorateMatches(text, index) {
  const matches = index.entries.filter(entry => entry.names.some(name => containsName(text, name)))
  // Prefer a full compound name over a shorter name contained within it, e.g.
  // Badr Al Janub must not also become the separate Badr governorate.
  return matches.filter(entry => {
    let remainder = text
    for (const other of matches) {
      if (other === entry) continue
      for (const name of other.names) if (entry.names.some(short => short !== name && containsName(name, short))) {
        remainder = removeName(remainder, name)
      }
    }
    return entry.names.some(name => containsName(remainder, name))
  })
}

function relativeDescription(text, matches) {
  let rest = text
  for (const entry of matches) for (const name of entry.names) rest = removeName(rest, name)
  return /(?:^| )(?:between|near|outside|north|south|east|west|northeast|northwest|southeast|southwest|northwards|southwards|road|route|شمال|جنوب|شرق|غرب|شمالي|جنوبي|شرقي|غربي|بين|قرب|بالقرب|طريق|علي بعد|يبعد|خارج)(?: |$)/u.test(rest)
    || /(?:^| )\d+(?:[.,]\d+)? (?:km|kms|kilometres|kilometers|miles|كم)(?: |$)/u.test(rest)
    || /^(?:n|s|e|w|ne|nw|se|sw) /u.test(rest)
}

/** Resolve an original place string; optional publisherRegionOriginal is the
 * publisher's stateProvince text, not a regionId inferred from coordinates. */
export function resolveNamedPlace(originalPlace, governorates, regions, {publisherRegionOriginal = ''} = {}) {
  const index = geographyIndex(governorates, regions)
  const text = normalizePlaceName(originalPlace)
  const publisherText = normalizePlaceName(publisherRegionOriginal)
  const address = addressRegion(originalPlace, index)
  const explicitRegions = [...new Map([
    ...namedRegions(text, index), ...(address ? [address.entry] : []),
  ].map(entry => [entry.item.id, entry])).values()]
  const publisherRegions = namedRegions(publisherText, index, true)
  let localText = text
  if (address) localText = removeName(localText, address.name)
  for (const entry of explicitRegions) {
    for (const phrase of [...entry.phrases, ...(REGION_ONLY_NAMES.has(entry.item.id) ? entry.names : [])]) {
      localText = removeName(localText, phrase)
    }
  }
  let matched = governorateMatches(localText, index)
  let matchKind = 'source_locality'
  const isRelative = relativeDescription(localText, matched)
  if (!matched.length && publisherText && !publisherRegions.length) {
    // Some publishers put a unique county name such as AlUla in stateProvince.
    // Read that name as published, while retaining the exact original field.
    matched = index.entries.filter(entry => entry.names.includes(publisherText))
    matchKind = 'source_administrative_name'
  }
  const regionCandidates = [...new Map([...explicitRegions, ...publisherRegions].map(entry => [entry.item.id, entry])).values()]
  if (matched.length === 1 && !isRelative) {
    const governorate = matched[0].item
    if (regionCandidates.some(entry => entry.item.id !== governorate.regionId)) {
      return {level: 'unresolved', reason: 'conflicting_published_names'}
    }
    if (governorate.isRegionalCapital) {
      return regionMatch(index.regional.find(entry => entry.item.id === governorate.regionId), 'named_regional_capital')
    }
    return {level: 'governorate', id: governorate.id, name: governorate.name, regionId: governorate.regionId,
      matchedName: governorate.name, matchKind}
  }
  if (regionCandidates.length === 1) return regionMatch(regionCandidates[0], publisherRegions.length ? 'source_region' : 'named_region')
  if (regionCandidates.length > 1) return {level: 'unresolved', reason: 'multiple_published_regions'}
  // A small, reviewed name-to-region table covers named places for which this
  // boundary asset does not supply an individual governorate polygon.
  const knownRegions = REVIEWED_REGIONAL_PLACES.filter(([, names]) => names.some(name => containsName(text, normalizePlaceName(name))))
  if (!isRelative && knownRegions.length === 1) {
    const entry = index.regional.find(candidate => candidate.item.id === knownRegions[0][0])
    if (entry) return regionMatch(entry, 'reviewed_named_place_region')
  }
  return {level: 'unresolved', reason: !text && !publisherText ? 'source_place_missing'
    : isRelative ? 'relative_location' : matched.length > 1 ? 'multiple_named_governorates' : 'place_name_not_resolved'}
}

/** observations must be obtained through spatialForPlant, preserving its UUID,
 * version and source-binding gate. Recheck record/reference identity here too. */
export function coverageByNamedPlace(plant, observations, governorates, regions) {
  const groups = {governorates: new Map(), regions: new Map()}, unresolved = []
  const records = allowedRecords(plant)
  const byRecord = new Map(records.map(record => [record.id, record]))
  const matchedObservations = new Map(), seen = new Set()
  for (const observation of observations || []) {
    const record = byRecord.get(observation?.recordId)
    if (!record || record.sourceKind !== 'occurrence_records' || record.sourceId !== observation.sourceId
      || !record.recordUrls?.includes(observation.referenceUrl) || seen.has(observation.id)) continue
    seen.add(observation.id)
    if (!matchedObservations.has(record.id)) matchedObservations.set(record.id, [])
    matchedObservations.get(record.id).push(observation)
  }
  function add(record, observation, originalPlace, options = {}, excel = false) {
    const match = resolveNamedPlace(originalPlace, governorates, regions, options)
    const evidence = {record, observation, originalPlace, publisherRegionOriginal: options.publisherRegionOriginal || '',
      matchedName: match.matchedName || '', matchKind: excel && match.level !== 'unresolved' ? 'reviewed_excel_place' : match.matchKind || ''}
    if (match.level === 'unresolved') { unresolved.push({...evidence, reason: match.reason}); return }
    const map = match.level === 'governorate' ? groups.governorates : groups.regions
    if (!map.has(match.id)) map.set(match.id, {id: match.id, name: match.name,
      regionId: match.level === 'region' ? match.id : match.regionId, evidence: []})
    map.get(match.id).evidence.push(evidence)
  }
  for (const record of records) {
    if (record.sourceKind !== 'occurrence_records') { add(record, null, record.place); continue }
    const items = matchedObservations.get(record.id) || []
    if (items.length) {
      for (const item of items) add(record, item, valueText(item.localityOriginal), {
        publisherRegionOriginal: valueText(item.publisherRegionOriginal),
      })
    } else if (record.provenance?.placeNameReviewed === true) {
      add(record, null, record.place, {}, true)
    } else {
      unresolved.push({record, observation: null, originalPlace: '', publisherRegionOriginal: '', matchedName: '',
        matchKind: '', reason: 'original_observation_name_unavailable'})
    }
  }
  const ordered = values => [...values].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  return {governorates: ordered(groups.governorates.values()), regions: ordered(groups.regions.values()), unresolved}
}
