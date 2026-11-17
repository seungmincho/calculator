import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch30/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const pomo = (key, language = 'ko', values = {}) => tr('pomodoroTimer', key, language, values)
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
    if (!localStorage.getItem('__batch30Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch30Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:pomodoroTimer)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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


const pomoKeys = { settings: 'pomodoro-settings', tasks: 'pomodoro-tasks', timer: 'pomodoro-timer-state', stats: 'pomodoro-daily-stats', goal: 'pomodoro-daily-goal.v1' }
const clockOrigin = new Date('2026-11-17T09:00:00+09:00').getTime()
const settingsFixture = { workDuration: 1, shortBreakDuration: 1, longBreakDuration: 1, longBreakInterval: 4, autoStart: false, notificationsEnabled: false, soundEnabled: false, soundVolume: 70 }
const legacyTimer = (patch = {}) => ({ phase: 'work', timeLeft: 60, isRunning: false, currentRound: 1, completedRounds: 0, totalWorkSeconds: 0, lastTickTime: clockOrigin, settings: settingsFixture, ...patch })
async function observePomodoroPorts(context, storage = {}, notifications = 'granted') {
  await context.addInitScript(({ storage, notifications, clockOrigin }) => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__pomo30Fixture')) { for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); localStorage.setItem('__pomo30Fixture', '1') }
    const NativeDate = Date, nativeSet = setInterval.bind(window), nativeClear = clearInterval.bind(window), nativeWrite = Storage.prototype.setItem
    window.__pomoClock = { wall: Number(sessionStorage.getItem('__pomo30Wall') ?? clockOrigin), mono: 1000 }; window.__pomoIntervals = []; window.__pomoWrites = []; window.__pomoAlarms = []; window.__pomoNotifications = []; window.__pomoPermissionRequests = 0; window.__pomoPermission = notifications
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [window.__pomoClock.wall])) }; static now() { return Math.trunc(window.__pomoClock.wall) } }
    Object.defineProperty(performance, 'now', { configurable: true, value: () => window.__pomoClock.mono })
    window.setInterval = (callback, duration, ...args) => { if (duration !== 250) return nativeSet(callback, duration, ...args); const item = { active: true, callback: () => callback(...args), id: null }; const id = nativeSet(() => {}, duration); item.id = id; window.__pomoIntervals.push(item); return id }
    window.clearInterval = id => { const item = window.__pomoIntervals.findLast(item => item.id === id); if (item) item.active = false; return nativeClear(id) }
    window.__pomoTick = () => { for (const item of window.__pomoIntervals.filter(item => item.active)) item.callback() }
    window.__pomoAdvance = (wall, mono = wall, fire = true) => { window.__pomoClock.wall += wall; window.__pomoClock.mono += mono; nativeWrite.call(sessionStorage, '__pomo30Wall', String(window.__pomoClock.wall)); if (fire) window.__pomoTick() }
    Storage.prototype.setItem = function(key, value) { if (key.startsWith('pomodoro-')) window.__pomoWrites.push({ key, value: String(value), at: Date.now() }); return nativeWrite.call(this, key, value) }
    window.Notification = class extends EventTarget { static get permission() { return window.__pomoPermission }; static requestPermission() { window.__pomoPermissionRequests++; window.__pomoPermission = 'granted'; return Promise.resolve('granted') }; constructor(title, options) { super(); window.__pomoNotifications.push({ title, options }); this.close = () => {} } }
    window.AudioContext = class { constructor() { this.currentTime = 0; this.destination = {}; this.record = { oscillators: 0, closed: false }; window.__pomoAlarms.push(this.record) }; createOscillator() { this.record.oscillators++; return { frequency: { value: 0 }, connect() {}, start() {}, stop() {} } }; createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }; close() { this.record.closed = true; return Promise.resolve() } }
  }, { storage, notifications, clockOrigin })
}
async function advancePomodoro(page, wallMs, monoMs = wallMs, fire = true) { await page.evaluate(({ wallMs, monoMs, fire }) => window.__pomoAdvance(wallMs, monoMs, fire), { wallMs, monoMs, fire }); await wait(30) }
async function pomodoroSideEffects(page) { return page.evaluate(() => ({ alarms: window.__pomoAlarms, notifications: window.__pomoNotifications, permissionRequests: window.__pomoPermissionRequests, writes: window.__pomoWrites, stats: localStorage.getItem('pomodoro-daily-stats'), tasks: localStorage.getItem('pomodoro-tasks'), timer: localStorage.getItem('pomodoro-timer-state') })) }
async function timerSnapshot(page) { return page.locator('[data-pomodoro-timer]').evaluate(node => ({ phase: node.dataset.phase, running: node.dataset.running === 'true', remaining: Number(node.dataset.remainingMs), id: node.dataset.phaseId, notice: node.dataset.notice, text: node.textContent })) }
async function expectTimer(page, wanted) { await poll(async () => { const value = await timerSnapshot(page); return Object.entries(wanted).every(([key, wanted]) => value[key] === wanted) }, `timer ${JSON.stringify(wanted)}`); return timerSnapshot(page) }
async function checkpointSettled(page) { await poll(async () => !await page.getByRole('button', { name: pomo('reliability.cancelPending'), exact: true }).count(), 'storage checkpoint settled') }
async function bootPomo(context, open, storage = {}, settings = settingsFixture) { await observePomodoroPorts(context, { [pomoKeys.settings]: settings, [pomoKeys.timer]: legacyTimer({ settings }), ...storage }); await open('pomodoro') }
async function readStored(page, kind) { return page.evaluate(key => { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw) }, pomoKeys[kind]) }
async function holdTimerLock(page) { await page.evaluate(() => { window.__pomoLockAcquired = false; window.__pomoLockDone = navigator.locks.request('pomodoro-timer-state', () => new Promise(resolve => { window.__pomoUnlock = resolve; window.__pomoLockAcquired = true })) }); await poll(() => page.evaluate(() => window.__pomoLockAcquired), 'native timer lock acquired') }
async function releaseTimerLock(page) { await page.evaluate(() => window.__pomoUnlock()); await page.evaluate(() => window.__pomoLockDone) }
async function reloadStore(page, kind) { await page.locator(`[data-pomodoro-reload="${kind}"]`).click(); await page.locator('[data-pomodoro-confirm="reload"]').click(); await checkpointSettled(page) }
const testTask = { id: 'browser-task', text: '합성 검증 집중 과제', completed: false, estimatedPomodoros: 3, completedPomodoros: 0 }

