import assert from 'node:assert/strict'
import fs from 'node:fs'
import { componentHarness, all, text } from '../docs/verify/2026-11-17-repeat-batch19/component-harness.cjs'

const merge = (base, patch) => { for (const [key, value] of Object.entries(patch)) base[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(base[key] ?? {}, value) : value; return base }
const messages = lang => merge(JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8')), JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch23/translations-typing-custom.json', 'utf8'))[lang])
let groups = 0
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); groups++; console.log(`PASS ${name}`) }
const flush = async h => { await new Promise(resolve => setImmediate(resolve)); h.render() }

async function workspace(language = 'ko') {
  let now = 1000, sequence = 0, writes = 0, focuses = 0
  const timers = new Map(), captured = [], translations = messages(language)
  const h = await componentHarness('src/components/CustomTypingWorkspace.tsx', {
    props: { active: true }, messages: translations, url: 'https://toolhub.ai.kr/typing-test/?mode=time&sec=30#kept',
    storagePort: { getItem: () => 'untouched records', setItem: () => { writes++ } },
    beforeEffects(tree) { const input = all(tree).find(node => Object.hasOwn(node.props, 'data-custom-input')); if (input) input.props.ref.current = { focus() { focuses++ } } },
    globals: { performance: { now: () => now }, setInterval(callback) { const id = ++sequence; timers.set(id, callback); captured.push(callback); return id }, clearInterval(id) { timers.delete(id) } },
  })
  h.render()
  const find = data => h.find(node => Object.hasOwn(node.props, data))
  const render = () => h.render()
  return { h, translations, timers, captured, writes: () => writes, focuses: () => focuses, find,
    draft(value) { find('data-custom-draft').props.onChange({ target: { value } }); render() },
    apply() { const button = find('data-custom-apply'); assert.equal(button.props.disabled, false); button.props.onClick(); render() },
    input(value, composing = false) { find('data-custom-input').props.onChange({ target: { value }, nativeEvent: { isComposing: composing } }); render() },
    startComposition() { find('data-custom-input').props.onCompositionStart(); render() },
    endComposition(value) { find('data-custom-input').props.onCompositionEnd({ currentTarget: { value } }); render() },
    retry() { find('data-custom-retry').props.onClick(); render() },
    language(value) { h.find(node => node.props['data-custom-language'] === value).props.onClick(); render() },
    advance(ms) { now += ms; for (const callback of [...timers.values()]) callback(); render() },
    result: () => h.all().find(node => Object.hasOwn(node.props, 'data-custom-result')),
    target: () => find('data-custom-target').props.children.map(node => node.props.children).join(''),
    setActive(active) { h.setProps({ active }) },
  }
}

await check('Draft boundaries and normalized preview never cut the passage or touch storage/URL', async () => {
  const f = await workspace(), url = f.h.window.location.href
  f.draft('a'.repeat(9)); assert.equal(f.find('data-custom-apply').props.disabled, true)
  f.draft('😀'.repeat(1001)); assert.equal(f.find('data-custom-apply').props.disabled, true)
  assert.equal([...f.find('data-custom-draft').props.value].length, 1001)
  assert.equal([...text(f.find('data-custom-preview'))].length, 1001)
  const draft = '  alpha\r\nbeta\tgamma  '
  f.draft(draft); f.apply()
  assert.equal(f.find('data-custom-draft').props.value, draft); assert.equal(f.target(), 'alpha beta gamma')
  assert.equal(f.timers.size, 0); assert.equal(f.h.window.location.href, url); assert.equal(f.writes(), 0)
  f.h.cleanup()
})

await check('Draft and next-unit edits preserve the running confirmed target and current grading unit', async () => {
  const f = await workspace(), first = '가나다라마바사아자차'
  f.draft(first); f.apply(); f.input('가'); f.advance(1500)
  assert.equal(f.timers.size, 1)
  f.draft('this is my second private text'); f.language('en')
  assert.equal(f.target(), first); assert.equal(f.find('data-custom-input').props.lang, 'ko')
  assert.ok(f.h.text().includes(f.translations.typingTest.custom.replaceWarning)); assert.equal(f.timers.size, 1)
  f.input(first); assert.ok(f.result()); assert.equal(f.timers.size, 0)
  f.retry(); assert.equal(f.target(), first); assert.equal(f.find('data-custom-input').props.lang, 'ko')
  f.apply(); assert.equal(f.target(), 'this is my second private text'); assert.equal(f.find('data-custom-input').props.lang, 'en')
  assert.equal(f.find('data-custom-input').props.value, ''); assert.equal(f.writes(), 0)
  f.h.cleanup()
})

