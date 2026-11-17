import assert from 'node:assert/strict'
import fs from 'node:fs'

// Reuse only the stable parent I/O host; expose effects/catalog in memory without editing shared files.
const sourcePath = new URL('./ocr-output-parent-harness.mjs', import.meta.url)
const hostPath = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
const input = fs.readFileSync(sourcePath, 'utf8')
const declaration = `const hostSource = source.replace(anchor, "bundle: true, write: false, supported: { 'dynamic-import': false }, format:")`
const cleanup = '    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); timers.clear() },'
const replay = '    replayEffects() { for (const [index] of effects) hooks[index].cleanup?.(); for (const [index, pending] of effects) hooks[index].cleanup = pending.effect(); return render() },\n' + cleanup
assert.ok(input.includes(declaration))
const transformed = input
  .replace("new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)", `new URL(${JSON.stringify(hostPath.href)})`)
  .replace(declaration, declaration + `.replace(${JSON.stringify(cleanup)}, ${JSON.stringify(replay)})`)
  .replace('return { h, io, worker, creation, termination, label, field, settle, flush, navigator, find,', 'return { h, io, messages, worker, creation, termination, label, field, settle, flush, navigator, find,')
const { fixture: baseFixture, componentHarness } = await import('data:text/javascript;base64,' + Buffer.from(transformed).toString('base64'))

export async function fixture() {
  const base = await baseFixture(), timers = [], selections = []
  let child = null, selecting = () => {}, alive = true
  const schedule = base.h.context.setTimeout
  base.h.context.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return schedule(callback, delay) }
  base.h.window.setTimeout = base.h.context.setTimeout
  const fieldPort = {
    focus() { selections.push('focus'); selecting('focus') },
    select() { selections.push('select'); selecting('select') },
    setSelectionRange(start, end) { selections.push(['range', start, end]); selecting('range') },
  }
  const bindRefs = tree => {
    const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node || typeof node !== 'object') return; if (Object.hasOwn(node.props ?? {}, 'data-ocr-copy-manual')) node.props.ref.current = fieldPort; visit(node.props?.children) }
    visit(tree)
  }
  const sync = async () => {
    if (!alive) { await base.flush(); return }
    await base.settle()
    const props = base.h.all().find(node => node.type === 'OcrCopyRecovery')?.props
    if (!props) { child?.cleanup(); child = null; return }
    if (child) child.setProps(props)
    else { child = await componentHarness('src/components/OcrCopyRecovery.tsx', { props, messages: base.messages, beforeEffects: bindRefs }); child.render() }
  }
  return { ...base, timers, selections, sync,
    get child() { return child },
    async act(key, value) { await base.action(key, value); await sync() },
    async edit(text) { await base.edit(text); await sync() },
    async locale(language) { await base.locale(language); await sync() },
    async complete(index, text) { await base.complete(index, text); await sync() },
    async add(count = 1) { await base.add(count); await sync() },
    async childClick(key) { assert.ok(child); child.find(node => Object.hasOwn(node.props ?? {}, 'data-ocr-copy-' + key)).props.onClick(); child.render(); await sync() },
    selection(callback) { selecting = callback },
    async handoff(selection = false) { await base.click(selection ? 'handoff.selection' : 'handoff.read'); await sync() },
    cleanup() { alive = false; child?.cleanup(); base.cleanup() },
  }
}