test('pomodoro-exact-ms-fractional-pause-and-checkpoints', async ({ page, context, open }) => {
  const raw = JSON.stringify(legacyTimer()); await bootPomo(context, open)
  await expectTimer(page, { remaining: 60000, running: false }); assert.equal((await pomodoroSideEffects(page)).timer, raw)
  assert.equal((await pomodoroSideEffects(page)).writes.filter(row => row.key === pomoKeys.timer).length, 0)
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  const writes = (await pomodoroSideEffects(page)).writes.filter(row => row.key === pomoKeys.timer).length
  await advancePomodoro(page, 1400); await expectTimer(page, { remaining: 58600, running: true })
  await advancePomodoro(page, 125.5, 125.5, false); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  const paused = await expectTimer(page, { remaining: 58474.5, running: false }); assert.match(paused.text, /00:59/)
  const stored = await readStored(page, 'timer'); assert.equal(stored.remainingMs, 58474.5); assert.equal(stored.timeLeft, 59); assert.equal(stored.version, 1)
  await advancePomodoro(page, 30000); await expectTimer(page, { remaining: 58474.5, running: false })
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  const resumedWrites = (await pomodoroSideEffects(page)).writes.length
  for (const interval of [137.25, 112.75, 444.4, 555.6]) await advancePomodoro(page, interval)
  await expectTimer(page, { remaining: 57224.5, running: true }); assert.equal((await pomodoroSideEffects(page)).writes.length, resumedWrites, 'no tick storage write')
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide'))); await checkpointSettled(page)
  assert.equal((await readStored(page, 'timer')).remainingMs, 57224.5)
  return { exactPausedMs: paused.remaining, displayCeilSeconds: stored.timeLeft, checkpointVersion: stored.version, startWrites: writes, tickWrites: 0, pagehideMs: 57224.5 }
})

