// Local user flows. Real MediaRecorder/IndexedDB, deterministic ASR and TTS stubs where noted.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-repeat-use')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const results = [], only = process.argv[2]
const button = (page, name) => page.getByRole('button', { name, exact: true })
function wav(seconds = 2, amplitude = 1000) {
  const size = seconds * 32000, b = Buffer.alloc(size + 44)
  b.write('RIFF'); b.writeUInt32LE(size + 36, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(size, 40)
  for (let i = 0; i < size / 2; i++) b.writeInt16LE(Math.round(Math.sin(i * 440 / 16000 * Math.PI * 2) * amplitude), 44 + i * 2)
  return { name: '회의메모.wav', mimeType: 'audio/wav', buffer: b }
}
async function run(name, fn, options = {}) {
  if (only && !name.includes(only)) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true })
  const errors = [], external = []
  await context.addInitScript(options => { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light') }, options)
  await context.route('**/*', route => { if (!route.request().url().startsWith(base)) { external.push(route.request().url()); return route.abort() } return route.continue() })
  const page = await context.newPage()
  page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(120000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error' && /hydration|didn't match/i.test(msg.text())) errors.push(msg.text()) })
  page.on('dialog', dialog => dialog.accept())
  const open = async slug => {
    await page.goto(`${base}/${slug}/`, { waitUntil: 'domcontentloaded' })
    await page.locator('main h1').waitFor()
    if (slug === 'voice-memo') await page.getByText('저장한 메모를 불러오고 있어요…', { exact: true }).waitFor({ state: 'hidden' })
    if (slug === 'text-to-speech') await page.getByRole('option', { name: 'Korean test voice (ko-KR)', exact: true }).waitFor({ state: 'attached' })
    if (slug === 'team-divider') await page.waitForFunction(() => document.querySelector('[aria-labelledby="team-rosters-title"] input')?.disabled === false)
  }
  try { await fn({ page, context, open, external }); assert.deepEqual(errors, []); results.push({ name, pass: true }) }
  catch (error) { results.push({ name, pass: false, error: error.message }); await page.screenshot({ path: resolve(out, `${name}-failed.png`), fullPage: true }).catch(() => {}) }
  finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
}
const memo = page => page.getByTestId('voice-memo-item')
const importAudio = (page, audio = wav()) => page.getByLabel('오디오 파일 가져오기', { exact: true }).setInputFiles(audio)
async function readMemos(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('toolhub-voice-memos', 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => { const db = req.result, q = db.transaction('memos').objectStore('memos').getAll(); q.onsuccess = () => { resolve(q.result.map(r => ({ ...r, blob: { size: r.blob.size, type: r.blob.type } }))); db.close() } }
  }))
}
async function mockTTS(context) {
  await context.addInitScript(() => {
    window.__spoken = []
    window.__utterance = null
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text } } })
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak(utterance) { window.__utterance = utterance; window.__spoken.push(utterance.text) },
      cancel() { window.__utterance = null }, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
      getVoices() { return [{ name: 'Korean test voice', lang: 'ko-KR', localService: true, default: true }] },
    } })
    window.__finish = () => { const u = window.__utterance; window.__utterance = null; u?.onend?.() }
  })
}
async function prepareRepeat(page) {
  await page.locator('#tts-text').fill('첫 문장입니다. 둘째 문장입니다. 마지막 문장입니다.')
  await page.getByLabel('구간 반복 듣기', { exact: true }).check()
  await page.getByLabel('시작 문장', { exact: true }).selectOption('1')
  await page.getByLabel('끝 문장', { exact: true }).selectOption('2')
  await page.getByLabel('반복 횟수', { exact: true }).selectOption('2')
  await page.getByLabel('반복 사이 쉬는 시간', { exact: true }).selectOption('0')
}

