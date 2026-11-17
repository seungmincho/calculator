import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch23/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const tt = (key, language = "ko", values = {}) => tr("typingTest", key, language, values)
const sr = (key, language = "ko", values = {}) => tr("screenRecorder", key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch23Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch23Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

  }, options)
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient') })
  context.on('page', page => {
    page.setDefaultTimeout(16000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:typingTest|screenRecorder)\.[a-zA-Z][\w.]+/, 'Raw translation key') }
  catch (cause) { status = 'fail'; error = cause.stack ?? String(cause); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial' }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors, hydration, consoleErrors, external: [...new Set(external)] }
  clearTimeout(watchdog); results.push(result); writeFileSync(resolve(out, `${name}-evidence.json`), JSON.stringify(result, null, 2)); console.log(`${status.toUpperCase()} ${name}${error ? `: ${error.split('\n')[0]}` : ''}`); await context.close()
}
async function changeLanguage(page, language) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); const toggle = page.locator('[data-language-toggle]:visible').first()
  await toggle.locator('button[aria-expanded]').click(); await toggle.getByRole('button', { name: language === 'en' ? 'English' : '한국어', exact: true }).last().click()
}
async function screenshot(page, name, panel) {
  if (panel) { await panel.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await panel.screenshot({ path: resolve(out, `${name}-panel.png`), caret: 'initial' }) }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, `${name}-top.png`), caret: 'initial' })
}
async function mobile(page, fields, controls) {
  const box = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(box.body <= box.viewport + 1 && box.document <= box.viewport + 1, JSON.stringify(box)); assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  for (const field of fields) assert.ok(await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16)
  for (const control of controls) assert.ok((await control.boundingBox()).height >= 44)
  return box
}
async function download(page, action, filename) {
  const pending = page.waitForEvent('download'); await action(); const file = await pending; const path = resolve(out, filename ?? file.suggestedFilename()); await file.saveAs(path)
  const bytes = readFileSync(path); return { filename: file.suggestedFilename(), path, bytes, text: bytes.toString('utf8') }
}


