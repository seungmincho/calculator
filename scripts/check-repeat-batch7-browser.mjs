import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-batch7/browser')
const only = process.argv[2]
const ko = JSON.parse(readFileSync('messages/ko.json', 'utf8')).teamDivider
const en = JSON.parse(readFileSync('messages/en.json', 'utf8')).teamDivider
const t = (key, values = {}) => key.split('.').reduce((object, key) => object[key], ko).replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
const button = (page, name) => page.getByRole('button', { name, exact: true })
const teams = page => page.locator('[data-team]').evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll('[data-member]')].map(member => member.dataset.member)))
const rotation = page => page.locator('[aria-labelledby="team-rotation-title"]')
const results = []
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
async function run(name, fn, options = {}) {
  if (only && !name.includes(only)) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' })
  const errors = []
  await context.addInitScript(options => { if (!/^https?:$/.test(location.protocol)) return; localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('language', options.language ?? 'ko') }, options)
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort())
  context.on('page', page => {
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && /hydration|didn't match|server rendered HTML/i.test(message.text())) errors.push(message.text()) })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  try {
    await page.goto(`${base}/team-divider/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('[aria-labelledby="team-rosters-title"] input')?.disabled === false)
    await fn({ page, context })
    assert.deepEqual(errors, [])
    results.push({ name, pass: true, errors })
  } catch (error) {
    results.push({ name, pass: false, error: error.message, errors })
    await page.screenshot({ path: resolve(out, name + '-failed.png'), caret: 'initial' }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
  writeFileSync(resolve(out, `results${only ? '-' + only : ''}.json`), JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2))
}
async function divide(page) { await button(page, t('divide')).click(); await page.locator('[data-member]').nth(5).waitFor() }
async function rotate(page) { await button(page, t('rotation.action')).click(); await page.locator('[data-repeated-pairs]').waitFor() }
const pairSet = teams => new Set(teams.flatMap(team => team.flatMap((first, index) => team.slice(index + 1).map(second => [first, second].sort().join('|')))))
async function verifyCount(page, previous) {
  const current = await teams(page), oldPairs = pairSet(previous), newPairs = pairSet(current)
  const repeated = [...newPairs].filter(pair => oldPairs.has(pair)).length
  assert.equal(Number(await page.locator('[data-repeated-pairs]').getAttribute('data-repeated-pairs')), repeated)
  assert.equal(Number(await page.locator('[data-previous-pairs]').getAttribute('data-previous-pairs')), oldPairs.size)
  assert.deepEqual(current.flat().sort(), previous.flat().sort())
  assert.equal(new Set(current.flat()).size, current.flat().length)
  return repeated
}
try {
  await run('rotation-counts-and-two-level-undo', async ({ page }) => {
    await divide(page)
    const first = await teams(page)
    assert.equal(await page.locator('[data-team-rotation]').count(), 0)
    await rotate(page)
    const repeated = await verifyCount(page, first)
    assert.ok(repeated < pairSet(first).size)
    const second = await teams(page), metadata = await page.locator('[data-team-rotation]').innerText()
    await rotate(page)
    await verifyCount(page, second)
    await button(page, t('board.undo')).click()
    assert.deepEqual(await teams(page), second)
    assert.equal(await page.locator('[data-team-rotation]').innerText(), metadata)
    await button(page, t('board.undo')).click()
    assert.deepEqual(await teams(page), first)
    assert.equal(await page.locator('[data-team-rotation]').count(), 0)
  })
  await run('rotation-move-swap-drag-undo-and-real-share', async ({ page, context }) => {
    await divide(page)
    const original = await teams(page)
    await rotate(page)
    const rotated = await teams(page), person = rotated[0][0], other = rotated[1][0]
    await button(page, `${person} 선택`).click(); await button(page, '2팀으로 이동').click()
    assert.ok((await teams(page))[1].includes(person))
    await verifyCount(page, original)
    await rotation(page).getByText(t('rotation.editedHint'), { exact: true }).waitFor()
    await button(page, t('board.undo')).click()
    assert.deepEqual(await teams(page), rotated)
    await button(page, `${person} 선택`).click(); await button(page, `${other} 선택`).click()
    assert.ok((await teams(page))[1].includes(person)); assert.ok((await teams(page))[0].includes(other))
    await verifyCount(page, original)
    await button(page, t('board.undo')).click()
    await page.locator('[data-team="0"] [data-member]').first().dragTo(page.locator('[data-team="1"]'))
    assert.ok((await teams(page))[1].includes(person))
    await verifyCount(page, original)
    await button(page, '링크 복사').click()
    const handle = await page.waitForFunction(async () => { const value = await navigator.clipboard.readText(); return value.includes('#board=') ? value : false })
    const link = await handle.jsonValue(), expected = await teams(page)
    const restored = await context.newPage()
    await restored.goto(link, { waitUntil: 'domcontentloaded' })
    await restored.locator('[data-member]').nth(5).waitFor()
    assert.deepEqual(await teams(restored), expected)
    assert.equal(await restored.locator('[data-team-rotation]').count(), 0, 'Shared board does not imply shared rotation history')
    await page.locator('#team-divider-result').screenshot({ path: resolve(out, 'desktop-rotation-board.png'), caret: 'initial' })
  })
  await run('rotation-balanced-fixed-members-and-live-count', async ({ page }) => {
    await page.locator('input[value="balanced"]').check()
    const skills = Object.fromEntries([5, 4, 4, 3, 2, 1].map((skill, index) => [`참가자 ${index + 1}`, skill]))
    for (const [name, skill] of Object.entries(skills)) await page.getByRole('combobox', { name: t('skillFor', { name }), exact: true }).selectOption(String(skill))
    await divide(page)
    const original = await teams(page), fixed = original[0][0]
    await button(page, `${fixed} 팀 고정`).click()
    await rotate(page)
    const next = await teams(page)
    assert.ok(next[0].includes(fixed))
    assert.ok(await button(page, `${fixed} 선택`).isDisabled())
    assert.equal(Math.max(...next.map(team => team.length)) - Math.min(...next.map(team => team.length)), 0)
    await verifyCount(page, original)
    const sums = next.map(team => team.reduce((sum, name) => sum + skills[name], 0))
    const textPrefix = t('rotation.skillBaseline', { count: '__' }).split('__')[0]
    const baselineText = (await rotation(page).locator('p').allTextContents()).find(text => text.startsWith(textPrefix))
    assert.ok(baselineText)
    const gap = Number(baselineText.match(/\d+/)[0])
    assert.ok(Math.max(...sums) - Math.min(...sums) <= gap)
  })
  await run('rotation-mobile-dark-captain-and-reduced-motion', async ({ page }) => {
    assert.deepEqual(Object.keys(ko.rotation).sort(), Object.keys(en.rotation).sort())
    await divide(page); const original = await teams(page)
    await rotate(page); await verifyCount(page, original)
    assert.ok(await button(page, t('rotation.action')).isEnabled())
    const width = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
    assert.ok(width.body <= width.viewport + 1 && width.document <= width.viewport + 1, JSON.stringify(width))
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
    await rotation(page).screenshot({ path: resolve(out, 'rotation-320-dark-panel.png'), caret: 'initial' })
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: resolve(out, 'rotation-320-dark-top.png'), caret: 'initial' })
    await page.locator('input[value="captain"]').check()
    await rotation(page).getByText(t('rotation.captainHint'), { exact: true }).waitFor()
    assert.equal(await button(page, t('rotation.action')).count(), 0)
    await button(page, t('divide')).click()
    await button(page, '드래프트 취소').waitFor()
    assert.equal(await rotation(page).count(), 0)
    assert.ok(await page.getByLabel('새 명단 이름', { exact: true }).isDisabled())
    for (const name of ['참가자 3', '참가자 4', '참가자 5', '참가자 6']) await button(page, name).click()
    assert.equal((await teams(page)).flat().length, 6)
    assert.ok(await page.getByLabel('새 명단 이름', { exact: true }).isEnabled())
  }, { width: 320, dark: true, language: 'en' })
} finally { await browser.close() }
const latest = new Map()
const runs = readdirSync(out).filter(name => /^results.*\.json$/.test(name)).map(name => ({ name, ...JSON.parse(readFileSync(resolve(out, name), 'utf8')) })).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
for (const run of runs) for (const result of run.results) latest.set(result.name, { ...result, sourceRun: run.name })
writeFileSync(resolve(out, 'final-results.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), total: latest.size, passed: [...latest.values()].filter(result => result.pass).length, results: [...latest.values()] }, null, 2))
if (results.some(result => !result.pass)) process.exitCode = 1
