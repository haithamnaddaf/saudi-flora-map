import { readFile, access } from 'node:fs/promises'
import { validateAtlas, RELEASE } from '../src/catalog.js'
const dir = new URL('../public/', import.meta.url)
const json = async name => JSON.parse(await readFile(new URL('data/' + name, dir)))
const candidate = process.argv[2]
const [data, regions, bindings] = await Promise.all([
  candidate ? readFile(candidate,'utf8').then(JSON.parse) : json('distribution.v' + RELEASE + '.json'), json('regions.v1.json'), json('bindings.v1.json')
])
validateAtlas(data, regions, bindings)
if (!candidate && data.version !== RELEASE) throw Error('Release filename and dataset version disagree')
await Promise.all(data.plants.map(p => access(new URL('images/' + p.image, dir))))
await access(new URL('templates/distribution.xlsx', dir))
console.log('Validated dataset ' + data.version + ': ' + regions.length + ' regions, ' + data.plants.length + ' plants, ' + data.records.length + ' evidence records, ' + bindings.length + ' integration bindings.')
