import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { validatePlant, validateCatalog, validateRegions } from '../src/data-client.js'

const root = new URL('../', import.meta.url)
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const catalog = validateCatalog(await readJson('public/data/catalog.v2.json'))
const geometry = validateRegions(await readJson('public/data/regions.v1.json'))
const report = await readJson('docs/data-build-report.json')
const knownRegions = new Set(geometry.map(region => region.id))
const filenames = (await readdir(new URL('public/data/plants/', root))).filter(name => name.endsWith('.json'))
const expected = catalog.plants.map(plant => plant.uuid + '.json')
assert.equal(catalog.plants.length, 1482, 'The audited release must retain all 1,482 original UUIDs')
assert.equal(report.inputEntries, catalog.plants.length)
assert.deepEqual([...filenames].sort(), [...expected].sort(), 'Missing or orphaned plant assets')
let records = 0, largest = 0
for (const item of catalog.plants) {
  const path = new URL(`public/data/plants/${item.uuid}.json`, root)
  const content = await readFile(path, 'utf8')
  const plant = validatePlant(JSON.parse(content), item.uuid)
  assert.equal(plant.version, catalog.version)
  for (const key of ['name', 'scientificName', 'senseId', 'status', 'statusLabel']) assert.equal(plant[key], item[key])
  const mapped = [...new Set(plant.records.filter(record => record.status === 'verified').map(record => record.regionId).filter(Boolean))].sort()
  assert.deepEqual(mapped, [...item.regionIds].sort())
  for (const record of plant.records) assert.ok(record.regionId === null || knownRegions.has(record.regionId))
  assert.doesNotMatch(content, /"(?:enricherEmail|enricherName|password|email)"\s*:/i)
  largest = Math.max(largest, Buffer.byteLength(content))
  records += plant.records.length
}

async function inspectPublic(directory) {
  for (const item of await readdir(directory, {withFileTypes: true})) {
    const path = new URL(item.name + (item.isDirectory() ? '/' : ''), directory)
    if (item.isDirectory()) await inspectPublic(path)
    else {
      assert.ok(!/siwar_plant_distribution|integrated_(entries|evidence|sources)/i.test(item.name), 'Raw research must not be shipped: ' + fileURLToPath(path))
      const info = await stat(path)
      assert.ok(info.size < 10_000_000, 'Unexpected large public asset: ' + fileURLToPath(path))
    }
  }
}
await inspectPublic(new URL('public/', root))
assert.equal(records, report.counts.records)
assert.equal(largest, report.sizesBytes.largestPlant)
console.log(`Validated v${catalog.version}: ${catalog.plants.length} original UUIDs, ${geometry.length} regions, ${records} evidence records; largest plant ${largest} bytes. Raw research is not public.`)
