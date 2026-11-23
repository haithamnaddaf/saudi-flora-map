import { arabicNumber, stageRows, makeDraft } from './catalog.js'

export function setupImport(data) {
  const el = id => document.getElementById(id)
  const dialog = el('importer'), input = el('workbook'), drop = el('dropzone')
  const status = el('import-status'), report = el('import-report'), save = el('export')
  let draft = null, sequence = 0
  function list(messages) {
    report.replaceChildren(...messages.slice(0, 50).map(msg => {
      const li = document.createElement('li'); li.textContent = msg; return li
    }))
    if (messages.length > 50) report.append('يُعرض أول ٥٠ بندًا.')
  }
  function clear() {
    ++sequence
    draft = null
    save.disabled = true
    status.textContent = ''
    report.replaceChildren()
    input.removeAttribute('aria-invalid')
    input.setAttribute('aria-describedby','file-help import-status')
  }
  async function inspect(files) {
    clear()
    const request = sequence
    if (!files?.length) return
    const file = files[0]
    function reject(message, errors = []) {
      status.textContent = message
      input.setAttribute('aria-invalid','true')
      input.setAttribute('aria-describedby','file-help import-status import-report')
      list(errors)
    }
    if (files.length !== 1 || !/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024) {
      reject('اختر ملفًا واحدًا بصيغة .xlsx لا يتجاوز ٢ م.ب.'); return
    }
    status.textContent = 'جارٍ فحص ' + file.name + '…'
    try {
      const { readSheet } = await import('read-excel-file/browser')
      const rows = await readSheet(file, { sheet: 'Records' })
      if (request !== sequence) return
      const result = stageRows(rows, data)
      if (result.errors.length) { reject('صحّح الأخطاء ثم اختر الملف مجددًا.',result.errors); return }
      draft = makeDraft(data,result.pending)
      save.disabled = false
      status.textContent = file.name + ' · صفوف صالحة للمراجعة: ' + arabicNumber(result.pending.length)
      list(result.pending.map(r => [data.plants.find(p => p.id === r.plantId).name,r.regionId,r.place,r.locator,'بانتظار المراجعة'].join(' · ')))
    } catch {
      if (request === sequence) reject('تعذرت قراءة المصنف. تحقق من ورقة Records وافتح الملف في Excel ثم احفظه بصيغة .xlsx.')
    }
  }
  el('import-open').disabled = false
  el('import-open').addEventListener('click', () => dialog.showModal())
  dialog.addEventListener('close', () => { clear(); input.value = '' })
  input.addEventListener('change', () => inspect(input.files))
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag') })
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'))
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag'); input.value = ''; inspect(e.dataTransfer.files)
  })
  save.addEventListener('click', () => {
    if (!draft) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft,null,2) + '\n'], { type:'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'distribution.v' + draft.version + '.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(url),30000)
    status.textContent = 'جُهّزت المسودة للتنزيل. تظل شواهدها الجديدة بانتظار مراجعة المصدر.'
  })
}
