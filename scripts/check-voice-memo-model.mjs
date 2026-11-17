// Real Whisper tiny inference on the voice-memo page. Reuses the isolated local model test cache.
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const browser = await chromium.launchPersistentContext(resolve('.wrangler/speaking-model-profile'), { channel: 'chrome', serviceWorkers: 'block', headless: true })
const requests = [], errors = [], started = Date.now()
try {
  await browser.addInitScript(() => sessionStorage.setItem('toolhub_tracked_tools', JSON.stringify(['/voice-memo'])))
  const page = browser.pages()[0] || await browser.newPage()
  page.on('request', r => requests.push({ method: r.method(), url: r.url(), hasBody: !!r.postData() }))
  page.on('pageerror', e => errors.push(e.message))
  page.on('dialog', dialog => dialog.accept())
  await page.route(/google-analytics|googletagmanager|googlesyndication|cloudflareinsights|doubleclick|supabase\.co/, route => route.abort())
  await page.goto('http://127.0.0.1:3039/voice-memo/', { waitUntil: 'domcontentloaded' })
  await page.getByText('저장한 메모를 불러오고 있어요…', { exact: true }).waitFor({ state: 'hidden' })
  await page.getByLabel('오디오 파일 가져오기', { exact: true }).setInputFiles(resolve('docs/verify/2026-11-16-speaking/korean-test.wav'))
  await page.getByTestId('voice-memo-item').first().waitFor()
  assert.equal(requests.filter(r => !r.url.startsWith('http://127.0.0.1') && /huggingface|Qwen|mlc-ai/.test(r.url)).length, 0)
  await page.getByTestId('voice-memo-item').first().getByRole('button', { name: '글로 변환', exact: true }).click()
  console.log('Real Whisper tiny running on voice-memo')
  await page.waitForFunction(() => document.querySelector('textarea[id^="voice-text-"]')?.value.length > 0 || document.querySelector('[role="alert"]'), {}, { timeout: 490000 })
  const text = await page.locator('textarea[id^="voice-text-"]').inputValue()
  assert.ok(text.length > 5, await page.locator('[role="alert"]').allTextContents())
  assert.equal(requests.filter(r => !r.url.startsWith('http://127.0.0.1') && /Qwen|mlc-ai/.test(r.url)).length, 0)
  assert.equal(requests.filter(r => !r.url.startsWith('http://127.0.0.1') && r.hasBody && !/google-analytics|googletagmanager|googlesyndication|cloudflareinsights|doubleclick/.test(r.url)).length, 0, JSON.stringify(requests.filter(r => r.hasBody).map(r => ({ method:r.method,url:r.url }))))
  assert.deepEqual(errors, [])
  const result = { pass: true, milliseconds: Date.now() - started, text, modelRequests: requests.filter(r => /huggingface/.test(r.url)).map(r => r.url), noCoachingDownload: true, noExternalRequestBody: true }
  writeFileSync(resolve('docs/verify/2026-11-16-repeat-use/whisper-result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ pass: true, text, milliseconds: result.milliseconds }))
} finally { await browser.close() }
