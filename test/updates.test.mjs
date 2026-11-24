import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRecord } from '../src/data-client.js'
import {
  UPDATE_COLUMNS, STORAGE_KEY, validateUpdateRows, mergePatch, applyOverrides,
  readStoredPatch, saveStoredPatch, clearStoredPatch
} from '../src/updates.js'

const uuid = 'f009a176-94e3-4387-b682-0f416bf31afd'
const otherUuid = '3791f886-295b-4fe5-aa08-fee2c80cfd09'
const now = '2026-11-23T10:00:00.000Z'
const record = { id: 'E-BASE-1', regionId: 'SA-02', place: 'الليث', sourceId: 'SRC-1', sourceKind: 'official',
  sourceTitle: 'بطاقة الأراك', sourceUrl: 'https://example.org/arak', locator: 'نطاق الانتشار',
  evidence: 'ورد الأراك في الليث.', sourceScientificName: 'salvadora persica', accessedOn: '2026-11-23', status: 'verified' }
const plant = { schemaVersion: 2, uuid, senseId: 'sense-1', version: '2.0.0', name: 'أراكة', scientificName: 'salvadora persica',
  status: 'documented_for_supplied_taxon', statusLabel: 'موثق للاسم العلمي المعطى', records: [record] }
const other = { ...plant, uuid: otherUuid, name: 'مدخل آخر', records: [{ ...record, id: 'OTHER-RECORD' }] }
const catalog = { version: '2.0.0', plants: [plant, other] }
const plants = new Map([[uuid, plant], [otherUuid, other]])
const input = overrides => ({ uuid, scientificName: plant.scientificName, recordId: 'NEW-1', action: 'upsert',
  regionId: 'SA-09', place: 'جازان', sourceKind: 'official', sourceTitle: 'مرجع التحديث',
  sourceUrl: 'https://example.org/update', sourceAuthor: '', sourceYear: '', sourceEdition: '', locator: 'نطاق الانتشار',
  evidence: 'ورد النبات في المصدر لهذه المنطقة.', reviewStatus: 'verified', ...overrides })
const rows = (...entries) => [UPDATE_COLUMNS, ...entries.map(e => UPDATE_COLUMNS.map(c => e[c] ?? ''))]
const validate = (...entries) => validateUpdateRows(rows(...entries), catalog, plants, { fileName: 'تصحيح.xlsx', now })
const patchOf = entry => mergePatch(null, validate(entry).changes, '2.0.0', now)

test('an imported relation preserves UUID and row provenance and updates only the matching plant', () => {
  const result = validate(input())
  assert.deepEqual(result.errors, [])
  assert.equal(result.summary.added, 1)
  assert.deepEqual(result.changes[0].provenance, { file: 'تصحيح.xlsx', sheet: 'Records', row: 2, importedAt: now, placeNameReviewed: true })
  const patch = mergePatch(null, result.changes, '2.0.0', now)
  const updated = applyOverrides(plant, patch)
  assert.equal(updated.uuid, uuid)
  assert.equal(updated.scientificName, plant.scientificName)
  assert.equal(updated.records.length, 2)
  assert.equal(plant.records.length, 1)
  assert.equal(applyOverrides(other, patch), other)
})

test('unknown UUID and name-only matching are rejected', () => {
  const result = validate(input({ uuid: 'أراكة' }))
  assert.match(result.errors.join(' '), /UUID غير معروف/)
  assert.deepEqual(result.changes, [])
})

test('a different scientific identity invalidates the complete batch', () => {
  const result = validate(input(), input({ recordId: 'NEW-2', scientificName: 'Coffea arabica' }))
  assert.match(result.errors.join(' '), /الاسم العلمي لا يطابق/)
  assert.deepEqual(result.changes, [])
})

test('withheld entries cannot be cleared by importing verified rows', () => {
  const held = { ...plant, status: 'identity_review_required', records: [] }
  const result = validateUpdateRows(rows(input()), { ...catalog, plants: [held] }, new Map([[uuid, held]]), { now })
  assert.match(result.errors.join(' '), /محجوب/)
  assert.deepEqual(result.changes, [])
  assert.throws(() => applyOverrides(held, patchOf(input())), /حالة مراجعته/)
})

test('regional code must be known; vague geography may remain unlocated', () => {
  assert.match(validate(input({ regionId: 'نجد' })).errors.join(' '), /رمز منطقة/)
  const result = validate(input({ regionId: '', place: 'نجد' }))
  assert.equal(result.errors.length, 0)
  assert.equal(result.changes[0].record.regionId, null)
})

