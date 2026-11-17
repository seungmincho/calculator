import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'


import ts from 'typescript'

// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch27/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const wc = (key, language = 'ko', values = {}) => tr('worldClock', key, language, values)
const wn = (key, language = 'ko', values = {}) => tr('whiteNoise', key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch27Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch27Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

  }, options)
  await context.route('**/*', route => { const request = route.request(); network.push(request.url() + '\n' + (request.postData() ?? '')); const url = new URL(request.url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient') })
  context.on('page', page => {
    page.setDefaultTimeout(16000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { logs.push(message.text()); if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  page.__verificationSecrets = []
  const redact = value => { let text = String(value); if (options.sensitive) for (const secret of page.__verificationSecrets.filter(value => value.length >= 4)) text = text.replaceAll(secret, '[redacted generated value]'); return text }
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:worldClock|whiteNoise)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('[data-password-value]'), page.locator('[data-password-copy-recovery] textarea'), page.locator('#pg-check')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors: errors.map(redact), hydration: hydration.map(redact), consoleErrors: consoleErrors.map(redact), external: [...new Set(external)].map(redact) }
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

// UTC/timezone fixtures are declared independently of the product implementation.
const meetingFixtures = {
  seconds: Date.parse('2026-11-16T23:45:37Z'),
  foldEarly: Date.parse('2026-11-01T05:30:45Z'),
  foldLate: Date.parse('2026-11-01T06:30:45Z'),
  spring: Date.parse('2026-03-08T16:15:27Z'),
  lordHoweShort: Date.parse('2026-10-04T01:30:12Z'),
  lordHoweLong: Date.parse('2026-04-05T01:30:12Z'),
  kathmanduWork: [Date.parse('2026-11-16T03:15:00Z'), Date.parse('2026-11-16T09:00:00Z')],
}
const profileKey = 'toolhub-white-noise-profiles-v1'
const profileSettings = { type: 'rain', volume: 37, timerMinutes: 5, fade: true }
const meetingQuery = (ids, ms) => `?cities=${encodeURIComponent(ids.join(','))}&at=${ms / 1000}`
const stamp = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

function parseCalendar(bytes) {
  assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), 'ICS has no BOM')
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  assert.ok(text.endsWith('\r\n')); assert.ok(!/(?<!\r)\n|\r(?!\n)/.test(text), 'ICS CRLF only')
  const physical = text.slice(0, -2).split('\r\n')
  for (const line of physical) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, 'UTF-8 folding max 75 octets')
  const lines = text.replace(/\r\n[ \t]/g, '').trimEnd().split('\r\n'), properties = {}
  for (const line of lines) { const separator = line.indexOf(':'); assert.ok(separator > 0); const key = line.slice(0, separator); (properties[key] ??= []).push(line.slice(separator + 1)) }
  assert.deepEqual(properties.BEGIN, ['VCALENDAR', 'VEVENT']); assert.deepEqual(properties.END, ['VEVENT', 'VCALENDAR'])
  for (const key of ['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY']) assert.equal(properties[key]?.length, 1)
  assert.ok(!lines.some(line => /^(?:ATTENDEE|RRULE|TRIGGER|TZID)(?:;|:)/.test(line)))
  const unescapeText = value => value.replace(/\\([nN,;\\])/g, (_, character) => /[nN]/.test(character) ? '\n' : character)
  return { properties, summary: unescapeText(properties.SUMMARY[0]), bytes: bytes.length, physicalLines: physical.length }
}
function assertCalendar(calendar, { title, startMs, durationMinutes }) {
  const identity = JSON.stringify(['toolhub-world-meeting-v1', title, startMs, durationMinutes])
  assert.equal(calendar.properties.UID[0], `world-clock-${createHash('sha256').update(identity).digest('hex')}@toolhub.ai.kr`)
  assert.equal(calendar.properties.DTSTART[0], stamp(startMs)); assert.equal(calendar.properties.DTEND[0], stamp(startMs + durationMinutes * 60000)); assert.equal(calendar.summary, title)
}
async function observeDigest(context) {
  await context.addInitScript(() => {
    const native = crypto.subtle.digest.bind(crypto.subtle)
    window.__digestMode = 'native'; window.__digests = []
    crypto.subtle.digest = async (...args) => {
      const result = await native(...args)
      if (window.__digestMode === 'reject') throw new Error('Controlled digest failure')
      if (window.__digestMode === 'hold') return new Promise((resolve, reject) => window.__digests.push({ resolve: () => resolve(result), reject }))
      return result
    }
  })
}

// Native AudioContext/source/AudioParam APIs are observed, while every connection
// to the device destination passes through an extra gain fixed at zero. Chrome
// also receives --mute-audio. No speaker listening or microphone capture occurs.
async function silentNativeAudio(context) {
  await context.addInitScript(() => {
    const NativeContext = window.AudioContext, nativeDateNow = Date.now.bind(Date)
    window.__audio = []; window.__audioEvents = []; window.__audioPending = []; window.__audioResumeMode = 'native'; window.__audioWallShift = 0
    Date.now = () => nativeDateNow() + window.__audioWallShift
    if (!NativeContext) return
    const recordEvent = (record, kind, values = []) => window.__audioEvents.push({ id: record.id, kind, values, at: record.context.currentTime })
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args)
        const context = this, originalGain = this.createGain.bind(this), originalSource = this.createBufferSource.bind(this), originalResume = this.resume.bind(this), originalClose = this.close.bind(this)
        const sink = originalGain(); sink.gain.value = 0; sink.connect(context.destination)
        const record = { id: window.__audio.length, context, gains: [], sources: [], sink }; window.__audio.push(record); recordEvent(record, 'context')
        this.createGain = () => {
          const gain = originalGain(), connect = gain.connect.bind(gain), disconnect = gain.disconnect.bind(gain); record.gains.push(gain)
          for (const method of ['cancelScheduledValues', 'setValueAtTime', 'linearRampToValueAtTime']) {
            const native = gain.gain[method].bind(gain.gain); gain.gain[method] = (...values) => { recordEvent(record, method, values); return native(...values) }
          }
          gain.connect = (destination, ...rest) => connect(destination === context.destination ? sink : destination, ...rest)
          gain.disconnect = (...values) => { recordEvent(record, 'gainDisconnect'); return disconnect(...values) }
          return gain
        }
        this.createBufferSource = () => {
          const source = originalSource(); record.sources.push(source)
          for (const method of ['start', 'stop', 'disconnect']) { const native = source[method].bind(source); source[method] = (...values) => { recordEvent(record, `source:${method}`, values); return native(...values) } }
          return source
        }
        this.resume = async () => {
          recordEvent(record, 'resume', record.gains.map(gain => gain.gain.value))
          const mode = window.__audioResumeMode
          if (mode === 'reject') throw new Error('Controlled resume failure')
          await originalResume()
          if (mode === 'hold') return new Promise((resolve, reject) => window.__audioPending.push({ id: record.id, resolve, reject }))
        }
        this.close = () => { recordEvent(record, 'close'); sink.disconnect(); return originalClose() }
      }
    }
  })
}
function browserProductModule(path) {
  const source = readFileSync(path, 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  assert.ok(!/^import /m.test(output), `Offline probe must have no unresolved imports: ${path}`)
  return { url: `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`, sha256: createHash('sha256').update(source).digest('hex') }
}
async function offlineProductWaveforms(page) {
  const audio = browserProductModule('src/lib/whiteNoise/audio.ts'), plan = browserProductModule('src/utils/whiteNoise.ts')
  const waves = await page.evaluate(async ({ audioUrl, planUrl }) => {
    const { createWhiteNoiseAudio } = await import(audioUrl), { whiteNoiseAudioPlan } = await import(planUrl)
    const rate = 8000, scenarios = [
      { name: 'fade', duration: 32, remainingMs: 31000, volume: 80, fade: true, times: [0.5, 1, 16, 30.5, 31.5] },
      { name: 'no-fade', duration: 3, remainingMs: 2000, volume: 50, fade: false, times: [0.5, 1.5, 2.5] },
      { name: 'muted-unlimited', duration: 2, remainingMs: null, volume: 0, fade: true, times: [0.5, 1.5] },
      { name: 'unlimited', duration: 2, remainingMs: null, volume: 37, fade: true, times: [0.5, 1.5] },
    ], results = []
    for (const item of scenarios) {
      const context = new OfflineAudioContext(1, item.duration * rate, rate)
      const native = createWhiteNoiseAudio(context, 'white', ctx => { const source = ctx.createBufferSource(), buffer = ctx.createBuffer(1, rate, rate); buffer.getChannelData(0).fill(1); source.buffer = buffer; source.loop = true; return source })
      const schedule = whiteNoiseAudioPlan({ type: 'white', volume: item.volume, timerMinutes: item.remainingMs === null ? 0 : 5, fade: item.fade }, item.remainingMs, 0)
      native.start(schedule); const rendered = await context.startRendering(), data = rendered.getChannelData(0)
      results.push({ name: item.name, plan: schedule, samples: item.times.map(second => ({ second, value: data[Math.round(second * rate)] })) }); native.release()
    }
    return results
  }, { audioUrl: audio.url, planUrl: plan.url })
  const expected = [[0.8, 0.8, 0.4, 0.8 / 60, 0], [0.5, 0.5, 0], [0, 0], [0.37, 0.37]]
  waves.forEach((wave, index) => wave.samples.forEach((sample, at) => assert.ok(Math.abs(sample.value - expected[index][at]) < 0.0001, JSON.stringify({ wave: wave.name, sample, expected: expected[index][at] }))))
  return { waves, nativeOfflineEngine: true, physicalSpeakerOutput: false, productAudioSha256: audio.sha256, productPlanSha256: plan.sha256 }
}

async function clipboard(page, mode) {
  await page.evaluate(mode => { window.__nativeClipboard ??= navigator.clipboard; window.__copyPending = []; window.__fallbackCalls = 0; document.execCommand = () => { window.__fallbackCalls++; return mode === 'true' }; const value = mode === 'native' ? window.__nativeClipboard : mode === 'absent' || mode === 'true' ? undefined : { writeText: mode === 'pending' ? text => new Promise((resolve, reject) => window.__copyPending.push({ text, resolve, reject })) : () => Promise.reject(new DOMException('Controlled clipboard denial', 'NotAllowedError')) }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value }) }, mode)
}
async function spa(page, slug, query = '텍스트 변환') { await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill(query); await page.locator(`#search-listbox a[href="/${slug}"]`).first().click(); await page.waitForURL(url => url.pathname.replace(/\/$/, '') === `/${slug}`) }
const ws = (page, name, value) => page.locator(`[data-world-${name}${value === undefined ? '' : `="${value}"`}]`)
async function openWorld(args, ids = ['seoul', 'newYork', 'utc'], ms = meetingFixtures.seconds, target = args.page) {
  await args.open('world-clock', meetingQuery(ids, ms), target)
  await poll(async () => await ws(target, 'selected-ms').getAttribute('data-world-selected-ms') === String(ms), 'Exact selected meeting instant')
}
async function selected(page) { return Number(await ws(page, 'selected-ms').getAttribute('data-world-selected-ms')) }
async function calendarDownload(page, filename, expected) {
  const result = await download(page, () => ws(page, 'calendar-download').click(), filename)
  assert.equal(result.filename, 'toolhub-world-clock-meeting.ics'); const parsed = parseCalendar(result.bytes); assertCalendar(parsed, expected); return parsed
}

