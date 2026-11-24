// Editorial Arabic labels, keyed by source identity. Original citation fields are
// never modified. Naming sources and geographic limits: docs/arabic-presentation.md.
// This module has no DOM, network or storage dependency.
const SOURCE_TITLES_AR = Object.freeze({
  "EXCEL-SOURCE-e2e0d402": "نباتات شرق المملكة العربية السعودية — ماندافيل",
  "SRC-89ebcd364a2c4729": "نباتات الطائف — موقع نباتات السعودية",
  "SRC-10b78514dd1502d5": "نباتات المنطقة الشرقية — موقع نباتات السعودية",
  "SRC-017972adf1d715f5": "نباتات تبوك — موقع نباتات السعودية",
  "SRC-049d6c69f172ae1b": "نباتات جبال شدا — موقع نباتات السعودية",
  "SRC-08ab62b5f91e2a96": "نباتات جبال فيفا — موقع نباتات السعودية",
  "SRC-e13cd91fd1c9909b": "نباتات جزر فرسان — موقع نباتات السعودية",
  "SRC-5cef6001af551b5d": "نباتات حائل — موقع نباتات السعودية",
  "SRC-c3283246080d66ad": "نباتات عسير — موقع نباتات السعودية",
  "SRC-4ec0a42cf9be1981": "نباتات منطقة الباحة — موقع نباتات السعودية",
  "SRC-ac995707b7a963d3": "نباتات منطقة الجوف — موقع نباتات السعودية",
  "SRC-0bfbfc6392e9c550": "نباتات منطقة جازان — موقع نباتات السعودية",
  "SRC-29919d501c11940b": "نباتات نجد: الرياض والقصيم — موقع نباتات السعودية",
  "SRC-dea1b35f5d11f96c": "بطاقة نبات — مركز الغطاء النباتي",
  "SRC-a921946d947dd9d7": "بطاقة نبات — مركز الغطاء النباتي",
  "SRC-b51ed1963be24a09": "بطاقة نبات — مركز الغطاء النباتي",
  "SRC-bfe82f18a44d3e51": "بطاقة نبات — مركز الغطاء النباتي",
  "SRC-4cb007cff7e77f0c": "بطاقة نبات — مركز الغطاء النباتي",
  "SRC-d6e2544e0277f22e": "بطاقة الأراك — مركز الغطاء النباتي",
  "SRC-d3513ccb05ebe654": "بطاقة الدَّوْم — مركز الغطاء النباتي",
  "SRC-fddf8ecdd1f83456": "بطاقة السَّلَم — مركز الغطاء النباتي",
  "SRC-7feaa1262000b473": "بطاقة السَّمُر — مركز الغطاء النباتي",
  "SRC-308afc0561f04776": "بطاقة الشدن — العرم — مركز الغطاء النباتي",
  "SRC-cf891ea3538d10f2": "بطاقة الطلح النجدي — مركز الغطاء النباتي",
  "SRC-25f709337b72e2ed": "بطاقة الطنب — مركز الغطاء النباتي",
  "SRC-0cd8dc6c29148e26": "بطاقة اللوز البرّي — مركز الغطاء النباتي",
  "SRC-43479ed9bf07a837": "بطاقة المظّ — مركز الغطاء النباتي",
  "SRC-b9edebce2c4d2fa0": "بطاقة الهذب — مركز الغطاء النباتي",
  "SRC-v1-7414da48314480b2": "دراسة ارتفاعات السروات وصحة العرعر — Scientific Reports، ٢٠٢٥",
  "SRC-v1-c5e1377eb35f2bf5": "دراسة القرم في أرخبيل فرسان — Forests، ٢٠٢٠",
  "SRC-v1-0798642c7b7d5bad": "دراسة تربة غابات القرم في ثول — Biogeosciences، ٢٠٢٥",
  "SRC-91235066481a5365": "المجموعات النباتية في قاعدة BODATSA لجنوب القارة الأفريقية",
  "SRC-44a6b4ee19ef4f07": "المجموعة الأفريقية في متحف التاريخ الطبيعي بفريبورغ (MHNF-HAFRIC)",
  "SRC-391c2222a15198f9": "المجموعة المرجعية لحبوب اللقاح",
  "SRC-82f853d3990a5c94": "المجموعة النباتية CAS (BOT)",
  "SRC-bd574cf4249a7f20": "المجموعة النباتية في مركز Naturalis للتنوع الحيوي (NL)",
  "SRC-ce824a2722ddb0e8": "النباتات الوعائية في معشبة المجموعات الوطنية للتاريخ الطبيعي",
  "SRC-36e0d0178c91ce4b": "بيانات المعشبة الوطنية في فيكتوريا (MEL) عبر AVH",
  "SRC-195fe94db9c3264b": "بيانات معشبة PRA",
  "SRC-133e3b17a9e0f54c": "تسلسلات INSDC",
  "SRC-bce0a94e9df556ac": "مشاهدات Pl@ntNet ذات التحديد الآلي",
  "SRC-51f3a98c736459bb": "سجلات العينات في مجموعة NMNH (USNM، US)",
  "SRC-ef5ac6f9c2fa933b": "سجلات معشبات جامعة هارفارد",
  "SRC-99102cd7c98961ba": "سجلات وجود الأنواع في قاعدة FungalRoot",
  "SRC-34fe93deb36bad91": "عينات Tropicos من مجموعات غير MO",
  "SRC-d850b14683be667f": "عينات مجموعة MO في Tropicos",
  "SRC-a9e1773234425b72": "عينات مجموعة الفطريات في الحدائق النباتية الملكية بكيو",
  "SRC-5305d29aaf26d2ee": "عينات مجموعة النبات الاقتصادي في الحدائق النباتية الملكية بكيو",
  "SRC-3a4da9c5c86c67be": "عينات معشبة إدنبرة (E)",
  "SRC-3134b97cb534cd2a": "عينات معشبة الحدائق النباتية الملكية في كيو",
  "SRC-e141be87fd469798": "عينات معشبة معهد النبات بجامعة مونبلييه ٢ (MPU)",
  "SRC-e912e6af2a833b41": "مجموعة العينات النمطية في معشبة النباتات الوعائية (H)",
  "SRC-f7ae78c49c1fa00e": "مجموعة النباتات الوعائية بمعشبة المتحف الوطني للتاريخ الطبيعي في باريس (P)",
  "SRC-7615bf195857a6f7": "مجموعة النباتات الوعائية في الحديقة النباتية الملكية — CSIC (MA)",
  "SRC-53bf2cf3620f53c1": "مجموعة النباتات الوعائية في المجموعة النباتية الحكومية بميونخ",
  "SRC-624b4d5304d7db38": "مراجعة تصنيفية لنباتات من شبه الجزيرة العربية",
  "SRC-54eedb64dac4c200": "مسح نباتات المملكة لعام ٢٠١٣",
  "SRC-fd8a8a7a2d1b610e": "مشاهدات NABU / naturgucker",
  "SRC-bd2d8c09205e4dbb": "مشاهدات Pl@ntNet",
  "SRC-e9da7ccc9f18215c": "مشاهدات iNaturalist",
  "SRC-129c8624277f3a9f": "مشاهدات الطبيعة في Observation.org",
  "SRC-1e36918ef8801aa5": "معشبة PR",
  "SRC-e68dfa4ce118eed9": "معشبة النباتات الوعائية في أوسلو (O، UiO)",
  "SRC-2dd930d51f8714a4": "معشبة برلين (B)",
  "SRC-dcb05a814543cd50": "معشبة جامعة بايلور",
  "SRC-542a81bd7fdbd7c6": "معشبة جامعة تشارلز في براغ (PRC)",
  "SRC-94ad6addab147c30": "معشبة جامعة كويمبرا (COI)",
  "SRC-aa7f9af89f844445": "معشبة حديقة ميز النباتية (BR)",
  "SRC-7a0954c76ee4e4c3": "معشبة حديقة نيويورك النباتية (NY)",
  "SRC-c38ad82da6a7f312": "معشبة كلية ترينيتي في دبلن",
  "SRC-aad1d967ddc231dd": "معشبة لاغر في متحف التاريخ الطبيعي بفريبورغ (MHNF-HLAGGER)",
  "SRC-c363173618870c1b": "معشبة هامبورغ — Herbarium Hamburgense"
})

