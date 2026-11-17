// User-flow checks use real MediaRecorder/IndexedDB. Model inference is checked separately.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const base = 'http://127.0.0.1:3039'
const artifacts = resolve('docs/verify/2026-11-16-speaking-light-default')
mkdirSync(artifacts, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const results = []
const only = process.argv[2]
function wav(seconds = 2, amplitude = 0) {
  const rate = 16000, size = Math.floor(seconds * rate) * 2, b = Buffer.alloc(size + 44)
  b.write('RIFF'); b.writeUInt32LE(size + 36, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(size, 40)
  for (let i = 0; i < size / 2; i++) b.writeInt16LE(Math.round(Math.sin(i * 440 / rate * Math.PI * 2) * amplitude), 44 + i * 2)
  return { name: 'test.wav', mimeType: 'audio/wav', buffer: b }
}
async function test(name, run, options = {}) {
  if (only && !name.includes(only)) return
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: options.width || 1365, height: options.height || 1000 } })
  await context.addInitScript(({ dark, gpu }) => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/speaking-practice']))
    if (gpu === false) Object.defineProperty(navigator, 'gpu', { value: undefined })
  }, options)
  const page = await context.newPage(), errors = [], external = []
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(90000)
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && /hydration|hydrated|didn't match/i.test(m.text())) errors.push(m.text()) })
  await context.route('**/*', route => {
    if (!route.request().url().startsWith(base)) { external.push(route.request().url()); return route.abort() }
    return route.continue()
  })
  const open = async (query = '') => {
    await page.goto(`${base}/speaking-practice/${query}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: '1분 말하기 연습실', exact: true }).waitFor()
    await page.getByText('저장한 기록을 불러오고 있어요', { exact: true }).waitFor({ state: 'hidden' })
  }
  try {
    await run({ page, context, open, external })
    assert.deepEqual(errors, [], 'no runtime/hydration errors')
    results.push({ name, status: 'PASS' })
  } catch (e) {
    results.push({ name, status: 'FAIL', error: e.message })
    await page.screenshot({ path: resolve(artifacts, `${name}-failed.png`), fullPage: true }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
const input = page => page.locator('#speaking-transcript')
async function typed(page, text) { await button(page, '텍스트로 연습').click(); await input(page).fill(text) }
async function stored(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const r = indexedDB.open('toolhub-speaking-practice', 1)
    r.onerror = () => reject(r.error)
    r.onsuccess = () => { const db = r.result, q = db.transaction('sessions').objectStore('sessions').getAll(); q.onsuccess = () => { resolve(q.result); db.close() } }
  }))
}
try {
  await test('initial-mobile-no-model-download', async ({ page, open, external }) => {
    await open()
    assert.equal(await page.locator('h1').count(), 1)
    await page.getByText('연습 전 미리보기', { exact: true }).last().waitFor()
    assert.equal(external.filter(url => /huggingface|mlc-ai|web-llm|transformers/.test(url)).length, 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    const record = await button(page, '녹음 시작').boundingBox()
    assert.ok(record.y + record.height <= 812 - 80, 'record button is visible above bottom navigation')
    await page.screenshot({ path: resolve(artifacts, 'mobile-light.png') })
    await page.setViewportSize({ width: 320, height: 812 })
    const narrow = await button(page, '녹음 시작').boundingBox()
    assert.ok(narrow.y + narrow.height <= 812 - 80, '320px record button is also visible')
    await page.screenshot({ path: resolve(artifacts, 'mobile-first-screen-320.png') })
    await button(page, '업무 보고').click()
    await page.getByRole('heading', { name: '진행한 일과 현재 상태를 1분 안에 알려 주세요.' }).waitFor()
  }, { width: 375, height: 812 })
  await test('automatic-basic-checks-no-gpu-no-download', async ({ page, open, external }) => {
    await open()
    await typed(page, '음, 음. 저는 개발자입니다. 프로젝트 프로젝트 프로젝트 경험이 있습니다. 설명이 강점입니다.')
    const check = page.getByTestId('speaking-basic-check')
    await check.getByText('음 2회', { exact: true }).waitFor()
    await check.getByText('프로젝트 3회', { exact: true }).waitFor()
    assert.equal(await check.getByText('표현 있음', { exact: true }).count(), 3)
    await input(page).fill('저는 개발자입니다. 최근 화면을 개선했습니다. 설명이 강점입니다.')
    await check.getByText('전사문에서 후보를 찾지 못했어요.', { exact: true }).waitFor()
    assert.equal(external.filter(url => /huggingface|mlc-ai|web-llm|transformers/.test(url)).length, 0)
    assert.equal(await input(page).evaluate(el => getComputedStyle(el).fontSize), '16px')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.getByRole('link', { name: '기본 점검 보기', exact: true }).click()
    await page.screenshot({ path: resolve(artifacts, 'mobile-basic-checks.png') })
  }, { gpu: false, width: 320, dark: true })
  await test('remove-coaching-cache-preserves-records', async ({ page, open, external }) => {
    await open()
    await typed(page, '모델을 지워도 남아 있어야 하는 연습 기록입니다.')
    await button(page, '이 기기에 저장').click()
    await button(page, '이 기기에 저장했어요').waitFor()
    await page.evaluate(async () => {
      const cache = await caches.open('transformers-cache')
      await cache.put('https://huggingface.co/onnx-community/whisper-tiny/resolve/main/config.json', new Response('{}'))
      const model = await caches.open('webllm/model')
      await model.put('https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC/resolve/main/params_shard_0.bin', new Response('partial'))
      await model.put('https://huggingface.co/mlc-ai/other-model/resolve/main/params_shard_0.bin', new Response('keep'))
    })
    await button(page, '다운로드 안내·설정 보기').click()
    await button(page, '다운로드한 코칭 모델 삭제').click()
    await page.getByText('코칭 모델 캐시를 지웠어요. 연습 기록은 그대로예요.', { exact: true }).waitFor()
    assert.equal((await stored(page)).length, 1)
    assert.equal(await page.evaluate(async () => !!await (await caches.open('transformers-cache')).match('https://huggingface.co/onnx-community/whisper-tiny/resolve/main/config.json')), true)
    const modelKeys = await page.evaluate(async () => (await (await caches.open('webllm/model')).keys()).map(request => request.url))
    assert.equal(modelKeys.some(url => url.includes('Qwen3-1.7B')), false, 'partial download is also removed')
    assert.equal(modelKeys.some(url => url.includes('other-model')), true, 'unrelated cached models are preserved')
    assert.equal(external.filter(url => /huggingface|mlc-ai/.test(url)).length, 0, 'deleting a cache never downloads a model')
    assert.equal(await button(page, '생성형 코칭 받기').isDisabled(), true)
  })
  await test('text-fallback-compare-save-reload-export', async ({ page, open }) => {
    await open('?mode=report')
    await typed(page, '첫 보고입니다. 계산기 개편을 마쳤습니다.')
    await button(page, '다운로드 안내·설정 보기').click()
    assert.equal(await button(page, '생성형 코칭 받기').isDisabled(), true)
    await page.getByTestId('speaking-basic-check').getByText('기본 점검', { exact: true }).waitFor()
    await typed(page, '계산기 개편과 모바일 테스트를 마쳤습니다. 내일 배포할 예정입니다.')
    const compare = page.getByTestId('speaking-comparison')
    await compare.waitFor()
    assert.ok((await compare.innerText()).includes('첫 보고입니다.'))
    assert.ok((await compare.innerText()).includes('시간 정보 없음') === false)
    await button(page, '이 기기에 저장').click()
    await button(page, '이 기기에 저장했어요').waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await button(page, '불러오기').click()
    assert.match(await input(page).inputValue(), /내일 배포/)
    await compare.waitFor()
    assert.equal((await stored(page))[0].takes.length, 2)
    const download = page.waitForEvent('download')
    await button(page, '원문·점검 내보내기').click()
    const file = await download, dest = resolve(artifacts, 'export-report.txt')
    await file.saveAs(dest)
    assert.match(readFileSync(dest, 'utf8'), /첫 보고입니다/)
    assert.match(readFileSync(dest, 'utf8'), /내일 배포/)
    assert.match(readFileSync(dest, 'utf8'), /기본 점검/)
    await page.screenshot({ path: resolve(artifacts, 'comparison-dark-mobile.png'), fullPage: true })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    page.once('dialog', d => d.accept())
    await button(page, '삭제').click()
    await page.getByText('첫 연습을 저장하면 여기에 모여요.').waitFor()
    assert.equal((await stored(page)).length, 0)
  }, { gpu: false, width: 320, dark: true })
  await test('record-replay-blob-restoration', async ({ page, open }) => {
    await open()
    await button(page, '녹음 시작').click()
    await button(page, '녹음 마치기').waitFor()
    await page.waitForTimeout(1300)
    await button(page, '녹음 마치기').click()
    await page.locator('audio').waitFor()
    await input(page).fill('첫 녹음입니다. 개발자를 소개합니다.')
    await page.locator('audio').evaluate(async audio => { await audio.play(); audio.pause() })
    await button(page, '다시 녹음').click()
    await button(page, '녹음 마치기').waitFor()
    await page.waitForTimeout(1500)
    await button(page, '녹음 마치기').click()
    await input(page).fill('두 번째 녹음입니다. 경험부터 소개하겠습니다.')
    await page.getByTestId('speaking-comparison').waitFor()
    assert.equal(await page.locator('audio').count(), 3)
    await page.locator('audio').nth(1).evaluate(audio => audio.play())
    await page.locator('audio').nth(2).evaluate(audio => audio.play())
    assert.equal(await page.locator('audio').nth(1).evaluate(audio => audio.paused), true)
    await button(page, '이 기기에 저장').click()
    await button(page, '이 기기에 저장했어요').waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await button(page, '불러오기').click()
    await page.locator('audio').first().evaluate(async audio => { await audio.play(); audio.pause() })
    const blobSizes = await page.evaluate(() => new Promise(resolve => { const r = indexedDB.open('toolhub-speaking-practice', 1); r.onsuccess = () => { const db = r.result; const q = db.transaction('sessions').objectStore('sessions').getAll(); q.onsuccess = () => { resolve(q.result[0].takes.map(t => t.audio.size)); db.close() } } }))
    assert.ok(blobSizes.every(size => size > 100))
    const downloading = page.waitForEvent('download')
    await button(page, '선택한 녹음 내려받기').click()
    const download = await downloading
    await download.saveAs(resolve(artifacts, 'recorded-test.webm'))
    assert.ok(readFileSync(resolve(artifacts, 'recorded-test.webm')).length > 100)
  })
  await test('audio-validation-silence-and-take-limit', async ({ page, open }) => {
    await open()
    await page.locator('input[type=file]').setInputFiles(wav(91))
    await page.getByRole('alert').filter({ hasText: '90초 이내' }).waitFor()
    assert.equal(await input(page).count(), 0)
    await page.locator('input[type=file]').setInputFiles(wav(2))
    await button(page, '음성을 글로 변환').click()
    await page.getByRole('alert').filter({ hasText: '인식된 말이 없어요' }).waitFor()
    assert.equal(await input(page).inputValue(), '')
    for (let i = 0; i < 4; i++) await button(page, '텍스트로 연습').click()
    assert.equal(await button(page, '텍스트로 연습').isDisabled(), true)
    assert.equal(await button(page, '다시 녹음').isDisabled(), true)
    assert.equal(await page.locator('input[type=file]').isDisabled(), true)
    await button(page, '이 기기에 저장').click()
    await button(page, '이 기기에 저장했어요').waitFor()
    assert.equal((await stored(page))[0].takes.length, 5)
  })
  await test('failed-save-preserves-answer', async ({ page, open }) => {
    await open()
    await typed(page, '저장에 실패해도 이 답변은 유지되어야 합니다.')
    await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('quota', 'QuotaExceededError') } })
    await button(page, '이 기기에 저장').click()
    await page.getByRole('alert').filter({ hasText: '기기에 저장하지 못했어요' }).waitFor()
    assert.match(await input(page).inputValue(), /유지되어야/)
    assert.equal(await button(page, '이 기기에 저장했어요').count(), 0)
    assert.equal((await stored(page)).length, 0)
  })
  await test('microphone-denied-text-remains-usable', async ({ page, open }) => {
    await open()
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError') } })
    await button(page, '녹음 시작').click()
    await page.getByRole('alert').filter({ hasText: '마이크 권한이 허용되지 않았어요' }).waitFor()
    await typed(page, '마이크 없이 텍스트로 작성한 자기소개입니다.')
    assert.match(await input(page).inputValue(), /텍스트로 작성/)
  })
  await test('summary-only-link-reproduces-numbers', async ({ page, open }) => {
    await open('?summary=1&mode=report&seconds=60&words=80&transcript=PRIVATE')
    const summary = page.getByRole('region', { name: '공유받은 연습 요약' })
    assert.match(await summary.innerText(), /60초/)
    assert.match(await summary.innerText(), /80어절/)
    assert.equal(await input(page).count(), 0)
    assert.ok(!(await page.locator('main').innerText()).includes('PRIVATE'))
  })
  await test('cancel-model-load-preserves-answer', async ({ page, open, external }) => {
    await open()
    await typed(page, '취소 후에도 보존할 자기소개 원문입니다.')
    // Isolate cancellation without downloading a model; real inference has its own test.
    await page.evaluate(() => {
      window.testWorkers = []
      window.Worker = class extends EventTarget {
        constructor() { super(); this.stopped = false; window.testWorkers.push(this) }
        postMessage() {}
        terminate() { this.stopped = true }
      }
    })
    assert.equal(await button(page, '생성형 코칭 받기').count(), 0)
    await button(page, '다운로드 안내·설정 보기').click()
    assert.equal(await button(page, '생성형 코칭 받기').isDisabled(), true)
    assert.equal(external.filter(url => /huggingface|mlc-ai|web-llm|transformers/.test(url)).length, 0)
    await page.getByRole('checkbox', { name: /첫 실행 시 약 1.1GB/ }).check()
    assert.equal(await page.evaluate(() => window.testWorkers.length), 0, 'opting in alone does not load a model')
    await button(page, '생성형 코칭 받기').click()
    await button(page, '취소').waitFor()
    await page.waitForFunction(() => window.testWorkers.length > 0)
    await button(page, '취소').click()
    assert.equal(await input(page).isEnabled(), true)
    assert.match(await input(page).inputValue(), /보존할 자기소개/)
    assert.ok(await page.evaluate(() => window.testWorkers.every(worker => worker.stopped)))
    assert.equal(await page.getByTestId('speaking-feedback').count(), 0)
    await page.getByTestId('speaking-basic-check').waitFor()
    await page.getByRole('checkbox', { name: /첫 실행 시 약 1.1GB/ }).uncheck()
    assert.equal(await button(page, '생성형 코칭 받기').isDisabled(), true)
  })
  await test('cancel-permission-stops-late-microphone', async ({ page, open }) => {
    await open()
    await page.evaluate(() => {
      const actual = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
        window.grantTestMicrophone = async () => { window.testStream = await actual({ audio: true }); resolve(window.testStream) }
      })
    })
    await button(page, '녹음 시작').click()
    await button(page, '취소').click()
    await page.evaluate(() => window.grantTestMicrophone())
    await page.waitForFunction(() => window.testStream.getTracks().every(track => track.readyState === 'ended'))
    assert.equal(await button(page, '녹음 마치기').count(), 0)
    assert.equal(await button(page, '녹음 시작').isEnabled(), true)
  })
  await test('history-cap-updates-and-corrupt-record', async ({ page, open }) => {
    await open()
    await page.evaluate(() => new Promise(resolve => {
      const r = indexedDB.open('toolhub-speaking-practice', 1)
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('sessions', 'readwrite'), store = tx.objectStore('sessions')
        for (let n = 0; n < 20; n++) store.put({ version: 1, id: `s${n}`, mode: 'intro', createdAt: 1, updatedAt: n + 1, takes: [{ id: `t${n}`, createdAt: 1, seconds: null, transcript: '저장된 자기소개입니다.' }] })
        tx.oncomplete = () => { db.close(); resolve() }
      }
    }))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await button(page, '불러오기').first().waitFor()
    await typed(page, '스물한 번째 새 연습입니다.')
    await button(page, '이 기기에 저장').click()
    await page.getByRole('alert').filter({ hasText: '저장한 연습이 20개예요' }).waitFor()
    assert.equal((await stored(page)).length, 20)
    page.once('dialog', d => d.accept())
    await button(page, '불러오기').first().click()
    await input(page).fill('기존 기록은 개수 제한 상태에서도 수정할 수 있습니다.')
    await button(page, '이 기기에 저장').click()
    await button(page, '이 기기에 저장했어요').waitFor()
    assert.equal((await stored(page)).length, 20)
    assert.match((await stored(page)).find(record => record.id === 's19').takes[0].transcript, /수정할 수/)
    await page.evaluate(() => new Promise(resolve => {
      const r = indexedDB.open('toolhub-speaking-practice', 1)
      r.onsuccess = () => { const db = r.result, tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').put({ version: 1, id: 'corrupt', mode: 'intro', createdAt: 1, updatedAt: 2, takes: [null] }); tx.oncomplete = () => { db.close(); resolve() } }
    }))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await button(page, '불러오기').first().waitFor()
    assert.equal(await button(page, '불러오기').count(), 20)
  })
  await test('copied-summary-never-contains-transcript', async ({ page, open }) => {
    await open()
    await typed(page, 'PRIVATE 사용자 자기소개 원문은 공유 링크에 없어야 합니다.')
    await page.evaluate(() => { navigator.clipboard.writeText = async text => { window.copiedSummary = text } })
    await page.locator('summary').filter({ hasText: '연습 요약 공유' }).click()
    await button(page, '링크 복사').click()
    const link = new URL(await page.evaluate(() => window.copiedSummary))
    assert.deepEqual([...link.searchParams.keys()].sort(), ['mode', 'summary', 'words'])
    assert.equal(link.searchParams.get('words'), '8')
    assert.ok(!decodeURIComponent(link.href).includes('PRIVATE'))
  })
  await test('recording-stops-at-90-seconds', async ({ page, open }) => {
    await open()
    await button(page, '녹음 시작').click()
    await button(page, '녹음 마치기').waitFor()
    await button(page, '녹음 마치기').waitFor({ state: 'hidden', timeout: 100000 })
    await input(page).waitFor()
    assert.equal(await page.getByRole('timer').innerText(), '01:30')
    await button(page, '이 기기에 저장').click()
    await button(page, '이 기기에 저장했어요').waitFor()
    const take = (await stored(page))[0].takes[0]
    assert.equal(take.seconds, 90)
    assert.equal(await button(page, '다시 녹음').isEnabled(), true)
  })
} finally {
  await browser.close()
  writeFileSync(resolve(artifacts, only ? `browser-${only}.json` : 'browser-results.json'), JSON.stringify(results, null, 2))
}
if (results.some(r => r.status !== 'PASS')) process.exitCode = 1
