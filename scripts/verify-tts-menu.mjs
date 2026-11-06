// Local-only UI checks. Start npm run dev, then node scripts/verify-tts-menu.mjs.
// Native speech tests use the installed Korean voice at zero volume.
// Clipboard and the supplemental long-text lifecycle tests explicitly use mocks.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.VERIFY_BASE_URL ?? 'http://127.0.0.1:3039'
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname))
const out = resolve('.next/verify-tts-menu')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: process.env.VERIFY_BROWSER_CHANNEL || undefined })
const results = [], errors = []
async function run(name, test) {
  try {
    const detail = await test()
    results.push({ name, pass: true, detail })
    console.log('PASS', name, JSON.stringify(detail ?? ''))
  } catch (e) {
    results.push({ name, pass: false, error: e.message })
    console.error('FAIL', name, e.message)
  }
}
async function contextFor(width = 375, height = 812, theme = 'light', language = 'ko') {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block', colorScheme: theme })
  await context.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort())
  await context.addInitScript(({ theme, language }) => {
    if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return
    localStorage.setItem('theme', theme)
    localStorage.setItem('language', language)
    window.__clipboard = { value: '', denied: false }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      readText: async () => { if (window.__clipboard.denied) throw new Error('Denied'); return window.__clipboard.value },
      writeText: async value => { if (window.__clipboard.denied) throw new Error('Denied'); window.__clipboard.value = value },
    } })
  }, { theme, language })
  context.on('page', page => {
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', msg => {
      if (msg.type() === 'error' && /hydration|didn't match|MISSING_MESSAGE|Cannot update|not wrapped/i.test(msg.text())) errors.push(msg.text())
    })
  })
  return context
}
async function open(page, path) {
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 180000 })
  await page.locator('main h1').waitFor()
}
async function finishSpin(page, random = 0) {
  await page.evaluate(value => { Math.random = () => value }, random)
  await page.locator('#roulette-spin').click()
  await page.waitForFunction(() => document.querySelector('#roulette-spin')?.disabled === false, { }, { timeout: 8000 })
  return page.locator('#roulette-result p').nth(1).innerText()
}
try {
  for (const [width, height, theme, language] of [[320,740,'light','ko'],[375,812,'light','ko'],[390,844,'light','ko'],[768,1024,'light','ko'],[1280,900,'light','ko'],[375,812,'dark','en']]) {
    const context = await contextFor(width, height, theme, language), page = await context.newPage()
    for (const slug of ['text-to-speech', 'menu-roulette']) await run(slug + ' layout ' + width + ' ' + theme + ' ' + language, async () => {
      await open(page, '/' + slug + '/')
      const metrics = await page.evaluate(slug => {
        const action = document.querySelector(slug === 'text-to-speech' ? '#tts-controls button' : '#roulette-spin')
        const selector = slug === 'text-to-speech' ? '#tts-input button' : '#roulette-items button, #roulette-items input, #roulette-spin, main nav a'
        const smallControls = [...document.querySelectorAll(selector)].filter(el => el.getBoundingClientRect().height < 43.5).map(el => ({text: el.textContent, height: el.getBoundingClientRect().height}))
        return { scrollWidth: document.scrollingElement.scrollWidth, actionBottom: action.getBoundingClientRect().bottom, smallControls, dark: document.documentElement.classList.contains('dark') }
      }, slug)
      assert(metrics.scrollWidth <= width, 'Horizontal overflow: ' + JSON.stringify(metrics))
      assert.equal(metrics.smallControls.length, 0, JSON.stringify(metrics.smallControls))
      if (width < 768) assert(metrics.actionBottom < height - 64, 'Action hidden below fold: ' + metrics.actionBottom)
      if (theme === 'dark') assert(metrics.dark)
      const title = await page.locator('main h1').innerText()
      assert.equal(title, slug === 'text-to-speech' ? '텍스트 읽어주기 (TTS)' : '저녁메뉴 추천 룰렛')
      assert(!/MISSING_MESSAGE|menu\.quickTitle|reader\.controls/.test(await page.locator('main').innerText()))
      if (width <= 375) await page.screenshot({ path: resolve(out, slug + '-' + width + '-' + theme + '.png') })
      return metrics
    })
    await context.close()
  }
  const context = await contextFor(), page = await context.newPage()
  for (const slug of ['text-to-speech', 'menu-roulette']) await run(slug + ' metadata', async () => {
    await open(page, '/' + slug + '/')
    const meta = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      ogDescription: document.querySelector('meta[property="og:description"]')?.content,
      twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content,
      twitterDescription: document.querySelector('meta[name="twitter:description"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      app: [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => JSON.parse(el.textContent)).find(x => x['@type'] === 'WebApplication'),
    }))
    assert.equal(meta.title, meta.ogTitle)
    assert.equal(meta.title, meta.twitterTitle)
    assert.equal(meta.description, meta.ogDescription)
    assert.equal(meta.description, meta.twitterDescription)
    assert.equal(meta.description, meta.app.description)
    assert.equal(meta.canonical, 'https://toolhub.ai.kr/' + slug + '/')
    return meta.title
  })
  await run('TTS shared text/speed and clipboard success/denial (mock clipboard)', async () => {
    const text = '첫 문장입니다. 두 번째 문장입니다.'
    await open(page, '/text-to-speech/?t=' + encodeURIComponent(text) + '&r=1.3')
    assert.equal(await page.locator('#tts-text').inputValue(), text)
    assert.equal(await page.locator('#tts-rate').inputValue(), '1.3')
    await page.getByRole('button', { name: '텍스트 링크 복사', exact: true }).click()
    const url = new URL(await page.evaluate(() => window.__clipboard.value))
    assert.equal(url.searchParams.get('t'), text)
    assert.equal(url.searchParams.get('r'), '1.3')
    await page.evaluate(() => { window.__clipboard.value = '붙여넣기 확인입니다.\n두 번째 줄입니다.' })
    await page.getByRole('button', { name: '붙여넣기', exact: true }).click()
    assert.equal(await page.locator('#tts-text').inputValue(), '붙여넣기 확인입니다.\n두 번째 줄입니다.')
    await page.evaluate(() => { window.__clipboard.denied = true })
    await page.getByRole('button', { name: '붙여넣기', exact: true }).click()
    await page.getByText(/입력란을 길게 눌러/).waitFor()
    await page.getByRole('button', { name: /텍스트 링크 복사|복사했습니다/ }).click()
    await page.getByText(/링크를 복사하지 못했습니다/).waitFor()
    assert.equal(await page.getByRole('button', { name: '복사했습니다', exact: true }).count(), 0)
  })
  await run('TTS native Korean synthesis: sequential completion, pause/resume, edit cancels', async () => {
    await open(page, '/text-to-speech/')
    await page.waitForFunction(() => speechSynthesis.getVoices().some(v => v.lang.startsWith('ko') && v.localService))
    await page.evaluate(() => {
      window.__nativeEvents = []
      const original = SpeechSynthesis.prototype.speak
      SpeechSynthesis.prototype.speak = function(u) {
        for (const type of ['start','end','error']) u.addEventListener(type, e => window.__nativeEvents.push({ type, text: u.text, error: e.error }))
        return original.call(this, u)
      }
    })
    await page.locator('#tts-volume').focus()
    await page.locator('#tts-volume').press('Home')
    await page.locator('#tts-rate').focus()
    await page.locator('#tts-rate').press('End')
    await page.locator('#tts-text').fill('안녕하세요. 테스트입니다. 감사합니다.')
    await page.getByRole('button', { name: '재생', exact: true }).click()
    await page.waitForFunction(() => window.__nativeEvents.filter(e => e.type === 'end').length >= 3, {}, { timeout: 25000 })
    await page.getByRole('button', { name: '재생', exact: true }).waitFor()
    await page.locator('#tts-text').fill('이 문장은 음성 재생 상태와 일시정지 기능을 확인하기 위해 조금 길게 작성한 문장입니다. 다음 문장도 이어서 읽습니다.')
    await page.getByRole('button', { name: '재생', exact: true }).click()
    await page.waitForFunction(() => window.__nativeEvents.filter(e => e.type === 'start').length >= 4)
    await page.getByRole('button', { name: '일시정지', exact: true }).click()
    await page.getByRole('button', { name: '계속', exact: true }).click()
    await page.waitForFunction(() => window.__nativeEvents.filter(e => e.type === 'start').length >= 5)
    await page.locator('#tts-text').fill('수정한 문장입니다.')
    await page.getByRole('button', { name: '재생', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => speechSynthesis.speaking), false)
    const events = await page.evaluate(() => window.__nativeEvents)
    assert(!events.some(e => e.type === 'error' && !['interrupted','canceled'].includes(e.error)), JSON.stringify(events))
    return { starts: events.filter(e => e.type === 'start').length, completed: events.filter(e => e.type === 'end').length, audibleQuality: 'Not evaluated: volume zero' }
  })
  await run('TTS invalid saved settings and unbroken text on mobile', async () => {
    await page.evaluate(() => localStorage.setItem('tts.settings', JSON.stringify({ rate: 'invalid', pitch: 99, volume: -1 })))
    await open(page, '/text-to-speech/')
    for (const id of ['rate', 'pitch', 'volume']) assert.equal(await page.locator('#tts-' + id).inputValue(), '1')
    await page.locator('#tts-text').fill('x'.repeat(400))
    assert(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth), 'Long text overflow')
  })
  await run('Menu presets, edits, spin locks and result reset', async () => {
    await open(page, '/menu-roulette/')
    await page.getByRole('button', { name: '점심메뉴', exact: true }).first().click()
    const input = page.getByRole('textbox', { name: '추가할 항목', exact: true })
    assert(await input.isDisabled())
    await page.getByRole('button', { name: '김치찌개 삭제', exact: true }).click()
    await input.fill('직접 추가한 메뉴')
    await page.getByRole('button', { name: '항목 추가', exact: true }).click()
    const choices = await page.locator('#roulette-items li span.flex-1').allTextContents()
    assert(choices.includes('직접 추가한 메뉴'))
    await page.locator('#roulette-spin').click()
    assert(await page.getByRole('button', { name: '저녁메뉴', exact: true }).first().isDisabled())
    assert(await page.getByRole('button', { name: '직접 추가한 메뉴 삭제', exact: true }).isDisabled())
    await page.locator('#roulette-result').waitFor({ timeout: 8000 })
    const result = await page.locator('#roulette-result p').nth(1).innerText()
    assert(choices.includes(result), result)
    await page.locator('#roulette-result').screenshot({ path: resolve(out, 'menu-result.png') })
    await page.getByRole('button', { name: '저녁메뉴', exact: true }).first().click()
    assert.equal(await page.locator('#roulette-result').count(), 0)
    return { choices: choices.length, result }
  })
  await run('Menu always finishes at random extremes; URL restoration', async () => {
    const choices = ['새 메뉴 하나','새 메뉴 둘','새 메뉴 셋']
    await open(page, '/menu-roulette/?roulette=' + encodeURIComponent(choices.join(',')))
    assert.deepEqual(await page.locator('#roulette-items li span.flex-1').allTextContents(), choices)
    const outcomes = []
    for (const value of [0, 0.999999]) {
      const result = await finishSpin(page, value)
      assert(choices.includes(result))
      outcomes.push(result)
    }
    await page.reload({ waitUntil: 'networkidle' })
    assert.deepEqual(await page.locator('#roulette-items li span.flex-1').allTextContents(), choices)
    return outcomes
  })
  await run('Shared DecisionTools regression: generic roulette and order picker', async () => {
    await open(page, '/roulette/?roulette=' + encodeURIComponent('가,나,다'))
    assert(['가','나','다'].includes(await finishSpin(page)))
    await open(page, '/order-picker/?order=' + encodeURIComponent('하나,둘,셋'))
    await page.getByRole('button', { name: '뽑기!', exact: true }).click()
    await page.getByRole('button', { name: '전체 공개', exact: true }).waitFor({ timeout: 10000 })
    await page.getByRole('button', { name: '전체 공개', exact: true }).click()
    for (const name of ['하나','둘','셋']) assert((await page.getByText(name, { exact: true }).count()) >= 2)
    assert(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth))
  })
  await context.close()

  const simulated = await contextFor()
  await simulated.addInitScript(() => {
    const voice = { name: 'Test Korean', lang: 'ko-KR', localService: true, default: true, voiceURI: 'test' }
    window.__speech = { utterances: [], active: null, cancelCount: 0 }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [voice], addEventListener() {}, removeEventListener() {},
      speak(u) { window.__speech.active = u; window.__speech.utterances.push(u) },
      cancel() { window.__speech.cancelCount++; window.__speech.active = null },
      pause() {}, resume() {}, speaking: false, paused: false,
    } })
    // Native utterance.voice rejects plain test voices, so both sides of this supplemental mock use plain objects.
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
  })
  const mock = await simulated.newPage()
  await run('TTS supplemental mock: long text, stale callbacks, keyboard sentence, error', async () => {
    await open(mock, '/text-to-speech/')
    const text = Array.from({ length: 50 }, (_, i) => '이것은 ' + (i + 1) + '번째 긴 글 테스트 문장입니다.').join(' ')
    await mock.locator('#tts-text').fill(text)
    await mock.getByRole('button', { name: '재생', exact: true }).click()
    await mock.getByRole('button', { name: '일시정지', exact: true }).click()
    await mock.evaluate(() => window.__speech.utterances[0].onend())
    assert.equal(await mock.evaluate(() => window.__speech.utterances.length), 1, 'Canceled callback restarted playback')
    await mock.getByRole('button', { name: '계속', exact: true }).click()
    await mock.evaluate(() => { for(let i=0;i<50;i++) window.__speech.active.onend() })
    await mock.getByRole('button', { name: '재생', exact: true }).waitFor()
    const spoken = await mock.evaluate(() => window.__speech.utterances.slice(1).map(u => u.text))
    assert.equal(spoken.length, 50)
    assert(spoken[49].includes('50번째'))
    await mock.locator('button[data-i="2"]').focus()
    await mock.locator('button[data-i="2"]').press('Enter')
    assert((await mock.evaluate(() => window.__speech.active.text)).includes('3번째'))
    await mock.evaluate(() => window.__speech.active.onerror({ error: 'synthesis-failed' }))
    await mock.getByRole('alert').waitFor()
    await mock.getByRole('button', { name: '재생', exact: true }).waitFor()
    await mock.getByRole('button', { name: '지우기', exact: true }).click()
    assert(await mock.getByRole('button', { name: '재생', exact: true }).isDisabled())
    return { completedSentences: spoken.length, backend: 'Explicitly simulated' }
  })
  await simulated.close()
  await run('No browser runtime or hydration errors', async () => { assert.deepEqual(errors, []) })
} finally {
  await browser.close()
  writeFileSync(resolve(out, 'results.json'), JSON.stringify({ results, errors }, null, 2))
}
const failed = results.filter(r => !r.pass)
console.log(results.length - failed.length + '/' + results.length + ' passed')
if (failed.length) process.exitCode = 1
