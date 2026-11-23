import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readSheet } from 'read-excel-file/node'
import { COLUMNS, RELEASE, validateDataset, validateAtlas, resolveContext, verifiedRecords, stageRows, makeDraft } from '../src/catalog.js'

const path = p => new URL('../public/' + p,import.meta.url)
const load = async p => JSON.parse(await readFile(path('data/' + p)))
const data = await load('distribution.v' + RELEASE + '.json')
const regions = await load('regions.v1.json')
const bindings = await load('bindings.v1.json')
const rows = await readSheet(await readFile(path('templates/distribution.xlsx')), {sheet:'Records'})
const key = q => resolveContext(new URLSearchParams(q),bindings,data.plants[0].id)

test('the release covers exactly the 13 ISO units with usable geometry and evidence',() => {
  validateAtlas(data,regions,bindings)
  assert.throws(() => validateAtlas(data,regions.slice(1),bindings),/geometry/)
  assert.throws(() => validateAtlas(data,regions,[...bindings,bindings[0]]),/binding/)
  assert.throws(() => validateAtlas(data,regions,[{...bindings[0],plantId:'missing'}]),/binding/)
})
test('exact external pairs resolve independently of Siwar; incomplete and ambiguous inputs are unmapped',() => {
  assert.equal(key(''),'juniperus-procera')
  assert.equal(key('entryId=demo-mangrove&senseId=botanical'),'avicennia-marina')
  for (const query of ['entryId=demo-juniper','senseId=botanical','entryId=unknown&senseId=botanical','entryId=demo-juniper&senseId=wrong','entryId=demo-juniper&entryId=other&senseId=botanical']) {
    assert.equal(key(query),null)
  }
})
test('subdivision and locality filters use only published verified occurrences',() => {
  assert.equal(verifiedRecords(data,'juniperus-procera','SA-14').length,2)
  assert.equal(verifiedRecords(data,'juniperus-procera','SA-14','السودة').length,1)
  assert.equal(verifiedRecords(data,'juniperus-procera','SA-01').length,0)
})
test('supplied workbook parses into a versioned draft with a pending record',() => {
  assert.deepEqual(rows[0],COLUMNS)
  const r = stageRows(rows,data)
  assert.deepEqual(r.errors,[])
  const draft = makeDraft(data,r.pending)
  assert.equal(draft.version,'1.0.1-draft.1')
  assert.equal(draft.records.at(-1).place,'حداد بني مالك')
  assert.equal(draft.records.at(-1).status,'pending')
  assert.deepEqual(verifiedRecords(draft,'juniperus-procera'),verifiedRecords(data,'juniperus-procera'))
  assert.equal(data.records.length,6)
})
test('invalid imports are atomic, row-numbered and do not allow extra status columns',() => {
  for (const [index,value] of [[0,'unknown'],[1,'SA-13'],[2,''],[3,''],[4,'javascript:alert(1)'],[4,'https://u:p@example.org'],[5,''],[6,'']]) {
    const invalid = [...rows[1]]; invalid[index] = value
    const result = stageRows([rows[0],rows[1],invalid],data)
    assert.equal(result.pending.length,0)
    assert.match(result.errors[0],/٣/)
  }
  assert.ok(stageRows([[...COLUMNS,'status'],[...rows[1],'verified']],data).errors.length)
  assert.ok(stageRows([rows[0],rows[1],rows[1]],data).errors.length)
  assert.ok(stageRows([rows[0],COLUMNS.map(k => data.records[0][k])],data).errors.length)
})
test('empty and oversized sheets fail and columns may be reordered',() => {
  for (const sheet of [[],[COLUMNS],[COLUMNS,[]],[COLUMNS,...Array(501).fill(rows[1])]]) assert.ok(stageRows(sheet,data).errors.length)
  assert.equal(stageRows(rows.map(r => [...r].reverse()),data).pending.length,1)
})
test('release validation rejects malformed, duplicate and unreferenced records',() => {
  for (const patch of [{country:'GB'},{schemaVersion:2},{version:'latest'},{plants:[data.plants[0],data.plants[0]]},
    {records:[...data.records,data.records[0]]},{records:[{...data.records[0],status:'maybe'}]},
    {records:[{...data.records[0],sourceUrl:'file:///tmp/x'}]},{records:[{...data.records[0],plantId:'foreign'}]}]) {
    assert.throws(() => validateDataset({...data,...patch}))
  }
})
