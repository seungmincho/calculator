import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const messages = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch29/translations-team-actions.json', 'utf8'))
const has = (node, key) => Object.hasOwn(node.props, key)

for (const locale of ['ko', 'en']) {
  let selected = 0, retried = 0, closed = 0, failed = false
  const text = '팀 1 (2명)\n가, 😀\n\n팀 2 (1명)\n나'
  const props = { text, busy: false, onRetry() { retried++ }, onClose() { closed++ } }
  const h = await componentHarness('src/components/TeamResultCopyRecovery.tsx', {
    props, messages: messages[locale],
    beforeEffects(tree) {
      const visit = node => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(visit); return }
        if (node.type === 'textarea') node.props.ref.current = {
          focus() {}, select() { if (failed) throw new Error('selection unavailable'); selected++ },
          setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, node.props.value.length) },
        }
        visit(node.props?.children)
      }
      visit(tree)
    },
  })
  h.render()
  const action = name => h.find(node => has(node, `data-team-copy-${name}`))
  const field = () => h.find(node => node.type === 'textarea')
  assert.equal(field().props.value, text); assert.equal(field().props.readOnly, true)
  assert.ok(field().props.className.includes('text-base'))
  assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
  action('select').props.onClick(); assert.equal(selected, 1)
  failed = true; action('select').props.onClick(); h.render()
  assert.ok(h.text().includes(messages[locale].teamDivider.resultActions.selectionFailed)); assert.equal(field().props.value, text)
  action('retry').props.onClick(); assert.equal(retried, 1)
  h.setProps({ ...props, busy: true }); assert.equal(action('retry').props.disabled, true)
  assert.ok(h.text().includes(messages[locale].teamDivider.resultActions.copying))
  action('close').props.onClick(); assert.equal(closed, 1)
  h.setProps({ ...props, text: 'Current result' }); assert.equal(field().props.value, 'Current result')
  h.cleanup()
  console.log(`PASS ${locale} actual team recovery child: exact snapshot, manual selection/error, retry/busy/close, sizes`)
}
console.log('Team recovery child: 2 groups passed (controlled host refs; actual browser focus is separate)')
