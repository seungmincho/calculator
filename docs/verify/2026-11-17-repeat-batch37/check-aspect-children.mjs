import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch19/component-harness.cjs'

const fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch37/translations-aspect.json', 'utf8'))
let groups = 0
async function check(name, run) { await run(); groups++; console.log('PASS', name) }
const attr = (h, name, value = '') => h.find(node => node.props[name] === value)

await check('actual KO/EN nine-position and slider controls have exact coordinates, 44px targets and no implicit reset', async () => {
  for (const locale of ['ko', 'en']) {
    const calls = [], props = { x: 50, y: 50, canMoveX: true, canMoveY: false, onChange: (...value) => calls.push(value) }
    const h = await componentHarness('src/components/AspectCropControls.tsx', { props, messages: fragment[locale] }); h.render()
    const buttons = h.all().filter(node => node.type === 'button'); assert.equal(buttons.length, 9)
    for (let i = 0; i < buttons.length; i++) { assert.ok(buttons[i].props.className.includes('min-h-11')); buttons[i].props.onClick(); assert.deepEqual(calls.at(-1), [(i % 3) * 50, Math.floor(i / 3) * 50]) }
    assert.equal(attr(h, 'data-aspect-crop-position', 'center').props['aria-pressed'], true)
    assert.equal(attr(h, 'data-aspect-crop-axis', 'y').props.disabled, true); assert.ok(attr(h, 'data-aspect-crop-axis', 'y').props['aria-describedby'])
    attr(h, 'data-aspect-crop-axis', 'x').props.onChange({ target: { value: '17' } }); assert.deepEqual(calls.at(-1), [17, 50])
    const before = calls.length; attr(h, 'data-aspect-crop-axis', 'x').props.onChange({ target: { value: 'Infinity' } }); assert.equal(calls.length, before)
    h.setProps({ ...props, x: 17, y: 83 }); assert.equal(h.all().filter(node => node.type === 'button' && node.props['aria-pressed']).length, 0); assert.equal(calls.length, before)
    h.setProps({ ...props, disabled: true }); assert.equal(h.all().filter(node => node.type === 'button' && !node.props.disabled).length, 0)
    h.cleanup()
  }
})
await check('actual recovery retains full text, selects all, reports selection failure and exposes retry without false success', async () => {
  let retried = 0, closed = 0, selected = null, throws = false
  const text = 'aspect-ratio: 16 / 9;', props = { text, busy: false, onRetry: () => retried++, onClose: () => closed++ }
  const h = await componentHarness('src/components/AspectCopyRecovery.tsx', { props, messages: fragment.ko, beforeEffects(tree) {
    const search = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(search); if (node.type === 'textarea') node.props.ref.current = { focus() {}, select() {}, setSelectionRange(start, end) { if (throws) throw new Error('blocked'); selected = [start, end] } }; search(node.props?.children) }; search(tree)
  } }); h.render()
  assert.equal(attr(h, 'data-aspect-copy-manual').props.readOnly, true); assert.equal(attr(h, 'data-aspect-copy-manual').props.value, text); assert.ok(attr(h, 'data-aspect-copy-manual').props.className.includes('text-base'))
  attr(h, 'data-aspect-copy-select').props.onClick(); h.render(); assert.deepEqual(selected, [0, text.length])
  throws = true; attr(h, 'data-aspect-copy-select').props.onClick(); h.render(); assert.ok(h.text().includes(fragment.ko.aspectRatio.copyRecovery.selectionFailed))
  attr(h, 'data-aspect-copy-retry').props.onClick(); attr(h, 'data-aspect-copy-close').props.onClick(); assert.equal(retried, 1); assert.equal(closed, 1)
  h.setProps({ ...props, busy: true }); assert.equal(attr(h, 'data-aspect-copy-retry').props.disabled, true)
  assert.ok(h.all().filter(node => node.type === 'button').every(node => node.props.className.includes('min-h-11'))); h.cleanup()
})
console.log(`Aspect child UI: ${groups} groups passed`)
