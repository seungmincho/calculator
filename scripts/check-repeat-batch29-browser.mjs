import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch29/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const teamText = (key, language = 'ko', values = {}) => tr('teamDivider', key, language, values)
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
    if (!localStorage.getItem('__batch29Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch29Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:teamDivider)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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

const teams = page => page.locator('[data-team]').evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll('[data-member]')].map(member => member.dataset.member)))
const locked = page => page.locator('[data-member]').evaluateAll(nodes => nodes.filter(node => node.querySelectorAll('button')[1]?.getAttribute('aria-pressed') === 'true').map(node => node.dataset.member))
async function observeRevealTimers(context) {
  await context.addInitScript(() => {
    const nativeSet = window.setInterval.bind(window), nativeClear = window.clearInterval.bind(window)
    window.__teamRevealTimers = []; window.__holdTeamReveal = false; window.__teamCopyTimers = []
    const nativeTimeout = window.setTimeout.bind(window)
    window.setTimeout = (callback, duration, ...args) => { const id = nativeTimeout(callback, duration, ...args); if (duration === 2000 && typeof callback === 'function') window.__teamCopyTimers.push({ id, callback: () => callback(...args) }); return id }
    window.setInterval = (callback, duration, ...args) => {
      const id = nativeSet(duration === 80 ? () => { if (!window.__holdTeamReveal) callback(...args) } : callback, duration, ...args)
      if (duration === 80 && typeof callback === 'function') window.__teamRevealTimers.push({ id, callback: () => callback(...args), cleared: false })
      return id
    }
    window.clearInterval = id => { const timer = window.__teamRevealTimers.findLast(timer => timer.id === id && !timer.cleared); if (timer) timer.cleared = true; return nativeClear(id) }
  })
}
const result = page => page.locator('#team-divider-result')
const ts = (page, key, value) => page.locator(`[data-team-${key}${value === undefined ? '' : `="${value}"`}]`)
const member = (page, name) => page.locator('[data-member]').filter({ has: page.getByRole('button', { name: teamText('board.select', 'ko', { name }), exact: true }) })
const selectMember = (page, name, language = 'ko') => button(page, teamText('board.select', language, { name })).click()
async function openTeam(args, { animate = false, query = '' } = {}) { await observeRevealTimers(args.context); await args.open('team-divider', query); await poll(async () => !(await args.page.getByLabel(teamText('rosters.name'), { exact: true }).isDisabled()), 'team hydration/roster readiness'); if (!animate) await args.page.getByLabel(teamText('board.animate'), { exact: true }).uncheck() }
async function divide(page, again = false) { await ts(page, 'divide', again ? 'again' : 'initial').click(); await poll(async () => await result(page).getAttribute('data-team-dividing') === 'false' && (await teams(page)).flat().length > 0, 'team division finished') }
async function history(page) { return result(page).evaluate(node => ({ past: Number(node.dataset.teamHistoryPast), future: Number(node.dataset.teamHistoryFuture), epoch: Number(node.dataset.teamBoardEpoch), mode: node.dataset.teamResultMode, drafting: node.dataset.teamDrafting, dividing: node.dataset.teamDividing })) }
async function snapshot(page) { return { teams: await teams(page), locked: await locked(page), mode: (await history(page)).mode, comparison: await page.locator('[data-team-rotation]').count() ? await page.locator('[data-team-rotation]').innerText() : null } }
async function move(page, name, target) { await selectMember(page, name); await button(page, teamText('board.moveHere', 'ko', { number: target + 1 })).click() }
async function toggleLock(page, name) { await member(page, name).locator('button').nth(1).click() }
const shared = board => '#board=' + encodeURIComponent(JSON.stringify(board))
const baseBoard = { teams: [['검증 A', '검증 B', '검증 C'], ['검증 D', '검증 E', '검증 F']], skills: { '검증 A': 5, '검증 B': 4, '검증 C': 3, '검증 D': 2, '검증 E': 1, '검증 F': 3 }, mode: 'balanced' }
function textOracle(board, language = 'ko') { return board.teams.map((group, index) => { const balanced = board.mode === 'balanced', score = name => board.skills[name] ?? 3; const sum = balanced ? ' · ' + teamText('skillSum', language, { sum: group.reduce((total, name) => total + score(name), 0) }) : ''; return `${teamText('teamLabel', language)} ${index + 1} (${group.length}${teamText('memberUnit', language)}${sum})\n${group.map(name => balanced ? `${name}(${score(name)})` : name).join(', ')}` }).join('\n\n') }
function pairs(groups) { return new Set(groups.flatMap(group => group.flatMap((a, i) => group.slice(i + 1).map(b => JSON.stringify([a, b].sort()))))) }