test('world-exact-seconds-url-order-and-safe-input', async args => {
  const { page, context } = args
  await context.addInitScript(() => { if (!/^https?:$/.test(location.protocol)) return; if (!sessionStorage.getItem('__cityseed')) { localStorage.setItem('worldClock.cities', 'tokyo,london'); sessionStorage.setItem('__cityseed', '1') } })
  await openWorld(args); assert.deepEqual(await ws(page, 'city').evaluateAll(nodes => nodes.map(node => node.dataset.worldCity)), ['seoul', 'newYork', 'utc']); assert.match(await ws(page, 'selected-city', 'seoul').innerText(), /2026-11-17.*08:45:37/)
  await ws(page, 'move', 'newYork:up').click(); assert.equal(await selected(page), meetingFixtures.seconds); assert.equal(await ws(page, 'date').inputValue(), '2026-11-16'); await ws(page, 'work', 'start').selectOption('8'); assert.equal(await selected(page), meetingFixtures.seconds)
  await ws(page, 'copy', 'link').click(); const url = await page.evaluate(() => navigator.clipboard.readText()); assert.equal(new URL(url).searchParams.get('at'), String(meetingFixtures.seconds / 1000)); const next = await context.newPage(); await next.goto(url, { waitUntil: 'domcontentloaded' }); await ws(next, 'selected-ms').waitFor(); await poll(async () => await selected(next) === meetingFixtures.seconds, 'Copied URL restores exact instant'); assert.equal(await selected(next), meetingFixtures.seconds); await next.close()
  await changeLanguage(page, 'en'); assert.match(await ws(page, 'selected-city', 'newYork').innerText(), /New York/); assert.equal(await selected(page), meetingFixtures.seconds)
  for (const value of [0, -1000]) { await openWorld(args, ['utc'], value); assert.equal(await selected(page), value) }
  await args.open('world-clock', '?cities=utc,not-a-zone,utc,seoul&at=NaN'); await ws(page, 'url-notice').waitFor(); assert.deepEqual(await ws(page, 'city').evaluateAll(nodes => nodes.map(node => node.dataset.worldCity)), ['utc', 'seoul']); assert.ok(Number.isSafeInteger(await selected(page)))
  return { exactEpochAndSeconds: true, urlOverSavedCities: true, cityReorderPreservedInstant: true, epochZeroAndNegative: true, invalidInputSafe: true }
})
test('world-dst-fold-spring-slots', async args => {
  const { page } = args, results = []
  for (const [ms, offset] of [[meetingFixtures.foldEarly, 'UTC-04:00'], [meetingFixtures.foldLate, 'UTC-05:00']]) { await openWorld(args, ['newYork', 'utc'], ms); const text = await ws(page, 'selected-city', 'newYork').innerText(); assert.match(text, /01:30:45/); assert.ok(text.includes(offset)); assert.equal(await ws(page, 'day-ms').getAttribute('data-world-day-ms'), String(25 * 3600000)); assert.equal(await ws(page, 'slot-city', 'newYork').count(), 25); results.push({ ms, offset, exact: await selected(page) }) }
  await openWorld(args, ['newYork', 'utc'], meetingFixtures.spring); assert.equal(await ws(page, 'day-ms').getAttribute('data-world-day-ms'), String(23 * 3600000)); assert.equal(await ws(page, 'slot-city', 'newYork').count(), 23); const cell = ws(page, 'slot-city', 'newYork').nth(7), start = Number(await cell.getAttribute('data-world-slot-ms')); await cell.click(); assert.equal(await selected(page), start); await ws(page, 'date').fill('2026-03-09'); assert.equal(new URL(page.url()).searchParams.get('at'), String((await selected(page)) / 1000)); assert.equal(await ws(page, 'day-ms').getAttribute('data-world-day-ms'), String(24 * 3600000))
  return { foldedInstants: results, springHours: 23, fallHours: 25, explicitSlotChoosesStart: true, explicitDateChoosesConsistentDefault: true }
})
test('world-half-hour-kathmandu-work-intersection', async args => {
  const { page } = args, halfDays = []
  for (const [ms, hours, count] of [[meetingFixtures.lordHoweShort, 23.5, 24], [meetingFixtures.lordHoweLong, 24.5, 25]]) { await openWorld(args, ['Australia/Lord_Howe', 'utc'], ms); const slots = ws(page, 'slot-city', 'Australia/Lord_Howe'), durations = await slots.evaluateAll(nodes => nodes.map(node => Number(node.dataset.worldSlotDuration))); assert.equal(durations.length, count); assert.equal(durations.at(-1), 1800000); assert.equal(durations.reduce((a, b) => a + b, 0), hours * 3600000); halfDays.push({ hours, count, lastMs: durations.at(-1) }) }
  await openWorld(args, ['seoul', 'kathmandu'], Date.parse('2026-11-16T07:01:23Z')); const [start, end] = meetingFixtures.kathmanduWork; assert.equal(await ws(page, 'overlap-total').getAttribute('data-world-overlap-total'), String(end - start)); assert.equal(await ws(page, 'overlap-start').getAttribute('data-world-overlap-start'), String(start)); assert.equal(await ws(page, 'overlap-start').getAttribute('data-world-overlap-end'), String(end)); const overlaps = await ws(page, 'slot-city', 'seoul').evaluateAll(nodes => nodes.map(node => Number(node.dataset.worldOverlapMs))); assert.ok(overlaps.includes(2700000)); assert.equal(overlaps.reduce((a, b) => a + b, 0), end - start)
  await openWorld(args, ['utc'], Date.parse('2026-11-16T23:59:59Z')); const last = ws(page, 'slot-city', 'utc').last(); assert.equal(await last.getAttribute('aria-pressed'), 'true'); await openWorld(args, ['utc'], Date.parse('2026-11-17T00:00:00Z')); assert.equal(await ws(page, 'slot-city', 'utc').first().getAttribute('aria-pressed'), 'true')
  return { halfDays, exactWorkIntersection: { start, end, minutes: 345 }, partialCellMinutes: 45, midnightBoundary: true }
})
test('world-ics-native-download-exact-bytes', async args => {
  const { page } = args; await openWorld(args, ['utc', 'seoul'], meetingFixtures.seconds)
  const title = '27차 검증 미팅, 일정; 역슬래시\\ ' + '한글일정'.repeat(12), startMs = meetingFixtures.seconds
  await ws(page, 'event-title').fill(title); await ws(page, 'duration').selectOption('90'); const initial = await calendarDownload(page, 'world-clock-90-minutes.ics', { title, startMs, durationMinutes: 90 }); assert.ok(initial.physicalLines > 12)
  await ws(page, 'move', 'seoul:up').click(); await changeLanguage(page, 'en'); const again = await calendarDownload(page, 'world-clock-same-event-en.ics', { title, startMs, durationMinutes: 90 }); assert.equal(again.properties.UID[0], initial.properties.UID[0])
  const lengths = []; for (const durationMinutes of [30, 60, 120]) { await ws(page, 'duration').selectOption(String(durationMinutes)); const file = await calendarDownload(page, `world-clock-${durationMinutes}-minutes.ics`, { title, startMs, durationMinutes }); lengths.push({ minutes: durationMinutes, bytes: file.bytes }) }
  const persisted = await page.evaluate(() => JSON.stringify([location.href, localStorage, sessionStorage])); assert.ok(!persisted.includes(title)); assert.ok(!args.network.some(value => value.includes(title) || value.includes(encodeURIComponent(title)))); assert.ok(!args.logs.some(value => value.includes(title)))
  return { actualIcsBytes: initial.bytes, stableUidAcrossOrderAndLocale: true, allSupportedDurations: lengths, exactSecondsAndMidnight: true, titleNotPersistedOrTransmitted: true }
})
test('world-digest-failure-stale-and-end-range', async args => {
  const { page, context } = args; await observeDigest(context); await openWorld(args); let downloads = 0; page.on('download', () => downloads++)
  const actions = ['title', 'duration', 'instant', 'city', 'locale']
  for (const action of actions) {
    await ws(page, 'event-title').fill(`늦은 일정 검증 ${action}`); await page.evaluate(() => { window.__digestMode = 'hold'; window.__digests = [] }); await ws(page, 'calendar-download').click(); await poll(() => page.evaluate(() => window.__digests.length === 1), 'Digest held')
    if (action === 'title') await ws(page, 'event-title').fill('최신 일정 제목 유지')
    if (action === 'duration') await ws(page, 'duration').selectOption('120')
    if (action === 'instant') await ws(page, 'slot-city', 'seoul').nth(3).click()
    if (action === 'city') await ws(page, 'move', 'newYork:up').click()
    if (action === 'locale') await changeLanguage(page, 'en')
    await page.evaluate(() => window.__digests[0].resolve()); await wait(120); assert.equal(downloads, 0); assert.equal(await ws(page, 'calendar-status').count(), 0)
  }
  const title = await ws(page, 'event-title').inputValue(), startMs = await selected(page), durationMinutes = Number(await ws(page, 'duration').inputValue()); await page.evaluate(() => { window.__digestMode = 'reject' }); await ws(page, 'calendar-download').click(); await ws(page, 'calendar-status', 'failed').waitFor(); assert.equal(await ws(page, 'event-title').inputValue(), title); await page.evaluate(() => { window.__digestMode = 'native' }); await calendarDownload(page, 'world-clock-digest-retry.ics', { title, startMs, durationMinutes }); assert.equal(downloads, 1)
  await page.evaluate(() => { window.__digestMode = 'hold'; window.__digests = [] }); await ws(page, 'calendar-download').click(); await poll(() => page.evaluate(() => window.__digests.length === 1), 'Unmount digest held'); await spa(page, 'text-converter', 'Text Converter'); await ws(page, 'meeting').waitFor({ state: 'detached' }); await page.evaluate(() => window.__digests[0].resolve()); await wait(100); assert.equal(downloads, 1)
  await openWorld(args, ['utc'], Date.parse('9999-12-31T23:45:00Z')); await ws(page, 'event-title').fill('지원 범위 종료'); await ws(page, 'calendar-download').click(); await ws(page, 'calendar-status', 'failed').waitFor(); assert.equal(downloads, 1)
  return { staleDigestActions: [...actions, 'unmount'], staleDownloads: 0, failedDigestRetainedInputAndRetried: true, endOutOfRangeRejected: true }
})
test('world-copy-manual-and-stale', async args => {
  const { page } = args; await openWorld(args); const line = await ws(page, 'share-text').inputValue(); await ws(page, 'copy', 'line').click(); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), line)
  await clipboard(page, 'reject'); await ws(page, 'copy', 'share').click(); await ws(page, 'copy-recovery').waitFor(); await button(ws(page, 'copy-recovery'), wc('copyRecovery.selectAll')).click(); const manual = page.locator('#world-clock-copy-manual'); assert.deepEqual(await manual.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, (await manual.inputValue()).length]); await clipboard(page, 'native'); await button(ws(page, 'copy-recovery'), wc('copyRecovery.retry')).click(); await ws(page, 'copy-recovery').waitFor({ state: 'detached' })
  await clipboard(page, 'pending'); await ws(page, 'copy', 'line').click(); await poll(() => page.evaluate(() => window.__copyPending.length === 1), 'Copy pending'); await page.evaluate(() => { window.__oldCopy = window.__copyPending[0] }); await clipboard(page, 'native'); await ws(page, 'copy', 'link').click(); const latest = await page.evaluate(() => navigator.clipboard.readText()); await page.evaluate(() => window.__oldCopy.reject(new Error('Late copy rejection'))); await wait(70); assert.equal(await page.evaluate(() => window.__fallbackCalls), 0); assert.equal(await ws(page, 'copy-recovery').count(), 0); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), latest)
  await clipboard(page, 'absent'); await ws(page, 'copy', 'line').click(); await ws(page, 'copy-recovery').waitFor(); await clipboard(page, 'true'); await button(ws(page, 'copy-recovery'), wc('copyRecovery.retry')).click(); await ws(page, 'copy-recovery').waitFor({ state: 'detached' }); return { nativeTextMatchedSeconds: true, manualSelectedAll: true, nativeAndLegacyRetry: true, crossTargetOldFallbackCalls: 0 }
})
test('world-320-dark-ko-en', async args => {
  const { page } = args; await openWorld(args, ['seoul', 'newYork'], meetingFixtures.foldLate); await ws(page, 'event-title').fill('모바일 일정 제목 유지'); await clipboard(page, 'reject'); await ws(page, 'copy', 'line').click(); await ws(page, 'copy-recovery').waitFor(); const fields = [ws(page, 'date'), ws(page, 'duration'), ws(page, 'event-title'), page.locator('#world-clock-copy-manual')], controls = [ws(page, 'calendar-download'), ws(page, 'copy', 'line'), ws(page, 'move', 'newYork:up')]; const korean = await mobile(page, fields, controls); await ws(page, 'calendar').scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(out, 'world-clock-meeting-320-dark-ko.png') }); await changeLanguage(page, 'en'); assert.equal(await selected(page), meetingFixtures.foldLate); assert.equal(await ws(page, 'event-title').inputValue(), '모바일 일정 제목 유지'); assert.match(await ws(page, 'selected-city', 'newYork').innerText(), /New York/); const english = await mobile(page, [ws(page, 'date'), ws(page, 'duration'), ws(page, 'event-title')], controls); await ws(page, 'selected-ms').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -70)); await page.screenshot({ path: resolve(out, 'world-clock-selected-320-dark-en.png') }); const before = await selected(page); await wait(1100); assert.equal(await selected(page), before); return { korean, english, liveClockDidNotMoveMeeting: true, localePreservedPrivateTitleAndInstant: true }
}, { width: 320, dark: true })

