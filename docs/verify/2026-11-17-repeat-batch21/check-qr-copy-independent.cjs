// Actual parent + batch + one shared actual clipboard helper; controlled clipboard/focus ports.
const assert = require('node:assert/strict')
const { componentHarness } = require('../2026-11-17-repeat-batch19/component-harness.cjs')
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

async function fixture() {
  const writes = [], fallbacks = []
  let field
  class Element {
    style = {}
    value = ''
    focus() {}
    select() {}
    setSelectionRange() {}
    remove() {}
  }
  const document = {
    activeElement: new Element(), body: { appendChild(node) { field = node } },
    createElement() { return new Element() },
    execCommand() { fallbacks.push(field.value); return false },
  }
  const navigator = { clipboard: { writeText(text) { const task = deferred(); writes.push({ text, task }); return task.promise } } }
  const helper = await componentHarness('src/utils/qrClipboard.ts', { document, navigator, globals: { HTMLElement: Element } })
  const sharedCopy = helper.module.exports
  const parent = await componentHarness('src/components/QrScanner.tsx', {
    props: {}, navigator, document, storage: { qrScanHistory: JSON.stringify([{ content: 'parent-history', type: 'text', timestamp: 1000 }]) },
    modules: { '@/utils/qrClipboard': sharedCopy, '@/components/QrBatchScanner': { __esModule: true, default: 'QrBatchScanner' } },
  })
  parent.render(); await flush(); parent.render()
  const batch = await componentHarness('src/components/QrBatchScanner.tsx', {
    props: { active: true }, navigator, document, globals: { AbortController },
    modules: { '@/utils/qrClipboard': sharedCopy, '@/lib/qr/image': { readQrImage: async () => ({ text: 'batch-payload', scaled: false, multiple: false }) } },
  })
  batch.render()
  batch.find(node => Object.hasOwn(node.props, 'data-qr-batch-input')).props.onChange({ target: { files: [new File(['x'], 'one.png', { type: 'image/png' })], value: 'x' } })
  batch.render(); batch.button('batch.start').props.onClick(); await flush(); batch.render()
  const recovery = h => h.all().filter(node => typeof node.type === 'function' && node.type.name === 'QrCopyRecovery').map(node => node.props.text)
  return { parent, batch, writes, fallbacks, recovery,
    copyButton(h) { return h === parent ? h.find(node => node.type === 'button' && node.props['aria-label'] === 'copy 1') : h.button('copy') },
    async settle() { await flush(); parent.render(); batch.render() },
    cleanup() { parent.cleanup(); batch.cleanup(); helper.cleanup() },
  }
}

;(async () => {
  for (const order of ['batch-parent', 'parent-batch']) {
    const f = await fixture()
    try {
      const first = order === 'batch-parent' ? f.batch : f.parent
      const second = order === 'batch-parent' ? f.parent : f.batch
      f.copyButton(first).props.onClick(); await f.settle()
      f.copyButton(second).props.onClick(); await f.settle()
      assert.equal(f.writes.length, 2, 'both OS clipboard requests have already been submitted')
      f.writes[1].task.reject(new Error('new request denied')); await f.settle()
      const currentText = order === 'batch-parent' ? 'parent-history' : 'batch-payload'
      assert.deepEqual(f.recovery(second), [currentText])
      assert.deepEqual(f.fallbacks, [currentText])
      f.writes[0].task.reject(new Error('old request denied')); await f.settle()
      assert.deepEqual(f.recovery(first), [])
      assert.deepEqual(f.recovery(second), [currentText])
      assert.deepEqual(f.fallbacks, [currentText], 'obsolete request must not issue a legacy copy')
      console.log(`PASS cross-area late rejection ${order}`)
    } finally { f.cleanup() }
  }
  const f = await fixture()
  try {
    f.copyButton(f.parent).props.onClick(); await f.settle()
    f.copyButton(f.batch).props.onClick(); await f.settle()
    f.writes[1].task.resolve(); await f.settle()
    f.writes[0].task.resolve(); await f.settle()
    assert.equal(f.copyButton(f.parent).props.children.type, 'icon:Copy')
    assert.ok(f.batch.all().some(node => node.type === 'button' && node.props.children === 'copied'))
    assert.deepEqual(f.fallbacks, [])
    console.log('PASS obsolete OS success cannot set old UI success (OS clipboard ordering itself is not asserted)')
  } finally { f.cleanup() }
  console.log('Independent QR clipboard: 3 groups passed')
})().catch(error => { console.error(error); process.exitCode = 1 })