test('pomodoro-complete-once-skip-reset-and-auto-start', async ({ page, context, open }) => {
  const settings = { ...settingsFixture, soundEnabled: true, notificationsEnabled: true, autoStart: true }
  await bootPomo(context, open, { [pomoKeys.tasks]: [testTask] }, settings)
  await button(page, testTask.text).click(); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await page.evaluate(() => { window.__oldPomoTick = window.__pomoIntervals.findLast(item => item.active).callback })
  await advancePomodoro(page, 60000); await expectTimer(page, { phase: 'shortBreak', running: true, remaining: 60000 }); await checkpointSettled(page)
  await poll(async () => (await readStored(page, 'stats'))?.[0]?.count === 1, 'first work stat persisted')
  assert.equal((await readStored(page, 'tasks'))[0].completedPomodoros, 1)
  await page.evaluate(() => { for (let i = 0; i < 4; i++) window.__oldPomoTick(); dispatchEvent(new PageTransitionEvent('pageshow')) }); await wait(60)
  let effects = await pomodoroSideEffects(page); assert.equal(effects.alarms.length, 1); assert.equal(effects.alarms[0].oscillators, 3); assert.equal(effects.notifications.length, 1); assert.equal(effects.permissionRequests, 0)
  await advancePomodoro(page, 60000); await expectTimer(page, { phase: 'work', running: true }); await checkpointSettled(page)
  assert.equal((await readStored(page, 'stats'))[0].count, 1); assert.equal((await readStored(page, 'tasks'))[0].completedPomodoros, 1)
  await button(page, pomo('skip')).click(); await expectTimer(page, { phase: 'shortBreak' }); await checkpointSettled(page)
  effects = await pomodoroSideEffects(page); assert.equal(effects.notifications.length, 2); assert.equal(effects.alarms.length, 3, 'normal skip retains existing sound policy')
  assert.equal((await readStored(page, 'timer')).completedRounds, 1); assert.equal((await readStored(page, 'stats'))[0].count, 1)
  await button(page, pomo('resetAll')).click(); await expectTimer(page, { phase: 'work', remaining: 60000, running: false }); await checkpointSettled(page)
  assert.equal((await readStored(page, 'timer')).completedRounds, 0); assert.equal((await readStored(page, 'stats'))[0].count, 1)
  return { workCredits: 1, taskCredits: 1, completionNotifications: 2, alarmContextsIncludingSkip: 3, actualOsNotifications: 0, actualAudioOutput: 0, staleTicks: 4 }
})

test('pomodoro-wall-mono-gap-conservative-pause', async ({ page, context, open }) => {
  await bootPomo(context, open); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await advancePomodoro(page, 2000, 0); await expectTimer(page, { running: true, remaining: 60000 })
  await advancePomodoro(page, 1, 0); await expectTimer(page, { running: false, remaining: 57999, notice: 'clockChanged' }); await checkpointSettled(page)
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await advancePomodoro(page, -3000, 1000); await expectTimer(page, { running: false, remaining: 56999, notice: 'clockChanged' }); await checkpointSettled(page)
  await button(page, pomo('resetPhase')).click(); await checkpointSettled(page); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await advancePomodoro(page, 70000, 100); await expectTimer(page, { running: false, remaining: 0, notice: 'clockGapExpired' }); await checkpointSettled(page)
  let effects = await pomodoroSideEffects(page); assert.equal(effects.stats, null); assert.equal(effects.alarms.length + effects.notifications.length, 0)
  await page.locator('[data-pomodoro-toggle]').click(); await expectTimer(page, { phase: 'shortBreak', running: true, remaining: 60000 }); await checkpointSettled(page)
  assert.equal((await readStored(page, 'timer')).completedRounds, 0)
  await page.locator('[data-pomodoro-phase="work"]').click(); await checkpointSettled(page); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await advancePomodoro(page, 180000, 180000); await expectTimer(page, { phase: 'shortBreak', running: false, remaining: 60000 }); await checkpointSettled(page)
  await poll(async () => (await readStored(page, 'stats'))?.[0]?.count === 1, 'one normal late completion')
  effects = await pomodoroSideEffects(page)
  return { toleratedDivergenceMs: 2000, divergenceAt2001: 'paused', rollbackMsPreserved: 56999, wallOnlyExpiryCredits: 0, normalBothClock180SecondsCredits: JSON.parse(effects.stats)[0].count }
})