// Test media never calls the operating system screen/microphone selectors.
// Successful recordings still use the native canvas streams and MediaRecorder.
async function syntheticMedia(context) {
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return
    const NativeRecorder = window.MediaRecorder, NativeAudioContext = window.AudioContext, nativeNow = performance.now.bind(performance)
    window.__media = { displays: [], microphones: [], recorders: [], contexts: [], urls: [], timers: [], pendingDisplays: [], pendingMicrophones: [] }
    window.__displayMode = 'normal'; window.__microphoneMode = 'normal'; window.__recorderMode = 'native'; window.__systemAudio = false; window.__clockOffset = 0
    Object.defineProperty(performance, 'now', { configurable: true, value: () => nativeNow() + window.__clockOffset })
    const interval = window.setInterval, clearIntervalNative = window.clearInterval; window.setInterval = function(callback, delay, ...args) { const entry = { delay, active: true }; const id = interval(callback, delay, ...args); entry.id = id; window.__media.timers.push(entry); return id }; window.clearInterval = function(id) { const entry = window.__media.timers.find(item => item.id === id); if (entry) entry.active = false; return clearIntervalNative(id) }
    const observeTrack = (track, cleanup) => { const stop = track.stop.bind(track); track.__stopCount = 0; track.stop = () => { track.__stopCount++; stop(); cleanup?.() }; return track }
    const silentAudio = async () => {
      const ctx = new NativeAudioContext(), destination = ctx.createMediaStreamDestination(), source = ctx.createOscillator(), gain = ctx.createGain(); gain.gain.value = 0; source.connect(gain); gain.connect(destination); source.start(); await ctx.resume()
      for (const track of destination.stream.getTracks()) observeTrack(track, () => { try { source.stop() } catch {}; void ctx.close() }); return destination.stream
    }
    const display = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; const ctx = canvas.getContext('2d'); let frame = 0
      const draw = () => { ctx.fillStyle = frame % 2 ? '#245b9e' : '#3182f6'; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'; ctx.fillText(`Verification frame ${frame++}`, 12, 90) }; draw(); const timer = setInterval(draw, 70); const stream = canvas.captureStream(15)
      for (const track of stream.getTracks()) observeTrack(track, () => clearInterval(timer))
      if (window.__systemAudio) for (const track of (await silentAudio()).getAudioTracks()) stream.addTrack(track)
      return stream
    }
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { configurable: true, value: async config => {
      const entry = { config, stream: null, denied: window.__displayMode === 'deny' }; window.__media.displays.push(entry)
      if (entry.denied) throw new DOMException('Controlled display permission denied', 'NotAllowedError')
      entry.stream = await display(); if (window.__displayMode === 'hold') await new Promise(resolve => window.__media.pendingDisplays.push(resolve)); return entry.stream
    } })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async config => {
      const entry = { config, stream: null, denied: window.__microphoneMode === 'deny' }; window.__media.microphones.push(entry)
      if (entry.denied) throw new DOMException('Controlled microphone permission denied', 'NotAllowedError')
      entry.stream = await silentAudio(); if (window.__microphoneMode === 'hold') await new Promise(resolve => window.__media.pendingMicrophones.push(resolve)); return entry.stream
    } })
    if (NativeAudioContext) window.AudioContext = class extends NativeAudioContext { constructor(...args) { super(...args); window.__media.contexts.push(this); this.__closeCount = 0 }; close() { this.__closeCount++; return super.close() } }
    if (NativeRecorder) window.MediaRecorder = class extends NativeRecorder {
      constructor(...args) { if (window.__recorderMode === 'throwConstructor') throw new DOMException('Controlled recorder constructor failure', 'NotSupportedError'); super(...args); this.__mode = window.__recorderMode; this.__callbacks = {}; this.__started = false; window.__media.recorders.push(this)
        for (const type of ['dataavailable', 'stop', 'error']) { const property = `on${type}`; let proto = NativeRecorder.prototype, descriptor; while (proto && !descriptor) { descriptor = Object.getOwnPropertyDescriptor(proto, property); proto = Object.getPrototypeOf(proto) }; let current = null; Object.defineProperty(this, property, { configurable: true, get: () => current, set: handler => { current = handler; if (handler) { if (!this.__callbacks[type]) this.__callbacks[type] = []; this.__callbacks[type].push(handler) }; const wrapped = type === 'dataavailable' && this.__mode === 'empty' && handler ? event => handler.call(this, new BlobEvent(type, { data: new Blob([], { type: this.mimeType }), timecode: event.timecode })) : handler; descriptor.set.call(this, wrapped) } }) }
      }
      start(...args) { if (this.__mode === 'throwStart') throw new DOMException('Controlled recorder start failure', 'InvalidStateError'); this.__started = true; return super.start(...args) }
      addEventListener(type, listener, ...options) { if (!this.__callbacks[type]) this.__callbacks[type] = []; this.__callbacks[type].push(listener); if (type === 'dataavailable' && this.__mode === 'empty') { const original = listener; listener = event => original.call(this, new BlobEvent('dataavailable', { data: new Blob([], { type: this.mimeType }), timecode: event.timecode })); this.__emptyListener = { original, wrapped: listener } }; return super.addEventListener(type, listener, ...options) }
      removeEventListener(type, listener, ...options) { if (type === 'dataavailable' && this.__emptyListener?.original === listener) listener = this.__emptyListener.wrapped; return super.removeEventListener(type, listener, ...options) }
    }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => { if (window.__failVideoUrl && /^video\//.test(blob.type)) throw new Error('Controlled object URL failure'); const url = create(blob); window.__media.urls.push({ url, blob, revoked: false }); return url }
    URL.revokeObjectURL = url => { const item = window.__media.urls.find(item => item.url === url); if (item) item.revoked = true; return revoke(url) }
    window.__releaseDisplays = () => { for (const resolve of window.__media.pendingDisplays.splice(0)) resolve() }
    window.__releaseMicrophones = () => { for (const resolve of window.__media.pendingMicrophones.splice(0)) resolve() }
    window.__lateRecorder = (index, type) => { const recorder = window.__media.recorders[index]; const event = type === 'dataavailable' ? new BlobEvent(type, { data: new Blob(['late invalid chunk'], { type: recorder.mimeType }) }) : new Event(type); for (const callback of recorder.__callbacks[type] ?? []) callback.call(recorder, event) }
    window.__endDisplay = index => { const stream = window.__media.displays[index].stream; for (const track of stream.getVideoTracks()) { track.stop(); track.dispatchEvent(new Event('ended')) } }
  })
}
async function mediaEvidence(page) {
  return page.evaluate(() => ({
    displayRequests: window.__media.displays.map(item => ({ config: item.config, denied: item.denied, tracks: item.stream?.getTracks().map(track => ({ kind: track.kind, state: track.readyState, stopCount: track.__stopCount })) })),
    microphoneRequests: window.__media.microphones.map(item => ({ config: item.config, denied: item.denied, tracks: item.stream?.getTracks().map(track => ({ kind: track.kind, state: track.readyState, stopCount: track.__stopCount })) })),
    recorders: window.__media.recorders.map(item => ({ state: item.state, mime: item.mimeType, started: item.__started, injectedMode: item.__mode })),
    audioContexts: window.__media.contexts.map(item => ({ state: item.state, closeCount: item.__closeCount })),
    objectUrls: window.__media.urls.map(item => ({ url: item.url, bytes: item.blob.size, type: item.blob.type, revoked: item.revoked })),
    sessionTimers: window.__media.timers.filter(item => item.delay === 250).map(item => ({ active: item.active, delay: item.delay })),
  }))
}
async function observeTypingIntervals(context) {
  await context.addInitScript(() => { const nativeDate = Date.now.bind(Date), nativePerformance = performance.now.bind(performance); window.__typingClockOffset = 0; Date.now = () => nativeDate() + window.__typingClockOffset; Object.defineProperty(performance, 'now', { configurable: true, value: () => nativePerformance() + window.__typingClockOffset }); const create = window.setInterval, clear = window.clearInterval; window.__typingIntervals = []; window.setInterval = function(callback, delay, ...args) { const entry = { delay, active: true, ticks: 0 }; const id = create(() => { entry.ticks++; callback(...args) }, delay); entry.id = id; window.__typingIntervals.push(entry); return id }; window.clearInterval = function(id) { const entry = window.__typingIntervals.find(item => item.id === id); if (entry) entry.active = false; return clear(id) } })
}
async function typingIntervals(page) { return page.evaluate(() => window.__typingIntervals.filter(item => item.delay === 200)) }
async function composition(page, text, phase) {
  await page.locator('[data-custom-input]').evaluate((node, { text, phase }) => {
    if (phase === 'start') node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text)
    node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: text, isComposing: phase !== 'end' }))
    if (phase === 'end') node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: [...text].at(-1) }))
  }, { text, phase })
}

