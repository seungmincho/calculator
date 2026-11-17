import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const messages = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch36/translations-dutch-pay.json', 'utf8'))
for (const locale of ['ko', 'en']) {
  let selected = 0, retried = 0, closed = 0, failSelection = false
  const snapshot = { target: 'notice', id: 'notice', text: '<b>합성 원문</b>\n한글 😀\nhttps://toolhub.ai.kr/?d=example&ro=1' }
  const props = { snapshot, busy: false, onRetry() { retried++ }, onClose() { closed++ } }
  const h = await componentHarness('src/components/DutchPayCopyRecovery.tsx', {
    props, messages: messages[locale], beforeEffects(tree) {
      const visit = node => {
        if (Array.isArray(node)) return node.forEach(visit)
        if (!node || typeof node !== 'object') return
        if (node.type === 'textarea') node.props.ref.current = {
          focus() {}, select() { if (failSelection) throw new Error('selection denied'); selected++ },
          setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, node.props.value.length) },
        }
        visit(node.props?.children)
      }
      visit(tree)
    },
  })
  h.render()
  const action = name => h.find(node => Object.hasOwn(node.props, `data-dutch-copy-${name}`))
  const field = () => h.find(node => node.type === 'textarea')
  assert.equal(field().props.value, snapshot.text); assert.equal(field().props.readOnly, true); assert.equal(selected, 0)
  assert.ok(field().props.className.includes('text-base')); assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
  failSelection = true; action('select').props.onClick(); h.render(); assert.ok(h.text().includes(messages[locale].dutchPay.copyRecovery.selectionFailed))
  failSelection = false; action('select').props.onClick(); h.render(); assert.equal(selected, 1)
  action('retry').props.onClick(); assert.equal(retried, 1)
  h.setProps({ ...props, busy: true }); assert.equal(action('retry').props.disabled, true); action('retry').props.onClick(); assert.equal(retried, 1)
  action('close').props.onClick(); assert.equal(closed, 1)
  for (const target of ['amount', 'link']) {
    h.setProps({ ...props, snapshot: { ...snapshot, target, text: target === 'amount' ? '12345' : 'https://toolhub.ai.kr/?d=literal&ro=1' } })
    assert.ok(h.text().includes(messages[locale].dutchPay.copyRecovery[`${target}Label`]))
    assert.equal(h.all().some(node => node.props.dangerouslySetInnerHTML), false)
  }
  h.cleanup(); console.log(`PASS ${locale} actual DutchPay copy recovery: full literal, labels, selection failure, retry/busy/close and sizes`)
}
console.log('DutchPay recovery preparation: 2 groups passed; real browser focus is separate')