const AUTOMATED_SOURCE_ID = 'SRC-bce0a94e9df556ac'
const REGION_NAMES = Object.freeze({
  'SA-01': 'منطقة الرياض', 'SA-02': 'منطقة مكة المكرمة', 'SA-03': 'منطقة المدينة المنورة',
  'SA-04': 'المنطقة الشرقية', 'SA-05': 'منطقة القصيم', 'SA-06': 'منطقة حائل',
  'SA-07': 'منطقة تبوك', 'SA-08': 'منطقة الحدود الشمالية', 'SA-09': 'منطقة جازان',
  'SA-10': 'منطقة نجران', 'SA-11': 'منطقة الباحة', 'SA-12': 'منطقة الجوف', 'SA-14': 'منطقة عسير'
})

export function presentAreaName(area) {
  if (area.level === 'governorate') return (area.isRegionalCapital ? 'نطاق مدينة ' : 'محافظة ') + area.name
  return REGION_NAMES[area.id] || 'منطقة ' + area.name
}

// These are name correspondences, not a contemporary administrative gazetteer.
// A region and GADM-prefix guard prevents a translated homonym from reassigning
// an observation. GADM's Ash Shimasiyah/Riyadh mismatch is deliberately unmapped.
const ADMIN_NAMES = [
  ['SA-14', 'SAU.1.', {
    'Abha': 'أبها', 'Ahad Rifaydah': 'أحد رفيدة', 'Al-Namas': 'النماص', 'Al Birk': 'البرك',
    'Al Majardah': 'المجاردة', 'Balqarn': 'بلقرن', 'Bareq': 'بارق', 'Bisha': 'بيشة',
    'Khamis Mushayt': 'خميس مشيط', 'Muhayil': 'محايل', 'Rijal Alma': 'رجال ألمع',
    'Sarat Ubaida': 'سراة عبيدة', 'Tanomah': 'تنومة', 'Tarib': 'طريب', 'Tathlith': 'تثليث',
    'Zahran Al-Janub': 'ظهران الجنوب'
  }],
  ['SA-11', 'SAU.2.', {
    'Al Aqiq': 'العقيق', 'Al Bahah': 'الباحة', 'Al Hajrah': 'الحجرة', 'Al Makhwah': 'المخواة',
    'Al Mandaq': 'المندق', 'Al Qari': 'القرى', 'Baljurashi': 'بلجرشي', 'Bani Hasan': 'بني حسن', 'Qilwah': 'قلوة'
  }],
  ['SA-08', 'SAU.3.', {'Al Uwayqilah': 'العويقيلة', 'Arar': 'عرعر', 'Rafha': 'رفحاء', 'Turaif': 'طريف'}],
  ['SA-12', 'SAU.4.', {'Duma al-Jandal': 'دومة الجندل', 'Sakaka': 'سكاكا', 'Tubarjal': 'طبرجل'}],
  ['SA-03', 'SAU.5.', {
    'Al Hinakiyah': 'الحناكية', 'Al Is': 'العيص', 'Al Madinah': 'المدينة المنورة', 'Al Mahd': 'المهد',
    'Al Ula': 'العلا', 'Badr': 'بدر', 'Khaybar': 'خيبر', 'Wadi Al Fara': 'وادي الفرع', 'Yanbu': 'ينبع'
  }],
  ['SA-05', 'SAU.6.', {
    'Al Asyah': 'الأسياح', 'Al Badayea': 'البدائع', 'Al Bukayriyah': 'البكيرية', 'Al Mithnab': 'المذنب',
    'An Nabhaniyah': 'النبهانية', 'Ar Rass': 'الرس', 'Buraidah': 'بريدة', 'Riyadh Al Khabra': 'رياض الخبراء',
    'Unaizah': 'عنيزة', 'Uqlat As Suqur': 'عقلة الصقور', 'Uyun Al Jiwa': 'عيون الجواء'
  }],
  ['SA-01', 'SAU.7.', {
    'Ad Dilam': 'الدلم', 'Ad Diriyah': 'الدرعية', 'Ad Duwadimi': 'الدوادمي', 'Afif': 'عفيف',
    'Al Aflaj': 'الأفلاج', 'Al Ghat': 'الغاط', 'Al Hariq': 'الحريق', 'Al Kharj': 'الخرج',
    'Al Majmaah': 'المجمعة', 'Al Muzahimiyah': 'المزاحمية', 'Al Quwayiyah': 'القويعية',
    'Ar Rayn': 'الرين', 'As Sulayyil': 'السليل', 'Az Zulfi': 'الزلفي', 'Duruma': 'ضرما',
    'Hawtat Bani Tamim': 'حوطة بني تميم', 'Huraymila': 'حريملاء', 'Marat': 'مرات',
    'Riyadh': 'الرياض', 'Rumah': 'رماح', 'Shaqra': 'شقراء', 'Thadiq': 'ثادق', 'Wadi Ad Dawasir': 'وادي الدواسر'
  }],
  ['SA-04', 'SAU.8.', {
    'Abqaiq': 'بقيق', 'Al Ahsa': 'الأحساء', 'Al Jubayl': 'الجبيل', 'Al Khafji': 'الخفجي',
    'Al Khubar': 'الخبر', 'Al Nuayriyah': 'النعيرية', 'Al Qatif': 'القطيف', 'Al Udayd': 'العديد',
    'Hafar Al Batin': 'حفر الباطن', 'Qaryah Al Ulya': 'قرية العليا', 'Ras Tannurah': 'رأس تنورة'
  }],
  ['SA-06', 'SAU.9.', {
    'Al Ghazalah': 'الغزالة', 'Al Hait': 'الحائط', 'As Sulaymi': 'السليمي', 'Ash Shamli': 'الشملي',
    'Ash Shinan': 'الشنان', 'Baqa': 'بقعاء', 'Hail': 'حائل', 'Mawqaq': 'موقق', 'Simira': 'سميراء'
  }],
  ['SA-09', 'SAU.10.', {
    'Abu Arish': 'أبو عريش', 'Ad Dair': 'الدائر', 'Ad Darb': 'الدرب', 'Ahad Al Masarihah': 'أحد المسارحة',
    'Al Aridah': 'العارضة', 'Al Aydabi': 'العيدابي', 'Al Harth': 'الحرث', 'Ar Rayth': 'الريث',
    'At Tuwal': 'الطوال', 'Baysh': 'بيش', 'Damad': 'ضمد', 'Farasan': 'فرسان', 'Fayfa': 'فيفا',
    'Harub': 'هروب', 'Jazan': 'جازان', 'Sabya': 'صبياء', 'Samtah': 'صامطة'
  }],
  ['SA-02', 'SAU.11.', {
    'Adam': 'أضم', 'Al Ardiyat': 'العرضيات', 'Al Jumum': 'الجموم', 'Al Kamil': 'الكامل',
    'Al Lith': 'الليث', 'Al Qunfudhah': 'القنفذة', 'Al Taif': 'الطائف', 'Bahrah': 'بحرة',
    'Jiddah': 'جدة', 'Khulays': 'خليص', 'Makkah Al Mukarramah': 'مكة المكرمة',
    'Maysan': 'ميسان', 'Rabigh': 'رابغ', 'Ranyah': 'رنية'
  }],
  ['SA-10', 'SAU.12.', {
    'Badr Al Janub': 'بدر الجنوب', 'Khubash': 'خباش', 'Najran': 'نجران', 'Sharurah': 'شرورة',
    'Thar': 'ثار', 'Yadamah': 'يدمة'
  }],
  ['SA-07', 'SAU.13.', {
    'Al Bad': 'البدع', 'Al Wajh': 'الوجه', 'Duba': 'ضبا', 'Haqil': 'حقل',
    'Tabuk': 'تبوك', 'Tayma': 'تيماء', 'Umluj': 'أملج'
  }]
]

