import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch25/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const cc = (key, language = 'ko', values = {}) => tr('characterCounter', key, language, values)
const df = (key, language = 'ko', values = {}) => tr('diffViewer', key, language, values)
const ms = (key, language = 'ko', values = {}) => tr('minesweeper', key, language, values)
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  const rpc = { requests: [], hold: false, releases: [] }
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch25Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch25Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

  }, options)
  await context.route('**/*', async route => {
    const request = route.request(); network.push(request.url() + '\n' + (request.postData() ?? '')); const url = new URL(request.url())
    if (options.mines && /\/rest\/v1\/rpc\/(get_leaderboard|submit_leaderboard_score)$/.test(url.pathname)) {
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST,OPTIONS' } })
      const name = url.pathname.split('/').at(-1); rpc.requests.push({ name, body: request.postDataJSON() })
      if (name === 'submit_leaderboard_score' && rpc.hold) await new Promise(resolve => rpc.releases.push(resolve))
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(name === 'get_leaderboard' ? { entries: [], player_rank: null, player_score: null } : { submitted: true, rank: 1, personal_best: 12 }) })
    }
    if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient')
  })
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
  try { detail = await fn({ page, context, open, network, logs, rpc }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:characterCounter|diffViewer|minesweeper)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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

const keys = { versions: 'characterCounter.writingVersions.v1', draft: 'characterCounter.v2', handoff: 'toolhub-writing-diff-v1', tts: 'toolhub-ocr-tts-v1', best: 'toolhub-minesweeper-best', daily: 'toolhub-minesweeper-daily', achievements: 'game_achievements', name: 'leaderboard_player_name' }
const leftText = '검증용 저장 원고\r\n\r\n이전 문장\r\n마지막 줄\r\n'
const rightText = '검증용 현재 원고\n\n새 문장\n마지막 줄\n추가'
const savedVersion = { id: 'verify-saved', name: '검증 저장본', title: '<b>저장 제목</b>', text: leftText, sourceTab: 2, createdAt: '2026-11-17T00:00:00.000Z', target: 500, basis: 'chars' }
const sourceDraft = { active: 2, tabs: Array.from({ length: 5 }, (_, i) => ({ title: i === 2 ? '현재 제목' : `보존 문항 ${i + 1}`, text: i === 2 ? rightText : `보존 원문 ${i + 1}`, target: 500 + i, basis: 'chars' })) }
const payload = (left = leftText, right = rightText) => ({ version: 1, source: 'writing-versions', createdAt: Date.now(), left: { role: 'saved', name: savedVersion.name, title: savedVersion.title, sourceTab: 2, text: left }, right: { role: 'current', title: '현재 제목', sourceTab: 3, text: right } })
const normalize = value => value.replace(/\r\n?/g, '\n')
const split = value => value === '' ? [] : normalize(value).split('\n')
const handoff = page => page.locator('[data-writing-diff-handoff]')
const versionsPanel = page => page.locator('[aria-labelledby="writing-versions-title"]')
const sendDiff = page => page.locator('[data-writing-diff-send]')
const originalInput = page => page.getByRole('textbox', { name: cc('input.aria'), exact: true })
const db = (page, key, language = 'ko') => button(page, df(key, language))
async function seed(context, local = {}, session = {}) { await context.addInitScript(({ local, session }) => { if (!/^https?:$/.test(location.protocol)) return; if (!localStorage.getItem('__fixture25')) { for (const [key, value] of Object.entries(local)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); localStorage.setItem('__fixture25', '1') }; if (!sessionStorage.getItem('__fixture25')) { for (const [key, value] of Object.entries(session)) sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); sessionStorage.setItem('__fixture25', '1') } }, { local, session }) }
async function stored(page, names = [keys.versions, keys.draft]) { return page.evaluate(names => Object.fromEntries(names.map(key => [key, localStorage.getItem(key)])), names) }
async function observeHandoff(context, holdReceiver = false) {
  await context.addInitScript(({ holdReceiver }) => {
    window.__workerRecords = []; window.__workerReplies = []
    const WorkerClass = window.Worker; if (WorkerClass) window.Worker = class extends WorkerClass { constructor(url, options) { super(url, options); this.record = { url: String(url), posts: 0, terminated: false }; window.__workerRecords.push(this.record); this.addEventListener('message', event => window.__workerReplies.push(event.data)) }; postMessage(...args) { this.record.posts++; return super.postMessage(...args) }; terminate() { this.record.terminated = true; return super.terminate() } }
    const timeout = window.setTimeout, clear = window.clearTimeout; window.__receiverQueue = []; window.__holdReceiver = holdReceiver
    window.setTimeout = function(fn, ms, ...args) { if (window.__holdReceiver && ms === 0 && /receiveWritingDiffTransfer|receiver\.receive|\.receive\(ticket/.test(String(fn))) { const item = { fn, args, id: -90000 - window.__receiverQueue.length, active: true }; window.__receiverQueue.push(item); return item.id }; return timeout(fn, ms, ...args) }
    window.clearTimeout = id => { const item = window.__receiverQueue.find(item => item.id === id); if (item) item.active = false; else clear(id) }
    window.__releaseReceiver = () => { window.__holdReceiver = false; for (const item of window.__receiverQueue.splice(0)) if (item.active) timeout(item.fn, 0, ...item.args) }
  }, { holdReceiver })
}
async function openSource(args, draft = sourceDraft) { await observeHandoff(args.context); await seed(args.context, { [keys.versions]: { version: 1, versions: [savedVersion] }, [keys.draft]: draft }); await args.open('character-counter'); await versionsPanel(args.page).getByRole('button', { name: savedVersion.name, exact: false }).first().click(); await sendDiff(args.page).waitFor(); await poll(async () => !(await sendDiff(args.page).isDisabled()), 'source ready'); await wait(600) }
async function transfer(args) { const event = args.context.waitForEvent('page'); await sendDiff(args.page).click(); const target = await event; await target.waitForURL('**/diff-viewer/?from=writing-versions'); await handoff(target).waitFor(); await poll(async () => (await target.locator('#diff-left').inputValue()) === normalize(leftText), 'received left'); return target }
async function compare(page, language = 'ko') { const before = await page.evaluate(() => window.__workerReplies.length); await db(page, 'actions.compare', language).click(); await poll(() => page.evaluate(before => window.__workerReplies.length > before, before), 'native Worker replied'); await poll(async () => await db(page, 'workspace.cancel', language).count() === 0, 'compare settled'); const reply = await page.evaluate(() => window.__workerReplies.at(-1)); assert.equal(reply.ok, true); return reply.result }
function reconstruct(text, left, right) { const rows = text === '' ? [] : text.split('\n').map(line => { assert.match(line, /^[ +\-] /); return { sign: line[0], value: line.slice(2) } }); assert.deepEqual(rows.filter(line => line.sign !== '+').map(line => line.value), split(left)); assert.deepEqual(rows.filter(line => line.sign !== '-').map(line => line.value), split(right)) }
async function clipboardReject(page) { await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new DOMException('Controlled denial', 'NotAllowedError')) } }); document.execCommand = () => false }) }
async function fillLong(page, field, text) { await field.click(); await page.keyboard.press('Control+a'); await page.evaluate(text => navigator.clipboard.writeText(text), text); await page.keyboard.press('Control+v'); await poll(async () => await field.inputValue() === text, 'native large text paste') }