test('team-real-drag-swap-lock-undo-redo-and-keyboard-focus', async args => {
  const { page } = args; await openTeam(args); await page.locator('input[name="mode"][value="balanced"]').check(); await divide(page); const first = await snapshot(page); assert.equal(first.teams.flat().length, 6); assert.equal((await history(page)).past, 0)
  const person = first.teams[0][0]; await member(page, person).dragTo(page.locator('[data-team="1"]')); const dragged = await snapshot(page); assert.ok(dragged.teams[1].includes(person)); assert.equal((await history(page)).past, 1)
  await ts(page, 'undo').focus(); await page.keyboard.press('Enter'); assert.deepEqual(await snapshot(page), first); assert.equal(await ts(page, 'redo').evaluate(node => node === document.activeElement), true)
  await page.keyboard.press('Space'); assert.deepEqual(await snapshot(page), dragged); assert.equal(await ts(page, 'undo').evaluate(node => node === document.activeElement), true)
  await ts(page, 'undo').click(); const a = first.teams[0][1], b = first.teams[1][1]; await selectMember(page, a); await selectMember(page, b); const swapped = await snapshot(page); assert.ok(swapped.teams[0].includes(b) && swapped.teams[1].includes(a)); assert.equal((await history(page)).future, 0)
  await toggleLock(page, a); const fixed = await snapshot(page); assert.ok(fixed.locked.includes(a)); await ts(page, 'undo').click(); assert.deepEqual(await snapshot(page), swapped); await ts(page, 'redo').click(); assert.deepEqual(await snapshot(page), fixed)
  await ts(page, 'rotate').click(); await poll(async () => (await history(page)).dividing === 'false', 'rotation finished'); const rotated = await snapshot(page), priorPairs = pairs(fixed.teams), repeated = [...pairs(rotated.teams)].filter(pair => priorPairs.has(pair)).length; assert.equal(Number(await page.locator('[data-repeated-pairs]').getAttribute('data-repeated-pairs')), repeated); assert.equal(rotated.teams.findIndex(group => group.includes(a)), fixed.teams.findIndex(group => group.includes(a)))
  await ts(page, 'undo').click(); assert.deepEqual(await snapshot(page), fixed); await ts(page, 'redo').click(); assert.deepEqual(await snapshot(page), rotated)
  return { initialStrictModeDivisionMembers: 6, nativeHtmlDrag: true, swapAndLockRoundTrip: true, keyboardUndoRedoFocus: true, actualRepeatedPairs: repeated, rotationMetadataRestoredExactly: true }
})

test('team-20-history-noop-branch-and-current-skills', async args => {
  const { page } = args; await openTeam(args, { query: shared(baseBoard) }); assert.deepEqual(await teams(page), baseBoard.teams); const person = baseBoard.teams[0][0]
  for (let index = 0; index < 22; index++) await toggleLock(page, person); assert.equal((await history(page)).past, 20); assert.equal((await history(page)).future, 0)
  for (let index = 0; index < 20; index++) await ts(page, 'undo').click(); assert.equal((await history(page)).past, 0); assert.equal((await history(page)).future, 20); assert.ok(await ts(page, 'undo').isDisabled())
  for (let index = 0; index < 20; index++) await ts(page, 'redo').click(); assert.equal((await history(page)).past, 20); assert.equal((await history(page)).future, 0)
  await ts(page, 'undo').click(); const held = await snapshot(page), before = await history(page), available = baseBoard.teams[0][1]; await selectMember(page, available); await selectMember(page, available); assert.deepEqual(await snapshot(page), held); assert.equal((await history(page)).future, before.future)
  await page.getByLabel(teamText('skillFor', 'ko', { name: available }), { exact: true }).selectOption('5'); assert.equal((await history(page)).future, 1); await page.locator('input[value="random"][name="mode"]').check(); assert.equal((await history(page)).mode, 'balanced'); assert.equal((await history(page)).future, 1)
  await ts(page, 'redo').click(); assert.equal((await history(page)).mode, 'balanced'); await page.locator('input[value="balanced"][name="mode"]').check(); assert.equal(await page.getByLabel(teamText('skillFor', 'ko', { name: available }), { exact: true }).inputValue(), '5')
  await ts(page, 'undo').click(); await toggleLock(page, available); assert.equal((await history(page)).future, 0); assert.ok(await ts(page, 'redo').isDisabled())
  return { maximumTotalTransitions: 20, undoRedoFortyUiActions: true, selectionNoOpPreservedFuture: true, currentSkillAndNextModeOutsideBoardHistory: true, realBranchClearedFuture: true }
})

