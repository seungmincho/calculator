// Local UI verification: npm run dev, then node scripts/verify-taxi-shipping.mjs
// Optional: PLAYWRIGHT_BROWSERS_PATH, VERIFY_BASE_URL, VERIFY_BROWSER_CHANNEL.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.VERIFY_BASE_URL ?? 'http://localhost:3039'
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local server')
const output = resolve('.next/verify-taxi-shipping')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.VERIFY_BROWSER_CHANNEL || undefined })
const results = []
const errors = []
const paths = [
  { slug: 'taxi-fare', id: 'taxi', title: '택시 요금 계산기' },
  { slug: 'shipping-calculator', id: 'shipping', title: '택배비 계산기' },
]

async function contextFor(width = 375, height = 812, language = 'ko', theme = 'light') {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, deviceScaleFactor: 1, serviceWorkers: 'block', colorScheme: theme })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort()
  })
  await context.addInitScript(({ language, theme }) => {
    localStorage.setItem('language', language)
    localStorage.setItem('theme', theme)
  }, { language, theme })
  return context
}

async function open(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 })
  await page.locator('main h1').waitFor()
}

async function layout(page, id) {
  return page.evaluate(id => {
    const root = document.scrollingElement
    const input = document.getElementById(`${id}-input`)
    const link = input.querySelector(`a[href="#${id}-result"]`)
    const rect = link.getBoundingClientRect()
    const controls = [...input.querySelectorAll('input:not([type="checkbox"]), select, button')]
      .map(el => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 40), height: el.getBoundingClientRect().height }))
    return { viewport: innerWidth, width: root.scrollWidth, resultLinkBottom: Math.round(rect.bottom), resultLinkVisible: rect.height > 0, minControlHeight: Math.min(...controls.map(c => c.height)), smallControls: controls.filter(c => c.height < 43.5), dark: document.documentElement.classList.contains('dark') }
  }, id)
}

async function run(name, test) {
  try { const detail = await test(); results.push({ name, pass: true, detail }); console.log('PASS', name, JSON.stringify(detail ?? '')) }
  catch (error) { results.push({ name, pass: false, error: error.message }); console.error('FAIL', name, error.message) }
}