test('writing-new-tab-real-worker-txt-and-original-bytes', async args => {
  const { page, context, open } = args; await openSource(args); const existing = await context.newPage(); await open('diff-viewer', '', existing); await existing.locator('#diff-left').fill('이미 열려 있던 비교 원문'); const before = await stored(page), sourceUrl = page.url(); await page.evaluate(key => sessionStorage.setItem(key, 'source-session-protected'), keys.handoff); const target = await transfer(args)
  assert.equal(await target.locator('#diff-right').inputValue(), rightText); assert.equal(await target.evaluate(() => opener === null), true); assert.equal(await target.evaluate(key => sessionStorage.getItem(key), keys.handoff), null); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), 'source-session-protected'); assert.deepEqual(await stored(page), before); assert.equal(page.url(), sourceUrl); assert.equal(await existing.locator('#diff-left').inputValue(), '이미 열려 있던 비교 원문'); assert.equal(await target.evaluate(() => window.__workerRecords.length), 0); assert.equal(await target.locator('#diff-result tbody').count(), 0)
  await compare(target); const output = await download(target, () => db(target, 'workspace.download').click(), 'writing-snapshot-comparison.txt'); reconstruct(output.text, leftText, rightText); await db(target, 'actions.copyDiff').click(); assert.equal(normalize(await target.evaluate(() => navigator.clipboard.readText())), output.text); await originalInput(page).fill('보낸 뒤 원본에서만 수정'); assert.equal(await target.locator('#diff-right').inputValue(), rightText); assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.versions), before[keys.versions]); return { actualNewTab: true, openerRemoved: true, automaticWorkers: 0, explicitNativeWorkers: await target.evaluate(() => window.__workerRecords.length), txtBytes: output.bytes.length, originalFiveTabsAndVersionsUnchangedAtSend: true, existingDiffUntouched: true, laterSourceEditNotApplied: true }
})