test('team-reset-attendance-roster-and-shared-seed', async args => {
  const { page, context } = args; await openTeam(args); await divide(page); let group = await teams(page); const name = group[0][0]; await toggleLock(page, name)
  await page.getByLabel(teamText('attendance.attending', 'ko', { name }), { exact: true }).uncheck(); assert.equal((await history(page)).past, 0); assert.equal((await teams(page)).length, 0)
  await page.getByLabel(teamText('rosters.name'), { exact: true }).fill('전체 여섯 명 보존'); await button(page, teamText('rosters.save')).click(); await poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-team-rosters-v1') ?? '[]').length === 1), 'roster committed')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-team-rosters-v1'))); assert.equal(saved[0].names.length, 6)
  await divide(page); assert.equal((await teams(page)).flat().length, 5); await button(page, teamText('rosters.load')).click(); assert.equal((await teams(page)).length, 0); assert.equal((await history(page)).future, 0); assert.equal(await page.locator('[data-attending-count]').getAttribute('data-attending-count'), '6')
  await divide(page); group = await teams(page); await move(page, group[0][0], 1); await button(page, '링크 복사').click(); const link = await page.evaluate(() => navigator.clipboard.readText()); assert.ok(link.includes('#board=')); const expected = await teams(page), target = await context.newPage(); await args.open('team-divider', new URL(link).hash, target); await target.locator('[data-member]').first().waitFor(); assert.deepEqual(await teams(target), expected); assert.deepEqual([...(Object.values(await history(target))).slice(0, 2)], [0, 0]); await target.close()
  await button(page, '3').click(); assert.equal((await teams(page)).length, 0); assert.equal((await history(page)).past, 0); await divide(page); assert.equal((await teams(page)).length, 3)
  return { attendanceClearedHistoryWithoutDeletingName: true, savedRosterMembers: 6, rosterLoadResetAndRestoredAttendance: true, sharedFreshVisitSeededEmptyHistory: true, teamCountReset: true }
})

test('team-captain-reveal-generation-and-old-callbacks', async args => {
  const { page } = args; await openTeam(args, { animate: true }); await page.evaluate(() => { window.__holdTeamReveal = true }); await ts(page, 'divide', 'initial').click(); await ts(page, 'reveal-skip').waitFor(); assert.ok(await ts(page, 'undo').isDisabled()); assert.ok(await ts(page, 'redo').isDisabled()); const firstTimer = await page.evaluate(() => window.__teamRevealTimers.at(-1).id)
  await ts(page, 'reveal-skip').evaluate(node => { window.__oldRevealSkip = node[Object.keys(node).find(key => key.startsWith('__reactProps$'))].onClick }); await ts(page, 'reveal-skip').click(); const first = await teams(page)
  for (let retry = 0; retry < 4 && (await history(page)).dividing === 'false'; retry++) await ts(page, 'divide', 'again').click(); await ts(page, 'reveal-skip').waitFor(); const latest = await page.evaluate(() => window.__teamRevealTimers.at(-1).id); assert.notEqual(latest, firstTimer)
  await page.evaluate(firstTimer => { window.__teamRevealTimers.find(timer => timer.id === firstTimer).callback(); window.__oldRevealSkip() }, firstTimer); assert.equal((await history(page)).dividing, 'true'); assert.equal(await page.evaluate(id => window.__teamRevealTimers.find(timer => timer.id === id).cleared, latest), false)
  await page.evaluate(() => { const timer = window.__teamRevealTimers.at(-1); for (let count = 0; count < 8; count++) timer.callback() }); await poll(async () => (await history(page)).dividing === 'false', 'current reveal completes'); const newest = await teams(page); await ts(page, 'undo').click(); assert.deepEqual(await teams(page), first); assert.equal((await history(page)).dividing, 'false'); await ts(page, 'redo').click(); assert.deepEqual(await teams(page), newest)
  await page.locator('input[name="mode"][value="captain"]').check(); await ts(page, 'divide', 'initial').click(); assert.equal((await history(page)).drafting, 'true'); assert.equal((await history(page)).past, 0); await ts(page, 'draft-pick').first().evaluate(node => { window.__oldPick = node[Object.keys(node).find(key => key.startsWith('__reactProps$'))].onClick }); await ts(page, 'draft-pick').first().click(); const drafted = await teams(page); await page.evaluate(() => window.__oldPick()); assert.deepEqual(await teams(page), drafted)
  while ((await history(page)).drafting === 'true') await ts(page, 'draft-pick').first().click(); assert.equal((await teams(page)).flat().length, 6); assert.equal((await history(page)).past, 0); assert.equal((await history(page)).mode, 'captain'); assert.ok(await ts(page, 'undo').isDisabled())
  return { native80msRevealCallbacksCaptured: true, staleTickAndSkipDidNotStopNewReveal: true, undoRedoRestoredInstantly: true, oldDraftPickIgnored: true, captainCompletionSeededNoHistory: true }
})