const historyKey = 'typing-test-history-v2', dailyKey = 'typing-test-daily-v1'
const historyBytes = JSON.stringify([{ ts: 1794844800000, lang: 'ko', mode: 'daily', speed: 234, acc: 98 }], null, 2)
const dailyBytes = JSON.stringify({ 1: { best: 234, acc: 98, tries: 2 } }, null, 2)
const custom = page => page.locator('[data-custom-typing]'), draft = page => page.locator('[data-custom-draft]'), typing = page => page.locator('[data-custom-input]'), attempt = page => page.locator('[data-custom-attempt]'), target = page => page.locator('[data-custom-target]'), customResult = page => page.locator('[data-custom-result]')
const mode = (page, value) => page.locator(`[data-typing-mode="${value}"]`)
const copyPanel = page => page.locator('[data-typing-copy]')
async function typingStorage(page) { return page.evaluate(({ historyKey, dailyKey }) => ({ history: localStorage.getItem(historyKey), daily: localStorage.getItem(dailyKey), query: location.search }), { historyKey, dailyKey }) }
async function openTyping(args, query = '') { await observeTypingIntervals(args.context); await args.context.addInitScript(({ historyKey, dailyKey, historyBytes, dailyBytes }) => { if (!/^https?:$/.test(location.protocol)) return; if (!localStorage.getItem('__typing23Seeded')) { localStorage.setItem(historyKey, historyBytes); localStorage.setItem(dailyKey, dailyBytes); localStorage.setItem('__typing23Seeded', '1') } }, { historyKey, dailyKey, historyBytes, dailyBytes }); await args.open('typing-test', query); await mode(args.page, 'custom').waitFor(); await wait(200) }
async function customStart(page, text = 'abcdefghij', language = 'en') { await draft(page).fill(text); await page.locator(`[data-custom-language="${language}"]`).click(); await page.locator('[data-custom-apply]').click(); await typing(page).waitFor() }
async function finishCustom(page, text = 'abcdefghij') { await typing(page).pressSequentially(text, { delay: 20 }); await customResult(page).waitFor() }
async function standardFinish(page) { const text = await page.locator('[data-standard-typing] div[lang]').textContent(); await page.locator('[data-standard-input]').pressSequentially(text, { delay: 4 }); await page.locator('[data-standard-result]').waitFor(); return text }
async function typingClipboard(page, state) { await page.evaluate(state => { if (!window.__nativeTypingClipboard) window.__nativeTypingClipboard = navigator.clipboard; if (!window.__nativeExec) window.__nativeExec = document.execCommand; window.__copyFallbacks = 0; document.execCommand = () => { window.__copyFallbacks++; return state === 'fallbackTrue' }; if (state === 'native') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.__nativeTypingClipboard }); return }; if (state === 'absent' || state === 'fallbackTrue') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); return }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: state === 'pending' ? () => new Promise((resolve, reject) => { window.__copyResolve = resolve; window.__copyReject = reject }) : () => Promise.reject(new Error('Controlled clipboard denial')) } }) }, state) }