test('writing-popup-storage-limit-empty-and-stale-source', async args => {
  const { page, context } = args; await openSource(args); const before = await stored(page); await page.evaluate(() => { window.__open = window.open; window.open = () => null }); await sendDiff(page).click(); await versionsPanel(page).getByText(cc('versions.diff.popupBlocked'), { exact: true }).waitFor(); assert.deepEqual(await stored(page), before)
  await page.evaluate(() => { window.open = (...args) => { const target = window.__open(...args); Object.defineProperty(target, 'sessionStorage', { get() { throw new Error('Controlled target storage denial') } }); return target } }); const pageCount = context.pages().length; await sendDiff(page).click(); await versionsPanel(page).getByText(cc('versions.diff.handoffFailed'), { exact: true }).waitFor(); await poll(() => Promise.resolve(context.pages().length === pageCount), 'failed blank tab closed'); assert.deepEqual(await stored(page), before); await page.evaluate(() => { window.open = window.__open })
  await fillLong(page, originalInput(page), '가'.repeat(50001)); await sendDiff(page).click(); await versionsPanel(page).getByText(cc('versions.diff.textTooLong'), { exact: true }).waitFor(); assert.equal(context.pages().length, pageCount); await originalInput(page).fill(''); const target = await transfer(args); assert.equal(await target.locator('#diff-right').inputValue(), ''); await target.close(); assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.versions), before[keys.versions])
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)); value.versions[0].name = '다른 탭의 변경'; localStorage.setItem(key, JSON.stringify(value)) }, keys.versions); const changed = await stored(page); await sendDiff(page).click(); await versionsPanel(page).getByText(cc('versions.diff.conflict'), { exact: true }).waitFor(); assert.equal(context.pages().length, pageCount); assert.equal(await originalInput(page).inputValue(), ''); assert.equal((await stored(page))[keys.versions], changed[keys.versions]); return { popupBlockedPreserved: true, failedTargetClosed: true, over50000NotTruncated: true, emptyCurrentTransferred: true, missedStorageEventRejectedAtClick: true }
})

