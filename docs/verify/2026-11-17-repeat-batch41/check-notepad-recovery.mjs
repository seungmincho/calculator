import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const fragments = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch41/translations-notepad.json', 'utf8'))
const note = (content, id = 'same') => ({ id, title: '<b>합성 제목</b>', content, createdAt: 1, updatedAt: 2 })
for (const locale of ['ko', 'en']) {
  const messages = { notepad: { ...JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')).notepad, ...fragments[locale].notepad } }
  const calls = []
  const view = { ready: true, notes: [note('local')], activeId: 'same', revision: 1, scope: 7, dirty: true, status: 'external', error: 'conflict', originalRaw: 'old', external: { ok: true, raw: 'external-raw', value: [note('external')] }, undoToken: null }
  const props = { view, onRetry() { calls.push('retry') }, onRecheck() { calls.push('recheck') }, onKeepBoth(scope, raw) { calls.push(['merge', scope, raw]) }, onBackup() { calls.push('backup') }, onRawBackup(raw) { calls.push(['raw', raw]) }, onRetrySettings() { calls.push('settings') } }
  const h = await componentHarness('src/components/NotepadRecovery.tsx', { props, messages }); h.render()
  const by = name => h.find(node => Object.hasOwn(node.props, `data-notepad-${name}`))
  assert.deepEqual(calls, []); assert.ok(h.text().includes('<b>합성 제목</b>')); assert.equal(h.all().some(node => node.props.dangerouslySetInnerHTML), false)
  assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
  by('keep-both').props.onClick(); assert.deepEqual(calls.pop(), ['merge', 7, 'external-raw'])
  by('backup-raw').props.onClick(); assert.deepEqual(calls.pop(), ['raw', 'external-raw'])
  by('backup-current').props.onClick(); assert.equal(calls.pop(), 'backup')
  by('save-recheck').props.onClick(); assert.equal(calls.pop(), 'recheck')
  h.setProps({ ...props, view: { ...view, status: 'saving', error: undefined } })
  assert.equal(by('keep-both').props.disabled, true); by('keep-both').props.onClick(); assert.deepEqual(calls, [])
  h.setProps({ ...props, view: { ...view, external: { ok: true, raw: null, value: [] } } }); assert.ok(h.text().includes(messages.notepad.persistence.externalEmpty))
  by('keep-both').props.onClick(); assert.deepEqual(calls.pop(), ['merge', 7, null])
  for (const error of Object.keys(messages.notepad.persistence.errors)) {
    h.setProps({ ...props, settingsError: 'quota', view: { ...view, status: 'error', error, external: { ok: false, raw: '{broken', error: 'corrupt' } } })
    assert.ok(h.text().includes(messages.notepad.persistence.errors[error])); assert.equal(h.all().some(node => Object.hasOwn(node.props, 'data-notepad-keep-both')), false)
    by('backup-raw').props.onClick(); assert.deepEqual(calls.pop(), ['raw', '{broken'])
    by('save-retry').props.onClick(); assert.equal(calls.pop(), 'retry')
    by('settings-retry').props.onClick(); assert.equal(calls.pop(), 'settings')
  }
  for (const status of ['idle', 'dirty', 'saving', 'saved']) {
    h.setProps({ ...props, view: { ...view, external: null, error: undefined, status } })
    assert.ok(h.text().includes(messages.notepad.persistence[status]))
  }
  h.setProps({ ...props, view: { ...view, ready: false, external: null, error: undefined, status: 'idle' } }); assert.ok(h.text().includes(messages.notepad.persistence.loading))
  h.cleanup(); console.log(`PASS ${locale} recovery: exact preview ownership, literal titles/raw, error/status labels, busy guard and 44px controls`)
}
console.log('notepad recovery: 2 actual child groups passed; native layout/focus is separate')