test('typing-draft-normalization-codepoints-and-explicit-apply', async args => {
  const { page } = args; await openTyping(args); await mode(page, 'custom').click(); const original = '  abc\r\n def\t ghi   jkl  '; await draft(page).fill(original); assert.equal(await draft(page).inputValue(), original.replace(/\r\n?/g, '\n')); assert.equal(await page.locator('[data-custom-preview]').innerText(), 'abc def ghi jkl'); assert.equal(await attempt(page).count(), 0)
  const boundaries = []; for (const [text, allowed] of [['a'.repeat(9), false], ['a'.repeat(10), true], ['😀'.repeat(1000), true], ['😀'.repeat(1001), false]]) { await draft(page).fill(text); assert.equal(await page.locator('[data-custom-apply]').isEnabled(), allowed); assert.equal(await draft(page).inputValue(), text); assert.equal([...(await page.locator('[data-custom-preview]').innerText())].length, [...text].length); boundaries.push({ codepoints: [...text].length, utf16Units: text.length, allowed }) }
  await customStart(page, 'private passage twenty', 'en'); const confirmed = await target(page).textContent(); await draft(page).fill('A different draft remains private'); assert.equal(await target(page).textContent(), confirmed); assert.equal(await typing(page).inputValue(), ''); assert.deepEqual(await typingStorage(page), { history: historyBytes, daily: dailyBytes, query: '' }); return { boundaries, normalized: 'abc def ghi jkl', confirmed, draftOnlyDidNotApply: true }
})

test('typing-real-english-and-synthetic-korean-composition', async args => {
  const { page } = args; await openTyping(args); const before = await typingStorage(page); await mode(page, 'custom').click(); await customStart(page); await finishCustom(page); await attempt(page).getByText(tt('custom.accuracy', 'ko', { accuracy: 100 }), { exact: true }).waitFor(); await customResult(page).getByText(tt('custom.errors', 'ko', { count: 0 }), { exact: true }).waitFor(); assert.ok((await attempt(page).innerText()).includes('WPM')); assert.equal((await typingIntervals(page)).filter(item => item.active).length, 0)
  const korean = '가나다라마바사아자차'; await customStart(page, korean, 'ko'); await typing(page).pressSequentially(korean.slice(0, -1)); await composition(page, korean, 'start'); assert.equal(await customResult(page).count(), 0); assert.equal(await typing(page).isEnabled(), true); await composition(page, korean, 'end'); await customResult(page).waitFor(); const first = await customResult(page).innerText(); await composition(page, korean, 'end'); assert.equal(await customResult(page).innerText(), first); assert.equal(await customResult(page).count(), 1)
  const prefixTarget = '가나다라마바사아자각', committed = '가나다라마바사아자가'; await customStart(page, prefixTarget, 'ko'); await typing(page).pressSequentially(committed.slice(0, -1)); await composition(page, committed, 'start'); assert.equal(await customResult(page).count(), 0); await composition(page, committed, 'end'); await customResult(page).getByText(tt('custom.errors', 'ko', { count: 1 }), { exact: true }).waitFor(); assert.equal(await page.locator('[data-custom-char="wrong"]').count(), 1); assert.deepEqual(await typingStorage(page), before); return { nativeKeyboardEnglish: true, syntheticComposition: ['final-correct-held-until-end', 'duplicate-end-ignored', 'committed-prefix-counted-wrong'], osImeTested: false, customResultsDidNotWriteStandardStats: true }
})

test('typing-draft-clock-retry-language-and-mode-cleanup', async args => {
  const { page } = args; await openTyping(args); await mode(page, 'time').click(); await page.locator('[data-standard-input]').pressSequentially('abc'); await poll(async () => (await typingIntervals(page)).filter(item => item.active).length === 1, 'standard interval started'); const before = await typingStorage(page); await mode(page, 'custom').click(); await page.evaluate(() => { window.__typingClockOffset += 65000 }); await wait(250); assert.equal((await typingIntervals(page)).filter(item => item.active).length, 0); assert.deepEqual(await typingStorage(page), before)
  await customStart(page, 'abcdefghij private', 'en'); await typing(page).pressSequentially('abc'); await page.evaluate(() => { window.__typingClockOffset += 2200 }); await wait(250); const elapsed = await attempt(page).innerText(); assert.match(elapsed, /2\.[0-9]초/); const confirmed = await target(page).textContent(); await draft(page).fill('New draft to apply later'); await page.locator('[data-custom-language="ko"]').click(); assert.equal(await target(page).getAttribute('lang'), 'en'); assert.equal(await target(page).textContent(), confirmed); await changeLanguage(page, 'en'); await custom(page).getByRole('heading', { name: tt('custom.title', 'en'), exact: true }).waitFor(); assert.equal(await typing(page).inputValue(), 'abc'); assert.equal((await typingIntervals(page)).filter(item => item.active).length, 1)
  await page.locator('[data-custom-retry]').click(); assert.equal(await target(page).textContent(), confirmed); assert.equal(await draft(page).inputValue(), 'New draft to apply later'); assert.equal(await typing(page).inputValue(), ''); assert.equal((await typingIntervals(page)).filter(item => item.active).length, 0); await typing(page).pressSequentially('a'); await typing(page).press('Escape'); assert.equal(await typing(page).inputValue(), ''); assert.equal((await typingIntervals(page)).filter(item => item.active).length, 0)
  await mode(page, 'short').click(); await mode(page, 'custom').click(); assert.equal(await draft(page).inputValue(), 'New draft to apply later'); assert.equal(await target(page).textContent(), confirmed); await page.locator('[data-custom-apply]').click(); assert.equal(await target(page).textContent(), 'New draft to apply later'); assert.equal(await target(page).getAttribute('lang'), 'ko'); const storage = await typingStorage(page); assert.equal(storage.history, historyBytes); assert.equal(storage.daily, dailyBytes); assert.doesNotMatch(decodeURIComponent(storage.query), /private|New draft/); return { draftAndConfirmedSeparated: true, modeExitStopsStandardTimer: true, languageKeepsActiveAttempt: true, intervals: await typingIntervals(page), originalStatsBytesPreserved: true }
})