const ns = (page, name, value) => page.locator(`[data-noise-${name}${value === undefined ? '' : `="${value}"`}]`)
async function noisePhase(page, phase) { await poll(async () => await ns(page, 'phase').getAttribute('data-noise-phase') === phase, `Noise phase ${phase}`) }
async function setVolume(page, value) { await ns(page, 'volume').evaluate((node, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true })) }, value) }
async function settings(page) { return { type: await page.locator('[data-noise-type][aria-pressed="true"]').getAttribute('data-noise-type'), volume: Number(await ns(page, 'volume').inputValue()), timerMinutes: Number(await page.locator('[data-noise-timer][aria-pressed="true"]').getAttribute('data-noise-timer')), fade: await ns(page, 'fade').isChecked() } }
async function applySettings(page, value) { await ns(page, 'type', value.type).click(); await setVolume(page, value.volume); await ns(page, 'timer', value.timerMinutes).click(); await ns(page, 'fade').setChecked(value.fade); assert.deepEqual(await settings(page), value) }
async function rawProfiles(page) { return page.evaluate(key => window.__profileGet ? window.__profileGet(key) : localStorage.getItem(key), profileKey) }
const profileEnvelope = (records, revision = 1) => JSON.stringify({ version: 1, revision, profiles: records })
const savedProfile = (id = 'seed', name = '저장한 빗소리') => ({ id, name, settings: { ...profileSettings } })
async function noiseStorage(context, raw) {
  await context.addInitScript(({ key, raw }) => {
    if (!/^https?:$/.test(location.protocol)) return
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem
    if (raw !== undefined && get.call(localStorage, key) === null) set.call(localStorage, key, raw)
    window.__profileGet = key => get.call(localStorage, key); window.__profileSet = value => set.call(localStorage, key, value); window.__profileStorageMode = 'native'; window.__profileReadback = false
    Storage.prototype.getItem = function(name) { if (this === localStorage && name === key) { if (window.__profileStorageMode === 'blocked') throw new DOMException('Controlled storage denial', 'SecurityError'); if (window.__profileReadback) { window.__profileReadback = false; throw new Error('Controlled readback error') } }; return get.call(this, name) }
    Storage.prototype.setItem = function(name, value) { if (this === localStorage && name === key) { if (window.__profileStorageMode === 'quota') throw new DOMException('Controlled full storage', 'QuotaExceededError'); if (window.__profileStorageMode === 'blocked') throw new DOMException('Controlled storage denial', 'SecurityError'); const result = set.call(this, name, value); if (window.__profileStorageMode === 'unconfirmed') window.__profileReadback = true; return result }; return set.call(this, name, value) }
  }, { key: profileKey, raw })
}
async function openNoise(args, raw, target = args.page) { await silentNativeAudio(args.context); await noiseStorage(args.context, raw); await args.open('white-noise', '', target); await ns(target, 'profile-name').waitFor(); await noisePhase(target, 'idle') }
async function saveProfile(page, name) { await ns(page, 'profile-name').fill(name); await ns(page, 'profile-save').locator('button[type="submit"]').click(); await poll(async () => await ns(page, 'profile-name').inputValue() === '', 'Profile save success') }
async function loadProfile(page, id) { await ns(page, 'profile-select').selectOption(id); await ns(page, 'profile-load').click(); await ns(page, 'profile-confirm', 'load').click() }
async function holdProfileLock(page) { await page.evaluate(key => { window.__profileLockHeld = false; void navigator.locks.request(key, () => new Promise(resolve => { window.__releaseProfileLock = resolve; window.__profileLockHeld = true })) }, profileKey); await poll(() => page.evaluate(() => window.__profileLockHeld), 'Real profile Web Lock held') }
async function releaseProfileLock(page) { await page.evaluate(() => { window.__releaseProfileLock(); window.__profileLockHeld = false }); await wait(100) }

