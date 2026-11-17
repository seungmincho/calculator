import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import JSZip from 'jszip'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch11/browser')
const only = process.argv[2]
const decoderUrl = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, values = {}, language = 'ko') => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const tt = (config, key, values) => tr(config.ns, config.prefix + '.' + key, values)
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
  await context.route('**/*', route => { const url = route.request().url(); if (url.startsWith(base) || (options.decoder && url === decoderUrl)) return route.continue(); external.push(url); return route.abort() })
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
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch11Seeded')) return
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch11Seeded', '1')
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
  assert.doesNotMatch(await panel.innerText(), /(?:backup|scenarioBackup)\.[a-z]/)
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
const stamp = '2026-11-16T00:00:00.000Z'
const gpaDraft = { scale: '4.5', targetGpa: '4.3', remainingCredits: '10', semesters: [
  { id: 'semester-a', isExpanded: true, courses: [{ id: 'old', name: '수학', credits: 3, grade: 'B0', major: true }, { id: 'pass', name: 'Sports', credits: 1, grade: 'P' }, { id: 'fail', name: 'Seminar', credits: 2, grade: 'NP' }] },
  { id: 'semester-b', isExpanded: true, courses: [{ id: 'retake', name: '수학', credits: 3, grade: 'A0', major: true, retake: true }, { id: 'english', name: 'English', credits: 2, grade: 'A+', major: false }] },
] }
const writingDraft = { tabs: Array.from({ length: 5 }, (_, index) => ({ title: `Current tab ${index + 1}`, text: `Current text ${index + 1}\nPreserve this.`, target: 120 + index, basis: index === 0 ? 'bytesKr' : 'chars' })), active: 0 }
for (const semester of gpaDraft.semesters) for (const course of semester.courses) { course.major ??= false; course.retake ??= false }
const configs = [
  { id: 'team', slug: 'team-divider', ns: 'teamDivider', prefix: 'backup', key: 'toolhub-team-rosters-v1', field: 'rosters', format: 'toolhub-team-rosters', max: 10, bytes: 2 * 1024 * 1024, selector: '[data-team-roster-backup]', exportKey: 'download', addKey: 'apply', nameKey: 'title',
    items: [{ id: 'roster-a', title: '평일 모임', names: ['Alpha', 'Beta', 'Gamma', 'Delta'], skills: { Alpha: 1, Beta: 2, Gamma: 4, Delta: 5 }, teamCount: 2, mode: 'balanced', updatedAt: 1794787200000 }, { id: 'roster-b', title: '주말 모임', names: ['Alpha', 'Beta', 'Gamma', 'Delta'], skills: { Alpha: 1, Beta: 2, Gamma: 4, Delta: 5 }, teamCount: 2, mode: 'balanced', updatedAt: 1794787200000 }] },
  { id: 'gpa', slug: 'gpa-calculator', ns: 'gpaCalculator', prefix: 'scenarioBackup', key: 'toolhub-gpa-scenarios-v1', field: 'scenarios', format: 'toolhub-gpa-scenarios', max: 8, bytes: 16 * 1024 * 1024, selector: '[aria-labelledby="gpa-backup-title"]', exportKey: 'download', addKey: 'add', nameKey: 'name', draftKey: 'gpa-calculator-v2', draft: gpaDraft,
    items: [{ id: 'scenario-a', name: 'Stored grades', createdAt: stamp, snapshot: gpaDraft }] },
  { id: 'writing', slug: 'character-counter', ns: 'characterCounter', prefix: 'backup', key: 'characterCounter.writingVersions.v1', field: 'versions', format: 'toolhub-writing-versions', max: 20, bytes: 2 * 1024 * 1024, selector: '[aria-labelledby="writing-backup-title"]', exportKey: 'export', addKey: 'add', nameKey: 'name', draftKey: 'characterCounter.v2', draft: writingDraft,
    items: [{ id: 'version-a', name: '원고 수정본', title: 'Stored title', text: '저장한 글\n백업의 \"따옴표\"와\t탭 보존.', target: 500, basis: 'charsNoSpace', sourceTab: 4, createdAt: stamp }] },
]
const panel = (config, page) => page.locator(config.selector)
const envelope = (config, items = config.items) => ({ format: config.format, version: 1, exportedAt: stamp, [config.field]: items })
const storeEnvelope = (config, items) => config.id === 'team' ? items : { version: 1, ...(config.id === 'gpa' ? { revision: 'fixture-revision' } : {}), [config.field]: items }
async function items(config, page) { const value = await stored(page, config.key); return config.id === 'team' ? value ?? [] : value?.[config.field] ?? [] }
function fileValue(value, name = 'fixture.json') { return { name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) } }
async function choose(config, page, value, name) { await panel(config, page).locator('input[type="file"]').setInputFiles(typeof value === 'string' && value.startsWith(out) ? value : fileValue(value, name)) }
async function ready(config, page) {
  await panel(config, page).waitFor()
  await poll(async () => await panel(config, page).locator('input[type="file"]').isEnabled(), `${config.id} storage ready`)
  if (config.id === 'gpa') await poll(async () => isDeepStrictEqual(await stored(page, config.draftKey), config.draft), 'GPA draft restored')
  if (config.id === 'writing') await poll(async () => await page.getByRole('textbox', { name: tr(config.ns, 'input.aria'), exact: true }).inputValue() === config.draft.tabs[0].text, 'writing draft restored')
}
async function setup(config, args, records = config.items) {
  await seed(args.context, { [config.key]: storeEnvelope(config, records), ...(config.draftKey ? { [config.draftKey]: config.draft } : {}) })
  await args.open(config.slug); await ready(config, args.page)
}
async function currentWork(config, page, prepare = false) {
  if (config.id !== 'team') return raw(page, config.draftKey)
  if (prepare) {
    await page.locator('input[value="balanced"]').check(); await button(page, tr(config.ns, 'divide')).click()
    await poll(async () => await page.locator('[data-member][aria-hidden="false"]').count() === 6, 'current team result revealed')
    const person = await page.locator('[data-member]').first().getAttribute('data-member')
    await button(page, tr(config.ns, 'board.lock', { name: person })).click()
  }
  return page.locator('[data-team]').evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll('[data-member]')].map(member => ({ name: member.dataset.member, locked: member.querySelectorAll('button')[1].getAttribute('aria-pressed') }))))
}
async function preview(config, page, count) { await poll(async () => await panel(config, page).getByRole('checkbox').count() === count, `${config.id} preview ${count}`) }
async function apply(config, page, count) { await button(panel(config, page), tt(config, config.addKey)).click(); await poll(async () => (await items(config, page)).length === count, `${config.id} imported ${count}`) }