test('typing-copy-native-failure-selection-stale-and-standard-record', async args => {
  const { page } = args; await openTyping(args); await mode(page, 'custom').click(); await customStart(page, 'secret passage', 'en'); await finishCustom(page, 'secret passage'); await button(copyPanel(page), tt('copyRecovery.copy')).click(); await copyPanel(page).getByRole('status').waitFor(); const nativeSummary = await page.evaluate(() => navigator.clipboard.readText()); assert.ok(nativeSummary.includes(tt('custom.copyTitle'))); assert.doesNotMatch(nativeSummary, /secret passage|https?:/)
  await page.locator('[data-custom-retry]').click(); await finishCustom(page, 'secret passage'); await typingClipboard(page, 'reject'); await button(copyPanel(page), tt('copyRecovery.copy')).click(); await copyPanel(page).getByRole('alert').waitFor(); const recovery = copyPanel(page).locator('textarea[readonly]'); const text = await recovery.inputValue(); assert.doesNotMatch(text, /secret passage/); await button(copyPanel(page), tt('copyRecovery.select')).click(); assert.deepEqual(await recovery.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, text.length]); await typingClipboard(page, 'fallbackTrue'); await button(copyPanel(page), tt('copyRecovery.copy')).click(); await copyPanel(page).getByRole('status').waitFor(); assert.equal(await page.evaluate(() => window.__copyFallbacks), 1)
  await page.locator('[data-custom-retry]').click(); await finishCustom(page, 'secret passage'); await typingClipboard(page, 'pending'); await button(copyPanel(page), tt('copyRecovery.copy')).click(); await page.locator('[data-custom-retry]').click(); await page.evaluate(() => window.__copyReject(new Error('Late denial'))); await wait(120); assert.equal(await copyPanel(page).count(), 0); assert.equal(await page.evaluate(() => window.__copyFallbacks), 0)
  await typingClipboard(page, 'reject'); await mode(page, 'daily').click(); await standardFinish(page); await button(copyPanel(page), tt('copyRecovery.copy')).click(); await copyPanel(page).getByRole('alert').waitFor(); const stored = await typingStorage(page); assert.equal(JSON.parse(stored.history).length, 2); assert.equal(Object.values(JSON.parse(stored.daily)).reduce((sum, day) => sum + day.tries, 0), 3); return { nativeClipboardSummary: nativeSummary, failedCopyManualSelection: true, explicitFallbackTrueSucceeded: true, staleRejectionFallbackCalls: 0, standardHistoryIncrement: 1, standardDailyIncrement: 1 }
})

test('typing-paste-drop-shortcuts-and-320-dark-english', async args => {
  const { page } = args; await openTyping(args); await mode(page, 'custom').click(); await customStart(page, 'abcdefghij private', 'en'); await poll(() => typing(page).evaluate(node => document.activeElement === node), 'apply focuses new typing field'); await typing(page).pressSequentially('a'); await typing(page).press('Escape'); await poll(() => typing(page).evaluate(node => document.activeElement === node && node.value === ''), 'Escape focuses reset field'); await page.locator('[data-custom-retry]').click(); await poll(() => typing(page).evaluate(node => document.activeElement === node), 'retry focuses new field'); await page.evaluate(() => navigator.clipboard.writeText('abcdefghij private')); await typing(page).focus(); await page.keyboard.press('Control+v'); assert.equal(await typing(page).inputValue(), ''); const canceled = await typing(page).evaluate(node => { const data = new DataTransfer(); data.setData('text/plain', 'abcdefghij private'); return !node.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data })) }); assert.equal(canceled, true); assert.equal(await typing(page).inputValue(), ''); await finishCustom(page, 'abcdefghij private'); await typingClipboard(page, 'absent'); await button(copyPanel(page), tt('copyRecovery.copy', 'en')).click(); await copyPanel(page).getByRole('alert').waitFor(); const recovery = copyPanel(page).locator('textarea'); const geometry = await mobile(page, [draft(page), typing(page), recovery], [page.locator('[data-custom-apply]'), page.locator('[data-custom-retry]'), button(copyPanel(page), tt('copyRecovery.select', 'en'))]); await recovery.focus(); await page.keyboard.press('Control+a'); assert.deepEqual(await recovery.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, (await recovery.inputValue()).length]); await copyPanel(page).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'typing-custom-320-dark-english.png'), caret: 'initial' }); await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'typing-custom-320-dark-top.png'), caret: 'initial' }); return { geometry, nativePasteBlocked: true, syntheticDropPrevented: canceled, readonlySelection: true, applyRetryEscapeDomFocus: true }
}, { width: 320, dark: true, language: 'en' })

