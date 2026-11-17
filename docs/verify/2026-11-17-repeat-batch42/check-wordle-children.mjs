import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import { projectRecentWordleDays } from '../../../src/utils/koreanWordleHistory.ts'
import { dailyAnswer } from '../../../src/utils/koreanWordle.ts'

let groups = 0
for (const locale of ['ko', 'en']) {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch42/translations-wordle.json', 'utf8')); Object.assign(messages.koreanWordle, patch[locale].koreanWordle)
  const rows = projectRecentWordleDays({ 321: { guesses: [] }, 320: { guesses: [dailyAnswer(320)], hard: true } }, 321, { title: 'Wordle', contrast: true, url: 'https://toolhub.ai.kr/' }), selected = [], copied = []
  const props = { rows, selected: null, onSelect: day => selected.push(day), onCopy: row => copied.push(row), copying: null, copied: null }
  const h = await componentHarness('src/components/KoreanWordleHistory.tsx', { props, messages }); h.render()
  assert.equal(h.all().filter(node => Object.hasOwn(node.props, 'data-wordle-history-expand')).length, 1); h.find(node => node.props['data-wordle-history-expand'] === 320).props.onClick(); assert.deepEqual(selected, [320])
  h.setProps({ ...props, selected: 320 }); assert.equal(h.find(node => node.props['data-wordle-history-grid'] === 320).props.children, rows[1].text); h.find(node => node.props['data-wordle-history-copy'] === 320).props.onClick(); assert.equal(copied[0], rows[1])
  assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); assert.ok(!h.text().includes(dailyAnswer(320))); h.cleanup()
  let fail = false, focus = 0, retry = 0, close = 0; const selection = [], field = { focus() { focus++ }, select() { if (fail) throw Error('selection denied') }, setSelectionRange(...args) { selection.push(args) } }
  const r = await componentHarness('src/components/KoreanWordleCopyRecovery.tsx', { props: { text: rows[1].text, onRetry: () => retry++, onClose: () => close++ }, messages, beforeEffects(tree) { const visit = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); if (node.type === 'textarea') node.props.ref.current = field; visit(node.props?.children) }; visit(tree) } }); r.render()
  const button = name => r.find(node => Object.hasOwn(node.props, 'data-wordle-copy-' + name)); const textarea = r.find(node => node.type === 'textarea')
  assert.equal(textarea.props.readOnly, true); assert.equal(textarea.props.value, rows[1].text); assert.ok(textarea.props.className.includes('text-base')); button('select').props.onClick(); r.render(); assert.deepEqual(selection, [[0, rows[1].text.length]]); assert.equal(focus, 1)
  fail = true; button('select').props.onClick(); r.render(); assert.ok(r.text().includes(messages.koreanWordle.copyRecovery.selectionFailed)); button('retry').props.onClick(); button('close').props.onClick(); assert.equal(retry, 1); assert.equal(close, 1); r.cleanup()
  groups++; console.log('PASS history completed-only full snapshot and readOnly/select/retry/close', locale)
}
console.log(`Korean Wordle children: ${groups} groups passed`)