const valueText = value => typeof value === 'string' ? value.trim() : ''
const ownValue = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined
const normalizeName = value => valueText(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[-\s]+/g, ' ')
const arabicText = (value, maximum = 160) => {
  const text = valueText(value)
  return text.length <= maximum && /[\u0621-\u064a]/.test(text) && !/[A-Za-z<>\r\n]/.test(text) ? text : ''
}
const adminNames = new Map()
for (const [regionId, prefix, names] of ADMIN_NAMES) {
  for (const [original, label] of Object.entries(names)) {
    adminNames.set(normalizeName(original), {label, regionId, prefix})
  }
}
const capitalNames = new Set(['Abha', 'Al Bahah', 'Arar', 'Sakaka', 'Al Madinah', 'Buraidah',
  'Riyadh', 'Hail', 'Jazan', 'Makkah Al Mukarramah', 'Najran', 'Tabuk'].map(normalizeName))

// Exact short locality aliases only. Descriptions such as "40 km north of Al
// Lith" must retain their distinct meaning, not become an Al Lith city record.
const localityAliases = new Map([
  ['Dhahran', 'الظهران', 'SA-04'], ['Eastern Province. Dhahran.', 'الظهران', 'SA-04'],
  ['Al Hanakiyah', 'الحناكية', 'SA-03'], ['AlUla', 'العلا', 'SA-03'],
  ['Jeddah', 'جدة', 'SA-02'], ['Taif', 'الطائف', 'SA-02'], ['Makkah', 'مكة المكرمة', 'SA-02'],
  ["Ha'il", 'حائل', 'SA-06'], ['Ar Riyad', 'الرياض', 'SA-01'],
  ['Farasan Islands', 'جزر فرسان', 'SA-09'],
  ['[South Hijaz; 40 km north of Al Lith]', 'جنوب الحجاز، ٤٠ كم شمال الليث', 'SA-02']
].map(([original, label, regionId]) => [normalizeName(original), {label, regionId}]))
const regionAliases = Object.freeze({
  'SA-01': ['Riyadh Region', 'Ar Riyad'], 'SA-02': ['Makkah Region', 'Makkah'],
  'SA-03': ['Medina Region', 'Al Madinah'], 'SA-04': ['Eastern Region', 'Eastern Province', 'Ash Sharqiyah'],
  'SA-05': ['Qassim Region', 'Al Qassim'], 'SA-06': ['Hail Region'], 'SA-07': ['Tabuk Region'],
  'SA-08': ['Northern Borders Region'], 'SA-09': ['Jazan Region'], 'SA-10': ['Najran Region'],
  'SA-11': ['Al Bahah Region'], 'SA-12': ['Al Jawf Region'], 'SA-14': ['Asir Region']
})

