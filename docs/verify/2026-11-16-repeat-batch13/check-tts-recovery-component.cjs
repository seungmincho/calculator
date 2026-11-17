// Real component callback checks with a controlled speech engine, without Chrome or OS synthesis.
const assert = require('node:assert/strict')
const esbuild = require('esbuild')
const vm = require('node:vm')

async function main() {
  const built = await esbuild.build({ entryPoints: ['src/components/TextToSpeech.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'lucide-react', '@/lib/i18n', '@/lib/i18n/ns/textToSpeech', '@/hooks/useSearchParams', '@/hooks/useHydrated'] })
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
  const text = node => typeof node === 'string' ? node : typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children)
  const manuscript = '첫 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.'
  const local = { name: '기기 음성', lang: 'ko-KR', localService: true, default: true }
  const online = { name: '온라인 음성', lang: 'ko-KR', localService: false }
  const t = (key, vars) => key + (vars ? JSON.stringify(vars) : '')
  t.raw = () => []
  const settle = () => new Promise(resolve => setImmediate(resolve))
  function harness({ source = null, voices = [local, online] } = {}) {
    let cursor = 0, dirty = false, tree, timerId = 0
    const hooks = [], effects = [], utterances = [], listeners = new Map(), timers = new Map()
    const sessionValues = new Map(source ? [['toolhub-ocr-tts-v1', JSON.stringify({ source, text: manuscript, createdAt: Date.now() })]] : [])
    const storage = values => ({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) })
    const react = {
      useState(initial) { const index = cursor++; if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial }; return [hooks[index].value, next => { const value = typeof next === 'function' ? next(hooks[index].value) : next; if (!Object.is(value, hooks[index].value)) { hooks[index].value = value; dirty = true } }] },
      useRef(initial) { const index = cursor++; if (!hooks[index]) hooks[index] = { current: initial }; return hooks[index] },
      useEffect(effect, deps) { const index = cursor++, old = hooks[index]; if (!old || deps.some((item, n) => !Object.is(item, old.deps[n]))) { hooks[index] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); hooks[index].cleanup = effect() }) } },
      useMemo(factory, deps) { const index = cursor++, old = hooks[index]; if (!old || deps.some((item, n) => !Object.is(item, old.deps[n]))) hooks[index] = { deps, value: factory() }; return hooks[index].value },
      useCallback(fn, deps) { return this.useMemo(() => fn, deps) },
    }
    // Destructured React hooks do not retain `this`.
    react.useCallback = (fn, deps) => react.useMemo(() => fn, deps)
    const synth = { voices, throwNext: false, cancels: 0, getVoices() { return synth.voices }, cancel() { synth.cancels++ }, speak(utterance) { utterances.push(utterance); if (synth.throwNext) { synth.throwNext = false; throw new Error('synchronous synth failure') } }, pause() {}, resume() {}, addEventListener(key, fn) { listeners.set(key, fn) }, removeEventListener(key) { listeners.delete(key) } }
    const module = { exports: {} }, jsx = (type, props) => ({ type, props })
    const params = new URLSearchParams(source ? `from=${source}` : '')
    const context = vm.createContext({ module, exports: module.exports, console, URL, URLSearchParams,
      require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }; if (name === 'lucide-react') return new Proxy({}, { get: () => () => null }); if (name === '@/lib/i18n') return { useTranslations: () => t }; if (name.startsWith('@/lib/i18n/ns/')) return {}; if (name === '@/hooks/useSearchParams') return { useSearchParams: () => params }; if (name === '@/hooks/useHydrated') return { useHydrated: () => true }; return require(name) },
      setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id }, clearTimeout(id) { timers.delete(id) }, setInterval() { return ++timerId }, clearInterval() {}, queueMicrotask,
      window: { speechSynthesis: synth, location: { search: params.toString() ? `?${params}` : '', pathname: '/text-to-speech/', origin: 'http://test.local' }, addEventListener(key, fn) { listeners.set(key, fn) }, removeEventListener(key) { listeners.delete(key) } },
      navigator: { userAgent: 'test desktop' }, document: {}, localStorage: storage(new Map()), sessionStorage: storage(sessionValues),
      SpeechSynthesisUtterance: class { constructor(value) { this.text = value } },
    })
    vm.runInContext(built.outputFiles[0].text, context)
    const render = () => {
      let passes = 0
      do { dirty = false; cursor = 0; tree = module.exports.default(); while (effects.length) effects.shift()(); assert.ok(++passes < 30, 'render must settle') } while (dirty)
      return tree
    }
    const button = key => all(tree).find(node => node.type === 'button' && text(node).trim() === key)
    const click = key => { const node = button(key); assert.ok(node, `${key} exists`); assert.ok(!node.props.disabled, `${key} enabled`); node.props.onClick(); render() }
    const input = id => all(tree).find(node => node.props?.id === id)
    const changeText = value => { input('tts-text').props.onChange({ target: { value } }); render() }
    const field = label => all(tree).find(node => node.type === 'select' && node.props['aria-label'] === label)
    const changeRepeat = (label, value) => { field(label).props.onChange({ target: { value: String(value) } }); render() }
    const toggleRepeat = () => { const label = all(tree).find(node => node.type === 'label' && text(node).trim() === 'repeat.enable'); all(label).find(node => node.type === 'input').props.onChange({ target: { checked: true } }); render() }
    render()
    return { render, click, button, input, changeText, changeRepeat, toggleRepeat, utterances, synth, listeners, sessionValues, get output() { return text(tree) }, end(utterance = utterances.at(-1)) { utterance.onend(); render() }, fail(code = 'network', utterance = utterances.at(-1)) { utterance.onerror({ error: code }); render() }, jump(index) { all(tree).find(node => node.type === 'button' && node.props['data-i'] === index).props.onClick(); render() }, runGap() { const entry = [...timers].find(([, timer]) => timer.delay === 0); assert.ok(entry, 'repeat gap is scheduled'); timers.delete(entry[0]); entry[1].fn(); render() }, get gapPending() { return [...timers.values()].some(timer => timer.delay === 0) } }
  }
  let count = 0
  const check = async (label, run) => { await run(); count++; console.log(`PASS ${label}`) }
  const failSecond = h => { h.changeText(manuscript); h.click('play'); h.end(); h.fail() }
  await check('middle sentence error waits for explicit retry, exact sentence resumes', () => { const h = harness(); failSecond(h); assert.equal(h.utterances.length, 2); assert.ok(h.output.includes('recovery.sentence{"number":2}')); h.click('recovery.retry'); assert.equal(h.utterances.at(-1).text, '두 번째 문장입니다.'); assert.equal(h.utterances.length, 3) })
  await check('second repeat pass and remaining passes are preserved', () => {
    const h = harness(); h.changeText(manuscript); h.toggleRepeat(); h.changeRepeat('repeat.gap', 0); h.click('play'); h.end(); h.end();
    h.end(); h.runGap(); h.end(); h.fail();
    assert.ok(h.output.includes('recovery.repeat{"pass":2,"count":3,"remaining":1}')); h.click('recovery.retry'); assert.equal(h.utterances.at(-1).text, '두 번째 문장입니다.')
    h.end(); h.end(); h.runGap(); h.end(); h.end(); h.end();
    assert.equal(h.utterances.length, 10); assert.equal(h.gapPending, false); assert.equal(h.button('play')?.props.disabled, false); assert.ok(!h.button('recovery.retry'))
  })
  await check('text edit, Stop, new sentence, and repeat changes clear failed snapshot', () => {
    for (const action of [h => h.changeText('바뀐 본문입니다.'), h => h.click('stop'), h => h.jump(2), h => h.toggleRepeat()]) { const h = harness(); failSecond(h); action(h); assert.ok(!h.button('recovery.retry')) }
  })
  await check('every repeat field clears failure including gap/count', () => {
    for (const [field, value] of [['repeat.start', 1], ['repeat.end', 1], ['repeat.count', 5], ['repeat.gap', 5]]) { const h = harness(); h.changeText(manuscript); h.toggleRepeat(); h.click('play'); h.end(); h.fail(); h.changeRepeat(field, value); assert.ok(!h.button('recovery.retry')) }
  })
  await check('same-session previous utterance late end/error cannot replace current sentence', () => { const h = harness(); h.changeText(manuscript); h.click('play'); const first = h.utterances[0]; h.end(first); h.fail('network', first); h.end(first); assert.equal(h.utterances.length, 2); assert.ok(!h.button('recovery.retry')); h.fail(); assert.ok(h.output.includes('recovery.sentence{"number":2}')) })
  await check('previous session error/end ignored after explicit retry', () => { const h = harness(); failSecond(h); const old = h.utterances.at(-1); h.click('recovery.retry'); h.fail('network', old); h.end(old); assert.equal(h.utterances.length, 3); assert.ok(!h.button('recovery.retry')) })
  await check('canceled/interrupted are neutral stops without retry UI', () => { for (const code of ['canceled', 'interrupted']) { const h = harness(); h.changeText(manuscript); h.click('play'); h.fail(code); assert.ok(!h.button('recovery.retry')); assert.ok(!h.output.includes('error{"code"')); assert.ok(h.button('play')) } })
  await check('synchronous speak throw captures the same recovery path', () => { const h = harness(); h.changeText(manuscript); h.synth.throwNext = true; h.click('play'); assert.ok(h.output.includes('synthesis-failed')); h.click('recovery.retry'); assert.equal(h.utterances.at(-1).text, '첫 문장입니다.') })
  await check('voice and speed edits keep position, retry uses current settings', () => { const h = harness(); failSecond(h); h.input('tts-voice').props.onChange({ target: { value: online.name } }); h.input('tts-rate').props.onChange({ target: { value: '1.5' } }); h.render(); h.click('recovery.retry'); assert.equal(h.utterances.at(-1).voice.name, online.name); assert.equal(h.utterances.at(-1).rate, 1.5) })
  await check('OCR and Notepad handoffs stay local and never autoplay', async () => { for (const source of ['ocr', 'notepad']) { const h = harness({ source }); await settle(); h.render(); assert.equal(h.utterances.length, 0); assert.equal(h.synth.cancels, 0); assert.equal(h.sessionValues.size, 0); h.click('play'); assert.equal(h.utterances.at(-1).voice.localService, true); h.fail(); h.synth.voices = [online]; h.listeners.get('voiceschanged')(); h.render(); assert.equal(h.button('recovery.retry').props.disabled, true); assert.equal(h.utterances.length, 1) } })
  await check('pause/resume repeats current sentence without error recovery UI', () => { const h = harness(); h.changeText(manuscript); h.click('play'); h.end(); h.click('pause'); const last = h.utterances.at(-1); h.fail('interrupted', last); h.click('resume'); assert.equal(h.utterances.at(-1).text, '두 번째 문장입니다.'); assert.ok(!h.button('recovery.retry')) })
  console.log(`TTS real-component callback checks: ${count} passed`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
