// Run a copy of this file in a temporary directory whose node_modules resolves
// @oai/artifact-tool from the Codex primary runtime. Pass the repository root.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool'

const project = path.resolve(process.argv[2] || '.')
const outputDir = path.resolve(process.argv[3] || path.join(project, 'public/templates'))
const catalog = JSON.parse(await fs.readFile(path.join(project, 'public/data/catalog.v2.json'), 'utf8'))
const regions = JSON.parse(await fs.readFile(path.join(project, 'public/data/regions.v1.json'), 'utf8'))
const columns = ['uuid', 'scientificName', 'recordId', 'action', 'regionId', 'place', 'sourceKind', 'sourceTitle', 'sourceUrl', 'sourceAuthor', 'sourceYear', 'sourceEdition', 'locator', 'evidence', 'reviewStatus']
const w = Workbook.create()
const records = w.worksheets.add('Records')
const guide = w.worksheets.add('دليل الاستخدام')
const ids = w.worksheets.add('معرفات النباتات')
const areas = w.worksheets.add('المناطق')
const green = '#104631', pale = '#f3fcf6', ink = '#092a1e', input = '#fff9e8'

function base(sheet, range) {
  sheet.showGridLines = false
  sheet.getRange(range).format.font = { name: 'Arial', size: 11, color: ink }
  sheet.getRange(range).format.verticalAlignment = 'center'
  sheet.getRange(range).format.rowHeight = 25
}
function header(sheet, range) {
  sheet.getRange(range).format.fill = green
  sheet.getRange(range).format.font = { name: 'Arial', size: 11, bold: true, color: '#ffffff' }
  sheet.getRange(range).format.horizontalAlignment = 'center'
  sheet.getRange(range).format.rowHeight = 31
}

base(records, 'A1:O21')
records.getRange('A1:O1').values = [columns]
header(records, 'A1:O1')
records.getRange('A2:O21').format.fill = input
records.getRange('A1:O21').format.columnWidth = 24
records.getRange('A1:A21').format.columnWidth = 42
records.getRange('B1:B21').format.columnWidth = 32
records.getRange('H1:J21').format.columnWidth = 35
records.getRange('M1:M21').format.columnWidth = 32
records.getRange('N1:N21').format.columnWidth = 60
records.getRange('A2:C501').setNumberFormat('@')
records.getRange('D2:D501').dataValidation = { rule: { type: 'list', values: ['upsert', 'delete'] } }
records.getRange('E2:E501').dataValidation = { rule: { type: 'list', values: regions.map(r => r.id) } }
records.getRange('O2:O501').dataValidation = { rule: { type: 'list', values: ['verified', 'pending'] } }
records.freezePanes.freezeRows(1)
records.freezePanes.freezeColumns(2)
records.tabColor = green

