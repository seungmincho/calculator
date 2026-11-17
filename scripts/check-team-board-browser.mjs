import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const out = resolve('docs/verify/2026-11-16-interactive-team')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const button = (page, name) => page.getByRole('button', { name, exact: true })
const teams = page => page.locator('[data-team]').evaluateAll(nodes => nodes.map(node => [...node.querySelectorAll('[data-member]')].map(n => n.dataset.member)))
async function test(name, fn, width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
  await context.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:3039') ? r.continue() : r.abort())
  await context.addInitScript(() => { window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied = text } } }) })
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && /hydration|didn't match/.test(m.text())) errors.push(m.text()) })
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(120000)
  try {
    await page.goto('http://127.0.0.1:3039/team-divider/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelector('[aria-labelledby="team-rosters-title"] input')?.disabled === false)
    await fn(page)
    assert.deepEqual(errors, [])
    results.push({ name, pass: true })
  } catch (e) { results.push({ name, pass: false, error: e.message }); await page.screenshot({ path: resolve(out, `${name}-failed.png`), fullPage: true }) }
  finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
}
try {
  await test('deal-move-swap-undo-lock-share', async page => {
    await page.locator('input[value="balanced"]').check()
    await button(page, '팀 나누기!').click(); await page.waitForFunction(() => document.querySelectorAll('[data-member]').length === 6)
    await button(page, '다시 나누기').click(); await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent.trim() === '다시 나누기')?.disabled)
    const first = await teams(page), person = first[0][0], other = first[1][0]
    await button(page, `${person} 선택`).click(); await button(page, '2팀으로 이동').click()
    assert.ok((await teams(page))[1].includes(person))
    await button(page, '되돌리기').click(); assert.deepEqual(await teams(page), first)
    await button(page, `${person} 선택`).click(); await button(page, `${other} 선택`).click()
    assert.ok((await teams(page))[1].includes(person)); assert.ok((await teams(page))[0].includes(other))
    await button(page, `${person} 팀 고정`).click(); await button(page, '다시 나누기').click()
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent.trim() === '다시 나누기')?.disabled)
    assert.ok((await teams(page))[1].includes(person))
    assert.ok(await button(page, `${person} 선택`).isDisabled())
    await button(page, '링크 복사').click(); const link = await page.evaluate(() => window.__copied); assert.ok(link.includes('#board='))
    const shared = await teams(page); await page.goto(link); await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('[data-member]').first().waitFor(); assert.deepEqual(await teams(page), shared)
    await page.locator('#team-divider-result').screenshot({ path: resolve(out, 'desktop-board.png') })
  })
  await test('desktop-drag-drop', async page => {
    await page.getByLabel('카드를 하나씩 공개').uncheck(); await button(page, '팀 나누기!').click()
    const before = await teams(page), name = before[0][0]
    await page.locator('[data-team="0"] [data-member]').first().dragTo(page.locator('[data-team="1"]'))
    assert.ok((await teams(page))[1].includes(name))
  })
  await test('mobile-tap-captain-and-reduced-motion', async page => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await button(page, '팀 나누기!').click()
    await button(page, '다시 나누기').waitFor()
    const before = await teams(page), name = before[0][0]
    await button(page, `${name} 선택`).click(); await button(page, '2팀으로 이동').click()
    assert.ok((await teams(page))[1].includes(name))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.locator('#team-divider-result').screenshot({ path: resolve(out, 'mobile-board.png') })
    await page.locator('input[value="captain"]').check(); await button(page, '팀 나누기!').click()
    await button(page, '드래프트 취소').waitFor(); assert.ok(await page.getByLabel('새 명단 이름', { exact: true }).isDisabled())
    for (const name of ['참가자 3', '참가자 4', '참가자 5', '참가자 6']) await button(page, name).click()
    assert.equal((await teams(page)).flat().length, 6)
    assert.ok(await page.getByLabel('새 명단 이름', { exact: true }).isEnabled())
  }, 375)
} finally { await browser.close(); writeFileSync(resolve(out, 'results.json'), JSON.stringify(results, null, 2)) }
if (results.some(r => !r.pass)) process.exitCode = 1
