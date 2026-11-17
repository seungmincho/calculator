import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

export const local = { name: 'device', lang: 'ko-KR', localService: true, default: true }
export const remote = { name: 'remote', lang: 'ko-KR', localService: false }
export const manuscript = '첫 문장입니다. 두 번째 😀 문장입니다. 마지막 문장입니다.'
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export async function ttsFixture({ voices = [local, remote], url = 'https://toolhub.ai.kr/text-to-speech/', storage = {}, hydrated = true } = {}) {
  const values = new Map(Object.entries(storage)), writes = [], utterances = [], constructed = [], listeners = new Map(), locks = [], copies = [], reads = [], timers = []
  const language = { language: 'ko' }, io = { hold: false, paste: '', copy: 'ok', throwSpeech: false }, messages = JSON.parse(fs.readFileSync('messages/ko.json'))
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch46/translations-tts.json'))
  Object.assign(messages.textToSpeech, patch.ko.textToSpeech)
  const port = { getItem: key => values.get(key) ?? null, setItem(key, value) { values.set(key, value); writes.push([key, value]) }, removeItem(key) { values.delete(key); writes.push([key, null]) } }
  let serial = 0, alive = true, child
  const synth = { voices, canceled: 0, speaking: false, paused: false, getVoices() { return synth.voices }, speak(value) { utterances.push(value); if (io.throwSpeech) { io.throwSpeech = false; throw Error('synthesis') } }, cancel() { synth.canceled++ }, pause() {}, resume() {}, addEventListener(key, handler) { listeners.set(key, handler) }, removeEventListener(key) { listeners.delete(key) } }
  const navigator = { userAgent: 'test desktop', clipboard: { readText() { const task = deferred(); reads.push(task); return io.paste === 'wait' ? task.promise : Promise.resolve(io.paste) }, writeText(value) { copies.push(value); if (io.copy === 'wait') { const task = deferred(); copies.push(task); return task.promise }; return io.copy === 'fail' ? Promise.reject(Error('denied')) : Promise.resolve() } }, locks: { request(key, options, action) { if (!io.hold) return Promise.resolve().then(action); const task = deferred(); locks.push({ key, options, ...task }); return task.promise.then(action) } } }
  const globals = { AbortController, crypto: { randomUUID: () => 'tts-test-' + ++serial }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; constructed.push(this) } },
    setTimeout(callback, delay) { const value = { id: ++serial, callback, delay, canceled: false }; timers.push(value); return value.id }, clearTimeout(id) { const value = timers.find(item => item.id === id); if (value) value.canceled = true }, setInterval() { return ++serial }, clearInterval() {},
  }
  const h = await componentHarness('src/components/TextToSpeech.tsx', { messages, hydrated, storagePort: port, navigator, globals, url, window: { speechSynthesis: synth },
    modules: { '@/contexts/LanguageContext': { useOptionalLanguage: () => language }, '@/components/TtsReadingList': { __esModule: true, default: 'ReadingListBoundary' } } })
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve(); await Promise.resolve(); if (!alive) continue; h.render()
      const props = h.all().find(node => node.type === 'ReadingListBoundary')?.props
      if (child && props) child.setProps(props)
      else if (props) { child = await componentHarness('src/components/TtsReadingList.tsx', { props, messages, hydrated, storagePort: port, navigator, globals }); child.render() }
    }
  }
  const node = id => h.find(item => item.props.id === id)
  const attr = (name, value = '') => h.find(item => item.props['data-tts-' + name] === value)
  const list = (name, value = '') => child.find(item => item.props['data-tts-reading-' + name] === value)
  const click = async name => { attr(name).props.onClick(); await settle() }
  const edit = async (id, value) => { node(id).props.onChange({ target: { value } }); await settle() }
  const listClick = async (name, value = '') => { list(name, value).props.onClick(); await settle() }
  const save = async name => { list('name').props.onChange({ target: { value: name } }); await settle(); child.find(item => item.type === 'form').props.onSubmit({ preventDefault() {} }); await settle() }
  const end = async (utterance = utterances.at(-1)) => { utterance.onend(); await settle() }
  const fail = async (code = 'network', utterance = utterances.at(-1)) => { utterance.onerror({ error: code }); await settle() }
  const jump = async index => { h.find(item => item.props['data-i'] === index).props.onClick(); await settle() }
  h.render(); await settle()
  return { h, io, synth, values, writes, utterances, constructed, locks, copies, reads, timers, messages, node, attr, list, click, edit, listClick, save, end, fail, jump, settle,
    get child() { return child }, props: () => h.find(item => item.type === 'ReadingListBoundary').props,
    async load(id) { await listClick('load', id); await listClick('confirm', 'load') },
    async setVoices(value) { synth.voices = value; listeners.get('voiceschanged')(); await settle() },
    async hydrate() { h.setHydrated(true); child?.setHydrated(true); await settle() },
    async locale(value) { language.language = value; Object.assign(messages, JSON.parse(fs.readFileSync(`messages/${value}.json`))); Object.assign(messages.textToSpeech, patch[value].textToSpeech); await settle() },
    async repeat(value) { attr('repeat').props.onChange({ target: { checked: value } }); await settle() },
    async localOnly(value) { attr('local-only').props.onChange({ target: { checked: value } }); await settle() },
    cleanup() { alive = false; child?.cleanup(); h.cleanup() } }
}