const descriptions = [
  ['uuid', 'معرّف المدخل الأصلي. انسخه من دليل النباتات أو صفحة الإدارة. لا تستخدم الاسم العربي للربط.'],
  ['scientificName', 'الاسم العلمي المطابق لهذا المعرف. تصحيح الهوية يحتاج مراجعة مستقلة للأدلة.'],
  ['recordId', 'معرّف علاقة المكان بالمصدر. أبقه كما هو للتعديل أو الحذف. اكتب معرّفًا جديدًا للإضافة.'],
  ['action', 'upsert للإضافة أو التعديل، وdelete للحذف الصريح. لا تُحذف الصفوف الغائبة من الملف.'],
  ['regionId', 'رمز منطقة من ورقة المناطق. اتركه فارغًا إذا كان الموضع غير محسوم إداريًا مثل نجد.'],
  ['place', 'اسم الموقع الذي ورد في المصدر. لا تحول وصف الموئل مثل صحراوي إلى منطقة إدارية.'],
  ['sourceKind', 'نوع المرجع، مثل official أو flora أو occurrence أو website أو book أو dictionary أو encyclopedia.'],
  ['sourceTitle', 'العنوان الحقيقي للمصدر أو اسم الجهة مع اسم المادة.'],
  ['sourceUrl', 'رابط HTTPS مباشر للمعلومة. يمكن تركه فارغًا لكتاب أو معجم أو موسوعة بتوثيق كافٍ.'],
  ['sourceAuthor', 'المؤلف أو الجهة. مطلوب للمرجع الورقي الذي لا يملك رابطًا.'],
  ['sourceYear', 'سنة المرجع. مطلوبة للمرجع الورقي بلا رابط، وليست تاريخ إدخال الصف.'],
  ['sourceEdition', 'الطبعة إن توفرت. لا تختلق طبعة أو تاريخًا.'],
  ['locator', 'رقم الصفحة أو القسم أو الجدول الذي يسند الموضع. رقم سطر الاستخراج ليس صفحة مطبوعة.'],
  ['evidence', 'خلاصة المعلومة التي تربط هذا النبات بالمكان. لا تقدم الملخص بوصفه اقتباسًا حرفيًا.'],
  ['reviewStatus', 'verified إذا راجع المحرر الهوية والمكان والإحالة. pending يحفظ العلاقة للمراجعة ولا يلون الخريطة.']
]
base(guide, 'A1:B27')
guide.getRange('A2').values = [['دليل تحديث بيانات الخريطة']]
guide.getRange('A2').format.font = { name: 'Arial', size: 15, bold: true, color: green }
guide.getRange('A2:B2').format.rowHeight = 35
guide.getRange('A4:B4').values = [['الحقل', 'ما الذي تكتبه؟']]
guide.getRange('A5:B19').values = descriptions
header(guide, 'A4:B4')
guide.getRange('A1:A27').format.columnWidth = 30
guide.getRange('B1:B27').format.columnWidth = 95
guide.getRange('B5:B19').format.wrapText = true
guide.getRange('B5:B19').format.horizontalAlignment = 'right'
guide.getRange('A5:B19').format.rowHeight = 42
guide.getRange('A21:B26').values = [
  ['للبدء', 'انسخ سجلات نبتة من صفحة الإدارة والصقها في A1 من Records، أو أدخل علاقات جديدة من الصف الثاني.'],
  ['حدود الملف', 'حتى ٥٠٠ صف بيانات و٥ م.ب. يمكن الاستيراد على دفعات. لا تغير أسماء الأعمدة أو اسم Records.'],
  ['المعاينة', 'ارفع الملف، راجع فروق الإضافة والتعديل والحذف، ثم اختر تطبيق التغييرات في المعاينة.'],
  ['نطاق الحفظ', 'التعديل محلي في المتصفح. نزّل ملف JSON للتغييرات للاحتفاظ به واعتماده في إصدار مشترك لاحقًا.'],
  ['المدخل المحجوب', 'لا يرفع Excel حجب الهوية أو التصنيف. تعالج هذه الحالات في مراجعة البيانات أولًا.'],
  ['الإسناد', 'يُحفظ اسم الملف وRecords ورقم الصف تلقائيًا، بصورة منفصلة عن المصدر النباتي.']
]
guide.getRange('A21:B26').format.rowHeight = 42
guide.getRange('B21:B26').format.wrapText = true
guide.getRange('B21:B26').format.horizontalAlignment = 'right'
guide.getRange('A21:A26').format.font = { name: 'Arial', size: 11, bold: true, color: green }

const idRows = catalog.plants.map(p => [p.uuid, p.name, p.scientificName, p.statusLabel])
base(ids, 'A1:D' + (idRows.length + 1))
ids.getRange('A1:D1').values = [['uuid', 'المدخل العربي', 'scientificName', 'حالة المراجعة']]
ids.getRange('A2:D' + (idRows.length + 1)).values = idRows
header(ids, 'A1:D1')
ids.getRange('A1:A' + (idRows.length + 1)).format.columnWidth = 42
ids.getRange('B1:B' + (idRows.length + 1)).format.columnWidth = 28
ids.getRange('C1:C' + (idRows.length + 1)).format.columnWidth = 55
ids.getRange('D1:D' + (idRows.length + 1)).format.columnWidth = 65
ids.getRange('A2:A' + (idRows.length + 1)).setNumberFormat('@')
ids.freezePanes.freezeRows(1)
const idTable = ids.tables.add('A1:D' + (idRows.length + 1), true, 'PlantIdentifiers')
idTable.style = 'TableStyleLight1'

base(areas, 'A1:B14')
areas.getRange('A1:B14').values = [['regionId', 'المنطقة'], ...regions.map(r => [r.id, r.name])]
header(areas, 'A1:B1')
areas.getRange('A1:A14').format.columnWidth = 20
areas.getRange('B1:B14').format.columnWidth = 32
areas.getRange('A2:B14').format.fill = pale

w.recalculate()
console.log((await w.inspect({ kind: 'table', range: 'Records!A1:O3', include: 'values,formulas', tableMaxRows: 3, tableMaxCols: 15, maxChars: 1800 })).ndjson)
console.log((await w.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!', options: { useRegex: true, maxResults: 10 }, maxChars: 500 })).ndjson)
await fs.mkdir(outputDir, { recursive: true })
const previews = await fs.mkdtemp(path.join(os.tmpdir(), 'flora-template-checks-'))
for (const [sheetName, range, file] of [['Records', 'A1:F6', 'records'], ['دليل الاستخدام', 'A1:B12', 'guide'], ['معرفات النباتات', 'A1:D8', 'ids'], ['المناطق', 'A1:B14', 'regions']]) {
  const rendered = await w.render({ sheetName, range, scale: 1.4, format: 'png' })
  await fs.writeFile(path.join(previews, file + '.png'), new Uint8Array(await rendered.arrayBuffer()))
}
const out = await SpreadsheetFile.exportXlsx(w)
await out.save(path.join(outputDir, 'distribution-v2.xlsx'))
console.log(JSON.stringify({ output: path.join(outputDir, 'distribution-v2.xlsx'), plants: catalog.plants.length, headers: columns.length }))
