import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch13/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const raw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const stored = async (page, key) => JSON.parse(await raw(page, key))
const results = []
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const errors = [], external = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    localStorage.setItem('language', options.language ?? 'ko')
    localStorage.setItem('theme', options.dark ? 'dark' : 'light')
  }, options)
  await context.route('**/*', route => { const url = route.request().url(); if (url.startsWith(base)) return route.continue(); external.push(url); return route.abort() })
  context.on('page', page => {
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && /hydration|didn't match|server rendered HTML/i.test(message.text())) errors.push(message.text()) })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' })
    await target.locator('main h1').first().waitFor()
  }
  const start = Date.now()
  try {
    await fn({ page, context, open })
    assert.deepEqual(errors, [], 'JavaScript / hydration errors')
    results.push({ name, pass: true, milliseconds: Date.now() - start, errors, externalRequestsBlocked: external.length })
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - start, error: error.message, errors })
    await page.screenshot({ path: resolve(out, `${name}-failed.png`), caret: 'initial' }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
  writeFileSync(resolve(out, `results${only ? '-' + only.replace(/[^\w-]/g, '') : ''}.json`), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2))
}
async function seed(context, values) {
  await context.addInitScript(values => {
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch13Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch13Seeded', '1')
  }, values)
}
async function quota(page, key) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem
    window.__restoreStorage = () => { Storage.prototype.setItem = original }
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('Quota exceeded for verification', 'QuotaExceededError'); return original.call(this, name, value) }
  }, key)
}
async function download(page, click, filename) {
  const event = page.waitForEvent('download')
  await click()
  const file = await event
  const path = resolve(out, filename ?? file.suggestedFilename())
  await file.saveAs(path)
  return { name: file.suggestedFilename(), path, bytes: readFileSync(path) }
}
function shape(namespace, prefix) {
  const flat = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => value !== null && typeof value === 'object' ? flat(value, `${prefix}${key}.`) : [`${prefix}${key}:${typeof value}`]).sort()
  const ko = messages.ko[namespace][prefix], en = messages.en[namespace][prefix]
  assert.ok(ko && en); assert.deepEqual(flat(ko), flat(en))
}
async function mobile(page, panel, name) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(sizes.body <= sizes.width + 1 && sizes.document <= sizes.width + 1, `Page overflow: ${JSON.stringify(sizes)}`)
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  assert.doesNotMatch(await panel.innerText(), /(?:copyFeedback|retry|recovery)\.[a-z]/)
  const box = await panel.boundingBox()
  if (box.height > 700) {
    await panel.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY - 80))
    await page.screenshot({ path: resolve(out, `${name}-320-dark-panel.png`), caret: 'initial' })
    const detail = panel.locator('li').last()
    if (await detail.count()) {
      await detail.evaluate(element => element.scrollIntoView({ block: 'center' }))
      await detail.screenshot({ path: resolve(out, `${name}-320-dark-detail.png`), caret: 'initial' })
    }
  } else {
    await panel.evaluate(element => element.scrollIntoView({ block: 'center' }))
    await panel.screenshot({ path: resolve(out, `${name}-320-dark-panel.png`), caret: 'initial' })
  }
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: resolve(out, `${name}-320-dark-top.png`), caret: 'initial' })
}
async function poll(predicate, description) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 100)) }
  assert.fail(`Timed out: ${description}`)
}