await check('Matching final Korean composition waits for commitment and old composition callbacks cannot finish a retry', async () => {
  const f = await workspace(), target = '가나다라마바사아자차'
  f.draft(target); f.apply(); f.startComposition(); f.input('ㄱ', true); f.advance(1000)
  f.input(target, true); assert.equal(f.result(), undefined); assert.equal(f.timers.size, 1)
  const previousInput = f.find('data-custom-input')
  f.endComposition(target); assert.ok(f.result()); assert.equal(f.timers.size, 0)
  const firstResult = text(f.result())
  f.input(target); assert.equal(text(f.result()), firstResult)
  f.retry(); previousInput.props.onCompositionEnd({ currentTarget: { value: target } }); f.h.render()
  assert.equal(f.result(), undefined); assert.equal(f.find('data-custom-input').props.value, '')
  f.h.cleanup()
})

await check('Committed final prefix error completes with a visible error instead of remaining in composition', async () => {
  const f = await workspace(), target = '가나다라마바사아자각', wrong = '가나다라마바사아자가'
  f.draft(target); f.apply(); f.startComposition(); f.input(wrong, true); f.advance(1200)
  assert.equal(f.result(), undefined)
  f.endComposition(wrong); assert.ok(f.result()); assert.match(text(f.result()), /1개/)
  assert.ok(f.h.text().includes('정확도 90%')); assert.equal(f.timers.size, 0)
  f.h.cleanup()
})

await check('One active timer survives plain edits; restart/leave/unmount clear it and invalidate old ticks', async () => {
  const f = await workspace(), target = 'abcdefghij'
  f.draft(target); f.language('en'); f.apply(); f.input('a'); assert.equal(f.timers.size, 1)
  f.advance(1000); const oldTick = f.captured[0], oldInput = f.find('data-custom-input')
  f.draft('saved draft goes here'); f.translations.typingTest = messages('en').typingTest; f.h.render()
  assert.equal(f.timers.size, 1); assert.equal(f.find('data-custom-draft').props.value, 'saved draft goes here')
  f.retry(); assert.equal(f.timers.size, 0); oldTick(); f.h.render()
  assert.equal(f.find('data-custom-input').props.value, ''); assert.ok(f.h.text().includes('Elapsed: 0.0s'))
  f.input('a'); assert.equal(f.timers.size, 1)
  f.setActive(false); assert.equal(f.timers.size, 0); assert.equal(f.h.text(), '')
  oldInput.props.onChange({ target: { value: target }, nativeEvent: {} }); oldTick(); f.h.render()
  f.setActive(true)
  assert.equal(f.target(), target); assert.equal(f.find('data-custom-draft').props.value, 'saved draft goes here')
  assert.equal(f.find('data-custom-input').props.value, ''); assert.equal(f.timers.size, 0)
  f.input('a'); assert.equal(f.timers.size, 1); f.h.cleanup(); assert.equal(f.timers.size, 0)
})

await check('Only typing input blocks paste/drop; IME keys are not intercepted and Escape resets the confirmed attempt', async () => {
  const f = await workspace()
  f.draft('abcdefghij'); f.apply(); f.input('a')
  const input = f.find('data-custom-input')
  assert.equal(f.find('data-custom-draft').props.onPaste, undefined)
  let prevented = 0
  for (const event of ['onPaste', 'onDrop']) input.props[event]({ preventDefault() { prevented++ } })
  input.props.onBeforeInput({ nativeEvent: { inputType: 'insertFromPaste' }, preventDefault() { prevented++ } })
  assert.equal(prevented, 3)
  input.props.onKeyDown({ key: 'Escape', keyCode: 229, nativeEvent: { isComposing: true }, preventDefault() { prevented++ } }); f.h.render()
  assert.equal(f.find('data-custom-input').props.value, 'a')
  input.props.onKeyDown({ key: 'Enter', nativeEvent: {}, preventDefault() { prevented++ } }); assert.equal(prevented, 4)
  input.props.onKeyDown({ key: 'Escape', nativeEvent: {}, preventDefault() {} }); f.h.render()
  assert.equal(f.find('data-custom-input').props.value, ''); assert.equal(f.target(), 'abcdefghij')
  f.h.cleanup()
})