test('books without URL require sufficient bibliographic information', () => {
  const row = input({ sourceKind: 'book', sourceUrl: '', sourceAuthor: 'المؤلف', sourceYear: '2020', locator: 'ص ٤٢' })
  const result = validate(row)
  assert.equal(result.errors.length, 0)
  assert.equal(result.changes[0].record.year, '2020')
  assert.equal(validate({ ...row, sourceAuthor: '' }).changes.length, 0)
  assert.equal(validate({ ...row, sourceKind: 'website' }).changes.length, 0)
})

test('unsafe source URLs and credentials are rejected', () => {
  for (const url of ['javascript:alert(1)', 'http://example.org', 'https://user:secret@example.org/',
    'https://example.org/a b', ' https://example.org/', 'https://example.org/ ', 'https://example.org/a\tb']) {
    assert.match(validate(input({ sourceUrl: url })).errors.join(' '), /HTTPS/)
  }
})

test('editing locality or evidence preserves the original citation date, taxon spelling and occurrence links', () => {
  const original = { ...record, accessedOn: '2024-02-03', sourceScientificName: 'Salvadora persica L.',
    recordUrls: ['https://www.gbif.org/occurrence/5063329898'] }
  const current = { ...plant, records: [original] }
  const result = validateUpdateRows(rows(input({ ...original, recordId: original.id, regionId: 'SA-09',
    place: 'موقع مصحح', locator: 'قسم مصحح', evidence: 'تصحيح كلمة في الخلاصة.', reviewStatus: 'verified' })),
  catalog, new Map([[uuid, current]]), { fileName: 'تصحيح.xlsx', now })
  assert.deepEqual(result.errors, [])
  const updated = result.changes[0].record
  assert.equal(updated.accessedOn, '2024-02-03')
  assert.equal(updated.sourceScientificName, 'Salvadora persica L.')
  assert.deepEqual(updated.recordUrls, original.recordUrls)
  assert.equal(updated.sourceId, original.sourceId)
  assert.equal(updated.provenance.importedAt, now)
  assert.doesNotThrow(() => validateRecord(updated))
})

test('a new or replaced source records its import time without inventing a reference access date', () => {
  for (const row of [input(), input({ recordId: record.id })]) {
    const result = validate(row)
    assert.deepEqual(result.errors, [])
    const updated = result.changes[0].record
    assert.equal(updated.accessedOn, '')
    assert.equal(updated.provenance.importedAt, now)
    assert.equal(updated.recordUrls, undefined)
    assert.equal(updated.sourceScientificName, plant.scientificName)
    assert.doesNotThrow(() => validateRecord(updated))
  }
})

test('only verified additions or changed place names gain an explicit name review', () => {
  const corrected = validate(input({ ...record, recordId: record.id, place: 'الوجه', reviewStatus: 'verified' }))
  assert.deepEqual(corrected.errors, [])
  assert.equal(corrected.changes[0].record.provenance.placeNameReviewed, true)
  assert.equal(corrected.changes[0].provenance.placeNameReviewed, true)
  assert.equal(validate(input()).changes[0].record.provenance.placeNameReviewed, true)
  for (const row of [
    input({ reviewStatus: 'pending' }),
    input({ ...record, recordId: record.id, place: 'الوجه', reviewStatus: 'pending' }),
    input({ ...record, recordId: record.id, evidence: 'تصحيح النص فقط.', reviewStatus: 'verified' }),
    input({ ...record, recordId: record.id, sourceYear: '2024', reviewStatus: 'verified' }),
    input({ ...record, recordId: record.id, place: '  الليث  ', evidence: 'تغيير المسافات فقط.', reviewStatus: 'verified' }),
  ]) {
    const result = validate(row)
    assert.deepEqual(result.errors, [])
    assert.equal(result.changes[0].record.provenance.placeNameReviewed, undefined)
  }
})

test('an earlier name review survives wording edits but not suspension or a different citation', () => {
  const prior = { ...record, provenance: { file: 'reviewed.xlsx', sheet: 'Records', row: 2, importedAt: now, placeNameReviewed: true } }
  const current = { ...plant, records: [prior] }
  const revise = overrides => validateUpdateRows(rows(input({ ...prior, recordId: prior.id, reviewStatus: 'verified',
    evidence: 'صياغة أوضح للدليل.', ...overrides })), catalog, new Map([[uuid, current]]), { fileName: 'wording.xlsx', now })
  assert.equal(revise({}).changes[0].record.provenance.placeNameReviewed, true)
  for (const change of [
    { reviewStatus: 'pending' }, { sourceUrl: 'https://example.org/replacement' },
    { sourceTitle: 'مرجع مختلف' }, { sourceAuthor: 'مؤلف مختلف' }, { sourceYear: '2024' },
    { sourceEdition: 'الطبعة الثانية' }, { locator: 'صفحة مختلفة' }, { sourceKind: 'research' },
  ]) {
    const result = revise(change)
    assert.deepEqual(result.errors, [])
    assert.equal(result.changes[0].record.provenance.placeNameReviewed, undefined)
  }
})

