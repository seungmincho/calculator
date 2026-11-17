// Actual storage/import handlers with synthetic notes only; no browser storage is read.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { parseNotes, mergeNotes, sortNotes, newId, STORAGE_KEY } from '../../../src/utils/notepad.ts'

const source = readFileSync(new URL('../../../src/components/Notepad.tsx', import.meta.url), 'utf8')
const storageStart = source.indexOf('const onStorage = (e: StorageEvent)')
const storageEnd = source.indexOf("window.addEventListener('storage', onStorage)", storageStart)
const importStart = source.indexOf('const importFiles = async (files: FileList | null)')
const importEnd = source.indexOf('// ── 찾기·바꾸기', importStart)
assert.ok(storageStart >= 0 && storageEnd > storageStart && importStart >= 0 && importEnd > importStart)
const compile = value => ts.transpileModule(value, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const note = content => ({ id: 'synthetic-1', title: 'Synthetic', content, createdAt: 1, updatedAt: 2 })
function fixture() {
  const state = { notes: [note('unsaved local text')], activeId: 'synthetic-1', toast: null }
  const context = vm.createContext({
    notesRef: { current: state.notes }, skipSave: { current: false }, fileRef: { current: { value: 'selected-file' } }, activeId: state.activeId,
    parseNotes, mergeNotes, sortNotes, newId, STORAGE_KEY, clearReadingSelection() {}, t: key => key,
    setNotes: value => { state.notes = value }, setActiveId: value => { state.activeId = typeof value === 'function' ? value(state.activeId) : value },
    showToast: value => { state.toast = value },
  })
  vm.runInContext(compile(`${source.slice(storageStart, storageEnd)};globalThis.onStorage = onStorage;${source.slice(importStart, importEnd)};globalThis.importFiles = importFiles;`), context)
  return { state, context }
}
const probes = []
{
  const f = fixture()
  f.context.onStorage({ key: STORAGE_KEY, newValue: JSON.stringify([note('other tab text')]) })
  assert.equal(f.state.notes[0].content, 'other tab text')
  probes.push({ name: 'storage event replaces unsaved local note', content: f.state.notes[0].content })
}
{
  const f = fixture()
  f.context.onStorage({ key: STORAGE_KEY, newValue: null })
  assert.equal(f.state.notes.length, 0)
  probes.push({ name: 'external key deletion clears current unsaved notes', count: f.state.notes.length })
}
{
  const f = fixture()
  let resolveFile
  const fileText = new Promise(resolve => { resolveFile = resolve })
  const pending = f.context.importFiles([{ name: 'synthetic.txt', text: () => fileText }])
  f.state.notes = [note('new edit while file is loading')]
  f.context.notesRef.current = f.state.notes
  resolveFile('imported synthetic text')
  await pending
  assert.equal(f.state.notes.find(item => item.id === 'synthetic-1').content, 'unsaved local text')
  assert.equal(f.state.notes.length, 2)
  probes.push({ name: 'late import restores captured notes over a newer edit', content: f.state.notes.find(item => item.id === 'synthetic-1').content, count: f.state.notes.length })
}
const report = { reproductionOnly: true, sourceSha256: createHash('sha256').update(source).digest('hex'), groups: probes.length, probes }
if (process.argv.includes('--record')) writeFileSync(new URL('before-fix.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
