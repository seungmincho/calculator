import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { createNotepadDraft } from '../../../src/utils/notepadDraft.ts'

const note = (id, content) => ({ id, title: '<img src=x onerror=bad()>', content, createdAt: 1, updatedAt: 2 })
const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch41/translations-notepad.json', 'utf8'))
for (const locale of ['ko', 'en']) {
  let raw = JSON.stringify([note('a', 'saved')]), writes = 0, selection = null, rawBackup = null, memoryBackups = 0
  const draft = createNotepadDraft({ storage: { getItem: () => raw, setItem(_key, value) { raw = value; writes++ } }, timers: { set: () => 1, clear() {} }, id: () => 'conflict-copy' })
  draft.initialize(); draft.edit([note('a', 'local')]); raw = JSON.stringify([note('a', 'external')]); draft.externalChange()
  let props = { view: draft.snapshot(), settingsError: 'quota', onRetry() {}, onRecheck() {}, onKeepBoth: (scope, candidate) => { selection = draft.applyMergedExternal(scope, candidate) }, onBackup: () => memoryBackups++, onRawBackup: value => { rawBackup = value }, onRetrySettings() {} }
  const messages = { notepad: { untitled: 'Untitled', ...fragment[locale].notepad } }
  const h = await componentHarness('src/components/NotepadRecovery.tsx', { props, messages }); h.render()
  const attr = name => h.find(node => node.props[name] === '')
  assert.equal(selection, null); assert.equal(writes, 0); assert.ok(h.text().includes('<img src=x onerror=bad()>'))
  const oldApply = attr('data-notepad-keep-both').props.onClick; draft.edit([note('a', 'latest edit')]); oldApply(); assert.equal((await selection).error, 'cancelled'); assert.equal(writes, 0)
  props = { ...props, view: draft.snapshot() }; h.setProps(props); attr('data-notepad-keep-both').props.onClick(); assert.equal((await selection).ok, true); assert.equal(writes, 1)
  assert.deepEqual(draft.snapshot().notes.map(item => item.content).sort(), ['external', 'latest edit'])
  const corrupt = '\uFEFF{ original \u0000 <script> bytes'; raw = corrupt; draft.externalChange(); props = { ...props, view: draft.snapshot() }; h.setProps(props)
  assert.equal(h.all().some(node => Object.hasOwn(node.props, 'data-notepad-keep-both')), false)
  attr('data-notepad-backup-raw').props.onClick(); attr('data-notepad-backup-current').props.onClick(); assert.equal(rawBackup, corrupt); assert.equal(memoryBackups, 1); assert.equal(writes, 1)
  assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
  h.cleanup(); draft.dispose()
}
console.log('PASS KO/EN real recovery delegates exact preview scope/raw, rejects stale keep-both and preserves corrupt raw backup')
