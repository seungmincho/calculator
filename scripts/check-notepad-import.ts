import assert from 'node:assert/strict'
import { backupJson, type Note } from '../src/utils/notepad.ts'
import { createNotepadImporter, mergeImportedNotes, parseNotepadImport } from '../src/utils/notepadImport.ts'
const note = (content = '원고', id = 'same'): Note => ({ id, title: '같은 제목', content, createdAt: 1, updatedAt: 2, pinned: false })
let groups = 0
async function check(name: string, run: () => unknown) { await run(); groups++; console.log(`PASS ${name}`) }
await check('v1 self backup and raw arrays preserve strings and large lists exactly', () => {
  const notes = [note('\u0000\ud800\r\n'), note('다른 원고', 'other')]
  for (const raw of [JSON.stringify(notes), backupJson(notes, 0)]) assert.deepEqual(parseNotepadImport(raw), { ok: true, notes })
  const many = Array.from({ length: 50000 }, (_, i) => note('', `${i}`)); const result = parseNotepadImport(backupJson(many, 0)); assert.equal(result.ok, true); if (result.ok) assert.equal(result.notes.length, 50000)
  for (const raw of ['{', JSON.stringify({ app: 'other', version: 1, notes }), JSON.stringify({ app: 'toolhub-notepad', version: 2, notes }), JSON.stringify([{ content: 'partial' }])]) assert.equal(parseNotepadImport(raw).ok, false)
})
await check('ID conflicts keep both without timestamp winners; reimport does not multiply copies', () => {
  const current = [note('local'), note('legitimate duplicate', 'id2'), note('legitimate duplicate', 'id3')], incoming = [note('external')]
  const merged = mergeImportedNotes(current, incoming, () => 'same')
  assert.deepEqual(merged.notes.map(n => n.content), ['local', 'legitimate duplicate', 'legitimate duplicate', 'external'])
  assert.equal(new Set(merged.notes.map(n => n.id)).size, 4); assert.equal(merged.conflicts, 1)
  assert.deepEqual(current[0], note('local')); assert.equal(mergeImportedNotes(merged.notes, incoming).added, 0)
  assert.equal(mergeImportedNotes(current, [note('local', 'distinct-id')]).added, 1)
  assert.equal(mergeImportedNotes(current, [note('local')]).duplicates, 1)
  const reserved = mergeImportedNotes([note('old', 'original')], [note('new', 'original'), note('new', 'reserved-id')], () => 'reserved-id')
  assert.equal(reserved.notes.length, 3); assert.deepEqual(reserved.notes.map(n => n.id), ['original', 'reserved-id-1', 'reserved-id'])
  assert.equal(reserved.duplicates, 0); assert.equal(reserved.added, 2)
})
await check('sequential reading isolates individual failures and preserves text newline policy', async () => {
  const order: string[] = [], importer = createNotepadImporter({ now: () => 5, id: () => 'txt' })
  const result = await importer.read([
    { name: 'first.txt', async text() { order.push('first'); return 'a\r\nb\rc' } },
    { name: 'bad.txt', async text() { order.push('bad'); throw new Error('read') } },
    { name: 'future.json', async text() { order.push('future'); return '{"app":"toolhub-notepad","version":2,"notes":[]}' } },
    { name: 'good.json', async text() { order.push('good'); return backupJson([note()], 0) } },
  ])
  assert.deepEqual(order, ['first', 'bad', 'future', 'good']); assert.equal(result?.notes[0].content, 'a\nb\nc'); assert.equal(result?.notes[0].title, 'first'); assert.equal(result?.notes.length, 2)
  assert.deepEqual(result?.failures.map(f => f.error), ['unreadable', 'unsupported'])
})
await check('edit cancellation consumes late rejection without starting the next file', async () => {
  let reject: (error: Error) => void = () => {}; let second = 0, scope = 1
  const importer = createNotepadImporter(), first = new Promise<string>((_resolve, no) => { reject = no })
  const pending = importer.read([{ name: 'first', text: () => first }, { name: 'second', async text() { second++; return 'b' } }], () => scope === 1)
  scope++; reject(new Error('late')); assert.equal(await pending, null); assert.equal(second, 0)
})
await check('new import, cancel and dispose invalidate late resolves; Strict reactivation works', async () => {
  const importer = createNotepadImporter(); let resolve: (text: string) => void = () => {}
  const slow = () => new Promise<string>(yes => { resolve = yes })
  const old = importer.read([{ name: 'old', text: slow }]); const next = await importer.read([{ name: 'new', async text() { return 'new' } }]); resolve('old')
  assert.equal(await old, null); assert.equal(next?.notes[0].content, 'new')
  const cancelled = importer.read([{ name: 'cancel', text: slow }]); importer.cancel(); resolve('cancel'); assert.equal(await cancelled, null)
  const gone = importer.read([{ name: 'gone', text: slow }]); importer.dispose(); importer.activate(); resolve('gone'); assert.equal(await gone, null)
  assert.equal((await importer.read([{ name: 'fresh', async text() { return 'fresh' } }]))?.notes[0].content, 'fresh')
})
console.log(`notepad import: ${groups} groups passed`)
