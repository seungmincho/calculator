import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const base = 'http://127.0.0.1:3039', out = resolve('docs/verify/2026-11-16-repeat-use-next'), only = process.argv[2]
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' }), results = []
const button = (page, name) => page.getByRole('button', { name, exact: true }).last()
async function test(name, fn, options = {}) {
  if (only && !name.includes(only)) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true })
  await context.route('**/*', r => r.request().url().startsWith(base) || (options.model && /cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com|cdnjs\.cloudflare\.com|raw\.githubusercontent\.com/.test(r.request().url())) ? r.continue() : r.abort())
  const page = await context.newPage(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && /hydration|didn't match/.test(m.text())) errors.push(m.text()) })
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(120000)
  const open = async path => { await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await page.locator('main h1').waitFor() }
  try { await fn({ page, context, open }); assert.deepEqual(errors, []); results.push({ name, pass: true }) }
  catch (error) { results.push({ name, pass: false, error: error.message }); await page.screenshot({ path: resolve(out, `${name}-failed.png`), fullPage: true }).catch(() => {}) }
  finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
}
async function ttsMock(context, local = true) {
  await context.addInitScript(local => {
    window.__spoken = []
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text } } })
    Object.defineProperty(window, 'speechSynthesis', { value: { speak(u) { window.__spoken.push({ text: u.text, local: u.voice?.localService }); u.onend?.() }, cancel() {}, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {}, getVoices() { return [...(local ? [{ name: 'Korean local test', lang: 'ko-KR', localService: true }] : []), { name: 'Korean online test', lang: 'ko-KR', localService: false }] } } })
  }, local)
}
const history = page => page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-rehearsals-v1') || '[]'))
try {
  await test('rehearsal-timing-pause-save-compare-reload', async ({ page, open }) => {
    await open('/presentation-timer/?s=도입:1,본론:1,마무리:1&snd=0&vib=0')
    await page.getByLabel('구간별 연습 기록 켜기').check()
    await page.getByLabel('연습 이름', { exact: true }).fill('월간 발표')
    await page.clock.install()
    await button(page, '시작').click(); await page.clock.runFor(2200)
    await button(page, '다음 구간 기록').click(); await page.clock.runFor(1800)
    await button(page, '일시정지').click(); await page.clock.runFor(5000)
    await button(page, '계속').click(); await page.clock.runFor(1200)
    await button(page, '다음 구간 기록').click(); await page.clock.runFor(2000)
    await button(page, '연습 마치고 저장').click()
    const [record] = await history(page)
    assert.ok(record.totalMs >= 7200 && record.totalMs < 8500, `pause excluded: ${record.totalMs}`)
    assert.equal(record.actualMs.length, 3); assert.ok(record.actualMs.every(value => value > 0))
    const optionId = record.id
    await page.getByLabel('비교할 연습 기록', { exact: true }).selectOption(optionId)
    await button(page, '이 구성으로 새 연습').click(); await button(page, '시작').click(); await page.clock.runFor(1500)
    await button(page, '연습 마치고 저장').click()
    const second = (await history(page))[0]
    assert.deepEqual(second.actualMs.slice(1), [null, null], 'unvisited sections are not fabricated')
    assert.equal((await history(page)).length, 2)
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByLabel('비교할 연습 기록', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('비교할 연습 기록', { exact: true }).locator('option').count(), 3)
    await page.getByLabel('비교할 연습 기록', { exact: true }).selectOption(optionId)
    await button(page, '선택 기록 삭제').click(); await button(page, '삭제 확인').click(); assert.equal((await history(page)).length, 1)
  })
  await test('rehearsal-quota-keeps-measurement', async ({ page, context, open }) => {
    await context.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'toolhub-rehearsals-v1') throw new DOMException('quota', 'QuotaExceededError'); return set.call(this, key, value) } })
    await open('/presentation-timer/?snd=0&vib=0'); await page.getByLabel('구간별 연습 기록 켜기').check(); await page.clock.install()
    await button(page, '시작').click(); await page.clock.runFor(1800); await button(page, '연습 마치고 저장').click()
    await page.getByRole('alert').filter({ hasText: '저장 공간' }).waitFor()
    assert.equal((await history(page)).length, 0); assert.ok(await button(page, '연습 마치고 저장').isEnabled())
  })
  await test('ocr-transfer-no-url-no-autoplay-local-voice', async ({ page, context, open }) => {
    await ttsMock(context)
    await context.addInitScript(() => sessionStorage.setItem('toolhub-ocr-tts-v1', JSON.stringify({ source: 'ocr', text: '개인 메모의 테스트 문장입니다.', createdAt: Date.now() })))
    await open('/text-to-speech/?from=ocr')
    await page.getByText('사진에서 인식한 글을 불러왔어요. 내용을 확인한 뒤 재생을 누르세요.').waitFor()
    assert.equal(await page.locator('#tts-text').inputValue(), '개인 메모의 테스트 문장입니다.')
    assert.ok(!decodeURIComponent(page.url()).includes('개인 메모'))
    assert.equal(await page.evaluate(() => sessionStorage.getItem('toolhub-ocr-tts-v1')), null)
    assert.deepEqual(await page.evaluate(() => window.__spoken), [])
    assert.ok(await page.getByLabel('기기 내 음성만 사용').isChecked())
    await page.getByRole('option', { name: 'Korean local test (ko-KR)' }).waitFor({ state: 'attached' }); await button(page, '재생').click()
    assert.ok((await page.evaluate(() => window.__spoken)).every(u => u.local === true))
  })
  await test('ocr-transfer-online-only-blocked-until-choice', async ({ page, context, open }) => {
    await ttsMock(context, false)
    await context.addInitScript(() => sessionStorage.setItem('toolhub-ocr-tts-v1', JSON.stringify({ source: 'ocr', text: '온라인 음성 동의 전 재생 금지', createdAt: Date.now() })))
    await open('/text-to-speech/?from=ocr'); await page.getByText('이 기기에서 사용할 수 있는 내장 음성이 없어요.', { exact: false }).waitFor()
    assert.ok(await button(page, '재생').isDisabled()); await page.locator('h1').click(); await page.keyboard.press('Space')
    assert.deepEqual(await page.evaluate(() => window.__spoken), [])
    await page.getByLabel('기기 내 음성만 사용').uncheck(); await button(page, '재생').click()
    assert.equal((await page.evaluate(() => window.__spoken))[0].local, false)
  })
  for (const selectionOnly of [false, true]) await test(`ocr-real-recognition-to-tts${selectionOnly ? '-selection' : ''}`, async ({ page, context, open }) => {
    await ttsMock(context); await open('/image-ocr/')
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 260; const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 1200, 260); x.fillStyle = 'black'; x.font = '48px Arial'; x.fillText('Team meeting starts at noon.', 40, 100); x.fillText('Bring a notebook.', 40, 180); return c.toDataURL().split(',')[1] })
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'meeting.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
    await page.locator('textarea').waitFor({ timeout: 120000 })
    const recognized = await page.locator('textarea').inputValue(); assert.match(recognized, /meeting/i)
    await page.locator('textarea').fill('검토해서 고친 문장을 읽어줍니다.')
    if (selectionOnly) { await page.locator('textarea').press('Home'); for (let i = 0; i < 9; i++) await page.locator('textarea').press('Shift+ArrowRight') }
    const expected = selectionOnly ? '검토해서 고친 문장을 읽어줍니다.'.slice(0, 9) : '검토해서 고친 문장을 읽어줍니다.'
    await button(page, selectionOnly ? '선택한 글 읽어주기' : '현재 글 읽어주기').click(); await page.waitForURL('**/text-to-speech/?from=ocr')
    await page.getByText('사진에서 인식한 글을 불러왔어요. 내용을 확인한 뒤 재생을 누르세요.').waitFor()
    assert.equal(await page.locator('#tts-text').inputValue(), expected)
    assert.deepEqual(await page.evaluate(() => window.__spoken), [])
    writeFileSync(resolve(out, `ocr-sample${selectionOnly ? '-selection' : ''}.json`), JSON.stringify({ recognized, passedText: await page.locator('#tts-text').inputValue() }, null, 2))
  }, { model: true })
  await test('meals-save-week-exclusion-reload-date-rollover', async ({ page, open }) => {
    await open('/menu-roulette/'); const panel = page.locator('[aria-labelledby="meal-history-title"]')
    await panel.getByRole('button', { name: '모두 추천', exact: true }).waitFor(); await button(page, '모두 추천').click()
    const count = async () => Number((await panel.getByText(/현재 추천 후보/).innerText()).match(/후보 (\d+)개/)[1])
    const initial = await count(); await panel.locator('summary').click()
    await page.getByLabel('먹은 메뉴', { exact: true }).fill('피자'); await button(page, '식사 기록 추가').click()
    await button(page, '오늘 먹은 메뉴 제외').click(); assert.ok(await count() < initial)
    const today = await page.getByLabel('먹은 날짜', { exact: true }).inputValue()
    const past = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })
    await page.getByLabel('먹은 날짜', { exact: true }).fill(past); await page.getByLabel('먹은 메뉴', { exact: true }).fill('치킨'); await button(page, '식사 기록 추가').click()
    const daily = await count(); await button(page, '최근 7일 메뉴 제외').click(); assert.ok(await count() < daily)
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.querySelector('[aria-labelledby="meal-history-title"] button')?.disabled === false)
    assert.equal(await button(page, '최근 7일 메뉴 제외').getAttribute('aria-pressed'), 'true')
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-meals-v1')).records.length), 2)
    await button(page, '오늘 먹은 메뉴 제외').click()
    await page.clock.install(); await page.clock.setSystemTime(new Date(`${today}T12:00:00+09:00`).getTime() + 86400000); await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    assert.equal(await count(), initial, 'yesterday is no longer today')
  })
  await test('meals-filtered-spin-save-and-empty-recovery', async ({ page, context, open }) => {
    await context.addInitScript(() => {
      const date = new Date(), today = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
      localStorage.setItem('toolhub-meals-v1', JSON.stringify({ excludeDays: 7, records: ['피자','치킨'].map((name, i) => ({ id: String(i), date: today, name })) }))
    })
    await open('/menu-roulette/?roulette=피자,치킨,김밥,국밥')
    const panel = page.locator('#meal-history')
    await panel.getByText('현재 추천 후보 2개', { exact: false }).waitFor()
    assert.match(await page.locator('canvas[role="img"]').getAttribute('aria-label'), /김밥.*국밥/)
    assert.doesNotMatch(await page.locator('canvas[role="img"]').getAttribute('aria-label'), /피자|치킨/)
    await page.locator('#roulette-spin').click()
    await page.locator('#roulette-result').waitFor()
    await page.locator('#roulette-result').getByRole('button', { name: /오늘 먹음으로 저장/ }).click()
    await panel.getByText('현재 추천 후보 1개', { exact: false }).waitFor()
    assert.ok(await page.locator('#roulette-spin').isDisabled())
    await button(page, '모두 추천').click()
    assert.ok(await page.locator('#roulette-spin').isEnabled())
    const params = new URL(page.url()).searchParams.get('roulette')
    assert.equal(params, '피자,치킨,김밥,국밥', 'exclusion preserves original candidates')
    await open('/roulette/?roulette=A,B')
    assert.equal(await page.locator('#meal-history').count(), 0)
    assert.ok(await page.locator('#roulette-spin').isEnabled())
  })
  await test('meals-storage-failure-preserves-input', async ({ page, context, open }) => {
    await context.addInitScript(() => { const set=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value) { if(key==='toolhub-meals-v1') throw new DOMException('quota','QuotaExceededError'); return set.call(this,key,value) } })
    await open('/menu-roulette/')
    const panel = page.locator('#meal-history')
    await panel.locator('summary').click(); await page.getByLabel('먹은 메뉴', { exact:true }).fill('김밥')
    await button(page, '식사 기록 추가').click(); await panel.getByRole('alert').waitFor()
    assert.equal(await page.getByLabel('먹은 메뉴', { exact:true }).inputValue(), '김밥')
    assert.equal(await page.evaluate(() => localStorage.getItem('toolhub-meals-v1')), null)
  })
  await test('mobile-320-remaining-tools', async ({ page, context, open }) => {
    await ttsMock(context)
    for (const path of ['/presentation-timer/', '/image-ocr/', '/menu-roulette/']) {
      await open(path)
      if (path.includes('presentation')) await page.getByLabel('구간별 연습 기록 켜기').check()
      if (path.includes('menu')) { await page.waitForFunction(() => document.querySelector('[aria-labelledby="meal-history-title"] button')?.disabled === false); await page.locator('[aria-labelledby="meal-history-title"] summary').click() }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: no overflow`)
      assert.ok(!/rehearsal\.|handoff\.|weekly\./.test(await page.locator('main').innerText()))
      await page.screenshot({ path: resolve(out, path.split('/')[1] + '-320.png'), caret: 'initial' })
    }
  }, { width: 320 })
} finally { await browser.close(); writeFileSync(resolve(out, only ? `results-${only}.json` : 'results.json'), JSON.stringify(results, null, 2)) }
if (results.some(r => !r.pass)) process.exitCode = 1
