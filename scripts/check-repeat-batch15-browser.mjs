import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch15/browser')
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch15Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch15Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:basis|season|official|practiceLinks)\.[a-z]/)
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

const c = (key, values) => tr('csatGrade', key, values)
const d = (key, values) => tr('csatDday', key, values)
const timer = (key, values) => tr('timer', key, values)
const share = key => tr('shareResult', key)
const gradeRow = (page, id) => page.locator('li').filter({ has: page.locator(`#csat-${id}`) })
const sheetPanel = page => page.locator('.ui-card').filter({ has: page.getByRole('heading', { name: d('sheet.title'), exact: true }) })
const checklistPanel = page => page.locator('.ui-card').filter({ has: page.getByRole('heading', { name: d('checklist.title'), exact: true }) })
const schedulePanel = page => page.locator('.ui-card').filter({ has: page.getByRole('heading', { name: d('schedule.title'), exact: true }) })
const fixedDate = '2026-11-17T03:00:00.000Z'
const handoffScores = { kor: '85', math: '85', eng: '90', hist: '40', inq1: '44', inq2: '45' }
async function captureCanvas(context) {
  await context.addInitScript(() => {
    window.__canvasTexts = []; const draw = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) { window.__canvasTexts.push({ text: String(text), x, y, font: this.font, width: this.canvas.width, height: this.canvas.height }); return draw.apply(this, arguments) }
    window.__shared = null; Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__shared = data } })
  })
}
async function openGrade(args, query = '') {
  await args.page.clock.setFixedTime(new Date(fixedDate)); await args.open('csat-grade', query)
  await poll(async () => (await args.page.locator('main').innerText()).includes('D-2'), 'grade local date hydrated')
}
async function openDday(args, query = '') {
  await args.page.clock.setFixedTime(new Date(fixedDate)); await args.open('csat-dday', query)
  await args.page.locator('.ui-hero').getByText('D-2', { exact: true }).waitFor(); await args.page.locator('#csat-print').waitFor({ state: 'attached' })
}
async function png(page, click, filename) {
  const result = await download(page, click, filename); assert.equal(result.bytes.toString('ascii', 1, 4), 'PNG'); assert.equal(result.bytes.readUInt32BE(16), 1080); assert.equal(result.bytes.readUInt32BE(20), 1350); return result
}
async function assertGrade(page, id, grade) { await poll(async () => await gradeRow(page, id).locator('span.text-2xl').innerText() === String(grade), `${id} grade ${grade}`) }
const sheetAnswer = (page, q) => sheetPanel(page).getByRole('textbox', { name: d('sheet.qLabel', { q }), exact: true })
async function metadata(page, required) {
  const values = await page.evaluate(() => ({ title: document.title, description: document.querySelector('meta[name="description"]')?.content, og: document.querySelector('meta[property="og:description"]')?.content }))
  for (const term of required) assert.match(values.description, term)
  assert.equal(values.og, values.description); assert.match(values.title, /2027/)
  return values
}
async function inputSizes(scope) {
  const values = await scope.locator('input:not([type="checkbox"]),select').evaluateAll(inputs => inputs.map(input => ({ id: input.id, size: parseFloat(getComputedStyle(input).fontSize), height: input.getBoundingClientRect().height })))
  assert.ok(values.length > 0); for (const item of values) { assert.ok(item.size >= 16, `Input font: ${JSON.stringify(item)}`); assert.ok(item.height >= 44, `Input height: ${JSON.stringify(item)}`) }
}