const sessionPanel = page => page.locator('[data-screen-recording-phase]'), lastResult = page => page.locator('[data-screen-recording-result]')
const screenSetting = (page, name) => page.locator(`[data-screen-recording-setting="${name}"]`)
async function screenPhase(page, phase) { await poll(async () => await sessionPanel(page).getAttribute('data-screen-recording-phase') === phase, `recording phase ${phase}`) }
async function openScreen(args) { await syntheticMedia(args.context); await args.open('screen-recorder'); await screenPhase(args.page, 'idle'); assert.equal(await args.page.evaluate(() => window.__media.displays.length), 0) }
async function screenStart(page, language = 'ko') { await button(sessionPanel(page), sr(await lastResult(page).count() ? 'retry.recordAgain' : 'startRecording', language)).click() }
async function screenFinish(page, language = 'ko', delay = 650) { await screenPhase(page, 'recording'); await wait(delay); await button(sessionPanel(page), sr('stopRecording', language)).click(); await screenPhase(page, 'idle'); await lastResult(page).waitFor() }
async function resultIdentity(page) { return { id: await lastResult(page).getAttribute('data-screen-recording-result'), url: await lastResult(page).locator('video').getAttribute('src'), text: await lastResult(page).innerText() } }
async function assertPrevious(page, previous) { assert.deepEqual(await resultIdentity(page), previous); assert.equal(await page.evaluate(url => window.__media.urls.find(item => item.url === url)?.revoked, previous.url), false) }
async function checkMediaReleased(page) { const evidence = await mediaEvidence(page); assert.ok(evidence.displayRequests.flatMap(item => item.tracks ?? []).every(track => track.state === 'ended')); assert.ok(evidence.microphoneRequests.flatMap(item => item.tracks ?? []).every(track => track.state === 'ended')); assert.ok(evidence.audioContexts.every(item => item.state === 'closed')); assert.ok(evidence.sessionTimers.every(item => !item.active)); return evidence }
async function spa(page, slug, query) { await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill(query); await page.locator(`#search-listbox a[href="/${slug}"]`).first().click(); await page.waitForURL(url => url.pathname.replace(/\/$/, '') === `/${slug}`); await page.locator('main h1').waitFor() }

test('screen-native-webm-pause-monotonic-clock-and-download', async args => {
  const { page } = args; await openScreen(args); await screenStart(page); await screenPhase(page, 'recording'); await wait(500); await page.evaluate(() => { window.__clockOffset += 125000 }); await poll(async () => (await sessionPanel(page).getByRole('timer').innerText()).startsWith('00:02:05'), 'delayed tick catches monotonic time'); await button(sessionPanel(page), sr('pauseRecording')).click(); await screenPhase(page, 'paused'); const pausedTime = await sessionPanel(page).getByRole('timer').innerText(); await page.evaluate(() => { window.__clockOffset += 300000 }); await wait(350); assert.equal(await sessionPanel(page).getByRole('timer').innerText(), pausedTime); await button(sessionPanel(page), sr('resumeRecording')).click(); await screenPhase(page, 'recording'); await wait(450); await page.evaluate(() => { window.__clockOffset += 2000 }); await screenFinish(page, 'ko', 50)
  const previous = await resultIdentity(page); assert.match(previous.text, /00:02:0[78]/); const video = lastResult(page).locator('video'); await poll(() => video.evaluate(node => node.readyState >= 2 && node.videoWidth === 320), 'native encoded video decoded'); await video.evaluate(async node => { node.muted = true; await node.play() }); await poll(() => video.evaluate(node => node.currentTime > 0.05), 'actual video plays'); const playback = await video.evaluate(node => ({ width: node.videoWidth, height: node.videoHeight, readyState: node.readyState, currentTime: node.currentTime, error: node.error?.message ?? null })); assert.equal(playback.height, 180); assert.equal(playback.error, null); await video.evaluate(node => node.pause())
  const file = await download(page, () => button(lastResult(page), sr('download')).click(), 'synthetic-canvas-recording.webm'); assert.match(file.filename, /^screen-recording-.*\.webm$/); assert.equal(file.bytes.readUInt32BE(0), 0x1a45dfa3); assert.ok(file.bytes.length > 1000); const browserBytes = await page.evaluate(async url => [...new Uint8Array(await (await fetch(url)).arrayBuffer())], previous.url); assert.deepEqual(file.bytes, Buffer.from(browserBytes)); const evidence = await checkMediaReleased(page); assert.ok(evidence.objectUrls.some(item => item.url === previous.url && !item.revoked)); return { nativeMediaRecorder: true, privateScreenOrMicCaptured: false, file: { name: file.filename, bytes: file.bytes.length, magic: 'EBML/WebM' }, playback, pausedTime, displayedActiveTime: previous.text.match(/00:02:0[78]/)?.[0], ...evidence }
})

