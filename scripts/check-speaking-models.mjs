// Real browser inference. Downloads public model weights into an isolated test profile.
// Run: node scripts/check-speaking-models.mjs [optional audio file]
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const quality = 'standard'
const artifacts = resolve('docs/verify/2026-11-16-speaking-light-default')
mkdirSync(artifacts, { recursive: true })
const context = await chromium.launchPersistentContext(resolve('.wrangler/speaking-model-profile'), {
  channel: 'chrome', headless: true, serviceWorkers: 'block', viewport: { width: 1365, height: 1000 },
})
const results = [], requests = [], errors = []
let heartbeat
try {
  await context.addInitScript(() => {
    localStorage.setItem('theme', 'light'); sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/speaking-practice']))
    window.speakingWorkerMessages = []
    const RealWorker = window.Worker
    window.Worker = class extends RealWorker {
      constructor(...args) {
        super(...args)
        this.addEventListener('message', e => { if (e.data?.kind === 'return') window.speakingWorkerMessages.push(e.data) })
      }
    }
  })
  const page = context.pages()[0] || await context.newPage()
  page.on('dialog', dialog => dialog.accept())
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGE_ERROR', e.message.slice(0, 300)) })
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) requests.push({ method: r.method(), url: r.url(), body: r.postData() }) })
  await context.route(/google-analytics|googletagmanager|googlesyndication|cloudflareinsights|doubleclick/, route => route.abort())
  await page.goto('http://127.0.0.1:3039/speaking-practice/', { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByRole('heading', { name: '1분 말하기 연습실', exact: true }).waitFor({ timeout: 60000 })
  await page.getByText('저장한 기록을 불러오고 있어요', { exact: true }).waitFor({ state: 'hidden' })
  let last = ''
  heartbeat = setInterval(async () => {
    const status = await page.locator('[role="status"], [role="alert"]').allTextContents().catch(() => [])
    const next = status.join(' | ')
    if (next !== last) { console.log('PROGRESS', next); last = next }
  }, 10000)
  if (process.argv[2]) {
    await page.locator('input[type=file]').setInputFiles(resolve(process.argv[2]))
    await page.getByRole('button', { name: '음성을 글로 변환', exact: true }).waitFor()
    await page.getByRole('button', { name: '음성을 글로 변환', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('#speaking-transcript')?.value.length > 0 || document.querySelector('[role=alert]'), { }, { timeout: 490000 })
    const text = await page.locator('#speaking-transcript').inputValue()
    results.push({ task: 'asr', text, error: await page.locator('[role=alert]').allTextContents() })
    console.log('ASR', JSON.stringify(results.at(-1)))
    assert.ok(text.length > 0, 'real ASR produced text')
    await page.getByTestId('speaking-basic-check').waitFor()
    assert.equal(requests.filter(request => /Qwen|mlc-ai/.test(request.url)).length, 0, 'speech recognition and basic checks do not request the coaching model')
  } else await page.getByRole('button', { name: '텍스트로 연습', exact: true }).click()
  const examples = [
    { mode: 'intro', text: '안녕하세요. 저는 웹 개발자입니다. 최근 유류비 계산기의 입력 과정을 단순하게 바꾸었습니다. 사용자의 불편을 찾아 개선하는 것이 제 강점입니다. 앞으로도 사용하기 편한 도구를 만들고 싶습니다.' },
    { mode: 'report', text: '이번 주에 유류비 계산기 개편을 마쳤습니다. 정산 기능과 차량 저장 기능을 추가했습니다. 모바일 화면 테스트도 완료했습니다. 현재 배포 전이며 내일 최종 확인 후 배포할 예정입니다.' },
  ]
  for (const example of examples) {
    if (example.mode === 'report') {
      await page.getByRole('button', { name: '업무 보고', exact: true }).click()
      await page.getByRole('button', { name: '텍스트로 연습', exact: true }).click()
    }
    await page.locator('#speaking-transcript').fill(example.text)
    const show = page.getByRole('button', { name: '다운로드 안내·설정 보기', exact: true })
    if (await show.count()) await show.click()
    await page.getByRole('checkbox', { name: /첫 실행 시 약 1.1GB/ }).check()
    const started = Date.now()
    await page.getByRole('button', { name: '생성형 코칭 받기', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[data-testid="speaking-feedback"]') || document.querySelector('[role="alert"]'), {}, { timeout: 490000 })
    const feedback = await page.getByTestId('speaking-feedback').textContent().catch(() => null)
    results.push({ task: 'feedback', mode: example.mode, quality, elapsedSeconds: Math.round((Date.now() - started) / 1000), feedback, error: await page.locator('[role=alert]').allTextContents(), raw: await page.evaluate(() => window.speakingWorkerMessages) })
    const { raw, ...summary } = results.at(-1)
    console.log('RESULT', JSON.stringify(summary))
    await page.screenshot({ path: resolve(artifacts, `real-${quality}-${example.mode}.png`), fullPage: true })
    assert.ok(feedback, 'real model returns grounded Korean feedback')
    await page.getByRole('button', { name: '이 기기에 저장', exact: true }).click()
    await page.getByRole('button', { name: '이 기기에 저장했어요', exact: true }).waitFor()
    const originalText = await page.locator('#speaking-transcript').inputValue()
    await page.locator('#speaking-transcript').fill(originalText + ' 수정한 문장입니다.')
    assert.equal(await page.getByTestId('speaking-feedback').count(), 0, 'editing invalidates stale feedback')
    await page.getByRole('button', { name: '불러오기', exact: true }).first().click()
    await page.getByTestId('speaking-feedback').waitFor()
  }
  const uploaded = requests.filter(request => request.body && /개발자|계산기|자기소개|배포/.test(request.body))
  assert.deepEqual(uploaded, [], 'transcripts are not sent in network requests')
} finally {
  clearInterval(heartbeat)
  writeFileSync(resolve(artifacts, `real-${quality}.json`), JSON.stringify({ results, requests, errors }, null, 2))
  await context.close()
}