function basis(record) {
  return valueText(record?.basisOfRecord || record?.locator).replace(/[^A-Za-z]/g, '').toUpperCase()
}

function category(record) {
  const kind = valueText(record?.sourceKind).toLowerCase()
  if (['occurrence_records', 'observation'].includes(kind)) {
    const type = basis(record)
    if (type === 'PRESERVEDSPECIMEN') return 'specimen'
    if (type === 'MATERIALCITATION') return 'citation'
    if (type === 'MACHINEOBSERVATION') return 'machine'
    if (type === 'HUMANOBSERVATION' || type === 'OBSERVATION') return 'observation'
    return 'record'
  }
  if (kind === 'regional_checklist') return 'regional'
  if (kind === 'local_checklist') return 'local'
  if (['official_distribution_statement', 'official'].includes(kind)) return 'official'
  if (['research_paper', 'academic_paper', 'study', 'paper'].includes(kind)) return 'paper'
  if (/encyclop|موسوع/.test(kind)) return 'encyclopedia'
  if (/dictionary|معجم/.test(kind)) return 'dictionary'
  if (/book|كتاب/.test(kind)) return 'book'
  return 'reference'
}

const CATEGORY_LABELS = Object.freeze({
  regional: ['قائمة نباتات المنطقة', 'فتح قائمة النباتات'],
  local: ['قائمة نباتات الموقع', 'فتح قائمة النباتات'],
  observation: ['مشاهدة مسجّلة', 'عرض سجل المشاهدة'],
  specimen: ['عينة محفوظة', 'عرض سجل العينة'],
  citation: ['استشهاد بعينة', 'عرض سجل الاستشهاد'],
  machine: ['رصد آلي', 'عرض سجل الرصد'],
  record: ['سجل توثيق', 'عرض السجل'],
  official: ['بطاقة من جهة رسمية', 'فتح بطاقة النبات'],
  paper: ['بحث علمي', 'فتح البحث'], book: ['كتاب', 'فتح المرجع'],
  dictionary: ['معجم', 'فتح المرجع'], encyclopedia: ['موسوعة', 'فتح المرجع'],
  reference: ['مرجع نباتي', 'فتح المرجع']
})

