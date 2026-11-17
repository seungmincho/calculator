const assert = require('node:assert/strict')
const { componentHarness } = require('./component-harness.cjs')

const settle = () => new Promise(resolve => setImmediate(resolve))
let checks = 0
async function setup(options = {}) {
  const state = { api: options.api ?? 'reject', fallback: options.fallback ?? false, clipboard: '', fallbackCalls: 0, pending: [], active: null, removed: 0 }
  class Element {
    constructor() { this.style = {}; this.value = ''; this.readOnly = false }
    focus() { state.active = this }
    select() { state.selected = this.value }
    setSelectionRange(start, end) { state.range = [start, end] }
    remove() { state.removed++ }
  }
  state.active = new Element()
  const originalActive = state.active
  const document = { get activeElement() { return state.active }, createElement: () => new Element(), body: { appendChild() {} }, execCommand(command) {
    assert.equal(command, 'copy'); state.fallbackCalls++
    if (state.fallback === 'throw') throw new Error('Copy disabled')
    if (state.fallback) state.clipboard = state.selected
    return state.fallback
  } }
  const navigator = { get clipboard() { return state.api === 'missing' ? undefined : { writeText(value) {
    if (state.api === 'syncThrow') throw new Error('Clipboard disabled')
    if (state.api === 'reject') return Promise.reject(new Error('NotAllowedError'))
    if (state.api === 'pending') return new Promise((resolve, reject) => state.pending.push({ resolve() { state.clipboard = value; resolve() }, reject, value }))
    state.clipboard = value; return Promise.resolve()
  } } } }
  const h = await componentHarness('src/components/GpaConverter.tsx', {
    url: options.url ?? 'https://toolhub.ai.kr/gpa-converter/?scale=4.3&v=3.7&lang=en#result',
    hydrated: options.hydrated ?? true, document, navigator, globals: { HTMLElement: Element },
  })
  h.render()
  return { h, state, originalActive,
    async copy(label) { h.button(label).props.onClick(); await settle(); h.render() },
    change(value) { h.find(node => node.props?.id === 'gpa-input').props.onChange({ target: { value } }); h.render() },
    recovery(target) { return h.all().find(node => typeof node.type === 'function' && node.props?.target === target && typeof node.props?.onRetry === 'function') },
  }
}
async function check(label, action) { await action(); checks++; console.log(`PASS ${label}`) }

async function main() {
  await check('hydration restores shared values once without overwriting the original query', async () => {
    const url = 'https://toolhub.ai.kr/gpa-converter/?scale=4.3&v=3.700&lang=en#result'
    const s = await setup({ hydrated: false, url })
    assert.equal(s.h.find(node => node.props?.id === 'gpa-input').props.value, '')
    assert.equal(s.h.window.location.href, url)
    s.h.setHydrated(true)
    assert.equal(s.h.find(node => node.props?.id === 'gpa-input').props.value, '3.700')
    assert.deepEqual(Object.fromEntries(s.h.window.location.searchParams), Object.fromEntries(new URL(url).searchParams))
    assert.equal(s.h.window.location.hash, '#result')
    s.change('3.5'); assert.equal(s.h.window.location.search.includes('v=3.5'), true)
    s.h.render(); assert.equal(s.h.find(node => node.props?.id === 'gpa-input').props.value, '3.5')
    s.h.cleanup()
  })
  await check('Clipboard denial/missing/synchronous throw with false/throw fallback never reports success', async () => {
    for (const api of ['reject', 'missing', 'syncThrow']) for (const fallback of [false, 'throw']) {
      const s = await setup({ api, fallback }); await s.copy('copyResult')
      const recovery = s.recovery('result'); assert.ok(recovery)
      assert.ok(recovery.props.text.includes('result.method.ratio')); assert.ok(recovery.props.text.includes('result.method.band'))
      assert.equal(recovery.props.text.split('\n').length, 4)
      assert.equal(s.h.text().includes('copied'), false); assert.equal(s.state.fallbackCalls, 1); assert.equal(s.state.removed, 1)
      s.h.cleanup()
    }
  })
  await check('confirmed fallback success removes temporary field and provides copied state', async () => {
    const s = await setup({ api: 'missing', fallback: true }); await s.copy('copyResult')
    assert.equal(s.recovery('result'), undefined); assert.ok(s.h.text().includes('copied'))
    assert.ok(s.state.clipboard.includes('result.method.ratio')); assert.equal(s.state.removed, 1)
    s.h.cleanup()
  })
  await check('manual link is built from current input and retains unrelated URL context', async () => {
    const s = await setup(); s.change('3.25'); await s.copy('copyLink')
    const value = s.recovery('link').props.text, url = new URL(value)
    assert.equal(url.searchParams.get('v'), '3.25'); assert.equal(url.searchParams.get('scale'), '4.3')
    assert.equal(url.searchParams.get('lang'), 'en'); assert.equal(url.hash, '#result')
    s.change('2.5'); assert.equal(s.recovery('link'), undefined)
    await s.copy('copyLink'); assert.equal(new URL(s.recovery('link').props.text).searchParams.get('v'), '2.5')
    s.h.cleanup()
  })
  await check('retry uses the failure target and success replaces manual recovery', async () => {
    const s = await setup(); await s.copy('copyResult'); const recovery = s.recovery('result'), expected = recovery.props.text
    s.state.api = 'success'; recovery.props.onRetry(); await settle(); s.h.render()
    assert.equal(s.state.clipboard, expected); assert.equal(s.recovery('result'), undefined); assert.ok(s.h.text().includes('copied'))
    s.h.cleanup()
  })
  await check('input/scale edits and unmount invalidate both late resolve and rejection', async () => {
    for (const action of ['input', 'scale', 'unmount']) for (const outcome of ['resolve', 'reject']) {
      const s = await setup({ api: 'pending', fallback: true }); await s.copy('copyResult')
      if (action === 'input') s.change('2.0')
      if (action === 'scale') { s.h.button('scales.s40').props.onClick(); s.h.render() }
      if (action === 'unmount') s.h.cleanup()
      const pending = s.state.pending[0]; if (outcome === 'resolve') pending.resolve(); else pending.reject(new Error('late denied'))
      await settle()
      if (action !== 'unmount') { s.h.render(); assert.equal(s.h.text().includes('copied'), false); assert.equal(s.recovery('result'), undefined) }
      assert.equal(s.state.fallbackCalls, 0)
      if (action !== 'unmount') s.h.cleanup()
    }
  })
  await check('new target supersedes an older result rejection without overwriting the successful link', async () => {
    const s = await setup({ api: 'pending', fallback: true }); await s.copy('copyResult'); const old = s.state.pending[0]
    s.state.api = 'success'; await s.copy('copyLink'); const newest = s.state.clipboard
    old.reject(new Error('old result denied')); await settle(); s.h.render()
    assert.equal(s.state.fallbackCalls, 0); assert.equal(s.state.clipboard, newest); assert.ok(s.h.text().includes('copyLinkDone')); assert.equal(s.recovery('result'), undefined)
    s.h.cleanup()
  })
  await check('new same-target failure remains visible after an earlier request resolves', async () => {
    const s = await setup({ api: 'pending' }); await s.copy('copyResult'); const old = s.state.pending[0]
    s.state.api = 'reject'; await s.copy('copyResult'); assert.ok(s.recovery('result'))
    old.resolve(); await settle(); s.h.render()
    assert.ok(s.recovery('result')); assert.equal(s.h.text().includes('copied'), false)
    s.h.cleanup()
  })
  console.log(`Independent GPA copy: ${checks} component groups passed`)
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