try {
  await run('csat-grade-basis-absolute-boundaries-and-existing-calculation', async args => {
    const { page } = args; await openGrade(args); const context = page.locator('#csat-grade-context'), result = page.locator('#csat-grade-result'); await context.waitFor()
    shape('csatGrade', 'context'); const meta = await metadata(page, [/2026/, /추정/, /올해 확정컷을 제공하지/, /절대평가/]); writeFileSync(resolve(out, 'csat-grade-metadata.json'), JSON.stringify(meta, null, 2))
    const explanation = await context.innerText(); assert.match(explanation, /2027/); assert.match(explanation, /2026/); assert.match(explanation, /미공개|공개되지|반영되어 있지/); assert.match(explanation, /추정/); assert.match(explanation, /영어/); assert.match(explanation, /한국사/)
    for (const [id, score] of Object.entries(handoffScores)) await page.locator(`#csat-${id}`).fill(score)
    await page.getByRole('combobox', { name: c('u.selectAria', { s: c('subjects.math') }), exact: true }).selectOption('calc')
    for (const id of Object.keys(handoffScores)) await assertGrade(page, id, 1)
    assert.ok((await result.innerText()).includes('1.00')); assert.match(await result.innerText(), /2026/); assert.match(await result.innerText(), /추정/)
    await page.locator('#csat-kor').fill('84'); await assertGrade(page, 'kor', 2); await page.locator('#csat-eng').fill('89'); await assertGrade(page, 'eng', 2); await page.locator('#csat-hist').fill('39'); await assertGrade(page, 'hist', 2)
    assert.match(await gradeRow(page, 'eng').innerText(), /절대평가/); assert.match(await gradeRow(page, 'hist').innerText(), /절대평가/); assert.doesNotMatch(await gradeRow(page, 'eng').innerText(), /표준점수 약/)
    await page.locator('#csat-eng').fill('1000'); assert.equal(await page.locator('#csat-eng').inputValue(), '100'); await page.locator('#csat-hist').fill('-1'); assert.equal(await page.locator('#csat-hist').inputValue(), '0'); await assertGrade(page, 'hist', 9)
    const table = page.locator('#csat-grade-cut-table'); await page.getByRole('combobox', { name: c('subject'), exact: true }).selectOption('english'); assert.match(await table.innerText(), /절대평가/); assert.equal(await table.locator('thead th').count(), 3)
    await page.getByRole('combobox', { name: c('subject'), exact: true }).selectOption('korLm'); assert.match(await table.innerText(), /2026/); assert.match(await table.innerText(), /추정/); assert.equal(await table.locator('thead th').count(), 5)
    await button(page, c('u.nSum', { n: 2 })).click(); await page.getByRole('spinbutton', { name: c('u.minSumAria'), exact: true }).fill('2'); await page.getByText(c('u.minMine', { n: 2, sum: 2, target: 2 }), { exact: true }).waitFor()
  })
  await run('csat-grade-share-url-real-png-and-basis-text', async args => {
    const { page, context, open } = args; await captureCanvas(context); const query = new URLSearchParams({ kor: '90', math: '85', eng: '89', hist: '39', inq1: '46', inq2: '42', korSel: 'hj', mathSel: 'calc', inq1Type: 'earth1', inq2Type: 'bio1', minN: '4', minSum: '6' })
    await openGrade(args, '?' + query); for (const [id, score] of Object.entries({ kor: '90', math: '85', eng: '89', hist: '39', inq1: '46', inq2: '42' })) assert.equal(await page.locator(`#csat-${id}`).inputValue(), score, `shared score ${id}`)
    assert.equal(await page.getByRole('combobox', { name: c('u.selectAria', { s: c('subjects.math') }), exact: true }).inputValue(), 'calc'); assert.equal(await page.getByRole('spinbutton', { name: c('u.minSumAria'), exact: true }).inputValue(), '6')
    await button(page, share('copyLink')).click(); const url = await page.evaluate(() => navigator.clipboard.readText()); for (const [name, value] of query) assert.equal(new URL(url).searchParams.get(name), value)
    const second = await context.newPage(); await open('csat-grade', new URL(url).search, second); await poll(async () => await second.locator('#csat-kor').inputValue() === '90', 'shared URL restored on new visit'); await assertGrade(second, 'eng', 2); await second.close()
    const image = await png(page, () => button(page, share('save')).click(), 'csat-grade-basis.png'); assert.equal(image.name, 'csat-grade.png'); const canvas = await page.evaluate(() => window.__canvasTexts.filter(item => item.width === 1080 && item.height === 1350)); const text = canvas.map(item => item.text).join('\n')
    assert.match(text, /2026/); assert.match(text, /추정|참고/); assert.match(text, /절대평가/); writeFileSync(resolve(out, 'csat-grade-canvas-text.json'), JSON.stringify(canvas, null, 2))
    await button(page, share('share')).click(); await poll(async () => !!await page.evaluate(() => window.__shared), 'share metadata captured'); const shared = await page.evaluate(() => window.__shared); assert.match(shared.text, /2026/); assert.match(shared.text, /추정|참고/); assert.match(shared.text, /절대평가/); writeFileSync(resolve(out, 'csat-grade-share-metadata.json'), JSON.stringify(shared, null, 2))
    await open('csat-grade', '?subject=english&score=90'); await poll(async () => await page.locator('#csat-eng').inputValue() === '90', 'legacy link restored'); await assertGrade(page, 'eng', 1)
  })
  await run('csat-grade-mobile-dark-first-screen-basis', async args => {
    const { page } = args; await openGrade(args); await mobile(page, page.locator('#csat-grade-context'), 'csat-grade-context'); await inputSizes(page.locator('main')); const box = await page.locator('#csat-grade-context').boundingBox(); assert.ok(box.y < 900, 'basis starts in first viewport')
    await page.locator('#csat-grade-result').evaluate(element => element.scrollIntoView({ block: 'start' })); await page.screenshot({ path: resolve(out, 'csat-grade-result-320-dark.png'), caret: 'initial' }); assert.doesNotMatch(await page.locator('main').innerText(), /csatGrade\.|basis\.[a-zA-Z]/)
  }, { width: 320, dark: true, language: 'en' })
  await run('csat-dday-d2-official-information-and-practice', async args => {
    const { page } = args; await openDday(args); shape('csatDday', 'essentials'); shape('csatDday', 'practice'); const meta = await metadata(page, [/2026년 11월 19일/, /공식/, /연습 타이머/]); writeFileSync(resolve(out, 'csat-dday-metadata.json'), JSON.stringify(meta, null, 2)); const mainText = await page.locator('main').innerText(); assert.match(mainText, /08:10/); assert.doesNotMatch(mainText, /2027 수능은 가채점표 작성이 가능/)
    const sourceLinks = await page.locator('main a[href^="https:"]').evaluateAll(links => links.map(link => ({ label: link.textContent, href: link.href }))); assert.ok(sourceLinks.some(link => /moe\.go\.kr|suneung\.re\.kr|kice\.re\.kr|goe\.go\.kr|sen\.go\.kr/.test(new URL(link.href).hostname))); assert.ok(sourceLinks.some(link => /board|view|download|file/i.test(link.href))); assert.match(mainText, /2026[.\-/년 ]+11/)
    await button(schedulePanel(page), d('schedule.practiceStart')).click(); await schedulePanel(page).getByText(d('schedule.practiceOn'), { exact: true }).waitFor(); assert.match(await schedulePanel(page).innerText(), /80/); await button(schedulePanel(page), d('schedule.practiceStop')).click(); assert.equal(await schedulePanel(page).getByText(d('schedule.practiceOn'), { exact: true }).count(), 0)
    writeFileSync(resolve(out, 'csat-official-source-links.json'), JSON.stringify(sourceLinks, null, 2))
  })
  await run('csat-dday-exam-day-kst-start-break-and-finish', async ({ page, open }) => {
    await page.clock.install({ time: new Date('2026-11-18T23:39:58.000Z') }); await page.clock.pauseAt(new Date('2026-11-18T23:39:59.000Z')); await open('csat-dday'); await page.getByText('D-day', { exact: true }).waitFor(); assert.equal(await button(schedulePanel(page), d('schedule.practiceStart')).count(), 0)
    await page.clock.fastForward(1000); await page.getByText(d('hero.during'), { exact: true }).waitFor(); await schedulePanel(page).getByText(d('schedule.statusNow', { name: d('schedule.slots.kor'), n: 80 }), { exact: true }).waitFor()
    await page.clock.fastForward(80 * 60000); await schedulePanel(page).getByText(d('schedule.statusNext', { name: d('schedule.slots.math'), n: 30 }), { exact: true }).waitFor()
    await page.clock.fastForward(290 * 60000); await schedulePanel(page).getByText(d('schedule.statusNow', { name: d('schedule.slots.inq'), n: 107 }), { exact: true }).waitFor()
    await page.clock.fastForward(175 * 60000); await page.getByText(d('hero.after'), { exact: true }).waitFor(); assert.ok(await page.getByRole('link', { name: d('hero.ctaGrade'), exact: true }).isVisible())
  })
  await run('csat-dday-checklist-answer-storage-and-real-print-pdf', async args => {
    const { page } = args; await openDday(args); const checklist = checklistPanel(page), sheet = sheetPanel(page); await checklist.getByRole('checkbox', { name: d('checklist.items.admitCard'), exact: true }).check(); await checklist.getByRole('checkbox', { name: d('checklist.items.idCard'), exact: true }).check(); assert.deepEqual(await stored(page, 'csatDday.checklist'), { admitCard: true, idCard: true })
    await sheetAnswer(page, 1).fill('2'); await sheetAnswer(page, 3).fill('5'); await sheet.getByRole('textbox', { name: d('sheet.selectPlaceholder'), exact: true }).fill('언어와 매체'); await sheet.getByRole('tab', { name: d('sheet.subjects.math'), exact: true }).click(); await sheetAnswer(page, 16).fill('123'); await sheetAnswer(page, 29).fill('999'); await sheet.getByRole('textbox', { name: d('sheet.selectPlaceholder'), exact: true }).fill('미적분'); const saved = await stored(page, 'csatDday.sheet'); assert.equal(saved.a.math[15], '123'); assert.equal(saved.a.kor[2], '5')
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#csat-print').waitFor({ state: 'attached' }); await poll(async () => await checklistPanel(page).getByRole('checkbox', { name: d('checklist.items.idCard'), exact: true }).isChecked(), 'checklist restored'); assert.equal(await sheetAnswer(page, 1).inputValue(), '2'); await sheetPanel(page).getByRole('tab', { name: d('sheet.subjects.math'), exact: true }).click(); assert.equal(await sheetAnswer(page, 16).inputValue(), '123'); assert.equal(await sheetPanel(page).getByRole('textbox', { name: d('sheet.selectPlaceholder'), exact: true }).inputValue(), '미적분')
    await page.evaluate(() => { window.__printCount = 0; window.print = () => { window.__printCount++ } }); await button(sheetPanel(page), d('sheet.print')).click(); assert.equal(await page.evaluate(() => window.__printCount), 1)
    await page.emulateMedia({ media: 'print' }); await page.locator('#csat-print').waitFor(); assert.equal(await page.locator('#csat-print section').count(), 7); assert.match(await page.locator('#csat-print').innerText(), /미적분/); assert.match(await page.locator('#csat-print').innerText(), /123/); assert.equal(await page.locator('main').isVisible(), false)
    const pdf = await page.pdf({ path: resolve(out, 'csat-answer-sheet.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true }); assert.equal(pdf.toString('ascii', 0, 4), '%PDF'); assert.ok(pdf.length > 10000); await page.locator('#csat-print').screenshot({ path: resolve(out, 'csat-answer-print.png'), caret: 'initial' }); await page.emulateMedia({ media: 'screen' }); assert.deepEqual(await stored(page, 'csatDday.sheet'), saved)
  })
  await run('csat-dday-calendar-download-cheer-link-and-past-filter', async args => {
    const { page, context, open } = args; await openDday(args); const file = await download(page, () => button(page.locator('#csat-timeline'), tr('common', 'addToCalendar')).click(), 'csat-2027-schedule.ics'); const text = file.bytes.toString('utf8').replace(/\r\n /g, ''); assert.equal(file.name, 'csat-2027-schedule.ics'); assert.equal((text.match(/BEGIN:VEVENT/g) ?? []).length, 10); assert.match(text, /DTSTART;VALUE=DATE:20261119/); assert.match(text, /DTSTART;VALUE=DATE:20261211/); assert.match(text, /DTEND;VALUE=DATE:20270108/)
    await page.getByRole('textbox', { name: d('cheer.placeholder'), exact: true }).fill('검증 수험생'); await button(page, share('copyLink')).click(); const link = await page.evaluate(() => navigator.clipboard.readText()); assert.equal(new URL(link).searchParams.get('name'), '검증 수험생'); const second = await context.newPage(); await open('csat-dday', new URL(link).search, second); await second.getByText(d('cheer.banner', { name: '검증 수험생' }), { exact: true }).waitFor(); await second.close()
    await page.clock.setFixedTime(new Date('2026-11-20T03:00:00.000Z')); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByText(d('hero.after'), { exact: true }).waitFor(); const future = await download(page, () => button(page.locator('#csat-timeline'), tr('common', 'addToCalendar')).click(), 'csat-remaining-schedule.ics'); assert.equal((future.bytes.toString('utf8').match(/BEGIN:VEVENT/g) ?? []).length, 9); assert.doesNotMatch(future.bytes.toString('utf8'), /DTSTART;VALUE=DATE:20261119/)
  })
  await run('csat-dday-mobile-subject-timers-restore-without-autostart', async args => {
    const { page, context } = args; await openDday(args); const links = page.locator('main a[href*="/timer"][href*="m="]'); await poll(async () => await links.count() >= 5, 'subject timer links ready'); const targets = await links.evaluateAll(links => links.map(link => ({ label: link.textContent, href: link.href }))); assert.ok(targets.some(item => new URL(item.href).searchParams.get('m') === '80')); assert.ok(targets.some(item => new URL(item.href).searchParams.get('m') === '100'))
    const digits = await page.locator('.ui-hero .grid > div > p:first-child').evaluateAll(items => items.map(element => { const range = document.createRange(); range.selectNodeContents(element); return { text: element.textContent, lines: range.getClientRects().length, textWidth: range.getBoundingClientRect().width, boxWidth: element.getBoundingClientRect().width } })); assert.equal(digits.length, 4); for (const digit of digits) { assert.equal(digit.lines, 1, `Countdown wraps: ${JSON.stringify(digit)}`); assert.ok(digit.textWidth <= digit.boxWidth + 1, `Countdown overflows: ${JSON.stringify(digit)}`) }
    const meta = await metadata(page, [/일반 수험생/, /연습 타이머/]); writeFileSync(resolve(out, 'csat-dday-metadata.json'), JSON.stringify(meta, null, 2)); const direct = page.locator('main a[href*="boardSeq=107599"]'); assert.ok(await direct.count() >= 2, 'essentials and page source both link current official guidance')
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: resolve(out, 'csat-dday-320-dark-top.png'), caret: 'initial' }); const d2 = await page.locator('.ui-hero').getByText('D-2', { exact: true }).boundingBox(); assert.ok(d2.y >= 0 && d2.y + d2.height <= 900, 'D-2 visible in first viewport')
    const panel = page.locator('#csat-practice'); await mobile(page, panel, 'csat-practice-links'); await inputSizes(sheetPanel(page)); for (const link of await links.all()) assert.ok((await link.boundingBox()).height >= 44)
    const target = await context.newPage(); for (const item of targets) {
      const minutes = Number(new URL(item.href).searchParams.get('m')); assert.ok([30, 40, 70, 80, 100].includes(minutes)); await target.goto(item.href); const fields = target.getByRole('group', { name: timer('countdown.setTime'), exact: true }); await fields.waitFor(); await poll(async () => Number(await fields.getByRole('textbox', { name: timer('countdown.hours'), exact: true }).inputValue()) * 60 + Number(await fields.getByRole('textbox', { name: timer('countdown.minutes'), exact: true }).inputValue()) === minutes, `${minutes} minute URL restored`)
      assert.equal(await fields.getByRole('textbox', { name: timer('countdown.seconds'), exact: true }).inputValue(), '0'); assert.ok(await button(target, timer('countdown.start')).isEnabled()); assert.equal(await button(target, timer('countdown.pause')).count(), 0); await target.waitForTimeout(80); assert.ok(await fields.isVisible())
    }; await target.close(); writeFileSync(resolve(out, 'csat-subject-timer-links.json'), JSON.stringify(targets, null, 2))
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1