export function presentSource(record) {
  const originalTitle = typeof record?.sourceTitle === 'string' ? record.sourceTitle : ''
  const [kindLabel, actionLabel] = CATEGORY_LABELS[category(record)]
  return {
    titleAr: ownValue(SOURCE_TITLES_AR, record?.sourceId) || arabicText(originalTitle) || kindLabel,
    originalTitle,
    kindLabel,
    actionLabel: !record?.sourceUrl && ['book', 'dictionary', 'encyclopedia'].includes(category(record))
      ? 'عرض بيانات المرجع' : actionLabel,
    automated: record?.sourceId === AUTOMATED_SOURCE_ID
  }
}

function localLabel(original, regionId) {
  const direct = arabicText(original, 110)
  if (direct) return direct
  const aliases = new Set((ownValue(regionAliases, regionId) || []).map(normalizeName))
  const parts = valueText(original).split(/[,،]/).map(valueText).filter(Boolean)
  const named = parts.filter(part => !/^(?:SA|Saudi Arabia|Arabie saoudite)$/i.test(part)
    && !/^\d{4,6}$/.test(part) && !aliases.has(normalizeName(part)))
  if (named.length !== 1) return ''
  const candidate = named[0].replace(/\s+(?:Saudi Arabia|Arabie saoudite)$/i, '')
  const arabic = arabicText(candidate, 110)
  if (arabic) return arabic
  const matched = localityAliases.get(normalizeName(candidate)) || adminNames.get(normalizeName(candidate))
  return matched && (!regionId || regionId === matched.regionId) ? matched.label : ''
}

