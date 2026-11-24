#!/usr/bin/env node
// Converts an explicitly reviewed workbook through the same validation as the UI.
// It writes a patch only; apply-updates.mjs prepares a separate data release.
import { readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, basename, join } from 'node:path'
import { readSheet } from 'read-excel-file/node'
import { validateCatalog, validatePlant } from '../src/data-client.js'
import { MAX_IMPORT_BYTES, validateUpdateRows, mergePatch } from '../src/updates.js'

const usage = 'node scripts/import-reviewed-workbook.mjs --file /path/reviewed.xlsx --output /path/changes.json [--data public/data]'
const flags = new Map()
for (let i = 2; i < process.argv.length; i += 2) {
  const name = process.argv[i], value = process.argv[i + 1]
  if (!['--file', '--output', '--data'].includes(name) || !value || value.startsWith('--') || flags.has(name)) throw Error(usage)
  flags.set(name, value)
}
if (!flags.has('--file') || !flags.has('--output')) throw Error(usage)
const file = resolve(flags.get('--file')), output = resolve(flags.get('--output')), data = resolve(flags.get('--data') || 'public/data')
if ((await stat(file)).size > MAX_IMPORT_BYTES) throw Error('Workbook exceeds the 5 MiB import limit.')
const bytes = await readFile(file)
const rows = await readSheet(bytes, { sheet: 'Records' })
if (!rows.length || !Array.isArray(rows[0])) throw Error('Records sheet is empty.')
const catalog = validateCatalog(JSON.parse(await readFile(join(data, 'catalog.v2.json'), 'utf8')))
const ids = new Set(rows.slice(1).map(row => row[rows[0].indexOf('uuid')]).filter(value => typeof value === 'string'))
const plants = new Map()
for (const listed of catalog.plants.filter(item => ids.has(item.uuid))) {
  plants.set(listed.uuid, validatePlant(JSON.parse(await readFile(join(data, 'plants', listed.uuid + '.json'), 'utf8')), listed.uuid))
}
const now = new Date().toISOString()
const result = validateUpdateRows(rows, catalog, plants, { fileName: basename(file), now })
if (result.errors.length) throw Error(result.errors.join('\n'))
if (!result.changes.length) throw Error('The workbook has no unapplied changes.')
const patch = mergePatch(null, result.changes, catalog.version, now, plants)
await writeFile(output, JSON.stringify(patch, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ output, baseVersion: catalog.version, ...result.summary }))
