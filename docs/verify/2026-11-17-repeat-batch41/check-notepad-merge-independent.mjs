import assert from 'node:assert/strict'
import fs from 'node:fs'
import { mergeImportedNotes } from '../../../src/utils/notepadImport.ts'

const note = (id, content) => ({ id, title: 'same title', content, createdAt: 1, updatedAt: 2 })
const current = [note('original', 'current draft')]
const incoming = [note('original', 'incoming draft'), note('reserved-id', 'incoming draft')]
const before = structuredClone({ current, incoming })
const result = mergeImportedNotes(current, incoming, () => 'reserved-id')
const observed = { expectedNotes: 3, actualNotes: result.notes.length, added: result.added, duplicates: result.duplicates, notes: result.notes }
assert.deepEqual({ current, incoming }, before)
if (process.argv.includes('--reproduce')) {
  fs.writeFileSync('docs/verify/2026-11-17-repeat-batch41/merge-before-fix.json', JSON.stringify(observed, null, 2) + '\n')
  console.log(JSON.stringify(observed, null, 2))
} else {
  assert.equal(result.notes.length, 3)
  assert.equal(result.notes.find(note => note.id === 'original').content, 'current draft')
  assert.equal(result.notes.find(note => note.id === 'reserved-id').content, 'incoming draft')
  assert.equal(result.notes.filter(note => note.content === 'incoming draft').length, 2)
  assert.equal(new Set(result.notes.map(note => note.id)).size, 3)
  console.log('PASS generated conflict ID cannot consume a later legitimate incoming ID')
}