test('screen-previous-result-survives-denial-and-initialization-failures', async args => {
  const { page } = args; await openScreen(args); await screenStart(page); await screenFinish(page); const previous = await resultIdentity(page), failures = []
  for (const failure of ['displayDenied', 'throwConstructor', 'throwStart', 'empty', 'urlFailure']) {
    await page.evaluate(failure => { window.__displayMode = failure === 'displayDenied' ? 'deny' : 'normal'; window.__recorderMode = ['throwConstructor', 'throwStart', 'empty'].includes(failure) ? failure : 'native'; window.__failVideoUrl = failure === 'urlFailure' }, failure); await screenStart(page)
    if (failure === 'empty' || failure === 'urlFailure') { await screenPhase(page, 'recording'); await wait(600); await button(sessionPanel(page), sr('stopRecording')).click() }; await screenPhase(page, 'idle'); await sessionPanel(page).getByRole('alert').waitFor(); await assertPrevious(page, previous); failures.push({ failure, alert: await sessionPanel(page).getByRole('alert').innerText() })
  }
  const file = await download(page, () => button(lastResult(page), sr('download')).click(), 'previous-after-failures.webm'); assert.equal(file.bytes.readUInt32BE(0), 0x1a45dfa3); return { failures, previousResultId: previous.id, sameUrlAndMetadataPreserved: true, downloadedBytes: file.bytes.length, ...(await checkMediaReleased(page)) }
})

test('screen-canceled-late-permissions-and-preparing-track-ended', async args => {
  const { page } = args; await openScreen(args); await page.evaluate(() => { window.__displayMode = 'hold' }); await screenStart(page); await screenPhase(page, 'preparing'); await poll(() => page.evaluate(() => window.__media.pendingDisplays.length === 1), 'display permission held'); assert.equal(await button(sessionPanel(page), sr('startRecording')).count(), 0); assert.equal(await screenSetting(page, 'quality').isDisabled(), true); await button(sessionPanel(page), sr('retry.cancelPreparation')).click(); await screenPhase(page, 'idle'); await page.evaluate(() => window.__releaseDisplays()); await poll(() => page.evaluate(() => window.__media.displays[0].stream.getTracks().every(track => track.readyState === 'ended')), 'late display stopped'); assert.equal(await page.evaluate(() => window.__media.recorders.length), 0)
  await page.evaluate(() => { window.__displayMode = 'normal'; window.__microphoneMode = 'hold' }); await screenSetting(page, 'audio').selectOption('mic'); await screenStart(page); await screenPhase(page, 'preparing'); await poll(() => page.evaluate(() => window.__media.pendingMicrophones.length === 1), 'mic permission held'); await page.evaluate(() => window.__endDisplay(1)); await screenPhase(page, 'idle'); await page.evaluate(() => window.__releaseMicrophones()); await poll(() => page.evaluate(() => window.__media.microphones[0].stream.getTracks().every(track => track.readyState === 'ended')), 'late mic stopped after share ended'); assert.equal(await page.evaluate(() => window.__media.recorders.length), 0)
  await screenSetting(page, 'audio').selectOption('none'); await page.evaluate(() => { window.__displayMode = 'hold' }); await screenStart(page); await poll(() => page.evaluate(() => window.__media.pendingDisplays.length === 1), 'second late display pending'); await spa(page, 'text-converter', '텍스트 변환'); await page.evaluate(() => window.__releaseDisplays()); await poll(() => page.evaluate(() => window.__media.displays[2].stream.getTracks().every(track => track.readyState === 'ended')), 'unmounted permission stream stopped'); return { noNativePermissionPrompt: true, lateResultNeverStartedRecorder: true, ...(await checkMediaReleased(page)) }
})

test('screen-microphone-choice-system-status-and-native-audio-mix', async args => {
  const { page } = args; await openScreen(args); await screenSetting(page, 'audio').selectOption('both'); await page.evaluate(() => { window.__microphoneMode = 'deny' }); await screenStart(page); await screenPhase(page, 'audioChoice'); assert.equal(await page.evaluate(() => window.__media.recorders.length), 0); await sessionPanel(page).getByText(sr('retry.systemMissing'), { exact: true }).waitFor(); await button(sessionPanel(page), sr('retry.continueWithoutMic')).click(); await screenPhase(page, 'recording'); await sessionPanel(page).getByText(sr('retry.micOmitted'), { exact: true }).waitFor(); await screenFinish(page); const first = await resultIdentity(page); assert.ok(first.text.includes(sr('retry.notConnected')))
  await page.evaluate(() => { window.__microphoneMode = 'normal'; window.__systemAudio = true }); await screenStart(page); await screenPhase(page, 'recording'); await sessionPanel(page).getByText(sr('retry.systemStatus', 'ko', { state: sr('retry.connected') }), { exact: true }).waitFor(); await sessionPanel(page).getByText(sr('retry.micStatus', 'ko', { state: sr('retry.connected') }), { exact: true }).waitFor(); await screenFinish(page, 'ko', 850); const latest = await resultIdentity(page); assert.notEqual(latest.id, first.id); assert.equal(await page.evaluate(url => window.__media.urls.find(item => item.url === url).revoked, first.url), true); const evidence = await checkMediaReleased(page); assert.equal(evidence.audioContexts.length, 1); assert.equal(evidence.audioContexts[0].closeCount, 1); return { microphoneDeniedRequiredExplicitChoice: true, requestedSystemMissingHonest: true, actualSyntheticSilentAudioMix: true, noPhysicalMicrophoneCaptured: true, ...evidence }
})