test('writing-receiver-marker-expiry-invalid-and-consumed-revisit', async args => {
  const { page, context, open } = args; await observeHandoff(context); await open('diff-viewer'); const initial = await page.locator('#diff-left').inputValue(); const cases = [ ['missing', null], ['expired', { ...payload(), createdAt: Date.now() - 600001 }], ['unsupported', { ...payload(), version: 2 }], ['invalid', { ...payload(), left: { ...payload().left, role: 'current' } }] ]
  for (const [error, value] of cases) { const raw = value === null ? null : JSON.stringify(value); await page.evaluate(({ key, raw }) => raw === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, raw), { key: keys.handoff, raw }); await open('diff-viewer', '?from=writing-versions'); await handoff(page).getByText(df(`handoff.errors.${error}`), { exact: true }).waitFor(); assert.equal(await page.locator('#diff-left').inputValue(), initial); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), raw) }
  const raw = JSON.stringify(payload()); await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), { key: keys.handoff, raw }); await open('diff-viewer'); assert.equal(await page.locator('#diff-left').inputValue(), initial); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), raw); await open('diff-viewer', '?from=writing-versions'); await poll(async () => await page.locator('#diff-right').inputValue() === rightText, 'valid received'); await page.reload({ waitUntil: 'domcontentloaded' }); await handoff(page).getByText(df('handoff.errors.missing'), { exact: true }).waitFor(); assert.equal(await page.locator('#diff-left').inputValue(), initial); await page.locator('#diff-left').fill('직접 입력'); await page.locator('#diff-right').fill('직접 수정'); await compare(page); return { invalidOrExpiredRawPreserved: cases.map(([name]) => name), noMarkerDidNotConsume: true, consumedReloadNotReapplied: true, directNativeComparisonStillWorks: true }
})

test('writing-receiver-dirty-new-raw-and-cleanup-races', async args => {
  const { page, context, open } = args; await observeHandoff(context, true); await seed(context, {}, { [keys.handoff]: payload() }); await open('diff-viewer', '?from=writing-versions'); await poll(() => page.evaluate(() => window.__receiverQueue.some(item => item.active)), 'receiver callback held'); await page.locator('#diff-left').fill('수신 전 사용자 입력'); await page.evaluate(() => window.__releaseReceiver()); await handoff(page).getByText(df('handoff.errors.edited'), { exact: true }).waitFor(); assert.equal(await page.locator('#diff-left').inputValue(), '수신 전 사용자 입력'); assert.notEqual(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), null)
  const newPayload = JSON.stringify(payload('새로운 왼쪽', '새로운 오른쪽')); const checks = []
  for (const at of [2, 3]) { await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), { key: keys.handoff, value: JSON.stringify(payload()) }); await open('diff-viewer', '?from=writing-versions'); await poll(() => page.evaluate(() => window.__receiverQueue.some(item => item.active)), 'next receiver held'); const initial = await page.locator('#diff-left').inputValue(); await page.evaluate(({ key, value, at }) => { const get = Storage.prototype.getItem; let calls = 0; Storage.prototype.getItem = function(name) { if (this === sessionStorage && name === key && ++calls === at) this.setItem(key, value); return get.call(this, name) } }, { key: keys.handoff, value: newPayload, at }); await page.evaluate(() => window.__releaseReceiver()); await handoff(page).waitFor(); await poll(async () => await handoff(page).innerText().then(text => text.includes(df(at === 2 ? 'handoff.errors.changed' : 'handoff.cleanupFailed'))), 'correct race notice'); assert.equal(await page.locator('#diff-left').inputValue(), at === 2 ? initial : normalize(leftText)); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), newPayload); checks.push({ changedOnRead: at, applied: at === 3, newerRawPreserved: true }) }
  await page.locator('#diff-right').fill('받은 후 편집 유지'); await db(page, 'actions.swap').click(); await changeLanguage(page, 'en'); assert.equal(await page.locator('#diff-left').inputValue(), '받은 후 편집 유지'); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), newPayload); assert.equal(await page.evaluate(() => window.__workerRecords.length), 0); return { preReceiveDirtyPreserved: true, raceChecks: checks, swapLocaleAndNewPayloadDidNotReapply: true }
})

