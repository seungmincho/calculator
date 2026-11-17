import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Runs against the existing development server. Product calculations/storage are
// real; only the selected localStorage key receives injected quota failures.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch5/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(resolve(`messages/${language}.json`), 'utf8'))]))
const tr = (namespace, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((current, part) => current?.[part], messages[language][namespace])
  assert.equal(typeof value, 'string', `Missing translation: ${language}:${namespace}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const readRaw = (page, key) => page.evaluate(key => localStorage.getItem(key), key)
const readStored = async (page, key) => JSON.parse(await readRaw(page, key))
const results = []
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, serviceWorkers: 'block' })
  const errors = [], external = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    localStorage.setItem('language', options.language ?? 'ko')
    localStorage.setItem('theme', options.dark ? 'dark' : 'light')
  }, options)
  await context.route('**/*', route => {
    if (!route.request().url().startsWith(base)) { external.push(route.request().url()); return route.abort() }
    return route.continue()
  })
  context.on('page', page => {
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /hydration|didn't match|server rendered HTML/i.test(message.text())) errors.push(message.text())
    })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (slug, target = page, query = '') => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' })
    await target.locator('main h1').first().waitFor()
  }
  const startedAt = Date.now()
  try {
    await fn({ page, context, open })
    assert.deepEqual(errors, [], 'JavaScript / hydration errors')
    results.push({ name, pass: true, milliseconds: Date.now() - startedAt, errors, externalRequestsBlocked: external.length })
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - startedAt, error: error.message, errors })
    await context.pages().at(-1)?.screenshot({ path: resolve(out, `${name}-failed.png`), fullPage: true, caret: 'initial' }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
  writeFileSync(resolve(out, `results${only ? '-' + only.replace(/[^\w-]/g, '') : ''}.json`), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2))
}

async function seed(context, storage) {
  await context.addInitScript(storage => {
    if (!/^https?:$/.test(location.protocol) || localStorage.getItem('__batch5Seeded')) return
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    localStorage.setItem('__batch5Seeded', 'yes')
  }, storage)
}

async function failWrites(page, key) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem
    window.__restoreStorage = () => { Storage.prototype.setItem = original }
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Quota exceeded for verification', 'QuotaExceededError')
      return original.call(this, name, value)
    }
  }, key)
}

async function assertMobile(page, panel, name) {
  await panel.scrollIntoViewIfNeeded()
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  const widths = await page.evaluate(() => ({ width: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(widths.body <= widths.width + 1 && widths.document <= widths.width + 1, `Page overflow: ${JSON.stringify(widths)}`)
  const text = await panel.innerText()
  assert.doesNotMatch(text, /(?:taxiFare|gpaCalculator|characterCounter)\.[a-z]|savedTrips\.|scenarios\.|versions\./, 'Untranslated key in panel')
  await page.screenshot({ path: resolve(out, `${name}-320-dark-en.png`), fullPage: true })
}

const fixtures = {
  gpa: {
    scale: '4.5', targetGpa: '4.3', remainingCredits: '10',
    semesters: [
      { id: 'semester-a', isExpanded: true, courses: [
        { id: 'course-old', name: 'Math', credits: 3, grade: 'B0', major: true },
        { id: 'course-pass', name: 'Sports', credits: 1, grade: 'P' },
        { id: 'course-fail', name: 'Seminar', credits: 2, grade: 'NP' },
      ] },
      { id: 'semester-b', isExpanded: true, courses: [
        { id: 'course-new', name: 'Math', credits: 3, grade: 'A0', major: true, retake: true },
        { id: 'course-english', name: 'English', credits: 2, grade: 'A+', major: false },
      ] },
    ],
  },
  writing: { tabs: Array.from({ length: 5 }, (_, index) => ({ title: index === 0 ? 'Application draft' : '', text: index === 0 ? 'First draft.\nKeep this line.' : '', target: index === 0 ? 120 : 500, basis: index === 0 ? 'bytesKr' : 'chars' })), active: 0 },
}
const configs = [
  { id: 'taxi', slug: 'taxi-fare', namespace: 'taxiFare', prefix: 'savedTrips', key: 'toolhub:taxi:saved-trips', field: 'trips', panel: page => page.getByTestId('taxi-saved-trips'), error: 'unavailable' },
  { id: 'gpa', slug: 'gpa-calculator', namespace: 'gpaCalculator', prefix: 'scenarios', key: 'toolhub-gpa-scenarios-v1', field: 'scenarios', panel: page => page.locator('[aria-labelledby="gpa-scenarios-title"]'), error: 'quota', draftKey: 'gpa-calculator-v2' },
  { id: 'writing', slug: 'character-counter', namespace: 'characterCounter', prefix: 'versions', key: 'characterCounter.writingVersions.v1', field: 'versions', panel: page => page.locator('[aria-labelledby="writing-versions-title"]'), error: 'unavailable', draftKey: 'characterCounter.v2' },
]
const tt = (config, key, values) => tr(config.namespace, `${config.prefix}.${key}`, 'ko', values)
const t = (config, key) => tr(config.namespace, key)
async function setup(config, context, extras = {}) {
  await seed(context, { ...(config.draftKey ? { [config.draftKey]: fixtures[config.id] } : {}), ...extras })
}
async function panelReady(config, page) {
  const panel = config.panel(page)
  await panel.waitFor()
  if (config.id === 'taxi' && !(await panel.getAttribute('open') !== null)) await panel.locator('summary').click()
  await panel.getByLabel(tt(config, 'name'), { exact: true }).waitFor()
  return panel
}
async function submitSave(config, page, name) {
  const panel = config.panel(page)
  await panel.getByLabel(tt(config, 'name'), { exact: true }).fill(name)
  await button(panel, tt(config, 'save')).click()
  if (config.id === 'gpa') await button(panel.getByRole('alertdialog'), tt(config, 'confirm.saveAction')).click()
}
async function save(config, page, name) {
  await submitSave(config, page, name)
  await page.waitForFunction(({ key, field, name }) => JSON.parse(localStorage.getItem(key) || 'null')?.[field]?.some(item => item.name === name), { key: config.key, field: config.field, name })
  // Storage writes can precede React's state update by a microtask (Web Locks).
  await config.panel(page).getByRole('status').filter({ hasText: config.id === 'gpa' ? tt(config, 'saved', { name }) : config.id === 'writing' ? tt(config, 'notices.saved') : tt(config, 'saved') }).waitFor()
}
async function restore(config, page, name) {
  const panel = config.panel(page)
  if (config.id === 'taxi') await button(panel.locator('li').filter({ has: page.getByRole('heading', { name, exact: true }) }), tt(config, 'load')).click()
  else if (config.id === 'gpa') {
    await panel.getByRole('combobox').selectOption({ label: name })
    await button(panel, tt(config, 'load')).click()
    await button(panel.getByRole('alertdialog'), tt(config, 'confirm.loadAction')).click()
  } else {
    await panel.getByRole('button', { name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click()
    await button(panel, tt(config, 'restore')).click()
    await button(panel, tt(config, 'confirmRestoreButton')).click()
  }
}
async function storedItems(config, page) { return (await readStored(page, config.key))?.[config.field] ?? [] }
async function refresh(config, page) {
  await button(config.panel(page), tt(config, 'refresh')).first().click()
  await config.panel(page).getByRole('alert').waitFor({ state: 'hidden' })
}
function assertTranslationShape(config) {
  const flatten = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' && value !== null ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}:${typeof value}`]).sort()
  const ko = messages.ko[config.namespace][config.prefix], en = messages.en[config.namespace][config.prefix]
  assert.ok(ko && en, `Missing locale section: ${config.namespace}.${config.prefix}`)
  assert.deepEqual(flatten(ko), flatten(en), 'Added Korean and English key structures differ')
}

