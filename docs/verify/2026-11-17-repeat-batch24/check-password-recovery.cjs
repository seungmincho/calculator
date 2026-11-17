/* eslint-disable @typescript-eslint/no-require-imports -- Actual component event fixture uses the existing CommonJS harness. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const messages = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch24/translations-password-actions.json', 'utf8'))

;(async () => {
  for (const locale of ['ko', 'en']) {
    let retried = 0, closed = 0, selected = 0, selectionFails = false
    const text = 'fake-first\nfake-second'
    const props = { text, target: 'all', count: 2, onRetry() { retried++ }, onClose() { closed++ } }
    const h = await componentHarness('src/components/PasswordCopyRecovery.tsx', {
      props, messages: messages[locale],
      beforeEffects(tree) {
        const visit = value => {
          if (!value || typeof value !== 'object') return
          if (Array.isArray(value)) { value.forEach(visit); return }
          if (value.type === 'textarea') value.props.ref.current = {
            focus() {}, select() { if (selectionFails) throw new Error('selection denied'); selected++ },
            setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, value.props.value.length) },
          }
          visit(value.props?.children)
        }
        visit(tree)
      },
    })
    h.render()
    const t = messages[locale].passwordGenerator.copyRecovery
    const field = () => h.find(node => node.type === 'textarea')
    assert.equal(field().props.value, text); assert.equal(field().props.readOnly, true)
    assert.ok(field().props.className.includes('text-base'))
    assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11')))
    h.button(t.selectText).props.onClick(); h.render(); assert.equal(selected, 1)
    h.button(t.retry).props.onClick(); assert.equal(retried, 1)
    h.setProps({ ...props, busy: true }); assert.equal(h.button(t.retrying).props.disabled, true)
    selectionFails = true; h.button(t.selectText).props.onClick(); h.render()
    assert.ok(h.text().includes(t.selectionFailed)); assert.equal(field().props.value, text)
    h.setProps({ ...props, target: 1, text: 'fake-one' })
    assert.equal(field().props.value, 'fake-one'); assert.equal(field().props.rows, 3)
    h.button(t.close).props.onClick(); assert.equal(closed, 1)
    h.cleanup()
    console.log(`PASS ${locale} actual recovery component: read-only snapshot, selection/error, retry/busy/close, control sizing`)
  }
  console.log('2 password recovery component groups passed (controlled host refs; browser focus is separate)')
})().catch(error => { console.error(error); process.exitCode = 1 })