test('writing-target-copy-recovery-dirty-and-tts-key-regression', async args => {
  const { page, context, open } = args; await observeHandoff(context); await seed(context, {}, { [keys.handoff]: payload(), [keys.tts]: { source: 'ocr', text: '기존 OCR 전달 검증', createdAt: Date.now() } }); await open('diff-viewer', '?from=writing-versions'); await poll(async () => await page.locator('#diff-right').inputValue() === rightText, 'received'); const ttsRaw = await page.evaluate(key => sessionStorage.getItem(key), keys.tts); await compare(page); await clipboardReject(page); await db(page, 'actions.copyDiff').click(); const field = page.locator('#diff-copy-fallback'); await field.waitFor(); await db(page, 'workspace.selectAll').click(); const text = await field.inputValue(); reconstruct(text, leftText, rightText); assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, text.length]); await page.locator('#diff-right').fill('다음 비교 전 새 입력'); await page.getByText(df('workspace.stale'), { exact: true }).waitFor(); const old = await download(page, () => db(page, 'workspace.download').click(), 'writing-confirmed-before-new-edit.txt'); assert.equal(old.text, text); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.tts), ttsRaw)
  await page.addInitScript(() => { window.__speechPlayCount = 0; if (window.speechSynthesis) window.speechSynthesis.speak = () => { window.__speechPlayCount++ } }); await open('text-to-speech', '?from=ocr'); await poll(async () => await page.locator('#tts-text').inputValue() === '기존 OCR 전달 검증', 'OCR regression received'); assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.tts), null); assert.equal(await page.evaluate(() => window.__speechPlayCount), 0); return { copyFailureManualSelection: true, dirtyExportUsesConfirmedSnapshot: true, separateOcrKeyReceivedOnce: true, automaticSpeech: 0 }
})

test('writing-320-dark-korean-english-transfer-ui', async args => {
  const { page } = args; await openSource(args); const sourceGeometry = await mobile(page, [originalInput(page)], [sendDiff(page)]); await sendDiff(page).evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'writing-send-320-dark-ko.png') }); const target = await transfer(args); assert.ok((await handoff(target).innerText()).includes('<b>저장 제목</b>')); assert.equal(await handoff(target).locator('b').count(), 0); await changeLanguage(target, 'en'); await handoff(target).getByText(df('handoff.title', 'en'), { exact: true }).waitFor(); const targetGeometry = await mobile(target, [target.locator('#diff-left'), target.locator('#diff-right')], [db(target, 'actions.compare', 'en')]); await handoff(target).evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await target.evaluate(() => scrollBy(0, -75)); await target.screenshot({ path: resolve(out, 'writing-received-320-dark-en.png') }); return { sourceGeometry, targetGeometry, koreanSourceEnglishTarget: true, titleEscapedAsText: true }
}, { width: 320, dark: true })