test('screen-error-stale-events-track-ended-and-result-delete', async args => {
  const { page } = args; await openScreen(args); await screenStart(page); await screenFinish(page); const first = await resultIdentity(page); await screenStart(page); await screenPhase(page, 'recording'); await wait(250); await page.evaluate(() => window.__lateRecorder(1, 'error')); await screenPhase(page, 'idle'); await assertPrevious(page, first); await page.evaluate(() => { window.__lateRecorder(1, 'dataavailable'); window.__lateRecorder(1, 'stop') }); await assertPrevious(page, first)
  await screenStart(page); await screenPhase(page, 'recording'); await wait(600); await page.evaluate(() => { window.__lateRecorder(0, 'error'); window.__lateRecorder(1, 'stop') }); await screenPhase(page, 'recording'); await assertPrevious(page, first); await page.evaluate(() => window.__endDisplay(2)); await screenPhase(page, 'idle'); await poll(async () => (await lastResult(page).getAttribute('data-screen-recording-result')) !== first.id, 'share ended commits current native recording'); assert.equal(await page.evaluate(url => window.__media.urls.find(item => item.url === url).revoked, first.url), true)
  const latest = await resultIdentity(page); await button(lastResult(page), sr('retry.deleteResult')).click(); await button(lastResult(page), sr('retry.keepResult')).click(); assert.deepEqual(await resultIdentity(page), latest); await button(lastResult(page), sr('retry.deleteResult')).click(); await button(lastResult(page), sr('retry.deleteConfirm')).click(); await lastResult(page).waitFor({ state: 'detached' }); assert.equal(await page.evaluate(url => window.__media.urls.find(item => item.url === url).revoked, latest.url), true); return { staleErrorDataStopIgnored: true, currentTrackEndedCommittedRealResult: true, explicitDeleteReleasedCurrentUrl: true, ...(await checkMediaReleased(page)) }
})

test('screen-320-dark-english-and-unmount-cleanup', async args => {
  const { page } = args; await openScreen(args); await screenSetting(page, 'quality').selectOption('medium'); await screenSetting(page, 'fps').selectOption('60'); await screenStart(page, 'en'); await screenFinish(page, 'en'); const preview = lastResult(page).locator('video'); await poll(() => preview.evaluate(node => node.readyState >= 2), 'mobile preview decoded'); await preview.evaluate(async node => { node.muted = true; await node.play() }); await poll(() => preview.evaluate(node => node.currentTime > 0.05), 'mobile video frame played'); await preview.evaluate(node => node.pause()); const first = await resultIdentity(page); await screenStart(page, 'en'); await screenPhase(page, 'recording'); await assertPrevious(page, first); const geometry = await mobile(page, [screenSetting(page, 'quality'), screenSetting(page, 'fps'), screenSetting(page, 'audio')], [button(sessionPanel(page), sr('pauseRecording', 'en')), button(sessionPanel(page), sr('stopRecording', 'en')), button(lastResult(page), sr('download', 'en')), button(lastResult(page), sr('retry.deleteResult', 'en'))]); await sessionPanel(page).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'screen-current-and-last-320-dark-english.png'), caret: 'initial' }); await lastResult(page).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'screen-last-result-320-dark-english.png'), caret: 'initial' }); await spa(page, 'text-converter', 'text converter'); const evidence = await checkMediaReleased(page); assert.ok(evidence.objectUrls.every(item => item.revoked)); assert.equal(evidence.displayRequests[0].config.video.frameRate, 60); assert.equal(evidence.displayRequests[0].config.video.width.ideal, 1280); return { geometry, settingsPassedToCapture: true, previousResultVisibleDuringNewAttempt: true, allResourcesReleasedOnUnmount: true, ...evidence }
}, { width: 320, dark: true, language: 'en' })

if (only === '--list') console.log(cases.map(item => item.name).join('\n') || 'Product readiness pending; scenarios in browser-scenarios.md')
else {
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part)))
  assert.ok(selected.length, 'No selected verification cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
