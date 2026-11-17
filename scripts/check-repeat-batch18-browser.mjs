import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch18/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 140) {
  for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }
  assert.fail(`Timed out: ${description}`)
}
const chunkKinds = new Map()
function enChunk(url) {
  const decoded = decodeURIComponent(url), pathname = new URL(decoded).pathname
  const publicScope = pathname.match(/^\/i18n\/en\/(?:ns\/)?([a-zA-Z0-9_-]+)\.[a-f0-9]{16}\.json$/)?.[1]
  if (publicScope) return { scope: publicScope, kind: 'catalogue', transport: 'json-fetch' }
  const scope = decoded.match(/messages_generated_en_(?:ns_)?(.+?)_json_[^/]+\.js(?:\?|$)/)?.[1]
  if (!scope) return null
  const filename = basename(new URL(decoded).pathname)
  if (!chunkKinds.has(filename)) {
    try {
      const source = readFileSync(resolve('out/dev/static/chunks', filename), 'utf8')
      const kind = source.includes('(json, async loader)') ? 'loader' : source.includes('(json)') && /__turbopack_context__\.v\(/.test(source) ? 'catalogue' : source.includes('TURBOPACK_CHUNK_LISTS') ? 'manifest' : 'unknown'
      chunkKinds.set(filename, kind)
    } catch { return { scope, kind: 'unknown' } }
  }
  return { scope, kind: chunkKinds.get(filename), transport: 'script' }
}
const enScope = url => { const chunk = enChunk(url); return chunk?.kind === 'catalogue' ? chunk.scope : null }
const toggle = page => page.locator('[data-language-toggle]:visible').first()
const retry = page => toggle(page).locator('[data-translation-retry]')
async function language(page, lang) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await wait(100)
  await toggle(page).locator('button[aria-expanded]').click()
  await poll(async () => await toggle(page).locator('button[aria-expanded]').getAttribute('aria-expanded') === 'true', 'language menu opened')
  if (page.viewportSize().width <= 320) {
    const buttons = await toggle(page).locator('button:visible').evaluateAll(nodes => nodes.map(node => ({ height: node.getBoundingClientRect().height, label: node.textContent })))
    assert.ok(buttons.every(item => item.height >= 44), JSON.stringify(buttons))
  }
  await toggle(page).getByRole('button', { name: lang === 'en' ? 'English' : '한국어', exact: true }).last().click()
  await poll(async () => await toggle(page).locator('button[aria-expanded]').getAttribute('aria-label') === (lang === 'en' ? 'English' : '한국어'), `language selected ${lang}`)
}
async function heading(page, ns, lang) { await poll(async () => await page.getByRole('heading', { level: 1, name: tr(ns, 'title', lang), exact: true }).count() > 0, `${ns} ${lang} heading`) }
async function spa(page, slug) {
  await page.keyboard.press('Control+k')
  await page.locator('#search-listbox').waitFor()
  await page.locator('input[aria-controls="search-listbox"]').fill(slug)
  await page.locator(`#search-listbox a[href="/${slug}"]`).click()
  await poll(() => Promise.resolve(new URL(page.url()).pathname.replace(/\/$/, '') === `/${slug}`), `SPA ${slug}`)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}