test('team-native-copy-exact-txt-and-privacy', async args => {
  const { page } = args; await openTeam(args); const names = ['Verifier29-A', 'Verifier29-B', 'Verifier29-C', 'Verifier29-D', 'Verifier29-E', 'Verifier29-F']; await button(page, teamText('bulkInput')).click(); await page.getByLabel(teamText('bulkInput'), { exact: true }).fill(names.join('\n')); await button(page, teamText('import')).click(); await page.locator('input[value="balanced"][name="mode"]').check(); await page.getByLabel(teamText('skillFor', 'ko', { name: names[0] }), { exact: true }).selectOption('5'); await divide(page)
  const current = { teams: await teams(page), skills: Object.fromEntries(names.map(name => [name, name === names[0] ? 5 : 3])), mode: 'balanced' }, expected = textOracle(current); await ts(page, 'result-copy').click(); await poll(async () => await ts(page, 'result-copy').getAttribute('data-team-result-copied') === 'true', 'native copy acknowledged'); assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), expected)
  const output = await download(page, () => ts(page, 'result-download').click(), 'team-balanced-native.txt'); assert.equal(output.filename, 'team-divider.txt'); assert.deepEqual(output.bytes, Buffer.from(expected)); assert.ok(!output.bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])))
  const oldTimer = await page.evaluate(() => window.__teamCopyTimers.length - 1); await toggleLock(page, names[0]); await ts(page, 'result-copy').click(); await poll(async () => await ts(page, 'result-copy').getAttribute('data-team-result-copied') === 'true', 'new native copy'); await page.evaluate(index => window.__teamCopyTimers[index].callback(), oldTimer); assert.equal(await ts(page, 'result-copy').getAttribute('data-team-result-copied'), 'true')
  const state = await page.evaluate(() => ({ url: location.href, storage: JSON.stringify([localStorage, sessionStorage]) })); for (const name of names) { assert.ok(!decodeURIComponent(state.url).includes(name)); assert.ok(!state.storage.includes(name)); assert.ok(!args.network.some(item => item.includes(name))); assert.ok(!args.logs.some(item => item.includes(name))) }
  return { actualNativeClipboard: true, exactDownloadedUtf8Bytes: output.bytes.length, noBom: true, stablePrivateFilename: true, staleSuccessTimerDidNotClearNewSuccess: true, namesNotPersistedOrTransmittedByCopyDownload: true }
})

test('team-copy-recovery-stale-and-draft-preservation', async args => {
  const { page } = args; await openTeam(args, { query: shared(baseBoard) }); const original = await snapshot(page)
  await clipboard(page, 'reject'); await ts(page, 'result-copy').click(); await ts(page, 'copy-recovery').waitFor(); const manual = ts(page, 'copy-recovery').locator('textarea'); assert.equal(await manual.inputValue(), textOracle(baseBoard)); await ts(page, 'copy-select').click(); assert.deepEqual(await manual.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, textOracle(baseBoard).length]); assert.deepEqual(await snapshot(page), original)
  await clipboard(page, 'absent'); await ts(page, 'copy-retry').click(); assert.equal(await ts(page, 'result-copy').getAttribute('data-team-result-copied'), 'false'); await clipboard(page, 'true'); await ts(page, 'copy-retry').click(); await ts(page, 'copy-recovery').waitFor({ state: 'detached' }); assert.equal(await ts(page, 'result-copy').getAttribute('data-team-result-copied'), 'true')
  const invalidations = []
  for (const action of ['lock', 'undo', 'skill', 'locale']) { await clipboard(page, 'pending'); await ts(page, 'result-copy').click(); await poll(() => page.evaluate(() => window.__copyPending.length === 1), 'held result copy'); if (action === 'lock') await toggleLock(page, '검증 A'); if (action === 'undo') await ts(page, 'undo').click(); if (action === 'skill') await page.getByLabel(teamText('skillFor', 'ko', { name: '검증 B' }), { exact: true }).selectOption('5'); if (action === 'locale') await changeLanguage(page, 'en'); await page.evaluate(() => window.__copyPending[0].reject(new Error('obsolete copy'))); await wait(50); assert.equal(await page.evaluate(() => window.__fallbackCalls), 0); assert.equal(await ts(page, 'copy-recovery').count(), 0); assert.equal(await ts(page, 'result-copy').getAttribute('data-team-result-copied'), 'false'); invalidations.push(action) }
  await clipboard(page, 'reject'); await ts(page, 'result-copy').click(); await ts(page, 'copy-recovery').waitFor(); await ts(page, 'copy-close').click(); assert.equal(await ts(page, 'copy-recovery').count(), 0); assert.equal((await teams(page)).flat().length, 6)
  return { deniedAndAbsentFalseCopyReportedFailure: true, manualExactAndFullySelected: true, controlledLegacyTrueAcknowledged: true, staleRejectionInvalidations: invalidations, extraFallbacks: 0, currentTeamsPreserved: true }
})