test('noise-native-silent-deadline-and-settings', async args => {
  const { page } = args; await openNoise(args); assert.equal(await page.evaluate(() => window.__audio.length), 0); await ns(page, 'timer', 5).click(); await ns(page, 'play').click(); await noisePhase(page, 'playing'); const deadline = Number(await ns(page, 'deadline').getAttribute('data-noise-deadline'))
  await page.evaluate(() => { window.__audioWallShift += 97000; dispatchEvent(new Event('pageshow')) }); await poll(async () => Number(await ns(page, 'remaining').getAttribute('data-noise-remaining')) <= 203000, 'Delayed wall clock catches up'); await ns(page, 'type', 'wind').click(); await noisePhase(page, 'playing'); await setVolume(page, 0); assert.equal(await ns(page, 'deadline').getAttribute('data-noise-deadline'), String(deadline)); assert.equal(await ns(page, 'status').innerText(), wn('playback.muted')); const contextCount = await page.evaluate(() => window.__audio.length); await ns(page, 'timer', 5).click(); assert.equal(await page.evaluate(() => window.__audio.length), contextCount); assert.equal(await ns(page, 'deadline').getAttribute('data-noise-deadline'), String(deadline))
  await ns(page, 'timer', 10).click(); await noisePhase(page, 'playing'); const newDeadline = Number(await ns(page, 'deadline').getAttribute('data-noise-deadline')), wall = await page.evaluate(() => Date.now()); assert.ok(newDeadline - wall > 595000 && newDeadline - wall <= 600000); await ns(page, 'timer', 0).click(); await noisePhase(page, 'playing'); assert.equal(await ns(page, 'deadline').getAttribute('data-noise-deadline'), ''); const lastId = await page.evaluate(() => window.__audio.at(-1).id); assert.equal(await page.evaluate(id => window.__audioEvents.filter(event => event.id === id && event.kind === 'source:stop').length, lastId), 0); await ns(page, 'play').click(); await noisePhase(page, 'idle'); assert.ok(await page.evaluate(() => window.__audio.every(record => record.context.state === 'closed' && record.sink.gain.value === 0))); return { nativeContexts: await page.evaluate(() => window.__audio.length), noMountAutoplay: true, delayedTickCaughtUp: true, originalDeadlinePreservedByTypeVolumeSameTimer: true, changedTimerRestartsFromNow: true, unlimitedHasNoScheduledStop: true, physicalOutputMuted: true }
})
test('noise-mute-before-resume-expiry-and-stale', async args => {
  const { page } = args; await openNoise(args); await ns(page, 'timer', 5).click(); await ns(page, 'play').click(); await noisePhase(page, 'playing'); await page.evaluate(() => window.__audio.at(-1).context.suspend()); await noisePhase(page, 'suspended'); await page.evaluate(() => { window.__audioResumeMode = 'hold'; window.__audioEvents = []; window.__audioPending = [] }); await ns(page, 'play').click(); await noisePhase(page, 'preparing'); await poll(() => page.evaluate(() => window.__audioPending.length === 1), 'Native resume completion held')
  await setVolume(page, 70); await ns(page, 'fade').check(); await page.evaluate(() => window.__audio.at(-1).context.dispatchEvent(new Event('statechange'))); const events = await page.evaluate(() => window.__audioEvents); const resumeIndex = events.findIndex(event => event.kind === 'resume'); assert.ok(resumeIndex > 0); assert.ok(events.slice(0, resumeIndex).some(event => event.kind === 'setValueAtTime' && event.values[0] === 0)); assert.ok(events.slice(resumeIndex).filter(event => event.kind === 'setValueAtTime').every(event => event.values[0] === 0)); assert.ok(await page.evaluate(() => window.__audio.at(-1).gains.every(gain => gain.gain.value === 0))); await page.evaluate(() => window.__audioPending[0].resolve()); await noisePhase(page, 'playing'); assert.ok(await page.evaluate(() => window.__audio.at(-1).gains.some(gain => Math.abs(gain.gain.value - 0.7) < 0.001)))
  await page.evaluate(() => window.__audio.at(-1).context.suspend()); await noisePhase(page, 'suspended'); await page.evaluate(() => { window.__audioPending = []; window.__audioEvents = [] }); await ns(page, 'play').click(); await poll(() => page.evaluate(() => window.__audioPending.length === 1), 'Expiry resume held'); await page.evaluate(() => { window.__audioWallShift += 301000; dispatchEvent(new Event('pageshow')) }); await noisePhase(page, 'idle'); await page.evaluate(() => window.__audioPending[0].resolve()); await wait(80); assert.equal(await ns(page, 'phase').getAttribute('data-noise-phase'), 'idle'); assert.ok(await page.evaluate(() => window.__audio.at(-1).context.state === 'closed')); assert.ok((await page.evaluate(() => window.__audioEvents)).filter(event => event.kind === 'setValueAtTime').every(event => event.values[0] === 0))
  await page.evaluate(() => { window.__audioResumeMode = 'reject' }); await ns(page, 'play').click(); await noisePhase(page, 'error'); await page.evaluate(() => { window.__audioResumeMode = 'hold'; window.__audioPending = [] }); await ns(page, 'play').click(); await poll(() => page.evaluate(() => window.__audioPending.length === 1), 'New start held'); await ns(page, 'play').click(); await noisePhase(page, 'idle'); await page.evaluate(() => { window.__audioResumeMode = 'native' }); await ns(page, 'play').click(); await noisePhase(page, 'playing'); const generation = await ns(page, 'generation').getAttribute('data-noise-generation'); await page.evaluate(() => { window.__audioPending[0].reject(new Error('Old resume rejection')); for (const record of window.__audio.slice(0, -1)) for (const source of record.sources) source.dispatchEvent(new Event('ended')) }); await wait(80); assert.equal(await ns(page, 'generation').getAttribute('data-noise-generation'), generation); await noisePhase(page, 'playing'); await ns(page, 'play').click(); await noisePhase(page, 'idle')
  await page.evaluate(() => { window.__audioResumeMode = 'hold'; window.__audioPending = [] }); await ns(page, 'play').click(); await poll(() => page.evaluate(() => window.__audioPending.length === 1), 'Hung preparation held'); await noisePhase(page, 'error'); await page.locator('[data-white-noise-player]').getByText(wn('playback.errors.prepareTimeout'), { exact: true }).waitFor(); await page.evaluate(() => window.__audioPending[0].resolve()); await wait(60); assert.equal(await ns(page, 'phase').getAttribute('data-noise-phase'), 'error'); return { preparationTimeoutAndLateResolveProtected: true, mutePrecededNativeResume: true, preparingGainStayedZero: true, latestGainRestoredOnlyAfterCurrentResolve: true, expiredDelayedResumeStayedMutedAndClosed: true, resumeRejectionVisible: true, oldRejectEndedIgnored: true, nativeAudioWithMutedSink: true }
})
test('noise-offline-native-waveforms', async args => { await openNoise(args); assert.equal(await args.page.evaluate(() => window.__audio.length), 0); return offlineProductWaveforms(args.page) })
test('noise-profile-crud-revisit-no-autoplay', async args => {
  const { page } = args; await openNoise(args); await applySettings(page, profileSettings); const name = '설'.repeat(40); await saveProfile(page, name); let raw = JSON.parse(await rawProfiles(page)); assert.deepEqual(Object.keys(raw).sort(), ['profiles', 'revision', 'version']); assert.deepEqual(raw.profiles[0].settings, profileSettings); assert.deepEqual(Object.keys(raw.profiles[0]).sort(), ['id', 'name', 'settings']); const id = raw.profiles[0].id
  await args.open('white-noise'); await noisePhase(page, 'idle'); assert.deepEqual(await settings(page), { type: 'white', volume: 50, timerMinutes: 0, fade: false }); assert.equal(await page.evaluate(() => window.__audio.length), 0); await ns(page, 'play').click(); await noisePhase(page, 'playing'); await loadProfile(page, id); await noisePhase(page, 'idle'); assert.deepEqual(await settings(page), profileSettings); assert.ok(await page.evaluate(() => window.__audio.every(record => record.context.state === 'closed')))
  await ns(page, 'profile-rename').fill('이름을 바꾼 빗소리'); await ns(page, 'profile-rename-save').click(); await poll(async () => JSON.parse(await rawProfiles(page)).profiles[0].name === '이름을 바꾼 빗소리', 'Rename saved'); const before = await settings(page); await ns(page, 'profile-name').fill('이름을 바꾼 빗소리'); await ns(page, 'profile-save').locator('button').click(); await page.locator('[data-white-noise-profiles]').getByText(wn('profiles.errors.duplicateName'), { exact: true }).waitFor(); assert.equal(JSON.parse(await rawProfiles(page)).profiles.length, 1); await ns(page, 'profile-delete').click(); await ns(page, 'profile-confirm', 'delete').click(); await poll(async () => JSON.parse(await rawProfiles(page)).profiles.length === 0, 'Delete saved'); assert.deepEqual(await settings(page), before)
  for (let index = 0; index < 6; index++) await saveProfile(page, `설정 ${index + 1}`); await ns(page, 'profile-name').fill('일곱 번째'); assert.ok(await ns(page, 'profile-save').locator('button').isDisabled()); assert.equal(JSON.parse(await rawProfiles(page)).profiles.length, 6); return { schemaContainsSettingsOnly: true, fortyCharacterName: true, sixProfileLimit: true, revisitDidNotApplyOrPlay: true, loadStoppedAudioBeforeSettingsOnly: true, renameDeletePreservedCurrentSettings: true }
})
test('noise-profile-corrupt-quota-and-readback', async args => {
  const { page } = args; await openNoise(args, '{broken'); const panel = page.locator('[data-white-noise-profiles]'); await panel.getByText(wn('profiles.errors.corrupt'), { exact: true }).waitFor(); assert.equal(await rawProfiles(page), '{broken'); await page.evaluate(() => window.__profileSet('{"version":2}')); await ns(page, 'profile-reload').click(); await panel.getByText(wn('profiles.errors.unsupported'), { exact: true }).waitFor(); assert.equal(await rawProfiles(page), '{"version":2}')
  await page.evaluate(raw => window.__profileSet(raw), profileEnvelope([savedProfile()])); await ns(page, 'profile-reload').click(); const original = await rawProfiles(page); await ns(page, 'profile-name').fill('실패 뒤 유지할 이름'); await page.evaluate(() => { window.__profileStorageMode = 'quota' }); await ns(page, 'profile-save').locator('button').click(); await panel.getByText(wn('profiles.errors.quota'), { exact: true }).waitFor(); assert.equal(await rawProfiles(page), original); assert.equal(await ns(page, 'profile-name').inputValue(), '실패 뒤 유지할 이름')
  await page.evaluate(() => { window.__profileStorageMode = 'blocked' }); await ns(page, 'profile-reload').click(); await panel.getByText(wn('profiles.errors.unavailable'), { exact: true }).waitFor(); assert.equal(await rawProfiles(page), original); await page.evaluate(() => { window.__profileStorageMode = 'native' }); await ns(page, 'profile-reload').click(); await page.evaluate(() => { window.__profileStorageMode = 'unconfirmed' }); await ns(page, 'profile-save').locator('button').click(); await panel.getByText(wn('profiles.errors.unconfirmed'), { exact: true }).waitFor(); assert.equal(JSON.parse(await rawProfiles(page)).profiles.length, 2); assert.equal(await ns(page, 'profile-name').inputValue(), '실패 뒤 유지할 이름'); await page.evaluate(() => { window.__profileStorageMode = 'native' }); await ns(page, 'profile-reload').click(); assert.equal(await ns(page, 'profile-select').locator('option').count(), 3)
  return { malformedFutureRawPreserved: true, quotaNameAndListPreserved: true, blockedReadRecoverable: true, actualWriteButReadbackUnknownNotRolledBack: true, explicitReloadRecoveredList: true }
})
test('noise-two-tabs-and-real-lock-cancellation', async args => {
  const { page, context } = args; await openNoise(args, profileEnvelope([savedProfile()])); const other = await context.newPage(); await args.open('white-noise', '', other); await ns(other, 'profile-name').fill('다른 탭 입력'); await saveProfile(page, '첫 탭 추가'); await other.locator('[data-white-noise-profiles]').getByText(wn('profiles.errors.conflict'), { exact: true }).waitFor(); assert.ok(await ns(other, 'profile-save').locator('button').isDisabled()); await ns(other, 'profile-reload').click(); await saveProfile(other, '다른 탭 입력'); await page.locator('[data-white-noise-profiles]').getByText(wn('profiles.errors.conflict'), { exact: true }).waitFor(); await ns(page, 'profile-reload').click(); assert.equal(JSON.parse(await rawProfiles(page)).profiles.length, 3)
  for (const action of ['edit', 'cancel', 'storage']) {
    await holdProfileLock(page); await loadProfile(page, 'seed'); await ns(page, 'profile-cancel').waitFor(); const before = await settings(page)
    if (action === 'edit') await setVolume(page, 63)
    if (action === 'cancel') await ns(page, 'profile-cancel').click()
    if (action === 'storage') await other.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)); data.revision++; localStorage.setItem(key, JSON.stringify(data)) }, profileKey)
    await releaseProfileLock(page); assert.deepEqual(await settings(page), action === 'edit' ? { ...before, volume: 63 } : before); await ns(page, 'profile-reload').click()
  }
  await loadProfile(page, 'seed'); await poll(async () => (await settings(page)).type === 'rain', 'Fresh explicit load'); assert.deepEqual(await settings(page), profileSettings); assert.equal(await page.evaluate(() => window.__audio.length), 0)
  await holdProfileLock(page); await ns(page, 'profile-name').fill('이탈 중 저장 금지'); await ns(page, 'profile-save').locator('button').click(); await ns(page, 'profile-cancel').waitFor(); const prior = await rawProfiles(page); await spa(page, 'text-converter'); await releaseProfileLock(page); assert.equal(await rawProfiles(page), prior); await other.close(); return { realTwoTabStorageEventsAndCas: true, nativeWebLock: true, queuedLoadInvalidatedByEditCancelStorage: true, freshLoadWorkedWithoutAutoplay: true, unmountedQueuedSaveDidNotWrite: true }
})
test('noise-320-dark-ko-en-and-cleanup', async args => {
  const { page } = args; await openNoise(args, profileEnvelope([savedProfile()])); await ns(page, 'profile-select').selectOption('seed'); await ns(page, 'profile-name').fill('모바일 설정'); await setVolume(page, 0); await ns(page, 'timer', 5).click(); await ns(page, 'play').click(); await noisePhase(page, 'playing'); const generation = await ns(page, 'generation').getAttribute('data-noise-generation'), count = await page.evaluate(() => window.__audio.length); const fields = [ns(page, 'profile-name'), ns(page, 'profile-select'), ns(page, 'profile-rename')], controls = [ns(page, 'play'), ns(page, 'type', 'rain'), ns(page, 'timer', 5), ns(page, 'profile-load')]; const korean = await mobile(page, fields, controls); await screenshot(page, 'white-noise-320-dark-ko'); await changeLanguage(page, 'en'); await ns(page, 'status').getByText(wn('playback.muted', 'en'), { exact: true }).waitFor(); assert.equal(await ns(page, 'generation').getAttribute('data-noise-generation'), generation); assert.equal(await page.evaluate(() => window.__audio.length), count); assert.equal(await ns(page, 'profile-name').inputValue(), '모바일 설정'); const english = await mobile(page, fields, controls); await page.locator('[data-white-noise-profiles]').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -70)); await page.screenshot({ path: resolve(out, 'white-noise-profiles-320-dark-en.png') }); await spa(page, 'text-converter', 'Text Converter'); await page.locator('[data-white-noise-player]').waitFor({ state: 'detached' }); await poll(() => page.evaluate(() => window.__audio.every(record => record.context.state === 'closed')), 'Unmount cleanup and native close completed'); return { korean, english, localeKeptPlayingGenerationAndSettings: true, unmountClosedAllNativeContexts: true, physicalOutputMuted: true }
}, { width: 320, dark: true })

const planned = [
  'world-exact-seconds-url-order-and-safe-input', 'world-dst-fold-spring-slots', 'world-half-hour-kathmandu-work-intersection',
  'world-ics-native-download-exact-bytes', 'world-digest-failure-stale-and-end-range', 'world-copy-manual-and-stale', 'world-320-dark-ko-en',
  'noise-native-silent-deadline-and-settings', 'noise-mute-before-resume-expiry-and-stale', 'noise-offline-native-waveforms',
  'noise-profile-crud-revisit-no-autoplay', 'noise-profile-corrupt-quota-and-readback', 'noise-two-tabs-and-real-lock-cancellation', 'noise-320-dark-ko-en-and-cleanup',
]
// Final parent selectors and author/translation readiness must be confirmed
// before enabling execution. Listing the planned boundaries never opens Chrome.
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Batch27 parent final readiness/selector wiring is pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part)))
  assert.ok(selected.length, 'No selected verification cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome', args: ['--mute-audio'] })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}