async function screenshot(page, name) { await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, `${name}.png`), caret: 'initial' }) }
async function noOverflow(page) {
  const box = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(box.body <= box.viewport + 1 && box.document <= box.viewport + 1, `Overflow ${JSON.stringify(box)}`)
  return box
}
const scores = page => page.locator('[id^="csat-"]').evaluateAll(nodes => Object.fromEntries(nodes.filter(node => /csat-(kor|math|eng|hist|inq1|inq2)$/.test(node.id)).map(node => [node.id, node.value])))
const results = []
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] })
  const errors = [], hydration = [], external = [], requests = [], failures = [], consoleErrors = [], navigations = [], loaderRequests = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch18Seeded')) {
      if (options.language !== null) localStorage.setItem('language', options.language ?? 'ko')
      localStorage.setItem('theme', options.dark ? 'dark' : 'light')
      localStorage.setItem('__batch18Seeded', '1')
    }
    window.__batch18Unhandled = []
    addEventListener('unhandledrejection', event => window.__batch18Unhandled.push(String(event.reason)))
  }, options)
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin === base || ['data:', 'blob:'].includes(url.protocol)) return route.continue()
    external.push(url.href); return route.abort('blockedbyclient')
  })
  context.on('request', request => { const chunk = enChunk(request.url()); if (chunk) (chunk.kind === 'catalogue' ? requests : loaderRequests).push({ ...chunk, url: request.url(), at: Date.now() }) })
  context.on('requestfailed', request => { if (enScope(request.url())) failures.push({ url: request.url(), error: request.failure()?.errorText }) })
  context.on('page', page => {
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()) })
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(16000)
  page.setDefaultNavigationTimeout(120000)
  const open = async (slug, query = '') => {
    const response = await page.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor(); await toggle(page).waitFor()
    await page.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button[aria-expanded]')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$'))))
    await wait(250)
    return response
  }
  let detail = {}, status = 'pass', error
  try {
    detail = await fn({ page, context, open, requests, failures }) ?? {}
    assert.deepEqual(errors, [], 'Unexpected JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors')
    assert.deepEqual(await page.evaluate(() => window.__batch18Unhandled), [], 'Unhandled rejections')
    assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:csatGrade|common|shareResult|timer|notepad|markdownEditor|fuelCalculator|runningPace|envEditor)\.[a-zA-Z][\w.]+/, 'Raw translation key')
  } catch (caught) {
    status = 'fail'; error = caught.stack ?? String(caught)
    await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial' }).catch(() => {})
    writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${await page.locator('body').innerText().catch(() => '')}`)
  }
  const languageTrace = await page.evaluate(() => window.__languageTrace).catch(() => undefined)
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors, hydration, requests, loaderRequests, failures, consoleErrors, navigations, languageTrace, external: [...new Set(external)] }
  results.push(result); writeFileSync(resolve(out, `${name}-evidence.json`), JSON.stringify(result, null, 2)); console.log(`${status.toUpperCase()} ${name}${error ? `: ${error.split('\n')[0]}` : ''}`)
  await context.close()
}

try {
  await run('ko-spa-visits-load-only-current-english-scope', async ({ page, open, requests }) => {
    await open('notepad'); await heading(page, 'notepad', 'ko'); await page.evaluate(() => { window.__sameDocument = 'batch18' })
    await spa(page, 'timer'); await heading(page, 'timer', 'ko'); await spa(page, 'csat-grade'); await heading(page, 'csatGrade', 'ko'); await wait(500)
    assert.equal(await page.evaluate(() => window.__sameDocument), 'batch18'); assert.equal(requests.length, 0)
    await language(page, 'en'); await heading(page, 'csatGrade', 'en'); await wait(500)
    const scopes = requests.map(item => item.scope)
    assert.ok(scopes.includes('csatGrade')); assert.ok(scopes.includes('shared')); assert.ok(!scopes.includes('notepad') && !scopes.includes('timer'))
    assert.equal(new Set(requests.map(item => item.url)).size, requests.length, 'Duplicate EN requests')
    return { scopes, koEnglishRequests: 0, sameDocument: true }
  })

  await run('csat-input-url-records-shared-ui-language-roundtrip', async ({ page, open }) => {
    await open('csat-grade', '?kor=77&math=88&eng=&hist=40&inq1=42&inq2=45&minN=2&minSum=4')
    await poll(async () => await page.locator('#csat-kor').inputValue() === '77', 'query restored')
    await page.locator('#csat-kor').fill('81'); await page.locator('#csat-goal-name').fill('보존할 목표 초안')
    const before = await scores(page), url = page.url(), records = await page.evaluate(() => localStorage.getItem('toolhub-csat-score-records-v1'))
    await language(page, 'en'); await heading(page, 'csatGrade', 'en')
    assert.deepEqual(await scores(page), before); assert.equal(await page.locator('#csat-goal-name').inputValue(), '보존할 목표 초안'); assert.equal(page.url(), url)
    await page.locator('footer').getByText(tr('footer', 'description', 'en'), { exact: true }).waitFor()
    await button(page, tr('shareResult', 'copyLink', 'en')).click()
    const copied = await page.evaluate(() => navigator.clipboard.readText()); assert.equal(copied, page.url())
    await button(page, tr('shareResult', 'copied', 'en')).waitFor()
    assert.ok((await page.locator('#csat-grade-result').innerText()).includes('2026'))
    await screenshot(page, 'csat-english-desktop')
    await language(page, 'ko'); await heading(page, 'csatGrade', 'ko'); assert.deepEqual(await scores(page), before)
    assert.equal(await page.evaluate(() => localStorage.getItem('toolhub-csat-score-records-v1')), records)
    return { scores: before, preservedUrl: url, clipboard: copied }
  })

  await run('saved-english-new-visit-korean-ssr-safe-hydration', async ({ page, open }) => {
    const response = await open('csat-grade', '?kor=91&math=0&eng=')
    const html = await response.text(); assert.ok(html.includes(tr('csatGrade', 'title', 'ko')))
    await heading(page, 'csatGrade', 'en'); await poll(async () => await page.locator('#csat-kor').inputValue() === '91', 'saved EN query restored')
    assert.equal(await page.locator('#csat-math').inputValue(), '0'); assert.equal(await page.locator('#csat-eng').inputValue(), '')
    return { serverKoTitle: true, hydratedEnglish: true }
  }, { language: 'en' })

  await run('notepad-current-manuscript-and-dom-survive-language', async ({ page, open }) => {
    await open('notepad'); const editor = page.getByRole('textbox', { name: tr('notepad', 'contentPlaceholder'), exact: true })
    await editor.fill('검증 원고 첫 줄\nEnglish draft stays unchanged.\n0 false 빈칸'); await page.getByRole('textbox', { name: tr('notepad', 'titlePlaceholder'), exact: true }).fill('원고 보존')
    await editor.evaluate(element => { element.dataset.verifyIdentity = 'same-editor' })
    await poll(async () => (await page.evaluate(() => localStorage.getItem('toolhub-notepad-notes'))) ?.includes('원고 보존'), 'note autosaved')
    const before = await page.evaluate(() => localStorage.getItem('toolhub-notepad-notes')), text = await editor.inputValue()
    await language(page, 'en'); await heading(page, 'notepad', 'en')
    const englishEditor = page.getByRole('textbox', { name: tr('notepad', 'contentPlaceholder', 'en'), exact: true })
    assert.equal(await englishEditor.inputValue(), text); assert.equal(await englishEditor.getAttribute('data-verify-identity'), 'same-editor')
    await wait(600); assert.equal(await page.evaluate(() => localStorage.getItem('toolhub-notepad-notes')), before)
    await language(page, 'ko'); await heading(page, 'notepad', 'ko'); assert.equal(await editor.inputValue(), text)
    return { preservedStoredNote: true, sameEditorNode: true }
  })

  await run('active-timer-guide-and-pause-resume-survive-language', async ({ page, open }) => {
    await page.clock.install({ time: new Date('2026-11-17T03:00:00Z') }); await open('timer', '?m=2')
    const progress = page.getByRole('progressbar'), clock = progress.locator('span.font-bold').first()
    await poll(async () => await clock.innerText() === '02:00', '2 minute URL restored')
    await button(page, tr('timer', 'guide.title')).click()
    await button(page, tr('timer', 'countdown.start')).click(); await page.clock.fastForward(5000); const start = await clock.innerText()
    await language(page, 'en'); await heading(page, 'timer', 'en'); await button(page, tr('timer', 'countdown.pause', 'en')).waitFor()
    await page.getByText(tr('timer', 'guide.whatIs.description', 'en'), { exact: true }).waitFor()
    await page.clock.fastForward(3000); const english = await clock.innerText(); assert.notEqual(english, start); assert.notEqual(english, '02:00')
    await language(page, 'ko'); await heading(page, 'timer', 'ko'); await page.clock.fastForward(2000)
    await button(page, tr('timer', 'countdown.pause')).click(); const paused = await clock.innerText(); await page.clock.fastForward(10000); assert.equal(await clock.innerText(), paused)
    await button(page, tr('timer', 'countdown.resume')).click(); await page.clock.fastForward(2000); assert.notEqual(await clock.innerText(), paused)
    return { start, english, paused, resumed: await clock.innerText() }
  })

  await run('markdown-user-text-equal-to-english-example-stays-saved', async ({ page, open }) => {
    await open('markdown-editor'); await heading(page, 'markdownEditor', 'ko')
    const text = tr('markdownEditor', 'sample', 'en'), editor = page.getByRole('textbox', { name: tr('markdownEditor', 'editor'), exact: true })
    await editor.fill(text); await wait(700)
    const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /markdown/i.test(key))))
    assert.ok(Object.values(before).includes(text), 'English example text entered by user is saved')
    await language(page, 'en'); await heading(page, 'markdownEditor', 'en'); await wait(700)
    assert.equal(await page.getByRole('textbox', { name: tr('markdownEditor', 'editor', 'en'), exact: true }).inputValue(), text)
    assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /markdown/i.test(key)))), before)
    await language(page, 'ko'); await heading(page, 'markdownEditor', 'ko'); assert.equal(await editor.inputValue(), text)
    return { userEnteredEnglishExamplePreserved: true }
  })

  await run('direct-scopes-fuel-running-and-mobile-result-english', async ({ page, context, open, requests }) => {
    await context.route('**/api/fuel-prices**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ RESULT: { OIL: [{ PRODCD: 'B027', PRICE: '1600', TRADE_DT: '20261117' }] } }) }))
    await open('fuel-calculator'); await page.locator('#fuel-distance').fill('123.4'); await page.locator('#fuel-efficiency').fill('14.2')
    await wait(400); const headline = await page.getByTestId('fuel-headline').innerText(); await language(page, 'en'); await heading(page, 'fuelCalculator', 'en')
    assert.equal(await page.locator('#fuel-distance').inputValue(), '123.4'); assert.equal(await page.locator('#fuel-efficiency').inputValue(), '14.2')
    assert.equal((await page.getByTestId('fuel-headline').innerText()).replace(/[^\d.,]/g, ''), headline.replace(/[^\d.,]/g, ''))
    await button(page, tr('fuelCalculator', 'guide.title', 'en')).click(); await page.getByText(tr('fuelCalculator', 'guide.whatIs.description', 'en'), { exact: true }).waitFor()
    await open('running-pace'); await heading(page, 'runningPace', 'en'); await page.locator('#running-minutes').fill('47')
    const result = await page.locator('#running-pace-result dd').allTextContents(); await language(page, 'ko'); await heading(page, 'runningPace', 'ko'); await language(page, 'en'); await heading(page, 'runningPace', 'en')
    assert.equal(await page.locator('#running-minutes').inputValue(), '47'); assert.deepEqual(await page.locator('#running-pace-result dd').allTextContents(), result)
    const link = page.locator('a[href="#running-pace-result"]'); assert.ok((await link.innerText()).includes(tr('common', 'seeResult', 'en')))
    await noOverflow(page); await screenshot(page, 'running-english-320-dark'); await link.click(); assert.ok(new URL(page.url()).hash.includes('running-pace-result'))
    assert.ok(requests.some(item => item.scope === 'fuelCalculator') && requests.some(item => item.scope === 'runningPace'))
    return { result, scopes: requests.map(item => item.scope) }
  }, { width: 320, dark: true })

  await run('real-english-chunk-failure-explicit-retry-mobile', async ({ page, context, open, requests }) => {
    let blocked = 0, failedFetch = 0
    await context.route('**/*', async route => {
      const chunk = enChunk(route.request().url())
      if (chunk?.scope === 'csatGrade' && chunk.kind === 'catalogue') {
        if (chunk.transport === 'script' && blocked++ === 0) return route.abort('failed')
        if (chunk.transport === 'json-fetch' && failedFetch++ === 0) return route.fulfill({ status: 503, body: 'Temporary verification failure' })
      }
      return route.fallback()
    })
    await open('csat-grade'); await page.locator('#csat-kor').fill('79'); await language(page, 'en')
    await retry(page).waitFor(); await heading(page, 'csatGrade', 'ko'); const first = requests.filter(item => item.scope === 'csatGrade').length
    await page.locator('#csat-math').fill('82'); await wait(1200); assert.equal(requests.filter(item => item.scope === 'csatGrade').length, first, 'No render-triggered retry')
    await noOverflow(page); const sizes = await toggle(page).locator('button:visible').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, height: node.getBoundingClientRect().height }))); assert.ok(sizes.every(item => item.height >= 44))
    const retryBox = await retry(page).boundingBox(); writeFileSync(resolve(out, 'retry-mobile-bounds.json'), JSON.stringify(retryBox, null, 2))
    await screenshot(page, 'english-chunk-failure-320-dark')
    await retry(page).getByRole('button').click(); await poll(() => Promise.resolve(failedFetch === 1), 'first fallback JSON requested'); await retry(page).waitFor(); await heading(page, 'csatGrade', 'ko')
    await wait(600); assert.equal(failedFetch, 1, 'Failed fallback does not auto retry')
    await retry(page).getByRole('button').click(); await heading(page, 'csatGrade', 'en'); await poll(async () => await retry(page).count() === 0, 'retry notice removed')
    assert.equal(await page.locator('#csat-kor').inputValue(), '79'); assert.equal(await page.locator('#csat-math').inputValue(), '82')
    await noOverflow(page); await screenshot(page, 'english-chunk-recovered-320-dark')
    assert.ok(retryBox.x >= 0 && retryBox.x + retryBox.width <= 320, `Retry popup outside viewport: ${JSON.stringify(retryBox)}`)
    assert.equal(failedFetch, 2)
    return { failedRequests: first, retryRequests: requests.filter(item => item.scope === 'csatGrade').length, fallbackAttempts: failedFetch, buttonSizes: sizes, retryBox }
  }, { width: 320, dark: true })

  await run('shared-failure-new-consumer-no-auto-retry-and-direct-recovery', async ({ page, context, open, requests }) => {
    const blocked = new Set()
    await context.route('**/*', async route => {
      const chunk = enChunk(route.request().url())
      if (chunk?.kind === 'catalogue' && chunk.transport === 'script' && ['shared', 'fuelCalculator'].includes(chunk.scope) && !blocked.has(chunk.scope)) { blocked.add(chunk.scope); return route.abort('failed') }
      if (new URL(route.request().url()).pathname === '/api/fuel-prices') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"RESULT":{"OIL":[]}}' })
      return route.fallback()
    })
    await open('csat-grade'); await page.evaluate(() => { window.__sameDocument = 'shared-failure' }); await language(page, 'en'); await heading(page, 'csatGrade', 'en'); await retry(page).waitFor()
    const sharedRequests = () => requests.filter(item => item.scope === 'shared')
    assert.equal(sharedRequests().length, 1)
    await spa(page, 'fuel-calculator'); await heading(page, 'fuelCalculator', 'ko'); await page.locator('#fuel-distance').fill('91.3'); await wait(800)
    assert.equal(await page.evaluate(() => window.__sameDocument), 'shared-failure'); assert.equal(sharedRequests().length, 1, 'New shared consumers must not auto retry')
    assert.ok(blocked.has('fuelCalculator')); await retry(page).getByRole('button').click(); await heading(page, 'fuelCalculator', 'en')
    await page.locator('footer').getByText(tr('footer', 'description', 'en'), { exact: true }).waitFor(); assert.equal(await page.locator('#fuel-distance').inputValue(), '91.3')
    await poll(async () => await retry(page).count() === 0, 'all current scopes recovered')
    assert.equal(sharedRequests().filter(item => item.transport === 'json-fetch').length, 1)
    assert.equal(requests.filter(item => item.scope === 'fuelCalculator' && item.transport === 'json-fetch').length, 1)
    return { sharedFailedRequestsBeforeExplicitRetry: 1, sharedAndDirectRecovered: true, preservedDistance: '91.3' }
  })

  await run('late-english-response-cannot-override-korean', async ({ page, context, open }) => {
    let release, waiting = false; const gate = new Promise(resolve => { release = resolve })
    await context.route('**/*', async route => { if (enScope(route.request().url()) === 'csatGrade') { waiting = true; await gate }; return route.fallback() })
    await open('csat-grade'); await language(page, 'en'); await poll(() => Promise.resolve(waiting), 'EN chunk held')
    await language(page, 'ko'); release(); await wait(1000); await heading(page, 'csatGrade', 'ko')
    assert.equal(await toggle(page).locator('button[aria-expanded]').getAttribute('aria-label'), '한국어')
    await language(page, 'en'); await heading(page, 'csatGrade', 'en')
    return { lateResponseKeptKorean: true, laterEnglishSucceeded: true }
  })

  await run('invalid-language-storage-and-en-prefix-remain-korean', async ({ page, open, requests }) => {
    for (const slug of ['energy-voucher', 'enneagram', 'env-editor']) {
      await open(slug); await wait(250); assert.equal(await toggle(page).locator('button[aria-expanded]').getAttribute('aria-label'), '한국어')
    }
    assert.equal(requests.length, 0); await language(page, 'en'); await poll(async () => requests.length > 0, 'English requested after explicit action')
    return { paths: ['energy-voucher', 'enneagram', 'env-editor'], koEnglishRequests: 0 }
  }, { language: 'invalid-language' })

  await run('language-storage-read-write-block-memory-switch', async ({ page, context, open }) => {
    await context.addInitScript(() => {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem
      Storage.prototype.getItem = function(key) { if (key === 'language') throw new DOMException('Blocked language read', 'SecurityError'); return get.call(this, key) }
      Storage.prototype.setItem = function(key, value) { if (key === 'language') throw new DOMException('Blocked language write', 'SecurityError'); return set.call(this, key, value) }
    })
    await open('csat-grade'); await heading(page, 'csatGrade', 'ko'); await language(page, 'en'); await heading(page, 'csatGrade', 'en'); await language(page, 'ko'); await heading(page, 'csatGrade', 'ko')
    return { blockedReadWriteMemorySwitch: true }
  })

} finally {
  await browser.close()
  const suffix = only ? only.replace(/[^a-z0-9-]+/gi, '_') : 'all'
  writeFileSync(resolve(out, `results-${suffix}.json`), JSON.stringify(results, null, 2))
  const final = new Map()
  for (const name of readdirSync(out).filter(name => name.endsWith('-evidence.json'))) {
    const result = JSON.parse(readFileSync(resolve(out, name), 'utf8'))
    const legacy = result.requests.filter(request => !request.kind)
    if (legacy.length) {
      result.requests = legacy.filter(request => enScope(request.url)).map(request => ({ ...request, kind: 'catalogue' }))
      result.loaderRequests = legacy.filter(request => !enScope(request.url)).map(request => ({ ...request, kind: enChunk(request.url)?.kind }))
    }
    final.set(result.name, result)
  }
  writeFileSync(resolve(out, 'final-results.json'), JSON.stringify([...final.values()], null, 2))
  console.log(`Chrome closed. ${results.filter(result => result.status === 'pass').length}/${results.length} passed.`)
}
if (results.some(result => result.status === 'fail')) process.exitCode = 1
