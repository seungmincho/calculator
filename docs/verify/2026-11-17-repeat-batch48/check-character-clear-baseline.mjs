import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const KEY = 'characterCounter.v2', messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
const t = messages.characterCounter, queue = [], writes = []
const initial = { active: 0, tabs: Array.from({ length: 5 }, (_, index) => ({ title: `질문 ${index + 1}`, text: `기존 원고 ${index + 1}`, target: 500, basis: 'chars' })) }
const values = new Map([[KEY, JSON.stringify(initial)]])
const storage = { getItem: key => values.get(key) ?? null, setItem(key, raw) { writes.push(['set', key, raw]); values.set(key, raw) }, removeItem(key) { writes.push(['remove', key]); values.delete(key) } }
const h = await componentHarness('src/components/CharacterCounter.tsx', { messages, storagePort: storage,
  modules: { '@/components/WritingVersionsPanel': { __esModule: true, default: 'WritingVersionsPanel' }, '@/components/GuideSection': { __esModule: true, default: 'GuideSection' } },
  window: { confirm: () => true }, navigator: { locks: { request(key, action) { assert.equal(key, KEY); return new Promise((resolve, reject) => queue.push(() => { try { resolve(action()) } catch (error) { reject(error) } })) } } },
})
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); h.render() }
const field = () => h.find(node => node.type === 'textarea' && node.props['aria-label'] === t.input.aria)
h.render(); await settle(); assert.equal(field().props.value, '기존 원고 1'); assert.equal(writes.length, 0)
const clear = h.button(t.save.clearAll).props.onClick(); h.render(); assert.equal(queue.length, 1)
field().props.onChange({ target: { value: '확인 뒤에 입력한 새 원고' } }); h.render(); await settle()
const before = { displayed: field().props.value, raw: values.get(KEY), pendingLocks: queue.length }
queue.shift()(); await clear; await settle()
const after = { displayed: field().props.value, raw: values.get(KEY) ?? null, pendingLocks: queue.length, writes }
assert.equal(before.displayed, '확인 뒤에 입력한 새 원고')
assert.equal(after.displayed, '')
assert.deepEqual(writes.map(row => row.slice(0, 2)), [['remove', KEY]])
const evidence = { kind: 'actual existing CharacterCounter confirmation and deferred lock handlers; controlled browser ports, not native', boundary: 'confirm clear all, type new text while the clear lock is pending, release old clear', before, after, observedIssue: 'confirmed old operation clears newer visible manuscript before any subsequent autosave lock is released' }
if (process.argv.includes('--record')) fs.writeFileSync('docs/verify/2026-11-17-repeat-batch48/clear-before-fix.json', JSON.stringify(evidence, null, 2) + '\n')
console.log(JSON.stringify({ reproduced: true, writes: writes.length, latestBefore: before.displayed, shownAfter: after.displayed }))
h.cleanup()