await check('KO/EN summary excludes the private passage and all new editors/buttons use the intended sizes', async () => {
  for (const language of ['ko', 'en']) {
    const f = await workspace(language), target = 'PRIVATE-UNIQUE-PASSAGE'
    f.draft(target); f.language('en'); f.apply(); f.input('P'); f.advance(2000); f.input(target)
    assert.ok(f.result())
    const copy = f.h.find(node => typeof node.type === 'function' && node.type.name === 'TypingSummaryCopy')
    assert.ok(!copy.props.text.includes(target)); assert.ok(!copy.props.text.includes('typing-test/?'))
    for (const node of f.h.all().filter(node => node.type === 'button')) assert.match(node.props.className, /min-h-11/)
    for (const node of f.h.all().filter(node => node.type === 'textarea')) assert.match(node.props.className, /text-base/)
    f.h.cleanup()
  }
})

await check('Actual copy child shows failure/manual selection, retries, and drops late results for changed summary or unmount', async () => {
  let outcome = 'fail', fallbackCalls = 0, resolvePending
  class Element { constructor() { this.style = {} } focus() {} select() {} setSelectionRange() {} remove() {} }
  const props = { text: 'summary A', contextKey: 'attempt-1', active: true }
  const h = await componentHarness('src/components/TypingSummaryCopy.tsx', { props, messages: messages('ko'), globals: { HTMLElement: Element }, navigator: { clipboard: { writeText: async () => { if (outcome === 'fail') throw Error('denied'); if (outcome === 'pending') await new Promise(resolve => { resolvePending = resolve }) } } }, document: { body: { appendChild() {} }, createElement: () => new Element(), execCommand() { fallbackCalls++; return false } } })
  h.render(); h.button('결과 요약 복사').props.onClick(); await flush(h)
  assert.equal(fallbackCalls, 1)
  const field = h.find(node => node.type === 'textarea'); assert.equal(field.props.readOnly, true); assert.equal(field.props.value, 'summary A')
  let selected = false; field.props.ref.current = { focus() {}, select() { selected = true }, setSelectionRange() {} }
  h.button('요약 전체 선택').props.onClick(); h.render(); assert.equal(selected, true)
  outcome = 'success'; h.button('결과 요약 복사').props.onClick(); await flush(h); assert.ok(h.text().includes('결과 요약을 복사했습니다.'))
  outcome = 'pending'; h.button('결과 요약을 복사했습니다.').props.onClick(); h.render()
  h.setProps({ ...props, text: 'summary B', contextKey: 'attempt-2' }); resolvePending(); await flush(h)
  assert.ok(!h.text().includes('결과 요약을 복사했습니다.')); assert.equal(h.all().filter(node => node.type === 'textarea').length, 0)
  h.button('결과 요약 복사').props.onClick(); h.cleanup(); resolvePending(); await new Promise(resolve => setImmediate(resolve))
  assert.equal(fallbackCalls, 1)
})

await check('Explicit apply retry and Escape focus the new input; mount draft locale and reactivation never autofocus', async () => {
  const f = await workspace()
  assert.equal(f.focuses(), 0); f.draft('abcdefghij'); assert.equal(f.focuses(), 0)
  f.apply(); assert.equal(f.focuses(), 1)
  f.draft('unfinished new draft'); f.translations.typingTest = messages('en').typingTest; f.h.render(); assert.equal(f.focuses(), 1)
  f.retry(); assert.equal(f.focuses(), 2)
  f.find('data-custom-input').props.onKeyDown({ key: 'Escape', nativeEvent: {}, preventDefault() {} }); f.h.render(); assert.equal(f.focuses(), 3)
  f.setActive(false); f.setActive(true); assert.equal(f.focuses(), 3)
  // A start superseded before its commit must not focus a hidden/reopened workspace.
  f.find('data-custom-apply').props.onClick(); f.setActive(false); f.setActive(true)
  assert.equal(f.focuses(), 3)
  const staleStart = f.find('data-custom-apply').props.onClick
  f.h.cleanup(); staleStart(); assert.equal(f.focuses(), 3)
})

console.log(`Custom typing components: ${groups} groups passed (controlled events/timers; no OS IME claim)`)