test('pomodoro-legacy-revisit-expired-without-credit', async ({ page, context, open }) => {
  const legacy = legacyTimer({ timeLeft: 3, isRunning: true, lastTickTime: clockOrigin - 5000 }); const raw = JSON.stringify(legacy)
  await bootPomo(context, open, { [pomoKeys.timer]: raw, [pomoKeys.tasks]: [testTask] })
  await expectTimer(page, { notice: 'restoredExpired', remaining: 0, running: false }); assert.equal((await pomodoroSideEffects(page)).timer, raw)
  await button(page, testTask.text).click(); await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow')))
  assert.equal((await readStored(page, 'tasks'))[0].completedPomodoros, 0); assert.equal((await readStored(page, 'stats')), null)
  await page.locator('[data-pomodoro-toggle]').click(); await expectTimer(page, { phase: 'shortBreak', running: true, remaining: 60000 }); await checkpointSettled(page)
  assert.equal((await readStored(page, 'timer')).version, 1)
  await advancePomodoro(page, 1234, 1234, false); await page.reload({ waitUntil: 'domcontentloaded' }); await expectTimer(page, { phase: 'shortBreak', running: true, remaining: 58766 })
  await advancePomodoro(page, 60000, 60000, false); await page.reload({ waitUntil: 'domcontentloaded' }); await expectTimer(page, { phase: 'shortBreak', running: false, remaining: 0, notice: 'restoredExpired' })
  const effects = await pomodoroSideEffects(page); assert.equal(effects.stats, null); assert.equal(effects.notifications.length + effects.alarms.length, 0)
  return { legacyReadBytesPreserved: true, runningReloadRemainingMs: 58766, expiredReloadCredits: 0, notifications: 0, sound: 0, normalCheckpointUpgrade: 1 }
})

test('pomodoro-native-lock-delayed-approval-and-cancel', async ({ page, context, open }) => {
  const settings = { ...settingsFixture, autoStart: true }; await bootPomo(context, open, {}, settings)
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page); await holdTimerLock(page)
  await advancePomodoro(page, 60000); await expectTimer(page, { phase: 'work', remaining: 0, running: false }); await poll(async () => await button(page, pomo('reliability.cancelPending')).count() > 0, 'completion waits for native lock')
  await advancePomodoro(page, 90000); assert.equal(await readStored(page, 'stats'), null)
  const approvalAt = await page.evaluate(() => Date.now()); await releaseTimerLock(page)
  await expectTimer(page, { phase: 'shortBreak', remaining: 60000, running: true }); await checkpointSettled(page)
  assert.equal((await readStored(page, 'timer')).lastTickTime, approvalAt)
  await poll(async () => (await readStored(page, 'stats'))?.[0]?.count === 1, 'approval credit')
  await page.locator('[data-pomodoro-phase="work"]').click(); await checkpointSettled(page); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await holdTimerLock(page); await advancePomodoro(page, 60000)
  await button(page, pomo('reliability.cancelPending')).click(); await expectTimer(page, { notice: 'restoredExpired', running: false }); await releaseTimerLock(page); await wait(80)
  assert.equal((await readStored(page, 'stats'))[0].count, 1)
  await button(page, pomo('resetPhase')).click(); await checkpointSettled(page)
  // Native lock/write still run; only delivery of its receipt is delayed.
  await page.evaluate(() => { const original = navigator.locks.request.bind(navigator.locks); navigator.locks.request = (...args) => original(...args).then(value => value?.decision === 'allow' && !window.__receiptHeld ? new Promise(resolve => { window.__receiptHeld = true; window.__receiptValue = value; window.__deliverReceipt = () => resolve(value) }) : value) })
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page); await advancePomodoro(page, 60000)
  await poll(() => page.evaluate(() => !!window.__receiptHeld), 'native completion receipt held')
  const receipt = await page.evaluate(() => window.__receiptValue); const persisted = await readStored(page, 'timer'); assert.equal(persisted.lastTickTime, receipt.startedAt.wallMs)
  await advancePomodoro(page, 1250, 1250, false); await page.evaluate(() => window.__deliverReceipt()); await expectTimer(page, { phase: 'shortBreak', running: true, remaining: 58750 }); await checkpointSettled(page)
  await poll(async () => (await readStored(page, 'stats'))?.[0]?.count === 2, 'receipt second credit')
  return { nativeWebLocks: true, approvalWaitMs: 90000, nextStartedAt: approvalAt, canceledCompletionCredit: 0, delayedReceiptMs: 1250, delayedReceiptRemainingMs: 58750, totalValidCredits: 2 }
})