try {
  await run('voice-save-restore-search-export-delete', async ({ page, open, external }) => {
    await open('voice-memo'); await importAudio(page)
    await memo(page).waitFor()
    await page.getByLabel('전사문', { exact: true }).fill('금요일 회의 준비: 견적서 검토')
    await button(page, '기기에 저장').click(); await button(page, '저장됨').waitFor()
    const stored = await readMemos(page)
    assert.equal(stored.length, 1); assert.equal(stored[0].duration, 2); assert.equal(stored[0].blob.size, wav().buffer.length)
    await page.reload({ waitUntil: 'domcontentloaded' }); await memo(page).waitFor()
    await page.getByLabel('메모 검색', { exact: true }).fill('견적서'); assert.equal(await memo(page).count(), 1)
    await page.getByLabel('메모 검색', { exact: true }).fill('없는단어'); await page.getByText('검색어와 일치하는 메모가 없어요.').waitFor()
    await page.getByLabel('메모 검색', { exact: true }).fill('회의메모')
    await button(page, '전사문 보기·수정').click()
    assert.equal(await page.getByLabel('전사문', { exact: true }).inputValue(), '금요일 회의 준비: 견적서 검토')
    const download = page.waitForEvent('download'); await button(page, '글 다운로드').click(); assert.ok((await download).suggestedFilename().endsWith('.txt'))
    await button(page, '재생').click(); await button(page, '일시정지').waitFor()
    await button(page, '삭제').click(); await button(page, '메모 삭제 확인').click(); await memo(page).waitFor({ state: 'hidden' })
    assert.equal((await readMemos(page)).length, 0)
    assert.equal(external.filter(url => /huggingface|mlc-ai|transformers|web-llm/i.test(url)).length, 0)
  })
  await run('voice-real-record-pause-resume-duration', async ({ page, open }) => {
    await open('voice-memo'); await button(page, '녹음').click(); await button(page, '중지').waitFor()
    await page.waitForTimeout(1200); await button(page, '일시정지').click(); await page.waitForTimeout(1200)
    await button(page, '다시 시작').click(); await page.waitForTimeout(1200); await button(page, '중지').click()
    await button(page, '기기에 저장').click(); await button(page, '저장됨').waitFor()
    const [saved] = await readMemos(page)
    assert.ok(saved.duration >= 2 && saved.duration < 3.6, `pause excluded: ${saved.duration}`)
    assert.ok(saved.blob.size > 0)
  })
  await run('voice-transcribe-cancel-and-limits-mocked-asr', async ({ page, context, open }) => {
    await context.addInitScript(() => {
      window.__workerCount = 0; window.__holdWorker = false
      window.Worker = class { constructor() { window.__workerCount++ } postMessage() { if (!window.__holdWorker) this.timer = setTimeout(() => this.onmessage?.({ data: { type: 'result', text: '다음 주 금요일에 보고하겠습니다.' } }), 30) } terminate() { clearTimeout(this.timer) } }
    })
    await open('voice-memo'); await importAudio(page); await memo(page).waitFor()
    assert.equal(await page.evaluate(() => window.__workerCount), 0)
    await button(page, '글로 변환').click()
    await page.waitForFunction(() => document.querySelector('textarea[id^="voice-text-"]')?.value.includes('보고하겠습니다'))
    assert.equal(await page.evaluate(() => window.__workerCount), 1)
    await page.evaluate(() => { window.__holdWorker = true }); await button(page, '글로 변환').click()
    await button(page, '취소').click(); assert.ok(await button(page, '글로 변환').isEnabled())
    await importAudio(page, wav(181)); await page.getByRole('alert').filter({ hasText: '3분' }).waitFor()
    assert.equal(await memo(page).count(), 1)
    await importAudio(page, wav(2, 0)); await memo(page).nth(1).waitFor(); await memo(page).first().getByRole('button', { name: '글로 변환', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: '말소리를 찾지' }).waitFor()
    assert.equal(await page.evaluate(() => window.__workerCount), 2)
  })
  await run('voice-storage-failure-keeps-recording', async ({ page, context, open }) => {
    await context.addInitScript(() => { IDBObjectStore.prototype.put = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError') } })
    await open('voice-memo'); await importAudio(page); await memo(page).waitFor()
    await page.getByLabel('전사문', { exact: true }).fill('저장 실패해도 남아야 하는 메모')
    await button(page, '기기에 저장').click(); await page.getByRole('alert').filter({ hasText: '저장 공간' }).waitFor()
    assert.equal(await page.getByLabel('전사문', { exact: true }).inputValue(), '저장 실패해도 남아야 하는 메모')
    assert.equal((await readMemos(page)).length, 0)
    assert.ok(await button(page, '다운로드').isEnabled())
    assert.equal(await button(page, '저장됨').count(), 0)
    await button(page, '삭제').click(); await button(page, '메모 삭제 확인').click(); await memo(page).waitFor({ state: 'hidden' })
  })
  await run('tts-selected-range-repeat-and-text-reset', async ({ page, context, open }) => {
    await mockTTS(context); await open('text-to-speech'); await prepareRepeat(page)
    assert.deepEqual(await page.evaluate(() => window.__spoken), [])
    await button(page, '재생').click()
    for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__finish()); await page.waitForTimeout(20) }
    assert.deepEqual(await page.evaluate(() => window.__spoken), ['둘째 문장입니다.', '마지막 문장입니다.', '둘째 문장입니다.', '마지막 문장입니다.'])
    await button(page, '재생').waitFor()
    await page.locator('#tts-text').fill('바뀐 원고입니다.')
    assert.equal(await page.getByLabel('구간 반복 듣기', { exact: true }).isChecked(), false)
    await button(page, '재생').click(); await page.evaluate(() => window.__finish())
    assert.equal((await page.evaluate(() => window.__spoken)).at(-1), '바뀐 원고입니다.')
  })
  await run('tts-gap-pause-resume-stop-no-stale-audio', async ({ page, context, open }) => {
    await mockTTS(context); await open('text-to-speech'); await prepareRepeat(page)
    await page.getByLabel('끝 문장', { exact: true }).selectOption('1')
    await page.getByLabel('반복 사이 쉬는 시간', { exact: true }).selectOption('2')
    await button(page, '재생').click(); await page.evaluate(() => window.__finish())
    await page.getByText('잠시 쉬는 중 · 소리 내어 따라 읽어 보세요.').waitFor()
    await button(page, '일시정지').click(); await page.waitForTimeout(2200)
    assert.equal((await page.evaluate(() => window.__spoken)).length, 1)
    await button(page, '계속').click(); await page.evaluate(() => window.__finish()); await button(page, '재생').waitFor()
    assert.equal((await page.evaluate(() => window.__spoken)).length, 2)
    await button(page, '재생').click(); await page.evaluate(() => window.__finish()); await button(page, '정지').click(); await page.waitForTimeout(2200)
    assert.equal((await page.evaluate(() => window.__spoken)).length, 3)
  })
  await run('roster-balanced-save-reload-update-delete', async ({ page, open }) => {
    await open('team-divider')
    await page.locator('input[value="balanced"]').check()
    await page.getByLabel('참가자 1 실력', { exact: false }).selectOption('5')
    await page.getByLabel('새 명단 이름', { exact: true }).fill('토요 풋살')
    await button(page, '3').click(); await button(page, '현재 명단 새로 저장').click()
    await page.getByText('이 브라우저에 명단을 저장했어요.', { exact: true }).waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('select').filter({ has: page.locator('option', { hasText: '토요 풋살' }) }).selectOption({ label: '토요 풋살 · 6명' })
    await button(page, '명단 불러오기').click()
    assert.ok(await page.locator('input[value="balanced"]').isChecked())
    assert.equal(await page.getByLabel('참가자 1 실력', { exact: false }).inputValue(), '5')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-team-rosters-v1')))
    assert.equal(stored[0].teamCount, 3)
    await button(page, '팀 나누기!').click(); await button(page, '다시 나누기').waitFor()
    assert.equal(await page.locator('#team-divider-result ul').count(), 3)
    assert.equal(await page.locator('#team-divider-result li').count(), 6)
    await button(page, '2').click(); await button(page, '현재 명단으로 덮어쓰기').click()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-team-rosters-v1'))[0].teamCount), 2)
    await button(page, '저장 명단 삭제').click(); await button(page, '취소').click()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-team-rosters-v1')).length), 1)
    await button(page, '저장 명단 삭제').click(); await button(page, '삭제 확인').click()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('toolhub-team-rosters-v1')).length), 0)
  })
  await run('roster-storage-failure-preserves-data', async ({ page, context, open }) => {
    await context.addInitScript(() => { localStorage.setItem('toolhub-team-rosters-v1', '{broken') })
    await open('team-divider'); await page.getByRole('alert').filter({ hasText: '명단 저장소' }).waitFor()
    await page.getByLabel('새 명단 이름', { exact: true }).fill('새 명단'); await button(page, '현재 명단 새로 저장').click()
    assert.equal(await page.evaluate(() => localStorage.getItem('toolhub-team-rosters-v1')), '{broken')
    assert.equal(await page.getByText('이 브라우저에 명단을 저장했어요.', { exact: true }).count(), 0)
  })
  for (const [language, dark] of [['ko', false], ['en', true]]) {
    await run(`mobile-320-${language}`, async ({ page, context, open, external }) => {
      await mockTTS(context)
      for (const slug of ['voice-memo', 'text-to-speech', 'team-divider']) {
        await open(slug)
        // Tool namespaces currently render Korean; navigation supports the saved language.
        if (slug === 'text-to-speech') await page.getByLabel('구간 반복 듣기', { exact: true }).check()
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), slug + ': no horizontal overflow')
        assert.ok(!/enhance\.|rosters\.|repeat\./.test(await page.locator('main').innerText()), 'no raw translation keys')
        await page.screenshot({ path: resolve(out, `${slug}-320-${language}.png`), caret: 'initial' })
      }
      assert.equal(external.filter(url => /huggingface|mlc-ai|transformers|web-llm/i.test(url)).length, 0)
    }, { width: 320, language, dark })
  }
} finally { await browser.close(); writeFileSync(resolve(out, only ? `results-${only}.json` : 'results.json'), JSON.stringify(results, null, 2)) }
if (results.some(r => !r.pass)) process.exitCode = 1