test('team-320-dark-ko-en-input-undo', async args => {
  const { page } = args; await openTeam(args, { query: shared(baseBoard) }); await move(page, '검증 A', 1); await ts(page, 'undo').click(); const before = await snapshot(page), previous = await history(page), input = page.getByLabel(teamText('addPlaceholder'), { exact: true })
  await input.fill('유지할 새 이름'); await input.press('End'); await input.press('X'); await input.press('Control+z'); assert.equal(await input.inputValue(), '유지할 새 이름'); assert.deepEqual(await snapshot(page), before); assert.equal((await history(page)).future, previous.future)
  await input.dispatchEvent('compositionstart', { data: '한' }); await input.dispatchEvent('compositionend', { data: '한' }); assert.equal((await history(page)).future, previous.future)
  await clipboard(page, 'reject'); await ts(page, 'result-copy').click(); await ts(page, 'copy-recovery').waitFor(); const korean = await mobile(page, [input, ts(page, 'copy-recovery').locator('textarea')], [ts(page, 'undo'), ts(page, 'redo'), ts(page, 'copy-select'), ts(page, 'copy-retry')]); await screenshot(page, 'team-history-320-dark-ko', result(page))
  await changeLanguage(page, 'en'); await ts(page, 'redo').getByText(teamText('history.redo', 'en'), { exact: true }).waitFor(); assert.deepEqual(await teams(page), before.teams); assert.equal((await history(page)).future, previous.future); assert.equal(await page.getByLabel(teamText('addPlaceholder', 'en'), { exact: true }).inputValue(), '유지할 새 이름'); await ts(page, 'result-copy').click(); await ts(page, 'copy-recovery').waitFor()
  const english = await mobile(page, [page.getByLabel(teamText('addPlaceholder', 'en'), { exact: true }), ts(page, 'copy-recovery').locator('textarea')], [ts(page, 'redo'), ts(page, 'copy-select'), ts(page, 'copy-retry')]); await ts(page, 'redo').focus(); await page.keyboard.press('Space'); assert.ok((await teams(page))[1].includes('검증 A')); assert.equal((await history(page)).future, 0); await screenshot(page, 'team-history-320-dark-en', result(page))
  return { korean, english, nativeInputUndoNotIntercepted: true, syntheticCompositionEventsOnly: true, localePreservedBoardHistoryAndNameDraft: true, keyboardRedo: true }
}, { width: 320, dark: true })
async function clipboard(page, mode) {
  await page.evaluate(mode => { window.__nativeClipboard ??= navigator.clipboard; window.__copyPending = []; window.__fallbackCalls = 0; document.execCommand = () => { window.__fallbackCalls++; return mode === 'true' }; const value = mode === 'native' ? window.__nativeClipboard : mode === 'absent' || mode === 'true' ? undefined : { writeText: mode === 'pending' ? text => new Promise((resolve, reject) => window.__copyPending.push({ text, resolve, reject })) : () => Promise.reject(new DOMException('Controlled clipboard denial', 'NotAllowedError')) }; Object.defineProperty(navigator, 'clipboard', { configurable: true, value }) }, mode)
}
const planned = [
  'team-real-drag-swap-lock-undo-redo-and-keyboard-focus', 'team-20-history-noop-branch-and-current-skills',
  'team-reset-attendance-roster-and-shared-seed', 'team-captain-reveal-generation-and-old-callbacks',
  'team-native-copy-exact-txt-and-privacy', 'team-copy-recovery-stale-and-draft-preservation', 'team-320-dark-ko-en-input-undo',
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Team history parent final readiness is pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}



