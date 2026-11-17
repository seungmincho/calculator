const assert = require('node:assert/strict')
const { componentHarness, eventTarget, text } = require('./component-harness.cjs')

const manuscript = '첫째 문장. 둘째 문장. 셋째 문장.'
const local = { name: 'Local Korean', lang: 'ko-KR', localService: true, default: true }
const remote = { name: 'Network Korean', lang: 'ko-KR', localService: false }
let checks = 0
async function setup(options = {}) {
  const spoken = [], state = { voices: options.voices ?? [local, remote], throwing: options.throwing ?? '', canceled: 0 }
  class Utterance { constructor(value) { if (state.throwing === 'constructor') throw new Error('no engine'); this.text = value } }
  const synth = { ...eventTarget(), getVoices: () => state.voices, cancel() { state.canceled++ }, speak(value) { if (state.throwing === 'speak') throw new Error('speak failed'); spoken.push(value) }, pause() {}, resume() {} }
  const h = await componentHarness('src/components/TextToSpeech.tsx', {
    url: options.url ?? 'https://toolhub.ai.kr/text-to-speech/',
    rawTranslations: { 'samples.items': [{ label: 'Sample', text: manuscript }] },
    window: { speechSynthesis: synth }, globals: { SpeechSynthesisUtterance: Utterance },
  })
  h.render()
  return { h, spoken, synth, state,
    click(label) { const button = h.button(label); assert.equal(!!button.props.disabled, false, `${label} enabled`); button.props.onClick(); h.render() },
    end(utterance = spoken.at(-1)) { utterance.onend(); h.render() },
    fail(code = 'network', utterance = spoken.at(-1)) { utterance.onerror({ error: code }); h.render() },
    change(id, value) { h.find(node => node.props?.id === id).props.onChange({ target: { value } }); h.render() },
    repeat() { const label = h.all().find(node => node.type === 'label' && text(node).includes('repeat.enable')); const checkbox = label.props.children.find(node => node?.type === 'input'); checkbox.props.onChange({ target: { checked: true } }); h.render() },
    setting(key, value) { h.find(node => node.type === 'select' && node.props['aria-label'] === key).props.onChange({ target: { value: String(value) } }); h.render() },
  }
}
async function check(label, action) { await action(); checks++; console.log(`PASS ${label}`) }