try {
  await run('writing-no-web-locks-fallback', async ({ page, context, open }) => {
    const config = configs.find(config => config.id === 'writing')
    await context.addInitScript(() => { Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined }) })
    await setup(config, context)
    await open(config.slug)
    await panelReady(config, page)
    await page.waitForFunction(text => document.querySelector('textarea')?.value === text, fixtures.writing.tabs[0].text)
    await page.getByRole('textbox', { name: t(config, 'input.aria'), exact: true }).fill('Fallback draft remains usable.')
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.tabs[0]?.text === 'Fallback draft remains usable.', config.draftKey)
    await save(config, page, 'Fallback version')
    assert.equal((await storedItems(config, page))[0].text, 'Fallback draft remains usable.')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await panelReady(config, page)
    await restore(config, page, 'Fallback version')
    assert.equal(await page.getByRole('textbox', { name: t(config, 'input.aria'), exact: true }).inputValue(), 'Fallback draft remains usable.')
  })
  for (const config of configs) {
    await run(`${config.id}-save-compare-restore-revisit`, async ({ page, context, open }) => {
      assertTranslationShape(config)
      await setup(config, context)
      await open(config.slug)
      const panel = await panelReady(config, page)
      if (config.id === 'taxi') {
        await page.locator('#taxi-distance').fill('12.3')
        await page.locator('#taxi-time').fill('42')
        await page.locator('#taxi-region').selectOption('busan')
      }
      await save(config, page, 'Baseline')
      const first = (await storedItems(config, page))[0]
      if (config.id === 'taxi') {
        assert.equal(first.conditions.distance, 12.3)
        assert.equal(first.conditions.time, 42)
        assert.equal(first.conditions.timeAuto, false)
        assert.equal(first.conditions.region, 'busan')
        const result = await page.locator('#taxi-result').innerText()
        await page.locator('#taxi-distance').fill('3')
        await page.locator('#taxi-time').fill('9')
        await page.locator('#taxi-region').selectOption('seoul')
        await restore(config, page, 'Baseline')
        assert.equal(await page.locator('#taxi-distance').inputValue(), '12.3')
        assert.equal(await page.locator('#taxi-time').inputValue(), '42')
        assert.equal(await page.locator('#taxi-region').inputValue(), 'busan')
        assert.equal(await page.locator('#taxi-result').innerText(), result)
        const url = new URL(page.url())
        assert.ok([...url.searchParams.values()].includes('12.3'), 'Loaded distance retained in URL')
        await button(panel, tt(config, 'rename')).click()
        await panel.getByLabel(tt(config, 'newName'), { exact: true }).fill('Renamed baseline')
        await button(panel, tt(config, 'renameSave')).click()
        await panel.getByRole('heading', { name: 'Renamed baseline', exact: true }).waitFor()
      } else if (config.id === 'gpa') {
        assert.deepEqual(first.snapshot, fixtures.gpa)
        assert.match(await page.locator('#gpa-calculator-result').innerText(), /4\.20/)
        await page.getByRole('combobox', { name: t(config, 'grade'), exact: true }).last().selectOption('A0')
        await panel.getByText(/-0\.20/).waitFor()
        assert.match(await panel.innerText(), /4\.00 \/ 4\.5/)
        assert.match(await panel.innerText(), /4\.20 \/ 4\.5/)
        await restore(config, page, 'Baseline')
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('gpa-calculator-v2'))?.semesters[1]?.courses[1]?.grade === 'A+')
        assert.deepEqual(await readStored(page, config.draftKey), fixtures.gpa)
      } else {
        assert.equal(first.text, fixtures.writing.tabs[0].text)
        await page.getByRole('textbox', { name: t(config, 'input.aria'), exact: true }).fill('Edited manuscript with more words.')
        await page.getByRole('textbox', { name: t(config, 'tabs.titleAria'), exact: true }).fill('Changed title')
        assert.match(await panel.innerText(), /Edited manuscript with more words\./)
        assert.match(await panel.innerText(), /First draft\./)
        await restore(config, page, 'Baseline')
        await page.waitForFunction(({ key, text }) => JSON.parse(localStorage.getItem(key))?.tabs[0]?.text === text, { key: config.draftKey, text: first.text })
        assert.deepEqual((await readStored(page, config.draftKey)).tabs[0], fixtures.writing.tabs[0])
      }
      await page.reload({ waitUntil: 'domcontentloaded' })
      await panelReady(config, page)
      assert.equal((await storedItems(config, page)).length, 1)
      await restore(config, page, config.id === 'taxi' ? 'Renamed baseline' : 'Baseline')
      if (config.id !== 'taxi') {
        await button(panel, tt(config, 'delete')).click()
        await button(panel, tt(config, config.id === 'gpa' ? 'confirm.deleteAction' : 'confirmDeleteButton')).click()
      } else {
        await button(panel, tt(config, 'delete')).click()
        await button(panel, tt(config, 'deleteConfirm')).click()
      }
      await page.waitForFunction(({ key, field }) => JSON.parse(localStorage.getItem(key))?.[field]?.length === 0, { key: config.key, field: config.field })
    })

    await run(`${config.id}-quota-retains-saved-and-current`, async ({ page, context, open }) => {
      await setup(config, context)
      await open(config.slug)
      const panel = await panelReady(config, page)
      await save(config, page, 'Keep saved record')
      const before = await readRaw(page, config.key)
      if (config.id === 'taxi') await page.locator('#taxi-distance').fill('8.8')
      if (config.id === 'gpa') {
        await page.getByRole('textbox', { name: t(config, 'courseName'), exact: true }).first().fill('Unsaved edit')
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.semesters[0]?.courses[0]?.name === 'Unsaved edit', config.draftKey)
      }
      if (config.id === 'writing') {
        await page.getByRole('textbox', { name: t(config, 'input.aria'), exact: true }).fill('Keep my unsaved manuscript')
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.tabs[0]?.text === 'Keep my unsaved manuscript', config.draftKey)
      }
      const draftBefore = config.draftKey ? await readRaw(page, config.draftKey) : null
      await failWrites(page, config.key)
      await submitSave(config, page, 'Failed save title')
      await panel.getByRole('alert').filter({ hasText: tt(config, `errors.${config.error}`) }).waitFor()
      assert.equal(await readRaw(page, config.key), before)
      assert.equal(await panel.getByLabel(tt(config, 'name'), { exact: true }).inputValue(), 'Failed save title')
      if (config.draftKey) assert.equal(await readRaw(page, config.draftKey), draftBefore)
      else assert.equal(await page.locator('#taxi-distance').inputValue(), '8.8')
      await page.evaluate(() => window.__restoreStorage())
      await save(config, page, 'Recovered save')
      assert.equal((await storedItems(config, page)).length, 2)
    })

    await run(`${config.id}-corrupt-and-future-data-preserved`, async ({ page, context, open }) => {
      const corrupt = '{"version":1,"broken":'
      await setup(config, context, { [config.key]: corrupt })
      await open(config.slug)
      const panel = await panelReady(config, page)
      await panel.getByRole('alert').waitFor()
      assert.equal(await readRaw(page, config.key), corrupt)
      assert.ok(await button(panel, tt(config, 'save')).isDisabled())
      if (config.draftKey) assert.deepEqual(await readStored(page, config.draftKey), fixtures[config.id])
      const future = JSON.stringify({ version: 999, protectedOriginal: 'Keep future-version data' })
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: config.key, raw: future })
      await button(panel, tt(config, 'refresh')).first().click()
      await panel.getByRole('alert').waitFor()
      assert.equal(await readRaw(page, config.key), future)
      assert.ok(await button(panel, tt(config, 'save')).isDisabled())
      await page.evaluate(key => localStorage.removeItem(key), config.key)
      await refresh(config, page)
      await save(config, page, 'After storage repair')
      assert.equal((await storedItems(config, page)).length, 1)
    })

    await run(`${config.id}-two-tabs-detect-stale-and-retry`, async ({ page, context, open }) => {
      await setup(config, context)
      await open(config.slug)
      await panelReady(config, page)
      await save(config, page, 'Original')
      const second = await context.newPage()
      await open(config.slug, second)
      const secondPanel = await panelReady(config, second)
      await secondPanel.getByLabel(tt(config, 'name'), { exact: true }).fill('Second tab draft')
      // Hold the real Web Lock briefly so both UI actions start from the same
      // persisted snapshot, then release them to exercise the actual race.
      await page.evaluate(key => new Promise(ready => {
        navigator.locks.request(key, async () => {
          ready()
          await new Promise(release => { window.__releaseVerificationLock = release })
        })
      }), config.key)
      await submitSave(config, page, 'First tab addition')
      await submitSave(config, second, 'Second tab draft')
      await page.evaluate(() => window.__releaseVerificationLock())
      await page.waitForFunction(({ key, field }) => JSON.parse(localStorage.getItem(key))?.[field]?.some(item => item.name === 'First tab addition'), { key: config.key, field: config.field })
      await secondPanel.getByRole('alert').filter({ hasText: tt(config, 'errors.conflict') }).waitFor()
      assert.ok(await button(secondPanel, tt(config, 'save')).isDisabled())
      assert.equal(await secondPanel.getByLabel(tt(config, 'name'), { exact: true }).inputValue(), 'Second tab draft')
      assert.deepEqual((await storedItems(config, second)).map(item => item.name).sort(), ['First tab addition', 'Original'])
      await refresh(config, second)
      await save(config, second, 'Second tab addition')
      assert.deepEqual((await storedItems(config, page)).map(item => item.name).sort(), ['First tab addition', 'Original', 'Second tab addition'])
      await config.panel(page).getByRole('alert').filter({ hasText: tt(config, 'errors.conflict') }).waitFor()
      await refresh(config, page)
      await restore(config, page, 'Second tab addition')
    })

    await run(`${config.id}-mobile-320-dark-english-setting`, async ({ page, context, open }) => {
      assertTranslationShape(config)
      await setup(config, context)
      await open(config.slug)
      const panel = await panelReady(config, page)
      await save(config, page, 'LongNameabcdefghijklmnopqrstuvwxyz123456')
      await restore(config, page, 'LongNameabcdefghijklmnopqrstuvwxyz123456')
      await assertMobile(page, panel, config.id)
    }, { width: 320, dark: true, language: 'en' })

    await run(`${config.id}-existing-input-isolation-and-recovery`, async ({ page, context, open }) => {
      if (config.id === 'taxi') {
        const conditions = { distance: 24, time: 72, timeAuto: true, traffic: 'normal', region: 'busan', taxiType: 'regular', hour: 23, outOfCity: true, people: 3 }
        await setup(config, context, { [config.key]: { version: 1, trips: [{ id: 'existing-trip', name: 'Saved commute', conditions }] } })
        await open(config.slug, page, '?distance=2&region=seoul&hour=10&n=1')
        await panelReady(config, page)
        assert.equal(await page.locator('#taxi-distance').inputValue(), '2', 'Saved trip must not silently replace URL input')
        assert.equal(await page.locator('#taxi-region').inputValue(), 'seoul')
        await restore(config, page, 'Saved commute')
        assert.equal(await page.locator('#taxi-distance').inputValue(), '24')
        assert.equal(await page.locator('#taxi-time').inputValue(), '72')
        await page.locator('#taxi-distance').fill('10')
        assert.equal(await page.locator('#taxi-time').inputValue(), '30', 'Restored automatic time continues recalculating')
        assert.equal((await storedItems(config, page))[0].conditions.distance, 24, 'Editing restored input does not edit saved snapshot')
      } else if (config.id === 'gpa') {
        await setup(config, context, { [config.key]: { version: 1, revision: 'fixture-revision', scenarios: [{ id: 'saved-gpa', name: 'Private grades', createdAt: '2026-11-16T00:00:00.000Z', snapshot: fixtures.gpa }] } })
        const before = JSON.stringify(fixtures.gpa)
        await open(config.slug, page, `?scale=4.3&c=${encodeURIComponent('SharedCourse~3~A-~m')}&target=4.1&rem=12`)
        const panel = await panelReady(config, page)
        await page.waitForFunction(() => document.querySelector('input[id^="gpa-course-"]')?.value === 'SharedCourse')
        assert.equal(await page.getByRole('textbox', { name: t(config, 'courseName'), exact: true }).first().inputValue(), 'SharedCourse')
        assert.equal(await readRaw(page, config.draftKey), before)
        await panel.getByRole('combobox').selectOption({ label: 'Private grades' })
        await panel.getByText(tt(config, 'differentScale'), { exact: true }).waitFor()
        await restore(config, page, 'Private grades')
        await page.waitForFunction(() => new URL(location.href).searchParams.get('c')?.includes('Math'))
        assert.equal(await readRaw(page, config.draftKey), before, 'Restoring in shared session must preserve private autosave bytes')
        assert.equal(new URL(page.url()).searchParams.get('scale'), '4.5')
        await save(config, page, 'Explicit shared-session snapshot')
        assert.equal(await readRaw(page, config.draftKey), before)
      } else {
        await setup(config, context)
        await open(config.slug)
        await panelReady(config, page)
        await save(config, page, 'First item version')
        await page.getByRole('tab').nth(1).click()
        await page.getByRole('textbox', { name: t(config, 'tabs.titleAria'), exact: true }).fill('Second item draft')
        await page.getByRole('textbox', { name: t(config, 'input.aria'), exact: true }).fill('Preserve the second item too.')
        await page.getByLabel(t(config, 'target.limit'), { exact: true }).fill('300')
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.tabs[1]?.target === 300, config.draftKey)
        const secondBefore = (await readStored(page, config.draftKey)).tabs[1]
        await restore(config, page, 'First item version')
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.tabs[1]?.title === 'Application draft', config.draftKey)
        const restored = await readStored(page, config.draftKey)
        assert.deepEqual(restored.tabs[0], fixtures.writing.tabs[0])
        assert.deepEqual(restored.tabs[1], fixtures.writing.tabs[0])
        await button(page, t(config, 'tools.undo')).click()
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.tabs[1]?.title === 'Second item draft', config.draftKey)
        assert.deepEqual((await readStored(page, config.draftKey)).tabs[1], secondBefore, 'Undo restores text, title, basis, and target')
      }
    })
  }
} finally {
  await browser.close()
}
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, localeScope: 'Added ko/en key parity and functional behavior with language=en. The common renderer remains Korean-only.', results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