const board = page => page.locator('[data-minesweeper-status]')
const cell = (page, index) => board(page).locator(`[data-i="${index}"]`)
const replay = page => page.locator('[data-minesweeper-replay]')
const recordKeys = [keys.best, keys.daily, keys.achievements, keys.name]
async function observeMines(context) { await context.addInitScript(() => { const now = Date.now; window.__gameTimeOffset = 0; Date.now = () => now() + window.__gameTimeOffset; window.__latePress = []; const timeout = window.setTimeout; window.setTimeout = function(fn, ms, ...args) { if (ms === 350) { window.__latePress.push({ fn, args }); if (window.__holdPress) return -81000 - window.__latePress.length }; return timeout(fn, ms, ...args) }; window.__releaseOldPress = () => { for (const item of window.__latePress.splice(0)) item.fn(...item.args) }; }) }
async function openMines(args, preferences = {}) { await observeMines(args.context); await seed(args.context, { 'toolhub-minesweeper-prefs': { diff: 'beginner', custom: { w: 5, h: 5, mines: 1 }, noGuess: false, qmarks: true, ...preferences } }); await args.open('minesweeper'); await board(args.page).waitFor(); await poll(async () => Number(await board(args.page).getAttribute('data-minesweeper-generation')) > 0, 'game initialized'); await wait(350) }
async function game(page) { return board(page).evaluate(node => { const key = Object.keys(node).find(key => key.startsWith('__reactFiber$')); let fiber = node[key]; const wantedGeneration = Number(node.dataset.minesweeperGeneration), wantedStatus = node.dataset.minesweeperStatus; while (fiber) { for (const owner of [fiber, fiber.alternate]) { let hook = owner?.memoizedState; const visited = new Set(); while (hook && !visited.has(hook)) { visited.add(hook); const value = hook.memoizedState; if (value && Array.isArray(value.open) && Array.isArray(value.marks) && value.generation === wantedGeneration && value.status === wantedStatus) return JSON.parse(JSON.stringify(value)); hook = hook.next } }; fiber = fiber.return }; throw new Error('Read-only game state not found') }) }
async function status(page, value) { await poll(async () => await board(page).getAttribute('data-minesweeper-status') === value, `game status ${value}`) }
async function startClassic(page, first = 40, seedValue = 1234) { await page.evaluate(seedValue => { Math.random = () => seedValue / 2 ** 32 }, seedValue); await cell(page, first).click(); await poll(async () => !!(await game(page)).layout, 'board layout generated'); return game(page) }
async function lose(page) { const current = await game(page); const mine = current.layout.mine.findIndex((mine, i) => mine && current.marks[i] !== 1); await cell(page, mine).click(); await status(page, 'lost'); return game(page) }
async function win(page) { await page.evaluate(() => { window.__gameTimeOffset += 12000 }); for (let attempt = 0; attempt < 500; attempt++) { const current = await game(page); if (current.status === 'won') return current; assert.notEqual(current.status, 'lost'); const index = current.layout.mine.findIndex((mine, i) => !mine && !current.open[i]); assert.ok(index >= 0); await cell(page, index).click() }; assert.fail('Win loop exhausted') }
async function closeName(page) { const dialog = page.getByRole('dialog').filter({ has: page.locator('#name-input-modal-title') }); if (await dialog.count()) await dialog.getByRole('button', { name: tr('common', 'close', await page.evaluate(() => localStorage.getItem('language'))), exact: true }).click() }
async function startPractice(page) { await closeName(page); await replay(page).click(); await poll(async () => await board(page).getAttribute('data-minesweeper-practice') === 'true', 'practice enabled'); return game(page) }
function sameBoard(actual, expected) { for (const key of ['w', 'h', 'mines', 'first', 'noGuessFailed']) assert.deepEqual(actual[key], expected[key], key); assert.deepEqual(actual.layout, expected.layout); assert.deepEqual(actual.replaySource, expected.replaySource) }
async function captureScoreCallback(page) { await page.getByRole('dialog').waitFor(); await page.getByRole('dialog').evaluate(node => { let fiber = node[Object.keys(node).find(key => key.startsWith('__reactFiber$'))]; while (fiber) { if (typeof fiber.memoizedProps?.onSubmit === 'function' && typeof fiber.memoizedProps?.isOpen === 'boolean') { window.__staleScoreSubmit = fiber.memoizedProps.onSubmit; return }; fiber = fiber.return }; throw new Error('Score callback not found') }) }
async function submitModal(page) { const dialog = page.getByRole('dialog'); await dialog.locator('input').fill('VerifierFixture'); await dialog.getByRole('button', { name: tr('leaderboard', 'submit', await page.evaluate(() => localStorage.getItem('language'))), exact: true }).click() }

test('mines-same-layout-first-reset-and-valid-action-clock', async args => {
  const { page } = args; await openMines(args); assert.equal(await replay(page).count(), 0); const first = await startClassic(page); const marked = first.layout.mine.findIndex(Boolean); await cell(page, marked).click({ button: 'right' }); await cell(page, marked).click({ button: 'right' }); await lose(page); const source = await game(page), initialRecords = await stored(page, recordKeys); const practice = await startPractice(page); sameBoard(practice, source); assert.equal(practice.start, 0); assert.equal(practice.end, 0); assert.equal(practice.clicks, 0); assert.equal(practice.boom, -1); assert.ok(practice.marks.every(value => value === 0)); assert.ok(practice.open[practice.first]); await page.evaluate(() => { window.__gameTimeOffset += 5000 }); await board(page).focus(); await page.keyboard.press('ArrowRight'); await wait(80); assert.equal((await game(page)).start, 0); const unopened = practice.open.findIndex(value => !value); await cell(page, unopened).click({ button: 'right' }); assert.ok((await game(page)).start > 0); await cell(page, unopened).click({ button: 'right' }); await lose(page); const again = await startPractice(page); sameBoard(again, source); assert.equal(again.start, 0); assert.deepEqual(await stored(page, recordKeys), initialRecords); return { mineIndices: source.layout.mine.flatMap((value, i) => value ? [i] : []), first: source.first, originalAndRepeatedPracticeLayoutSame: true, clockStartsOnlyAtValidAction: true, practiceLossDidNotRecord: true }
}, { mines: true })