test('pomodoro-corrupt-storage-unknown-write-and-two-tabs', async ({ page, context, open }) => {
  const corrupt = { settings: '{broken settings', tasks: '[{"id":"unchanged"}]', timer: '{"version":9,"private":"synthetic"}' }
  await bootPomo(context, open, Object.fromEntries(Object.entries(corrupt).map(([key, raw]) => [pomoKeys[key], raw])))
  for (const [kind, status] of [['settings','corrupt'], ['tasks','corrupt'], ['timer','unsupported']]) { assert.equal(await page.locator(`[data-pomodoro-store="${kind}"]`).getAttribute('data-store-status'), status); assert.equal(await page.evaluate(key => localStorage.getItem(key), pomoKeys[kind]), corrupt[kind]) }
  await page.locator('[data-pomodoro-toggle]').click(); await advancePomodoro(page, 1000); assert.equal(await page.evaluate(key => localStorage.getItem(key), pomoKeys.timer), corrupt.timer)
  await page.locator('[data-pomodoro-discard="timer"]').click(); await page.locator('[data-pomodoro-confirm="discard"]').click(); await checkpointSettled(page); assert.equal(await readStored(page, 'timer'), null)
  for (const kind of ['settings','tasks']) assert.equal(await page.evaluate(key => localStorage.getItem(key), pomoKeys[kind]), corrupt[kind])
  // Inject native Storage quota then a successful write with unreadable confirmation.
  await page.evaluate(() => { const set = Storage.prototype.setItem, get = Storage.prototype.getItem; window.__pomoFault = 'quota'; window.__pomoWritten = false; Storage.prototype.setItem = function(key, value) { if (key === 'pomodoro-timer-state') { if (window.__pomoFault === 'quota') throw new DOMException('fixture quota','QuotaExceededError'); window.__pomoWritten = true }; return set.call(this,key,value) }; Storage.prototype.getItem = function(key) { if (key === 'pomodoro-timer-state' && window.__pomoFault === 'readback' && window.__pomoWritten) throw new DOMException('fixture readback','SecurityError'); return get.call(this,key) } })
  await page.locator('[data-pomodoro-toggle]').click(); await poll(async () => await page.locator('[data-pomodoro-store="timer"]').getAttribute('data-store-status') === 'quota', 'quota'); await expectTimer(page,{running:true})
  await page.evaluate(() => { window.__pomoFault = 'readback'; window.__pomoWritten = false }); await page.locator('[data-pomodoro-toggle]').click()
  await poll(async () => await page.locator('[data-pomodoro-store="timer"]').getAttribute('data-store-status') === 'unconfirmed', 'unknown write'); await expectTimer(page, { running:false, notice:'unconfirmed' })
  await page.evaluate(() => { window.__pomoFault = 'none' }); await reloadStore(page,'timer'); await expectTimer(page,{running:false,notice:''})
  const other = await context.newPage(); await open('pomodoro','',other); await other.evaluate(wall => { window.__pomoClock.wall = wall }, await page.evaluate(() => Date.now()))
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page)
  await poll(async () => await other.locator('[data-pomodoro-store="timer"]').getAttribute('data-store-status') === 'conflict', 'real second tab storage event')
  await reloadStore(other,'timer'); await expectTimer(other,{running:true}); await other.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(other)
  await poll(async () => await page.locator('[data-pomodoro-store="timer"]').getAttribute('data-store-status') === 'conflict', 'first tab receives newer checkpoint')
  await expectTimer(page,{running:false,notice:'conflict'}); assert.equal(await readStored(page,'stats'),null)
  return { strictOriginalKeysPreserved: 3, explicitDiscardOnlyTimer: true, quotaMemoryTimer: true, readbackUnknownStops: true, nativeTwoTabStorageEvents: true, conflictCredits: 0 }
})