test('name review remains explicit through patch application and rejects invalid or mismatched metadata', () => {
  const reviewed = patchOf(input())
  assert.equal(applyOverrides(plant, reviewed).records.find(item => item.id === 'NEW-1').provenance.placeNameReviewed, true)
  for (const mutation of [
    change => { change.provenance.placeNameReviewed = 'true' },
    change => { change.record.provenance.placeNameReviewed = 1 },
    change => { delete change.record.provenance.placeNameReviewed },
    change => { change.record.status = 'pending' },
    change => { change.action = 'delete'; delete change.record },
  ]) {
    const invalid = JSON.parse(JSON.stringify(reviewed))
    mutation(invalid.changes[0])
    assert.throws(() => applyOverrides(plant, invalid), /مراجعة اسم المكان|غير مكتملة/)
  }
  const legacy = JSON.parse(JSON.stringify(reviewed))
  delete legacy.changes[0].provenance.placeNameReviewed
  delete legacy.changes[0].record.provenance.placeNameReviewed
  assert.doesNotThrow(() => applyOverrides(plant, legacy))
  assert.equal(applyOverrides(plant, legacy).records.find(item => item.id === 'NEW-1').provenance.placeNameReviewed, undefined)
})

test('stored patches cannot omit fields required by the public record contract', () => {
  const patch = patchOf(input())
  for (const key of ['sourceId', 'sourceScientificName', 'accessedOn']) {
    const invalid = structuredClone(patch)
    delete invalid.changes[0].record[key]
    assert.throws(() => applyOverrides(plant, invalid), /غير مكتملة/)
    assert.throws(() => mergePatch(null, invalid.changes, '2.0.0', now), /غير مكتملة/)
  }
  const invalid = structuredClone(patch)
  invalid.changes[0].record.recordUrls = ['https://example.org/a', 'https://example.org/a']
  assert.throws(() => applyOverrides(plant, invalid), /غير مكتملة/)
})

test('delete requires a record belonging to the exact UUID', () => {
  assert.match(validate(input({ action: 'delete', recordId: 'OTHER-RECORD' })).errors.join(' '), /غير موجودة لهذا UUID/)
  const deletion = patchOf(input({ action: 'delete', recordId: record.id }))
  assert.equal(applyOverrides(plant, deletion).records.length, 0)
  assert.equal(applyOverrides(other, deletion).records.length, 1)
})

test('upsert replaces one relation and pending remains unpublished', () => {
  const patch = patchOf(input({ recordId: record.id, reviewStatus: 'pending' }))
  const updated = applyOverrides(plant, patch)
  assert.equal(updated.records.length, 1)
  assert.equal(updated.records[0].status, 'pending')
  assert.equal(updated.records.filter(r => r.status === 'verified').length, 0)
})

test('the same UUID/recordId cannot occur twice in one workbook', () => {
  const result = validate(input(), input({ evidence: 'صياغة مختلفة' }))
  assert.match(result.errors.join(' '), /مكررة/)
  assert.deepEqual(result.changes, [])
})

test('same record identifiers under distinct UUIDs remain distinct', () => {
  const result = validate(input(), input({ uuid: otherUuid }))
  assert.equal(result.errors.length, 0)
  assert.equal(result.changes.length, 2)
  assert.equal(result.summary.plants, 2)
})

test('unmodified imported records do not pretend to be updates', () => {
  const result = validate(input({ ...record, recordId: record.id, sourceYear: '', reviewStatus: record.status }))
  assert.equal(result.errors.length, 0)
  assert.equal(result.changes.length, 0)
  assert.equal(result.summary.unchanged, 1)
})

test('headers, extra cells, blank workbooks and size of the batch are validated', () => {
  const duplicateHeaders = [UPDATE_COLUMNS.map(c => c === 'place' ? 'uuid' : c)]
  assert.equal(validateUpdateRows(duplicateHeaders, catalog, plants).changes.length, 0)
  assert.match(validateUpdateRows(rows(), catalog, plants).errors.join(' '), /صف بيانات/)
  const tooMany = rows(...Array.from({ length: 501 }, (_, i) => input({ recordId: 'ROW-' + i })))
  assert.match(validateUpdateRows(tooMany, catalog, plants).errors.join(' '), /٥٠٠/)
  const extra = rows(input()); extra[1].push('unexpected')
  assert.match(validateUpdateRows(extra, catalog, plants).errors.join(' '), /الخلايا الزائدة/)
})

