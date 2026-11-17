/* eslint-disable @typescript-eslint/no-require-imports -- Node 24 repository check */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const guides = require('../src/content/guides/catalog.json')
const { menuConfig } = require('../src/config/menuConfig.ts')
const { algorithms } = require('../src/config/algorithmConfig.ts')
const { csVisualizers } = require('../src/config/csVisualizerConfig.ts')
const labels = require('../messages/ko.json').toolGuides
const readings = require('../src/content/guides/walkthroughs.json')

const tools = new Set([
  ...Object.values(menuConfig).flatMap(category => category.items),
  ...algorithms.filter(algorithm => algorithm.status === 'ready'),
  ...csVisualizers,
].map(item => item.href.slice(1)))
const dir = path.join(__dirname, '../src/content/guides/notes')
const notes = new Map()
for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
  for (const [tool, note] of Object.entries(require(path.join(dir, file)))) {
    assert(!notes.has(tool), 'Duplicate note for ' + tool)
    assert(note.heading?.trim() && note.body?.trim(), 'Empty note for ' + tool)
    notes.set(tool, note)
  }
}
const covered = new Set()
const slugs = new Set()
for (const guide of guides) {
  assert(!slugs.has(guide.slug) && /^[a-z0-9-]+$/.test(guide.slug), 'Invalid or duplicate slug ' + guide.slug)
  slugs.add(guide.slug)
  assert(guide.title && guide.intro && guide.tools.length && labels.categories[guide.category], guide.slug)
  assert(/^\d{4}-\d{2}-\d{2}$/.test(guide.published), guide.slug)
  if (guide.updated) assert(guide.updated >= guide.published, guide.slug)
  assert.equal(guide.tools.length, new Set(guide.tools.map(tool => tool.replaceAll('/', '-'))).size, guide.slug)
  for (const tool of guide.tools) {
    assert(tools.has(tool), 'Unknown tool ' + tool)
    if (guide.slug === 'leap-month-birthday') assert.equal(tool, 'lunar-converter')
    else assert(notes.has(tool), 'Missing note for ' + tool)
    covered.add(tool)
  }
}
assert.deepEqual([...tools].filter(tool => !covered.has(tool)), [], 'Tools without a guide')
assert.deepEqual([...notes.keys()].filter(tool => !covered.has(tool)), [], 'Orphaned notes')
for (const [slug, sections] of Object.entries(readings)) {
  assert(slugs.has(slug), 'Reading missing from catalog: ' + slug)
  for (const { heading, paragraphs, table } of sections) {
    assert(heading && paragraphs.length && paragraphs.every(p => p.trim()), 'Empty section: ' + slug)
    if (table) assert(table.caption && table.rows.every(row => row.length === table.columns.length), 'Malformed table: ' + slug)
  }
}
console.log(`${guides.length} guides cover all ${tools.size} tools.`)