function regionLabel(record, supplied) {
  return ownValue(REGION_NAMES, record?.regionId) || arabicText(supplied, 80)
}

export function presentLocation(observation, record, regionName) {
  const regionId = record?.regionId || observation?.regionId || ''
  const region = ownValue(REGION_NAMES, regionId) || arabicText(regionName, 80)
  const locality = typeof observation?.localityOriginal === 'string' ? observation.localityOriginal : ''
  const governorate = typeof observation?.governorateOriginal === 'string' ? observation.governorateOriginal : ''
  const originalLabel = [locality, governorate].filter((value, index, all) => value.trim() && all.indexOf(value) === index).join(' — ')
    || (typeof record?.place === 'string' ? record.place : '')
  const local = localLabel(locality, regionId)
  if (local) return {
    label: local,
    levelLabel: local.startsWith('محافظة ') ? 'محافظة مذكورة في المصدر' : 'موضع مذكور في المصدر',
    provenanceLabel: 'الاسم وارد في وصف الموقع لدى ناشر السجل',
    originalLabel
  }
  const admin = adminNames.get(normalizeName(governorate))
  const governorateId = valueText(observation?.governorateId)
  if (observation?.governorateDerived === true && admin && (!regionId || admin.regionId === regionId)
    && (!governorateId || governorateId.startsWith(admin.prefix))) {
    return {
      label: admin.label,
      levelLabel: capitalNames.has(normalizeName(governorate)) ? 'نطاق إداري بحسب موقع السجل' : 'محافظة بحسب موقع السجل',
      provenanceLabel: 'ربطت قاعدة البيانات السجل بهذا النطاق من موقعه الجغرافي.',
      originalLabel
    }
  }
  if (!observation) {
    const place = localLabel(record?.place, regionId)
    if (place) {
      const broad = place === region || place === region.replace(/^منطقة /, '') || place === region.replace(/^المنطقة /, '')
      return {
        label: place,
        levelLabel: broad ? 'منطقة مذكورة في المصدر' : 'موضع مذكور في المصدر',
        provenanceLabel: 'بحسب وصف المرجع',
        originalLabel
      }
    }
  }
  const specimen = basis(observation) === 'PRESERVEDSPECIMEN' || category(record) === 'specimen'
  const kind = specimen ? 'موضع عينة' : 'موقع رصد'
  return {
    label: region ? `${kind} ضمن ${region}` : 'موضع مذكور في المصدر',
    levelLabel: region ? 'اسم الموضع يحتاج مراجعة' : 'المنطقة غير محددة في البيانات',
    provenanceLabel: 'الوصف الأصلي متاح في تفاصيل المرجع',
    originalLabel
  }
}