test('mines-practice-win-record-isolation-and-normal-win-regression', async args => {
  const { page, rpc } = args; await openMines(args); await startClassic(page); await lose(page); const before = await stored(page, recordKeys); await startPractice(page); const practice = await win(page); assert.equal(practice.practice, true); assert.deepEqual(await stored(page, recordKeys), before); assert.equal(await page.getByRole('dialog').count(), 0); assert.equal(rpc.requests.filter(item => item.name === 'submit_leaderboard_score').length, 0); await startPractice(page); await lose(page); assert.deepEqual(await stored(page, recordKeys), before)
  await page.locator('[data-minesweeper-new-game]').click(); await startClassic(page); const normal = await win(page); assert.equal(normal.practice, false); await page.getByRole('dialog').waitFor(); const after = await stored(page, recordKeys); assert.notEqual(after[keys.best], before[keys.best]); assert.notEqual(after[keys.achievements], before[keys.achievements]); assert.equal(after[keys.daily], before[keys.daily]); return { practiceWinAndLossRecordBytesUnchanged: true, normalWinBestAndAchievementsUpdated: true, normalNameModalVisible: true, realScoreSubmissions: 0 }
}, { mines: true })

test('mines-exit-routes-daily-and-small-board-auto-complete', async args => {
  const { page } = args; await openMines(args); await startClassic(page); await lose(page); await startPractice(page); await page.locator('[data-minesweeper-difficulty="beginner"]').click(); let current = await game(page); assert.equal(current.practice, false); assert.equal(current.layout, null); await startClassic(page); await lose(page); await startPractice(page); await page.getByRole('tab', { name: ms('modeClassic'), exact: true }).click(); assert.equal((await game(page)).practice, false); assert.equal((await game(page)).layout, null)
  const dailyBefore = (await stored(page, [keys.daily]))[keys.daily]; await page.getByRole('tablist').filter({ has: page.getByRole('tab', { name: ms('modeClassic'), exact: true }) }).getByRole('tab').last().click(); assert.equal((await game(page)).practice, false); assert.equal(await replay(page).count(), 0); await page.getByRole('tab', { name: ms('modeClassic'), exact: true }).click(); assert.equal((await stored(page, [keys.daily]))[keys.daily], dailyBefore)
  await page.locator('[data-minesweeper-difficulty="custom"]').click(); await poll(async () => (await game(page)).w === 5, 'custom config'); await startClassic(page, 12, 2); current = await game(page); if (current.status !== 'won') await win(page); await startPractice(page); const automatic = await game(page); assert.equal(automatic.status, 'won'); assert.equal(automatic.start, 0); assert.equal(automatic.end, 0); assert.equal(automatic.clicks, 0); await page.getByText(ms('replay.automaticWin'), { exact: true }).waitFor(); await page.locator('[data-minesweeper-exit-practice]').click(); assert.equal((await game(page)).practice, false); return { sameDifficultyAndClassicExit: true, dailyBytesPreserved: true, tinyBoardAutomaticPracticeComplete: true, automaticTimeAndClicks: 0 }
}, { mines: true })