const g = (key, values) => tr('gpaConverterCalc', key, values)
const t = (key, values) => tr('textToSpeech', key, values)
const recovery = (page, target = 'result') => page.locator(`[data-gpa-copy-recovery="${target}"]`)
const manual = (page, target = 'result') => page.locator(`#gpa-copy-${target}-text`)
const paragraphs = ['첫 번째 문장입니다.', '두 번째 문장입니다.', '세 번째 문장입니다.']
const sourceText = paragraphs.join(' ')
const localVoice = { name: 'Verification Korean Local', lang: 'ko-KR', localService: true, default: true, voiceURI: 'verify-local' }
const remoteVoice = { name: 'Verification Korean Online', lang: 'ko-KR', localService: false, default: false, voiceURI: 'verify-online' }
async function clipboard(page, api, fallback = false) {
  await page.evaluate(({ api, fallback }) => {
    const state = window.__clipboard = { writes: [], fallbacks: [], pending: [] }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: api === 'absent' ? undefined : { writeText(text) { state.writes.push(text); if (api === 'pending') return new Promise((resolve, reject) => state.pending.push({ resolve, reject })); return api === 'reject' ? Promise.reject(new DOMException('Verification denied', 'NotAllowedError')) : Promise.resolve() } } })
    document.execCommand = command => { state.fallbacks.push({ command, text: document.activeElement?.value, start: document.activeElement?.selectionStart, end: document.activeElement?.selectionEnd }); if (fallback === 'throw') throw new Error('Verification exec failure'); return fallback }
  }, { api, fallback })
}
async function speechMock(context, voices = [localVoice, remoteVoice]) {
  await context.addInitScript(voices => {
    const state = window.__speech = { utterances: [], log: [], cancelCount: 0, voices, current: null }, listeners = new Set()
    class Utterance { constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null } }
    const synth = {
      speaking: false, paused: false, pending: false,
      getVoices: () => state.voices,
      addEventListener: (name, fn) => { if (name === 'voiceschanged') listeners.add(fn) },
      removeEventListener: (name, fn) => { if (name === 'voiceschanged') listeners.delete(fn) },
      speak: utterance => { state.current = utterance; synth.speaking = true; state.utterances.push({ utterance, end: utterance.onend, error: utterance.onerror, boundary: utterance.onboundary }); state.log.push({ text: utterance.text, voice: utterance.voice?.name ?? null, local: utterance.voice?.localService ?? null, rate: utterance.rate, pitch: utterance.pitch, volume: utterance.volume }) },
      cancel: () => { state.cancelCount++; synth.speaking = false; state.current = null },
      pause: () => { synth.paused = true }, resume: () => { synth.paused = false },
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth }); Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance })
    window.__emitSpeech = (index, type, code = 'network') => {
      const item = state.utterances[index]; if (!item) throw new Error(`Unknown utterance ${index}`)
      if (type !== 'boundary' && state.current === item.utterance) { synth.speaking = false; state.current = null }
      const event = type === 'error' ? { error: code } : type === 'boundary' ? { name: 'word', charIndex: 0, charLength: 2 } : {}
      item[type]?.call(item.utterance, event)
    }
    window.__setSpeechVoices = values => { state.voices = values; for (const listener of listeners) listener() }
  }, voices)
}
const speakLog = page => page.evaluate(() => window.__speech.log)
async function emit(page, index, type, code) { await page.evaluate(({ index, type, code }) => window.__emitSpeech(index, type, code), { index, type, code }) }
async function expectSpeaks(page, count) { await poll(async () => (await speakLog(page)).length === count, `speech count ${count}`) }
async function openTts(args, options = {}) {
  await speechMock(args.context, options.voices); await args.open('text-to-speech', options.query ?? `?t=${encodeURIComponent(sourceText)}`)
  await poll(async () => await args.page.locator('#tts-text').inputValue() === (options.text ?? sourceText) && await args.page.locator('#tts-voice option').count() === (options.voices?.length ?? 2), 'TTS hydrated with mock voices')
  assert.equal((await speakLog(args.page)).length, 0)
}
async function openGpa(args, query = '?scale=4.3&v=3.7') {
  await args.open('gpa-converter', query)
  await poll(async () => await args.page.locator('#gpa-input').inputValue() === (new URLSearchParams(query).get('v') ?? ''), 'GPA URL restored')
}
const retryTts = page => button(page, t('recovery.retry'))
const ttsRecovery = page => retryTts(page).locator('..')
async function failFirst(page, code = 'network') {
  const index = (await speakLog(page)).length; await button(page, t('play')).click(); await expectSpeaks(page, index + 1); await emit(page, index, 'error', code); await retryTts(page).waitFor(); return index
}
async function failSecond(page) {
  const index = (await speakLog(page)).length; await button(page, t('play')).click(); await expectSpeaks(page, index + 1); await emit(page, index, 'end'); await expectSpeaks(page, index + 2); await emit(page, index + 1, 'error'); await retryTts(page).waitFor(); return index + 1
}