async function main() {
  await check('mid-sentence error never auto-restarts and retry starts at the same sentence', async () => {
    const s = await setup(); s.click('play'); s.end(); s.fail()
    assert.deepEqual(s.spoken.map(u => u.text), ['첫째 문장.', '둘째 문장.'])
    assert.ok(s.h.text().includes('recovery.sentence{"number":2}'))
    s.h.tick(0); assert.equal(s.spoken.length, 2)
    s.click('recovery.retry'); assert.equal(s.spoken.at(-1).text, '둘째 문장.')
    s.end(); assert.equal(s.spoken.at(-1).text, '셋째 문장.')
    s.h.cleanup()
  })
  await check('old sentence callbacks inside the same session cannot fail, skip, or re-run the current sentence', async () => {
    const s = await setup(); s.click('play'); const first = s.spoken[0]; s.end(first)
    s.fail('network', first); s.end(first); first.onboundary({ name: 'word', charIndex: 0, charLength: 2 }); s.h.render()
    assert.equal(s.spoken.length, 2); assert.equal(s.h.text().includes('recovery.retry'), false)
    s.end(); assert.equal(s.spoken.at(-1).text, '셋째 문장.')
    s.h.cleanup()
  })
  await check('retried utterance ignores error/end/boundary events from its failed predecessor', async () => {
    const s = await setup(); s.click('play'); s.end(); const failed = s.spoken.at(-1); s.fail(); s.click('recovery.retry')
    s.fail('network', failed); s.end(failed); failed.onboundary({ charIndex: 1 }); s.h.render()
    assert.equal(s.spoken.length, 3); assert.equal(s.h.text().includes('recovery.retry'), false)
    s.end(); assert.equal(s.spoken.at(-1).text, '셋째 문장.')
    s.h.cleanup()
  })
  await check('second repeat pass resumes without restarting completed passes or adding a pass', async () => {
    const s = await setup(); s.repeat(); s.setting('repeat.count', 3); s.setting('repeat.gap', 0)
    s.click('play'); s.end(); s.end(); s.end(); s.h.tick(0)
    assert.equal(s.spoken.length, 4); s.end(); s.fail()
    assert.ok(s.h.text().includes('recovery.repeat{"pass":2,"count":3,"remaining":1}'))
    s.click('recovery.retry'); s.end(); s.end(); s.h.tick(0); s.end(); s.end(); s.end(); s.h.tick(0)
    assert.deepEqual(s.spoken.map(u => u.text), ['첫째 문장.', '둘째 문장.', '셋째 문장.', '첫째 문장.', '둘째 문장.', '둘째 문장.', '셋째 문장.', '첫째 문장.', '둘째 문장.', '셋째 문장.'])
    assert.equal(s.h.button('play').props.disabled, false)
    s.h.cleanup()
  })
  await check('stop, Escape, body edit, and repeat-setting changes invalidate saved retry closures', async () => {
    for (const action of ['stop', 'escape', 'body', 'repeat']) {
      const s = await setup(); s.click('play'); s.end(); s.fail(); const oldRetry = s.h.button('recovery.retry').props.onClick
      if (action === 'stop') s.click('stop')
      if (action === 'escape') { s.h.window.dispatch('keydown', { key: 'Escape' }); s.h.render() }
      if (action === 'body') s.change('tts-text', '새 본문입니다. 새 두 번째입니다.')
      if (action === 'repeat') s.repeat()
      oldRetry(); s.h.render()
      assert.equal(s.spoken.length, 2, action); assert.equal(s.h.text().includes('recovery.retry'), false, action)
      s.h.cleanup()
    }
  })
  await check('pause/resume retains the failed sentence retry position and repeated pass', async () => {
    const s = await setup(); s.repeat(); s.setting('repeat.gap', 0); s.click('play'); s.end(); s.fail(); s.click('recovery.retry')
    s.click('pause'); s.click('resume'); assert.equal(s.spoken.at(-1).text, '둘째 문장.')
    s.fail(); assert.ok(s.h.text().includes('recovery.repeat{"pass":1'))
    s.h.cleanup()
  })
  await check('canceled/interrupted events do not expose a recoverable synthesis failure', async () => {
    for (const code of ['canceled', 'interrupted']) { const s = await setup(); s.click('play'); s.fail(code); assert.equal(s.h.text().includes('recovery.retry'), false); assert.equal(s.h.all().some(node => node.props?.role === 'alert'), false); s.h.cleanup() }
  })
  await check('synchronous constructor and speak errors capture a retryable sentence', async () => {
    for (const throwing of ['constructor', 'speak']) { const s = await setup({ throwing }); s.click('play'); assert.ok(s.h.text().includes('recovery.sentence{"number":1}')); s.state.throwing = ''; s.click('recovery.retry'); assert.equal(s.spoken.at(-1).text, '첫째 문장.'); s.h.cleanup() }
  })
  await check('speed/voice choices remain explicit and preserve retry position', async () => {
    const s = await setup(); s.click('play'); s.end(); s.fail(); s.change('tts-voice', remote.name); s.change('tts-rate', '1.3')
    assert.equal(s.spoken.length, 2); s.click('recovery.retry'); assert.equal(s.spoken.at(-1).text, '둘째 문장.'); assert.equal(s.spoken.at(-1).voice.name, remote.name); assert.equal(s.spoken.at(-1).rate, 1.3)
    s.h.cleanup()
  })
  await check('handoff local-only retry never chooses a network voice when local voices disappear', async () => {
    const s = await setup({ url: 'https://toolhub.ai.kr/text-to-speech/?from=notepad' }); s.click('play'); assert.equal(s.spoken.at(-1).voice.localService, true); s.fail()
    s.state.voices = [remote]; s.synth.dispatch('voiceschanged'); s.h.render()
    assert.equal(s.h.button('recovery.retry').props.disabled, true)
    s.h.button('recovery.retry').props.onClick(); s.h.render(); assert.equal(s.spoken.length, 1)
    s.h.cleanup()
  })
  console.log(`Independent TTS recovery: ${checks} component groups passed`)
}
main().catch(error => { console.error(error.stack); process.exitCode = 1 })