test('pomodoro-existing-goal-task-and-real-csv', async ({ page, context, open }) => {
  const stats = [{date:'2026-11-16',count:2,minutes:50},{date:'2026-11-17',count:1,minutes:25}]
  await bootPomo(context, open, { [pomoKeys.stats]:stats, [pomoKeys.tasks]:[testTask] }); await button(page,testTask.text).click(); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page); await advancePomodoro(page,1250)
  const before = await timerSnapshot(page); const savedBefore = (await pomodoroSideEffects(page)).timer
  await page.getByLabel(pomo('goal.label'),{exact:true}).fill('6'); await button(page,pomo('goal.save')).click(); await poll(async () => (await readStored(page,'goal'))?.target === 6,'goal saved')
  assert.deepEqual(await timerSnapshot(page),before); assert.equal((await pomodoroSideEffects(page)).timer,savedBefore)
  await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page); await advancePomodoro(page,58750)
  await expectTimer(page,{phase:'shortBreak',running:false}); await poll(async () => (await readStored(page,'stats'))?.find(row=>row.date==='2026-11-17')?.count===2,'current credit')
  const file = await download(page,()=>button(page,pomo('goal.export')).click(),'native-pomodoro-7days.csv'); assert.equal(file.filename,'pomodoro-2026-11-17-7days.csv'); assert.deepEqual([...file.bytes.subarray(0,3)],[239,187,191])
  const lines=file.text.replace(/^\uFEFF/,'').trim().split(/\r?\n/); assert.equal(lines.length,8); assert.ok(lines.some(line=>line==='"2026-11-16","2","50"')); assert.ok(lines.some(line=>line==='"2026-11-17","2","26"'))
  assert.equal((await readStored(page,'tasks'))[0].completedPomodoros,1)
  return { realCsvFilename:file.filename, csvBytes:file.bytes.length, csvRows:7, utf8Bom:true, today:{count:2,minutes:26}, goalChangePreservesTimer:true, taskCredits:1 }
})

test('pomodoro-320-dark-ko-en-running-preservation', async ({ page, context, open }) => {
  await bootPomo(context, open, { [pomoKeys.tasks]:[testTask] }); await page.locator('[data-pomodoro-toggle]').click(); await checkpointSettled(page); await advancePomodoro(page,1525.5)
  const before=await timerSnapshot(page); const fields=[page.getByLabel(pomo('goal.label'),{exact:true}),page.getByPlaceholder(pomo('taskPlaceholder'))]; const controls=[page.locator('[data-pomodoro-toggle]'),button(page,pomo('skip')),button(page,pomo('goal.save'))]
  const ko=await mobile(page,fields,controls); await screenshot(page,'pomodoro-320-ko',page.locator('[data-pomodoro-timer]'))
  await changeLanguage(page,'en'); await poll(async()=>await page.locator('[data-pomodoro-toggle]').getAttribute('aria-label')===pomo('pause','en'),'English timer controls')
  const after=await timerSnapshot(page); assert.equal(after.remaining,before.remaining); assert.equal(after.id,before.id); assert.equal(after.running,true)
  const en=await mobile(page,[page.getByLabel(pomo('goal.label','en'),{exact:true}),page.getByPlaceholder(pomo('taskPlaceholder','en'))],[page.locator('[data-pomodoro-toggle]'),button(page,pomo('skip','en')),button(page,pomo('goal.save','en'))]); await screenshot(page,'pomodoro-320-en',page.locator('[data-pomodoro-timer]'))
  await advancePomodoro(page,474.5); await expectTimer(page,{remaining:58000,running:true})
  assert.equal((await pomodoroSideEffects(page)).notifications.length,0)
  return { ko,en,fontMinimumPx:16,primaryTouchMinimumPx:44, localePreservedPhaseAndExactMs:true, actualAudioOutput:0,actualOsNotification:0 }
},{width:320,dark:true})


const planned = [
  "pomodoro-exact-ms-fractional-pause-and-checkpoints",
  "pomodoro-complete-once-skip-reset-and-auto-start",
  "pomodoro-wall-mono-gap-conservative-pause",
  "pomodoro-legacy-revisit-expired-without-credit",
  "pomodoro-native-lock-delayed-approval-and-cancel",
  "pomodoro-corrupt-storage-unknown-write-and-two-tabs",
  "pomodoro-existing-goal-task-and-real-csv",
  "pomodoro-320-dark-ko-en-running-preservation"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Parent final ready and translation signal pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
