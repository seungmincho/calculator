// Isolated model research; does not change the application's model or dependencies.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const directory = resolve('docs/verify/2026-11-16-speaking-lightweight')
mkdirSync(directory, { recursive: true })
const context = await chromium.launchPersistentContext(resolve('.wrangler/speaking-lightweight-profile'), { channel: 'chrome', headless: true, serviceWorkers: 'block' })
const result = { model: 'LiquidAI/LFM2.5-230M-ONNX', runtime: '@huggingface/transformers@4.3.2', dtype: 'q4', device: 'webgpu', responses: [], errors: [] }
try {
  await context.route('http://127.0.0.1:3039/__lfm-research', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body><h1>Local model research</h1></body></html>' }))
  const page = context.pages()[0]
  page.on('pageerror', e => result.errors.push(e.message))
  page.on('console', m => { if (/^MODEL_/.test(m.text())) console.log(m.text()) })
  await page.goto('http://127.0.0.1:3039/__lfm-research')
  const start = Date.now()
  result.setup = await page.evaluate(async () => {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js')
    env.allowLocalModels = false
    env.backends.onnx.wasm.numThreads = 1
    let percent = -1
    window.testGenerator = await pipeline('text-generation', 'LiquidAI/LFM2.5-230M-ONNX', { device: 'webgpu', dtype: 'q4', progress_callback: p => {
      if (p.status === 'progress' && Math.floor(p.progress / 20) !== percent) { percent = Math.floor(p.progress / 20); console.log('MODEL_LOADING', p.file, Math.round(p.progress)) }
    } })
    return 'loaded'
  })
  result.loadSeconds = (Date.now() - start) / 1000
  for (const example of [
    { mode: 'intro', text: '저는 웹 개발자입니다. 최근 유류비 계산기의 입력 과정을 단순하게 바꾸었습니다. 사용자의 불편을 찾아 개선하는 것이 제 강점입니다.' },
    { mode: 'report', text: '이번 주 계산기 개편을 마쳤습니다. 차량 저장 기능도 추가했고 모바일 테스트도 완료했습니다. 배포는 아직이고 내일 최종 확인 후 배포할 예정입니다.' },
    { mode: 'korean-control', text: '사용자가 이해하기 쉽게 입력 화면을 개선했습니다.', prompt: '다음 문장을 더 짧은 한국어 한 문장으로 고쳐 줘: 사용자가 이해하기 쉽게 입력 화면을 개선했습니다.' },
    { mode: 'english-control', text: 'I am a web developer. I redesigned a fuel calculator to make the inputs easier to use.', prompt: 'Rewrite this introduction in one clear English sentence: I am a web developer. I redesigned a fuel calculator to make the inputs easier to use.' },
  ]) {
    const started = Date.now()
    const generated = await page.evaluate(async ({ mode, text, prompt }) => {
      const output = await window.testGenerator([
        { role: 'system', content: mode === 'english-control' ? 'You are a concise writing coach.' : '너는 한국어 말하기 코치다. 원문에 없는 사실을 만들지 마라. 한국어로만 답하라.' },
        { role: 'user', content: prompt || `${mode === 'intro' ? '자기소개' : '업무 보고'} 원문: ${text}\n개선할 점 한 가지와 다듬은 답변을 짧게 써 줘. 완료한 일과 앞으로 할 일을 바꾸지 마.` },
      ], { max_new_tokens: 200, do_sample: false, repetition_penalty: 1.05 })
      return output[0].generated_text.at(-1)
    }, example)
    const output = { ...example, seconds: (Date.now() - started) / 1000, ...generated }
    result.responses.push(output)
    console.log('MODEL_RESULT', JSON.stringify(output))
  }
} catch (error) {
  result.errors.push(error.message)
  console.log('MODEL_ERROR', error.message)
  process.exitCode = 1
} finally {
  writeFileSync(resolve(directory, 'lfm-browser.json'), JSON.stringify(result, null, 2))
  await context.close()
}