try {
  for (const [width, height, language, theme] of [[320, 740, 'ko', 'light'], [375, 812, 'ko', 'light'], [390, 844, 'ko', 'light'], [768, 1024, 'ko', 'light'], [1280, 900, 'ko', 'light'], [375, 812, 'en', 'dark']]) {
    const context = await contextFor(width, height, language, theme)
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    for (const { slug, id, title } of paths) {
      await run(`${slug} ${width}px ${language} ${theme}`, async () => {
        await open(page, `${base}/${slug}/`)
        const metrics = await layout(page, id)
        assert(metrics.width <= width, `Page overflow: ${metrics.width} > ${width}`)
        assert(metrics.minControlHeight >= 43.5, `Small controls: ${JSON.stringify(metrics.smallControls)}`)
        if (width < 1024) {
          assert(metrics.resultLinkVisible && metrics.resultLinkBottom < height - 64, 'Result link must be visible above the bottom navigation')
          await page.locator(`#${id}-input a[href="#${id}-result"]`).click()
          await page.waitForTimeout(400)
          const top = await page.locator(`#${id}-result`).evaluate(el => el.getBoundingClientRect().top)
          assert(top >= 0 && top < height / 2, `Result anchor top: ${top}`)
          await page.locator(`#${id}-result a[href="#${id}-input"]`).click()
          await page.waitForTimeout(400)
        } else assert(!metrics.resultLinkVisible, 'Mobile shortcut should be hidden on desktop')
        if (theme === 'dark') assert(metrics.dark, 'Dark theme must be applied')
        const body = await page.locator('main').innerText()
        assert(!body.includes('MISSING_MESSAGE') && !body.includes('noRates.short'), 'Missing translation')
        if (language === 'ko') assert.equal(await page.locator('main h1').innerText(), title)
        if (width === 375) {
          await page.evaluate(() => scrollTo(0, 0))
          await page.waitForTimeout(300)
          await page.screenshot({ path: resolve(output, `${slug}-${language}-${theme}.png`) })
        }
        return metrics
      })
    }
    await context.close()
  }

  const context = await contextFor()
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  for (const { slug, title } of paths) {
    await run(`${slug} metadata`, async () => {
      await open(page, `${base}/${slug}/`)
      const metadata = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        ogTitle: document.querySelector('meta[property="og:title"]')?.content,
        ogDescription: document.querySelector('meta[property="og:description"]')?.content,
        twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content,
        twitterDescription: document.querySelector('meta[name="twitter:description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        application: [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => JSON.parse(el.textContent)).find(x => x['@type'] === 'WebApplication'),
      }))
      assert(metadata.title.startsWith(title))
      assert.equal(metadata.title, metadata.ogTitle)
      assert.equal(metadata.title, metadata.twitterTitle)
      assert.equal(metadata.description, metadata.ogDescription)
      assert.equal(metadata.description, metadata.twitterDescription)
      assert.equal(metadata.description, metadata.application.description)
      assert.equal(metadata.application.name, title)
      assert.equal(metadata.canonical, `https://toolhub.ai.kr/${slug}/`)
      return metadata
    })
  }

  await run('taxi inputs, surcharge, share URL and reset', async () => {
    await open(page, `${base}/taxi-fare/`)
    const result = page.locator('#taxi-result [aria-live="polite"]')
    const before = await result.innerText()
    await page.locator('#taxi-input').getByRole('button', { name: '10km', exact: true }).click()
    await page.locator('#taxi-input [role="radio"]').nth(23).click()
    await page.locator('#taxi-input input[type="checkbox"]').check()
    await page.waitForTimeout(300)
    const after = await result.innerText()
    assert.notEqual(before, after)
    const saved = page.url()
    assert.equal(new URL(saved).searchParams.get('distance'), '10')
    assert.equal(new URL(saved).searchParams.get('hour'), '23')
    assert.equal(new URL(saved).searchParams.get('out'), '1')
    await open(page, saved)
    assert.equal(await page.locator('#taxi-distance').inputValue(), '10')
    assert.equal(await page.locator('#taxi-input [role="radio"]').nth(23).getAttribute('aria-checked'), 'true')
    assert(await page.locator('#taxi-input input[type="checkbox"]').isChecked())
    assert.equal(await result.innerText(), after)
    await page.locator('#taxi-input').getByRole('button', { name: '초기화', exact: true }).click()
    assert.equal(await page.locator('#taxi-distance').inputValue(), '5')
    assert(!await page.locator('#taxi-input input[type="checkbox"]').isChecked())
    return { before, after, restored: true }
  })

  await run('shipping inputs, category, share URL and reset', async () => {
    await open(page, `${base}/shipping-calculator/`)
    for (const field of ['weight', 'width', 'height', 'depth']) assert.equal(await page.locator(`#sc-${field}`).getAttribute('inputmode'), 'decimal')
    await page.locator('#shipping-input').getByRole('button', { name: '우체국 3호', exact: true }).click()
    await page.locator('#sc-weight').fill('4.5')
    await page.locator('[aria-labelledby="sc-dest"]').getByRole('button').nth(1).click()
    await page.locator('[aria-labelledby="sc-carrier"]').getByRole('button').nth(1).click()
    await page.waitForTimeout(300)
    const saved = page.url()
    const before = await page.locator('#shipping-result [aria-live="polite"]').first().innerText()
    await open(page, saved)
    for (const [field, value] of Object.entries({ weight: '4.5', width: '34', height: '25', depth: '21' })) assert.equal(await page.locator(`#sc-${field}`).inputValue(), value)
    assert.equal(await page.locator('[aria-labelledby="sc-carrier"] button').nth(1).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('#shipping-result [aria-live="polite"]').first().innerText(), before)
    await page.locator('#shipping-input').getByRole('button', { name: '초기화', exact: true }).click()
    assert.equal(await page.locator('#sc-weight').inputValue(), '2')
    assert.equal(await page.locator('#sc-width').inputValue(), '30')
    await page.locator('#shipping-input a[href="#shipping-result"]').click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: resolve(output, 'shipping-results.png') })
    return { restored: true, reset: true }
  })

  await run('shipping no available rates at 320px', async () => {
    await page.setViewportSize({ width: 320, height: 740 })
    await open(page, `${base}/shipping-calculator/`)
    await page.locator('#sc-weight').fill('100')
    await page.locator('#shipping-result [role="status"]').waitFor()
    assert.match(await page.locator('#shipping-result [role="status"]').innerText(), /비교 가능한 택배 요금이 없어요/)
    await page.locator('#shipping-input a[href="#shipping-result"]').click()
    await page.waitForTimeout(400)
    assert((await layout(page, 'shipping')).width <= 320)
    await page.screenshot({ path: resolve(output, 'shipping-no-rates.png') })
    await page.locator('#shipping-result a[href="#shipping-input"]').click()
    await page.locator('#sc-weight').fill('2')
    await page.waitForTimeout(200)
    assert.equal(await page.getByRole('heading', { name: '비교 가능한 택배 요금이 없어요', exact: true }).count(), 0)
  })
  await context.close()
  await run('browser runtime errors', () => assert.deepEqual(errors, []))
} finally {
  await browser.close()
  writeFileSync(resolve(output, 'results.json'), JSON.stringify(results, null, 2))
}
console.log(`Results: ${results.filter(x => x.pass).length}/${results.length} passed. ${output}`)
if (results.some(x => !x.pass)) process.exitCode = 1