test('patch merging preserves unrelated prior edits while replacing only a keyed change', () => {
  const first = patchOf(input())
  const next = validate(input({ uuid: otherUuid, recordId: 'NEXT' })).changes
  const merged = mergePatch(first, next, '2.0.0', now)
  assert.equal(merged.changes.length, 2)
  const replacement = validate(input({ evidence: 'تصحيح الخلاصة.' })).changes
  assert.equal(mergePatch(merged, replacement, '2.0.0', now).changes.length, 2)
})

test('deleting a local addition cancels that addition without inventing a deletion in the source release', () => {
  const added = patchOf(input())
  const current = applyOverrides(plant, added)
  const deletion = validateUpdateRows(rows(input({ action: 'delete', recordId: 'NEW-1' })),
    catalog, new Map([[uuid, current]]), { now }).changes
  const cancelled = mergePatch(added, deletion, '2.0.0', now, plants)
  assert.deepEqual(cancelled.changes, [])
  assert.equal(applyOverrides(plant, cancelled), plant)
  const unrelated = validate(input({ uuid: otherUuid, recordId: 'OTHER-LOCAL' })).changes
  const both = mergePatch(added, unrelated, '2.0.0', now, plants)
  const remaining = mergePatch(both, deletion, '2.0.0', now, plants)
  assert.equal(remaining.changes.length, 1)
  assert.equal(remaining.changes[0].uuid, otherUuid)
})

test('deleting an edited original record keeps an explicit deletion of that original', () => {
  const edited = patchOf(input({ recordId: record.id }))
  const current = applyOverrides(plant, edited)
  const deletion = validateUpdateRows(rows(input({ action: 'delete', recordId: record.id })),
    catalog, new Map([[uuid, current]]), { now }).changes
  const merged = mergePatch(edited, deletion, '2.0.0', now, plants)
  assert.equal(merged.changes.length, 1)
  assert.equal(merged.changes[0].action, 'delete')
  assert.equal(merged.changes[0].recordId, record.id)
  assert.equal(applyOverrides(plant, merged).records.length, 0)
})

test('an unknown deletion is not hidden when there was no prior local addition or no baseline proof', () => {
  const added = patchOf(input())
  const deletion = { uuid, scientificName: plant.scientificName, recordId: 'NEW-1', action: 'delete',
    provenance: { file: 'delete.xlsx', sheet: 'Records', row: 2, importedAt: now } }
  assert.equal(mergePatch(null, [deletion], '2.0.0', now, plants).changes.length, 1)
  assert.equal(mergePatch(added, [deletion], '2.0.0', now).changes.length, 1)
  assert.equal(mergePatch(added, [deletion], '2.0.0', now, new Map()).changes.length, 1)
})

test('invalid changes are checked before cancellation can remove them from the net patch', () => {
  const added = patchOf(input())
  const invalidDeletion = { uuid, scientificName: plant.scientificName, recordId: 'NEW-1', action: 'delete',
    provenance: { file: 'delete.xlsx', sheet: 'Records', row: 0 } }
  assert.throws(() => mergePatch(added, [invalidDeletion], '2.0.0', now, plants), /إسناد صف/)
  const validDeletion = { ...invalidDeletion, provenance: { ...invalidDeletion.provenance, row: 2 } }
  const wrongIdentity = { ...validDeletion, scientificName: 'Coffea arabica' }
  assert.throws(() => mergePatch(added, [wrongIdentity], '2.0.0', now, plants), /هوية التغييرات/)
  assert.throws(() => mergePatch(added, [validDeletion, validDeletion], '2.0.0', now, plants), /مكررة/)
})

test('different base versions and changed scientific identities do not inherit saved evidence', () => {
  const patch = patchOf(input())
  assert.throws(() => applyOverrides({ ...plant, version: '2.1.0' }, patch), /إصدار بيانات مختلف/)
  assert.throws(() => applyOverrides({ ...plant, scientificName: 'Coffea arabica' }, patch), /هوية هذا النبات/)
})

test('storage errors propagate and corrupt patches do not silently load', () => {
  const patch = patchOf(input())
  assert.throws(() => saveStoredPatch({ setItem() { throw Error('QuotaExceededError') } }, patch), /Quota/)
  assert.throws(() => readStoredPatch({ getItem() { return '{broken' } }, '2.0.0'), /غير قابلة للقراءة/)
  const tampered = structuredClone(patch); tampered.changes[0].record.sourceUrl = 'javascript:alert(1)'
  assert.throws(() => applyOverrides(plant, tampered), /غير مكتملة/)
})

test('a successfully saved patch survives re-reading and can be cleared', () => {
  const memory = new Map()
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) }
  const patch = patchOf(input())
  saveStoredPatch(storage, patch)
  assert.deepEqual(readStoredPatch(storage, '2.0.0'), patch)
  assert.equal(memory.has(STORAGE_KEY), true)
  clearStoredPatch(storage)
  assert.equal(readStoredPatch(storage, '2.0.0'), null)
})