export function presentEvidence(record, plantName) {
  const name = arabicText(plantName, 120)
  const plant = name ? `النبات «${name}»` : 'هذا النبات'
  const type = category(record)
  const location = presentLocation(null, record, regionLabel(record)).label
  const place = /^(?:موضع مذكور|موقع رصد|موضع عينة)/.test(location) ? 'هذا الموضع' : location
  const evidence = arabicText(record?.evidence, 650)
  // Clear human-authored summaries (including book/research detail) are kept.
  // The old boilerplate intentionally does not become the main reader text.
  if (evidence && !/سجلات رصد أو عينات إيجابية/.test(evidence)) return record?.sourceId === AUTOMATED_SOURCE_ID
    && !/آلي/.test(evidence) ? `${evidence} تحديد النوع في هذا السجل آلي.` : evidence
  if (type === 'regional' || type === 'local') return `تذكر القائمة ${plant} ضمن نباتات ${place}.`
  if (type === 'official') return `تذكر بطاقة ${plant} ${place} ضمن نطاق انتشاره.`
  if (type === 'specimen') return `يربط سجل عينة محفوظة ${plant} بهذا الموضع.`
  if (type === 'citation') return `يرد استشهاد بعينة من ${plant} مرتبطة بهذا الموضع في مؤلف علمي.`
  if (type === 'observation') return record?.sourceId === AUTOMATED_SOURCE_ID
    ? `يوجد سجل مشاهدة لهذا النبات في ${place}، مع تحديد آلي لنوعه.`
    : `يوجد سجل مشاهدة لهذا النبات في ${place}.`
  if (type === 'machine') return `يربط سجل رصد آلي هذا النبات بهذا الموضع.`
  if (type === 'paper') return `يتناول البحث ${plant} ويربطه بهذا الموضع؛ تتاح التفاصيل في المرجع.`
  return `يرتبط ${plant} بهذا الموضع في المرجع. يمكن الاطلاع على التفاصيل في المصدر.`
}