test('mines-stale-name-submit-and-held-rpc-after-practice', async args => {
  const { page, rpc } = args; await openMines(args); await startClassic(page); await win(page); await captureScoreCallback(page); await startPractice(page); await page.evaluate(() => window.__staleScoreSubmit('OldFixture')); assert.equal(rpc.requests.filter(item => item.name === 'submit_leaderboard_score').length, 0)
  await page.locator('[data-minesweeper-new-game]').click(); await startClassic(page); await win(page); rpc.hold = true; await submitModal(page); await poll(() => Promise.resolve(rpc.releases.length === 1), 'eligible normal score mocked and held'); await closeName(page); await startPractice(page); const before = await stored(page, recordKeys), generation = (await game(page)).generation; rpc.hold = false; for (const release of rpc.releases.splice(0)) release(); await wait(250); assert.equal((await game(page)).generation, generation); assert.equal((await game(page)).practice, true); assert.equal(await page.getByRole('dialog').count(), 0); assert.deepEqual(await stored(page, recordKeys), before); return { hiddenOldSubmitRequests: 0, allowedNormalSubmitMocked: 1, lateNormalResponseDidNotModifyPractice: true, publicServerSubmissions: 0 }
}, { mines: true })

test('mines-stale-long-press-pointer-and-new-keyboard-input', async args => {
  const { page } = args; await openMines(args); await startClassic(page); const current = await game(page), index = current.open.findIndex(value => !value); await page.evaluate(() => { window.__holdPress = true }); await cell(page, index).dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 72, button: 0, buttons: 1, clientX: 30, clientY: 30 }); await poll(() => page.evaluate(() => window.__latePress.length > 0), 'long press queued'); await board(page).evaluate(node => { window.__oldBoard = node; window.__oldBoardProps = node[Object.keys(node).find(key => key.startsWith('__reactProps$'))]; window.__oldCell = node.querySelector('[data-i]') }); await page.locator('[data-minesweeper-new-game]').click(); const before = await game(page); await page.evaluate(() => { window.__releaseOldPress(); const event = { target: window.__oldCell, detail: 1, pointerId: 72, preventDefault() {}, nativeEvent: {} }; window.__oldBoardProps.onPointerUp(event); window.__oldBoardProps.onClick(event) }); assert.deepEqual(await game(page), before)
  await board(page).focus(); await page.keyboard.press('Enter'); assert.equal((await game(page)).status, 'playing'); await page.keyboard.press('ArrowRight'); const state = await game(page), unopened = state.open.findIndex(value => !value); await page.evaluate(() => { window.__holdPress = false }); await cell(page, unopened).dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 73, button: 0, buttons: 1, clientX: 40, clientY: 40 }); await wait(380); assert.equal((await game(page)).marks[unopened], 1); await cell(page, unopened).dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 73, button: 0 }); await board(page).focus(); await page.keyboard.press('f'); assert.notEqual((await game(page)).marks[unopened], 1); return { oldQueuedCallbackAndPointerHandlersIgnored: true, freshEnterArrowFlagAndSyntheticTouchWork: true, pointerEventsSynthetic: true }
}, { mines: true })

test('mines-320-dark-korean-english-practice-ui', async args => {
  const { page } = args; await openMines(args); await startClassic(page); await lose(page); const control = replay(page); assert.ok((await control.boundingBox()).height >= 44); await startPractice(page); const notice = page.locator('[data-minesweeper-practice-notice]'); const korean = await mobile(page, [], [page.locator('[data-minesweeper-exit-practice]'), page.locator('[data-minesweeper-new-game]')]); await notice.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.evaluate(() => scrollBy(0, -75)); await page.screenshot({ path: resolve(out, 'mines-practice-320-dark-ko.png') }); const before = await game(page); await changeLanguage(page, 'en'); await notice.getByText(ms('replay.active', 'en'), { exact: true }).waitFor(); assert.deepEqual(await game(page), before); await lose(page); const english = await mobile(page, [], [replay(page)]); await replay(page).evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'mines-result-320-dark-en.png') }); return { korean, english, practicePreservedAcrossLocale: true, newButtons44px: true }
}, { mines: true, width: 320, dark: true })

if (only === '--list') console.log(cases.map(item => item.name).join('\n'))
else {
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part)))
  assert.ok(selected.length, 'No selected verification cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}