try {
  for (const config of configs) {
    await run(`${config.id}-backup-real-file-roundtrip-current-work-and-duplicates`, async args => {
      const { page, open } = args; shape(config.ns, config.prefix); await setup(config, args)
      const exported = await download(page, () => button(panel(config, page), tt(config, config.exportKey)).click(), `${config.id}-backup.json`)
      const backup = JSON.parse(exported.bytes.toString('utf8')); assert.equal(backup.format, config.format); assert.equal(backup.version, 1); assert.deepEqual(backup[config.field], config.items)
      assert.ok(Number.isFinite(Date.parse(backup.exportedAt)))
      await page.evaluate(key => localStorage.removeItem(key), config.key); await open(config.slug); await ready(config, page)
      if (config.id === 'writing') {
        await button(page, tr(config.ns, 'actions.clear')).click()
        await poll(async () => JSON.parse(await raw(page, config.draftKey)).tabs[0].text === '', 'clear created existing undo state')
      }
      const current = await currentWork(config, page, true), original = await raw(page, config.key)
      await choose(config, page, exported.path); await preview(config, page, config.items.length)
      assert.equal(await raw(page, config.key), original, 'file selection only previews')
      for (const checkbox of await panel(config, page).getByRole('checkbox').all()) assert.ok(await checkbox.isChecked())
      await apply(config, page, config.items.length); assert.deepEqual(await items(config, page), config.items)
      assert.deepEqual(await currentWork(config, page), current, 'import never changes current work')
      if (config.id === 'writing') {
        assert.ok(await button(page, tr(config.ns, 'tools.undo')).isEnabled()); await button(page, tr(config.ns, 'tools.undo')).click()
        await poll(async () => JSON.stringify(await stored(page, config.draftKey)) === JSON.stringify(config.draft), 'undo state survives backup import')
      }
      await choose(config, page, exported.path); await preview(config, page, config.items.length)
      for (const checkbox of await panel(config, page).getByRole('checkbox').all()) assert.ok(await checkbox.isDisabled())
      assert.ok(await button(panel(config, page), tt(config, config.addKey)).isDisabled())
    })
    await run(`${config.id}-backup-conflict-copy-quota-and-stale-tab`, async args => {
      const { page, context, open } = args; await setup(config, args)
      const incoming = structuredClone(config.items[0]); incoming[config.nameKey] += ' changed'
      if (config.id === 'team') incoming.skills.Alpha = 3
      if (config.id === 'gpa') incoming.snapshot.targetGpa = '4.4'
      if (config.id === 'writing') incoming.text += '\nChanged saved revision'
      const input = envelope(config, [incoming]), before = await raw(page, config.key), current = await currentWork(config, page, true)
      await choose(config, page, input); await preview(config, page, 1)
      assert.equal(await panel(config, page).getByRole('checkbox').isChecked(), false, 'ID collision requires explicit selection')
      await panel(config, page).getByRole('checkbox').check(); await quota(page, config.key)
      await button(panel(config, page), tt(config, config.addKey)).click(); await panel(config, page).getByRole('alert').waitFor()
      assert.equal(await raw(page, config.key), before); assert.ok(await panel(config, page).getByRole('checkbox').isChecked()); assert.deepEqual(await currentWork(config, page), current)
      await page.evaluate(() => window.__restoreStorage()); await apply(config, page, config.items.length + 1)
      const after = await items(config, page)
      for (const original of config.items) assert.deepEqual(after.find(item => item.id === original.id), original)
      const copied = after.find(item => !config.items.some(original => original.id === item.id))
      assert.notEqual(copied.id, incoming.id); assert.deepEqual(await currentWork(config, page), current)
      if (config.id === 'team') assert.deepEqual(copied.importOrigin, { id: incoming.id, title: incoming.title, copyTitle: copied.title })
      await choose(config, page, input); await preview(config, page, 1); assert.ok(await panel(config, page).getByRole('checkbox').isDisabled(), 'same conflict copy is detected by content')
      await button(panel(config, page), tt(config, 'cancel')).click()
      const newcomer = { ...incoming, id: 'newcomer', [config.nameKey]: 'New incoming record' }
      await choose(config, page, envelope(config, [newcomer])); await preview(config, page, 1)
      const second = await context.newPage(); await open(config.slug, '', second)
      const changed = storeEnvelope(config, config.items)
      await second.evaluate(({ key, changed }) => localStorage.setItem(key, JSON.stringify(changed)), { key: config.key, changed })
      await poll(async () => await panel(config, page).evaluate((element, label) => { const action = [...element.querySelectorAll('button')].find(button => button.textContent === label); return !action || action.disabled }, tt(config, config.addKey)), 'stale preview cannot apply')
      assert.deepEqual(await items(config, page), config.items); assert.deepEqual(await currentWork(config, page), current)
    })
    await run(`${config.id}-backup-invalid-files-size-limit-and-cancelled-read`, async args => {
      const { page } = args; await setup(config, args); const before = await raw(page, config.key)
      const variants = ['{broken', { ...envelope(config), format: 'another-tool' }, { ...envelope(config), version: 99 }, envelope(config, [config.items[0], config.items[0]])]
      for (let index = 0; index < variants.length; index++) {
        await choose(config, page, variants[index], `invalid-${index}.json`); await panel(config, page).getByRole('alert').waitFor(); assert.equal(await raw(page, config.key), before)
      }
      await page.evaluate(() => { window.__fileReads = 0; const original = File.prototype.text; window.__restoreFile = () => { File.prototype.text = original }; File.prototype.text = function(...args) { window.__fileReads++; return original.apply(this, args) } })
      await panel(config, page).locator('input[type="file"]').setInputFiles({ name: 'oversize.json', mimeType: 'application/json', buffer: Buffer.alloc(config.bytes + 1, 32) })
      await panel(config, page).getByRole('alert').waitFor(); assert.equal(await page.evaluate(() => window.__fileReads), 0, 'oversize file rejected before reading')
      assert.equal(await raw(page, config.key), before); await page.evaluate(() => window.__restoreFile())
      await page.evaluate(() => { const original = File.prototype.text; window.__restoreFile = () => { File.prototype.text = original }; File.prototype.text = function() { const file = this; return new Promise(resolve => { window.__finishFile = async () => resolve(await original.call(file)) }) } })
      await choose(config, page, envelope(config), 'slow.json'); await button(panel(config, page), tt(config, 'cancel')).click()
      await page.evaluate(() => window.__finishFile()); await page.evaluate(() => window.__restoreFile()); await new Promise(resolve => setTimeout(resolve, 150))
      assert.equal(await panel(config, page).getByRole('checkbox').count(), 0); assert.equal(await raw(page, config.key), before)
    })
    await run(`${config.id}-backup-mobile-capacity-and-preview`, async args => {
      const { page } = args
      const full = Array.from({ length: config.max }, (_, index) => ({ ...structuredClone(config.items[0]), id: `full-${index}`, [config.nameKey]: `Stored ${index + 1}` }))
      await setup(config, args, full)
      const newcomer = { ...structuredClone(config.items[0]), id: 'mobile-new', [config.nameKey]: '추가할 기록' }
      const before = await raw(page, config.key); await choose(config, page, envelope(config, [newcomer])); await preview(config, page, 1)
      assert.ok(await button(panel(config, page), tt(config, config.addKey)).isDisabled()); await panel(config, page).getByRole('alert').waitFor()
      assert.equal(await raw(page, config.key), before); await mobile(page, panel(config, page), config.id)
    }, { width: 320, dark: true, language: 'en' })
  }
  await run('team-backup-renamed-conflict-copy-is-not-duplicate', async args => {
    const config = configs.find(config => config.id === 'team'), { page } = args
    const incoming = structuredClone(config.items[0]); incoming.skills.Alpha = 3
    const copied = { ...structuredClone(incoming), id: 'previous-copy', title: '사용자가 바꾼 복사본 이름', importOrigin: { id: incoming.id, title: incoming.title, copyTitle: '평일 모임 (복사 1)' } }
    await setup(config, args, [...config.items, copied]); const before = await raw(page, config.key)
    await choose(config, page, envelope(config, [incoming])); await preview(config, page, 1)
    const checkbox = panel(config, page).getByRole('checkbox'); assert.ok(await checkbox.isEnabled()); assert.equal(await checkbox.isChecked(), false)
    assert.equal(await raw(page, config.key), before); await checkbox.check(); await apply(config, page, 4)
    assert.deepEqual((await items(config, page))[2], copied, 'renamed earlier copy retained as separate content')
  })
  await run('gpa-backup-late-failed-add-keeps-newer-file-preview', async args => {
    const config = configs.find(config => config.id === 'gpa'), { page } = args; await setup(config, args)
    const a = { ...structuredClone(config.items[0]), id: 'file-a', name: 'File A' }, b = { ...structuredClone(config.items[0]), id: 'file-b', name: 'File B' }
    await choose(config, page, envelope(config, [a]), 'a.json'); await preview(config, page, 1)
    await page.evaluate(key => { window.__lockHeld = false; window.__holdingLock = navigator.locks.request(key, async () => { window.__lockHeld = true; await new Promise(resolve => { window.__releaseLock = resolve }) }) }, config.key)
    await poll(async () => await page.evaluate(() => window.__lockHeld), 'verification lock acquired')
    await button(panel(config, page), tt(config, config.addKey)).click()
    await choose(config, page, envelope(config, [b]), 'b.json'); await preview(config, page, 1)
    await panel(config, page).getByText('File B', { exact: true }).waitFor()
    await page.evaluate(async () => { window.__releaseLock(); await window.__holdingLock })
    await poll(async () => await button(panel(config, page), tt(config, config.addKey)).isEnabled(), 'newer preview remains actionable')
    assert.ok(await panel(config, page).getByRole('checkbox').isChecked()); await panel(config, page).getByText('File B', { exact: true }).waitFor()
    assert.equal((await items(config, page)).length, 1)
    await apply(config, page, 2); assert.ok((await items(config, page)).some(item => item.id === 'file-b')); assert.equal((await items(config, page)).some(item => item.id === 'file-a'), false)
  })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