try {
  await run('gpa-clipboard-failure-matrix-manual-selection-and-retry', async args => {
    const { page } = args; shape('gpaConverterCalc', 'copyRecovery'); await openGpa(args)
    await button(page, g('copyResult')).click(); await button(page, g('copied')).waitFor(); const realText = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')
    assert.ok(realText.includes('3.7')); assert.ok(realText.includes(g('result.method.ratio'))); assert.ok(realText.includes(g('result.method.band'))); assert.equal(realText.split('\n').length, 4)
    const matrix = [['absent', false], ['absent', 'throw'], ['reject', false], ['absent', true], ['reject', true]]
    for (const [api, fallback] of matrix) {
      await page.locator('#gpa-input').fill('3.6'); await page.locator('#gpa-input').fill('3.7'); await clipboard(page, api, fallback); await button(page, g('copyResult')).click()
      if (fallback === true) { await button(page, g('copied')).waitFor(); assert.equal(await recovery(page).count(), 0) }
      else {
        await recovery(page).waitFor(); assert.equal(await button(page, g('copied')).count(), 0); assert.equal(await manual(page).inputValue(), realText); assert.ok(await manual(page).getAttribute('readonly') !== null)
        await button(recovery(page), g('copyRecovery.result.select')).click(); const selection = await manual(page).evaluate(element => ({ active: document.activeElement === element, start: element.selectionStart, end: element.selectionEnd, length: element.value.length })); assert.deepEqual(selection, { active: true, start: 0, end: realText.length, length: realText.length })
      }
      const state = await page.evaluate(() => ({ writes: window.__clipboard.writes, fallbacks: window.__clipboard.fallbacks })); assert.equal(state.writes.length, api === 'absent' ? 0 : 1); assert.equal(state.fallbacks.length, 1); assert.equal(state.fallbacks[0].text, realText)
    }
    await page.locator('#gpa-input').fill('3.6'); await clipboard(page, 'reject'); await button(page, g('copyResult')).click(); await recovery(page).waitFor(); await clipboard(page, 'resolve'); await button(recovery(page), g('copyRecovery.result.retry')).click(); await button(page, g('copied')).waitFor(); assert.equal(await recovery(page).count(), 0)
    writeFileSync(resolve(out, 'gpa-copied-result.txt'), realText)
  })
  await run('gpa-delayed-copy-input-scale-and-competing-request', async args => {
    const { page } = args; await openGpa(args); await clipboard(page, 'pending'); await button(page, g('copyResult')).click(); await page.locator('#gpa-input').fill('3.1'); await page.evaluate(() => window.__clipboard.pending[0].resolve()); await page.waitForTimeout(80)
    assert.equal(await button(page, g('copied')).count(), 0); assert.equal(await recovery(page).count(), 0)
    await button(page, g('copyResult')).click(); await button(page, g('scales.s40')).click(); await page.evaluate(() => window.__clipboard.pending[1].reject(new Error('Delayed denial'))); await page.waitForTimeout(80)
    assert.equal(await recovery(page).count(), 0); assert.equal(await page.evaluate(() => window.__clipboard.fallbacks.length), 0, 'stale request never copies old result through fallback')
    await button(page, g('copyResult')).click(); await button(page, g('copyLink')).click(); await page.evaluate(() => window.__clipboard.pending[3].reject(new Error('Current link denial'))); await recovery(page, 'link').waitFor(); const link = await manual(page, 'link').inputValue(); assert.equal(new URL(link).searchParams.get('v'), '3.1'); assert.equal(new URL(link).searchParams.get('scale'), '4.0')
    await page.evaluate(() => window.__clipboard.pending[2].resolve()); await page.waitForTimeout(80); assert.equal(await button(page, g('copied')).count(), 0); assert.equal(await manual(page, 'link').inputValue(), link)
    await page.locator('#gpa-input').fill('2.8'); assert.equal(await recovery(page, 'link').count(), 0); await clipboard(page, 'absent'); await button(page, g('copyLink')).click(); await recovery(page, 'link').waitFor(); assert.equal(new URL(await manual(page, 'link').inputValue()).searchParams.get('v'), '2.8')
    await clipboard(page, 'pending'); await button(page, g('copyResult')).click(); await button(page, g('copyLink')).click(); await page.evaluate(() => window.__clipboard.pending[1].resolve()); await button(page, g('copyLinkDone')).waitFor(); await page.evaluate(() => window.__clipboard.pending[0].reject(new Error('Older result denied'))); await page.waitForTimeout(80)
    assert.equal(await page.evaluate(() => window.__clipboard.fallbacks.length), 0); assert.equal(await recovery(page).count(), 0); await button(page, g('copyLinkDone')).waitFor()
  })
  await run('gpa-url-all-scales-existing-calculation-and-image', async args => {
    const { page, open } = args; await openGpa(args)
    const fixtures = [
      ['4.5', '3.6', ['3.60', '3.44', '3.20', '80%']],
      ['4.3', '3.7', ['3.87', '3.70', '3.44', '86%']],
      ['4.0', '3.2', ['3.60', '3.44', '3.20', '80%']],
      ['100', '88', ['3.96', '3.78', '3.52', '88%']],
    ]
    for (const [scale, value, expected] of fixtures) {
      await open('gpa-converter', `?scale=${scale}&v=${value}`); await poll(async () => await page.locator('#gpa-input').inputValue() === value, 'GPA link input restored')
      const rows = page.locator('table').first().locator('tbody tr'); await poll(async () => await rows.count() === 4, 'calculation table ready'); assert.deepEqual(await rows.evaluateAll(rows => rows.map(row => row.querySelectorAll('td')[1].textContent)), expected)
      assert.equal(new URL(page.url()).searchParams.get('v'), value)
    }
    const image = await download(page, () => button(page, g('saveImage')).click(), 'gpa-existing-result.png'); assert.equal(image.bytes.toString('ascii', 1, 4), 'PNG'); assert.equal(image.bytes.readUInt32BE(16), 660); assert.equal(image.bytes.readUInt32BE(20), 380)
    await page.locator('#gpa-input').fill('101'); assert.equal(await button(page, g('copyResult')).count(), 0); assert.ok(await button(page, g('saveImage')).isDisabled())
    await page.locator('#gpa-input').fill('0'); assert.equal(await page.locator('table').first().locator('tbody tr').count(), 4); await page.locator('#gpa-input').fill(''); assert.equal(await button(page, g('copyResult')).count(), 0)
  })
  await run('gpa-manual-copy-mobile-dark', async args => {
    const { page } = args; await openGpa(args, '?scale=100&v=88'); await clipboard(page, 'reject'); await button(page, g('copyResult')).click(); await recovery(page).waitFor(); await button(recovery(page), g('copyRecovery.result.select')).click()
    assert.ok(await manual(page).evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 16)); for (const control of await recovery(page).getByRole('button').all()) assert.ok((await control.boundingBox()).height >= 44)
    await manual(page).press('Control+A'); assert.equal(await manual(page).evaluate(element => element.selectionEnd - element.selectionStart), (await manual(page).inputValue()).length); await mobile(page, recovery(page), 'gpa-copy-result')
    await button(page, g('copyLink')).click(); await recovery(page, 'link').waitFor(); await button(recovery(page, 'link'), g('copyRecovery.link.select')).click(); assert.ok((await manual(page, 'link').inputValue()).includes('scale=100')); await manual(page, 'link').evaluate(element => element.scrollIntoView({ block: 'center' })); await recovery(page, 'link').screenshot({ path: resolve(out, 'gpa-copy-link-320-dark-panel.png'), caret: 'initial' })
  }, { width: 320, dark: true, language: 'en' })
  await run('tts-middle-sentence-explicit-retry-and-stale-callbacks', async args => {
    const { page } = args; shape('textToSpeech', 'recovery'); await openTts(args); await button(page, t('play')).click(); await expectSpeaks(page, 1); await emit(page, 0, 'end'); await expectSpeaks(page, 2)
    await emit(page, 0, 'end'); await emit(page, 0, 'error'); await emit(page, 0, 'boundary'); assert.equal((await speakLog(page)).length, 2); assert.equal(await retryTts(page).count(), 0)
    await emit(page, 1, 'error'); await retryTts(page).waitFor(); await ttsRecovery(page).getByText(t('recovery.sentence', { number: 2 }), { exact: true }).waitFor(); assert.ok((await ttsRecovery(page).innerText()).includes(paragraphs[1])); assert.equal((await speakLog(page)).length, 2)
    await emit(page, 1, 'end'); assert.equal((await speakLog(page)).length, 2); await retryTts(page).click(); await expectSpeaks(page, 3); assert.equal((await speakLog(page))[2].text, paragraphs[1])
    await emit(page, 1, 'error'); await emit(page, 1, 'end'); assert.equal((await speakLog(page)).length, 3); assert.equal(await retryTts(page).count(), 0); await emit(page, 2, 'end'); await expectSpeaks(page, 4); assert.equal((await speakLog(page))[3].text, paragraphs[2]); await emit(page, 3, 'end'); await button(page, t('play')).waitFor(); assert.ok(await button(page, t('stop')).isDisabled())
    writeFileSync(resolve(out, 'tts-middle-retry-mock-log.json'), JSON.stringify(await speakLog(page), null, 2))
  })
  await run('tts-repeat-pass-retry-pause-resume-and-remaining-passes', async args => {
    const { page } = args; await openTts(args); await page.getByRole('checkbox', { name: t('repeat.enable'), exact: true }).check(); await page.getByRole('combobox', { name: t('repeat.start'), exact: true }).selectOption('1'); await page.getByRole('combobox', { name: t('repeat.gap'), exact: true }).selectOption('0')
    await button(page, t('play')).click(); await expectSpeaks(page, 1); await emit(page, 0, 'end'); await expectSpeaks(page, 2); await emit(page, 1, 'end'); await expectSpeaks(page, 3); await emit(page, 2, 'end'); await expectSpeaks(page, 4); await emit(page, 3, 'error'); await retryTts(page).waitFor()
    const summary = t('recovery.repeat', { pass: 2, count: 3, remaining: 1 }); await ttsRecovery(page).getByText(summary, { exact: true }).waitFor(); await retryTts(page).click(); await expectSpeaks(page, 5); assert.ok((await page.locator('#tts-controls').innerText()).includes(t('repeat.progress', { current: 2, total: 3 })))
    await button(page, t('pause')).click(); await emit(page, 4, 'end'); await emit(page, 4, 'error'); assert.equal((await speakLog(page)).length, 5); await button(page, t('resume')).click(); await expectSpeaks(page, 6); await emit(page, 5, 'end'); await expectSpeaks(page, 7); await emit(page, 6, 'end'); await expectSpeaks(page, 8); await emit(page, 7, 'end'); await button(page, t('play')).waitFor(); assert.ok(await button(page, t('stop')).isDisabled())
    assert.deepEqual((await speakLog(page)).map(item => item.text), [paragraphs[1], paragraphs[2], paragraphs[1], paragraphs[2], paragraphs[2], paragraphs[2], paragraphs[1], paragraphs[2]])
    writeFileSync(resolve(out, 'tts-repeat-retry-mock-log.json'), JSON.stringify({ failedSummary: summary, utterances: await speakLog(page) }, null, 2))
  })
  await run('tts-text-stop-sentence-and-repeat-settings-invalidate-retry', async args => {
    const { page } = args; await openTts(args); const index = await failSecond(page); await page.locator('#tts-text').fill('수정한 첫 문장. 새로운 둘째 문장.'); assert.equal(await retryTts(page).count(), 0); await emit(page, index, 'error'); await emit(page, index, 'end'); assert.equal((await speakLog(page)).length, 2)
    await failFirst(page); await button(page, t('stop')).click(); assert.equal(await retryTts(page).count(), 0); await failFirst(page); await page.keyboard.press('Escape'); assert.equal(await retryTts(page).count(), 0)
    await page.locator('#tts-text').fill(sourceText); await failFirst(page); const before = (await speakLog(page)).length; await page.locator('[data-i="2"]').click(); await expectSpeaks(page, before + 1); assert.equal((await speakLog(page)).at(-1).text, paragraphs[2]); assert.equal(await retryTts(page).count(), 0); await button(page, t('stop')).click()
    await failFirst(page); await page.getByRole('checkbox', { name: t('repeat.enable'), exact: true }).check(); assert.equal(await retryTts(page).count(), 0)
    for (const [key, value] of [['start', '1'], ['end', '1'], ['count', '5'], ['gap', '0']]) { await failFirst(page); await page.getByRole('combobox', { name: t('repeat.' + key), exact: true }).selectOption(value); assert.equal(await retryTts(page).count(), 0) }
  })
  await run('tts-retry-uses-updated-voice-and-audio-settings', async args => {
    const { page } = args; await openTts(args); await page.locator('#tts-voice').selectOption(remoteVoice.name); await failSecond(page)
    await page.locator('#tts-voice').selectOption(localVoice.name); await button(page, t('speedPresets.fast')).click(); await page.locator('#tts-pitch').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.locator('#tts-volume').focus(); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft')
    assert.equal((await speakLog(page)).length, 2); await retryTts(page).click(); await expectSpeaks(page, 3); assert.deepEqual((await speakLog(page))[2], { text: paragraphs[1], voice: localVoice.name, local: true, rate: 1.3, pitch: 1.2, volume: 0.8 })
    await button(page, t('stop')).click(); await page.evaluate(() => { speechSynthesis.speak = () => { throw new Error('Synthesis unavailable') } }); await button(page, t('play')).click(); await retryTts(page).waitFor(); await ttsRecovery(page).getByRole('alert').filter({ hasText: 'synthesis-failed' }).waitFor()
  })
  await run('tts-local-voice-filter-cancellation-and-network-error', async args => {
    const { page } = args; await openTts(args, { voices: [remoteVoice] }); await page.getByRole('checkbox', { name: t('handoff.localOnly'), exact: true }).check(); assert.ok(await button(page, t('play')).isDisabled()); await page.getByText(t('handoff.noLocal'), { exact: true }).waitFor(); assert.equal((await speakLog(page)).length, 0)
    await page.getByRole('checkbox', { name: t('handoff.localOnly'), exact: true }).uncheck(); await failFirst(page, 'network'); assert.equal((await speakLog(page))[0].local, false); await page.getByRole('checkbox', { name: t('handoff.localOnly'), exact: true }).check(); assert.equal(await retryTts(page).count(), 0); assert.ok(await button(page, t('play')).isDisabled())
    await page.evaluate(voices => window.__setSpeechVoices(voices), [remoteVoice, localVoice]); await poll(async () => await button(page, t('play')).isEnabled(), 'new local voice available'); await button(page, t('play')).click(); await expectSpeaks(page, 2); assert.equal((await speakLog(page))[1].local, true); await emit(page, 1, 'error', 'canceled'); assert.equal(await retryTts(page).count(), 0); await button(page, t('play')).waitFor()
    await button(page, t('play')).click(); await expectSpeaks(page, 3); await emit(page, 2, 'error', 'interrupted'); await button(page, t('play')).waitFor(); await poll(async () => await button(page, t('stop')).isDisabled(), 'interrupted callback rendered stopped'); assert.equal(await retryTts(page).count(), 0)
  })
  await run('tts-notepad-ocr-handoff-no-autoplay-and-no-stale-retry', async args => {
    const { page, context, open } = args; await speechMock(context); const noteText = sourceText, notes = [{ id: 'note13', title: 'Verification note', content: noteText, createdAt: 1794787200000, updatedAt: 1794787200000 }]
    await seed(context, { 'toolhub-notepad-notes': notes }); await open('notepad'); const editor = page.getByRole('textbox', { name: tr('notepad', 'contentPlaceholder'), exact: true }); await poll(async () => await editor.inputValue() === noteText, 'note fixture restored')
    const event = context.waitForEvent('page'); await button(page, tr('notepad', 'reading.all')).click(); const target = await event; await target.waitForURL('**/text-to-speech/?from=notepad'); await poll(async () => await target.locator('#tts-text').inputValue() === noteText, 'notepad handoff restored')
    assert.equal((await speakLog(target)).length, 0); assert.equal(await target.evaluate(() => window.__speech.cancelCount), 0); assert.equal(await target.evaluate(() => window.opener), null); assert.ok(await target.getByRole('checkbox', { name: t('handoff.localOnly'), exact: true }).isChecked()); await failSecond(target)
    await target.evaluate(text => sessionStorage.setItem('toolhub-ocr-tts-v1', JSON.stringify({ source: 'ocr', text, createdAt: Date.now() })), 'OCR 새 문장입니다. 둘째입니다.'); await target.goto(`${base}/text-to-speech/?from=ocr`); await poll(async () => await target.locator('#tts-text').inputValue() === 'OCR 새 문장입니다. 둘째입니다.', 'OCR handoff restored')
    assert.equal((await speakLog(target)).length, 0); assert.equal(await retryTts(target).count(), 0); assert.equal(await target.evaluate(() => sessionStorage.getItem('toolhub-ocr-tts-v1')), null); assert.ok(await target.getByRole('checkbox', { name: t('handoff.localOnly'), exact: true }).isChecked())
    await target.reload({ waitUntil: 'domcontentloaded' }); await target.getByText(t('handoff.expired'), { exact: true }).waitFor(); assert.equal((await speakLog(target)).length, 0)
  })
  await run('tts-recovery-mobile-dark-and-url-settings', async args => {
    const { page } = args; await openTts(args, { query: `?t=${encodeURIComponent(sourceText)}&r=1.3` }); assert.equal(await page.locator('#tts-rate').inputValue(), '1.3'); await failSecond(page); assert.ok((await retryTts(page).boundingBox()).height >= 44); await mobile(page, ttsRecovery(page), 'tts-recovery')
    await retryTts(page).click(); await expectSpeaks(page, 3); assert.equal((await speakLog(page)).at(-1).text, paragraphs[1]); assert.equal((await speakLog(page)).at(-1).rate, 1.3)
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1


