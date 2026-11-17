import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch19/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const d = (key, language = 'ko', values = {}) => tr('diffViewer', key, language, values)
const m = (key, language = 'ko', values = {}) => tr('markdownEditor', key, language, values)
const db = (page, key, language = 'ko') => button(page, d(key, language))
const mb = (page, key, language = 'ko') => button(page, m(key, language))
const normalize = text => text.replace(/\r\n?/g, '\n')
const split = text => text === '' ? [] : normalize(text).split('\n')
const results = []
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

async function run(name, fn, options = {}) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], workerUrls = [], consoleErrors = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch19Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch19Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))
    window.__workerHistory = []; window.__workerReplies = []; window.__workerQueue = []; window.__holdWorkerPosts = false
    const NativeWorker = window.Worker; window.__NativeWorker = NativeWorker
    if (NativeWorker) {
      class ObservedWorker extends NativeWorker {
        constructor(url, options) {
          super(url, options); this.__record = { url: String(url), terminated: false, posts: 0 }; window.__workerHistory.push(this.__record)
          this.addEventListener('message', event => { window.__workerReplies.push(event.data) })
        }
        postMessage(message, ...rest) {
          this.__record.posts++; this.__record.lengths = [message.left?.length, message.right?.length]
          if (window.__holdWorkerPosts) { window.__workerQueue.push(() => { if (!this.__record.terminated) super.postMessage(message, ...rest) }); return }
          return super.postMessage(message, ...rest)
        }
        terminate() { this.__record.terminated = true; return super.terminate() }
      }
      window.Worker = ObservedWorker; window.__ObservedWorker = ObservedWorker
    }
    window.__releaseWorkerPosts = () => { window.__holdWorkerPosts = false; for (const post of window.__workerQueue.splice(0)) post() }
  }, options)
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient') })
  context.on('page', page => {
    page.setDefaultTimeout(16000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
    page.on('worker', worker => workerUrls.push(worker.url()))
  })
  const page = await context.newPage()
  const open = async (slug, query = '') => {
    await page.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await page.locator('main h1').first().waitFor()
    await page.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 60000)
  try { detail = await fn({ page, context, open, workerUrls }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(await page.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.doesNotMatch(await page.locator('body').innerText(), /\b(?:diffViewer|markdownEditor)\.[a-zA-Z][\w.]+/, 'Raw translation key') }
  catch (cause) { status = 'fail'; error = cause.stack ?? String(cause); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial' }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors, hydration, workerUrls, workerHistory: await Promise.race([page.evaluate(() => window.__workerHistory).catch(() => []), wait(1500).then(() => [])]), consoleErrors, external: [...new Set(external)] }
  clearTimeout(watchdog)
  results.push(result); writeFileSync(resolve(out, `${name}-evidence.json`), JSON.stringify(result, null, 2)); console.log(`${status.toUpperCase()} ${name}${error ? `: ${error.split('\n')[0]}` : ''}`); await context.close()
}
async function changeLanguage(page, language) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); const toggle = page.locator('[data-language-toggle]:visible').first()
  await toggle.locator('button[aria-expanded]').click(); await toggle.getByRole('button', { name: language === 'en' ? 'English' : '한국어', exact: true }).last().click()
}
async function screenshot(page, name, panel) {
  if (panel) { await panel.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await panel.screenshot({ path: resolve(out, `${name}-panel.png`), caret: 'initial' }) }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, `${name}-top.png`), caret: 'initial' })
}
async function mobile(page, fields, controls) {
  const box = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  assert.ok(box.body <= box.viewport + 1 && box.document <= box.viewport + 1, JSON.stringify(box))
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  for (const field of fields) assert.ok(await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16)
  for (const control of controls) assert.ok((await control.boundingBox()).height >= 44)
  return box
}
async function download(page, action, filename) {
  const pending = page.waitForEvent('download'); await action(); const file = await pending; const path = resolve(out, filename ?? file.suggestedFilename()); await file.saveAs(path)
  return { filename: file.suggestedFilename(), path, text: readFileSync(path, 'utf8'), bytes: readFileSync(path).length }
}
async function fillField(page, field, value) {
  if (value.length < 20000) { await field.fill(value); return }
  await field.click(); await page.keyboard.press('Control+a'); await page.evaluate(text => navigator.clipboard.writeText(text), value); await page.keyboard.press('Control+v')
  await poll(async () => await field.inputValue() === normalize(value), 'large document pasted through native clipboard')
}
async function fillDiff(page, left, right) { await fillField(page, page.locator('#diff-left'), left); await fillField(page, page.locator('#diff-right'), right) }
async function compare(page, language = 'ko') {
  const previous = await page.evaluate(() => window.__workerReplies.length); await db(page, 'actions.compare', language).click()
  await poll(async () => await page.evaluate(previous => window.__workerReplies.length > previous, previous), 'actual Worker response')
  await poll(async () => await db(page, 'workspace.cancel', language).count() === 0, 'comparison settled')
  const response = await page.evaluate(() => window.__workerReplies.at(-1)); assert.equal(response.ok, true); return response.result
}
function reconstruct(result, left, right) {
  assert.deepEqual(result.lines.filter(line => line.type !== 'added').map(line => line.content), split(left))
  assert.deepEqual(result.lines.filter(line => line.type !== 'removed').map(line => line.content), split(right))
  for (const type of ['added', 'removed', 'unchanged']) assert.equal(result.summary[type], result.lines.filter(line => line.type === type).length)
}
function reconstructExport(text, left, right) {
  const rows = text === '' ? [] : text.split('\n').map(line => { assert.match(line, /^[ +\-] /); return { sign: line[0], value: line.slice(2) } })
  assert.deepEqual(rows.filter(line => line.sign !== '+').map(line => line.value), split(left)); assert.deepEqual(rows.filter(line => line.sign !== '-').map(line => line.value), split(right))
}
const resultSummary = page => page.locator('#diff-result dd').allTextContents()
async function clipboardMode(page, mode) {
  await page.evaluate(mode => {
    window.__clipboardDescriptor ??= Object.getOwnPropertyDescriptor(navigator, 'clipboard') ?? null; window.__realClipboard ??= navigator.clipboard; window.__realExec ??= document.execCommand
    window.__fallbackCalls = 0; window.__writes = []; window.__copyPending = []
    document.execCommand = function(command, ...args) { if (command !== 'copy') return window.__realExec.call(this, command, ...args); window.__fallbackCalls++; return mode === 'fallbackTrue' }
    if (mode === 'native') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: window.__realClipboard }); document.execCommand = window.__realExec; return }
    if (mode === 'absent' || mode === 'fallbackTrue') { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }); return }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: text => { window.__writes.push({ type: 'text', text }); if (mode === 'defer') return new Promise((resolve, reject) => window.__copyPending.push({ resolve, reject })); return Promise.reject(new DOMException('Verification clipboard rejection', 'NotAllowedError')) },
      write: items => { window.__writes.push({ type: 'rich', items }); if (mode === 'defer') return new Promise((resolve, reject) => window.__copyPending.push({ resolve, reject })); return Promise.reject(new DOMException('Verification clipboard rejection', 'NotAllowedError')) },
    } })
  }, mode)
}
const mdEditor = (page, language = 'ko') => page.getByRole('textbox', { name: m('editor', language), exact: true })
const mdCopy = (page, target) => page.locator(`[data-markdown-copy="${target}"]`)
const recovery = (page, target) => page.locator(`[data-markdown-copy-recovery="${target}"]`)
const mdFile = page => page.locator('[data-markdown-file-input]')
const draft = '# 검증 문서\n\n**강조**와 [링크](https://example.com).\n\n- 첫 항목\n- 두 번째 항목\n'
async function copied(page, target, language = 'ko') { await poll(async () => await mdCopy(page, target).innerText() === m('copied', language), `${target} copied`) }
async function controlledReaders(page) {
  await page.evaluate(() => {
    window.__NativeFileReader = window.FileReader; window.__readers = []
    window.FileReader = class {
      constructor() { this.result = null; this.readyState = 0; window.__readers.push(this) }
      readAsText(file) { this.file = file; this.kind = 'text'; this.readyState = 1 }
      readAsDataURL(file) { this.file = file; this.kind = 'image'; this.readyState = 1 }
      abort() { this.aborted = true; this.readyState = 2 }
    }
    window.__finishRead = (index, value, fail = false) => { const reader = window.__readers[index]; reader.result = value; reader.readyState = 2; if (fail) reader.onerror?.({ target: reader }); else reader.onload?.({ target: reader }) }
  })
}
async function chooseFile(page, name, text) { await mdFile(page).setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(text) }) }
async function spa(page, slug) { await page.keyboard.press('Control+k'); await page.locator('input[aria-controls="search-listbox"]').fill(slug); await page.locator(`#search-listbox a[href="/${slug}"]`).click(); await poll(() => Promise.resolve(new URL(page.url()).pathname.replace(/\/$/, '') === `/${slug}`), `SPA ${slug}`) }

try {
  await run('diff-real-worker-unicode-lines-txt-native-copy-and-snapshot', async ({ page, open, workerUrls }) => {
    await open('diff-viewer'); const left = '한글 제목\r\n\r\n<img src=x onerror="window.__diffXss=1">\r\n옛 문장\r\n', right = '한글 제목\n\n<img src=x onerror="window.__diffXss=1">\n새 문장\n추가'
    await fillDiff(page, left, right); const result = await compare(page); reconstruct(result, left, right); assert.ok(workerUrls.length > 0); assert.equal(await page.evaluate(() => window.__diffXss), undefined)
    const file = await download(page, () => db(page, 'workspace.download').click(), 'diff-unicode-comparison.txt'); assert.equal(file.filename, 'toolhub-text-comparison.txt'); reconstructExport(file.text, left, right)
    await db(page, 'actions.copyDiff').click(); await page.getByText(d('actions.copied'), { exact: true }).waitFor(); assert.equal(normalize(await page.evaluate(() => navigator.clipboard.readText())), file.text)
    await page.locator('#diff-right').fill('아직 비교하지 않은 수정'); await page.getByText(d('workspace.stale'), { exact: true }).waitFor()
    const stale = await download(page, () => db(page, 'workspace.download').click(), 'diff-previous-snapshot.txt'); assert.equal(stale.text, file.text)
    const updated = await compare(page); reconstruct(updated, normalize(left), '아직 비교하지 않은 수정'); assert.equal(await page.getByText(d('workspace.stale'), { exact: true }).count(), 0)
    return { summary: result.summary, workerActuallyRan: true, nativeClipboardRead: true, exportedBytes: file.bytes }
  })

  await run('diff-large-identical-small-change-pagination-filter-full-export', async ({ page, open }) => {
    await open('diff-viewer'); const large = Array.from({ length: 8000 }, (_, i) => `행 ${i + 1} 동일 본문`).join('\n')
    await fillDiff(page, large, large); const start = Date.now(), same = await compare(page); assert.deepEqual(same.summary, { added: 0, removed: 0, unchanged: 8000 }); const milliseconds = Date.now() - start
    const changed = large.replace('행 4000 동일 본문', '행 4000 수정 본문'); await fillField(page, page.locator('#diff-right'), changed); const modified = await compare(page); reconstruct(modified, large, changed); assert.deepEqual(modified.summary, { added: 1, removed: 1, unchanged: 7999 })
    assert.equal(await page.locator('#diff-result tbody tr').count(), 200); await db(page, 'workspace.nextPage').click(); assert.equal(await page.locator('#diff-result tbody tr').count(), 200)
    const summary = await resultSummary(page); await db(page, 'workspace.filter.changes').click(); assert.equal(await page.locator('#diff-result tbody tr').count(), 2); assert.deepEqual(await resultSummary(page), summary)
    const file = await download(page, () => db(page, 'workspace.download').click(), 'diff-8000-lines-full-result.txt'); reconstructExport(file.text, large, changed); assert.equal(file.text.split('\n').length, 8001)
    return { largeIdenticalMilliseconds: milliseconds, summary: modified.summary, visibleFilteredRows: 2, exportedRows: 8001 }
  })

  await run('diff-byte-line-work-limits-preserve-previous-result', async ({ page, open }) => {
    await open('diff-viewer'); const previous = await resultSummary(page)
    const cases = [['tooLarge', '가'.repeat(349526), '가'], ['tooManyLines', Array(10001).fill('줄').join('\n'), '줄'], ['tooComplex', Array.from({ length: 2000 }, (_, i) => `왼쪽${i}`).join('\n'), Array.from({ length: 2000 }, (_, i) => `오른쪽${i}`).join('\n')]]
    for (const [code, left, right] of cases) { await fillDiff(page, left, right); await db(page, 'actions.compare').click(); await page.getByText(d(`workspace.errors.${code}`), { exact: true }).waitFor(); assert.deepEqual(await resultSummary(page), previous); assert.equal(await page.locator('#diff-left').inputValue(), left) }
    await fillDiff(page, '', ''); const empty = await compare(page); assert.deepEqual(empty.summary, { added: 0, removed: 0, unchanged: 0 }); await page.getByText(d('workspace.bothEmpty'), { exact: true }).waitFor()
    return { rejected: cases.map(item => item[0]), previousResultPreserved: true, emptyExplicitlyCompared: true }
  })

  await run('diff-real-worker-delayed-post-cancel-edit-replace-and-clear', async ({ page, open }) => {
    await open('diff-viewer'); const previous = await resultSummary(page); await fillDiff(page, '이전', '새 결과')
    await page.evaluate(() => { window.__holdWorkerPosts = true }); await db(page, 'actions.compare').click(); await db(page, 'workspace.cancel').waitFor(); await db(page, 'workspace.cancel').click(); await page.evaluate(() => window.__releaseWorkerPosts()); assert.deepEqual(await resultSummary(page), previous)
    await page.evaluate(() => { window.__holdWorkerPosts = true }); await db(page, 'actions.compare').click(); await db(page, 'workspace.cancel').waitFor(); await page.locator('#diff-right').fill('편집한 최신 내용'); await page.evaluate(() => window.__releaseWorkerPosts()); assert.equal(await db(page, 'workspace.cancel').count(), 0)
    await page.evaluate(() => { window.__holdWorkerPosts = true }); await db(page, 'actions.compare').click(); await db(page, 'workspace.compareAgain').waitFor(); await page.evaluate(() => { window.__holdWorkerPosts = false }); await db(page, 'workspace.compareAgain').click()
    await poll(async () => await page.evaluate(() => window.__workerReplies.some(reply => reply.ok)), 'replacement native Worker response'); await page.evaluate(() => window.__releaseWorkerPosts()); const result = await page.evaluate(() => window.__workerReplies.at(-1).result); reconstruct(result, '이전', '편집한 최신 내용')
    await page.evaluate(() => { window.__holdWorkerPosts = true }); await db(page, 'actions.compare').click(); await db(page, 'workspace.cancel').waitFor(); await db(page, 'actions.swap').click(); assert.equal(await page.locator('#diff-left').inputValue(), '편집한 최신 내용'); await db(page, 'actions.clear').click(); await page.evaluate(() => window.__releaseWorkerPosts()); await page.getByText(d('workspace.noResult'), { exact: true }).waitFor()
    return { actualWorkersWithControlledMessageDelay: true, canceledWorkers: await page.evaluate(() => window.__workerHistory.filter(item => item.terminated).length) }
  })

  await run('diff-worker-unavailable-error-timeout-and-recovery', async ({ page, open }) => {
    await page.clock.install({ time: new Date('2026-11-17T03:00:00Z') }); await open('diff-viewer'); await fillDiff(page, '원문', '변경')
    await page.evaluate(() => { window.Worker = undefined }); await db(page, 'actions.compare').click(); await page.getByText(d('workspace.errors.unsupported'), { exact: true }).waitFor()
    await page.evaluate(() => { window.Worker = class { constructor() { throw new Error('Verification constructor failure') } } }); await db(page, 'actions.compare').click(); await page.getByText(d('workspace.errors.workerFailed'), { exact: true }).waitFor()
    await page.evaluate(() => { window.Worker = class { postMessage() {} terminate() { window.__timedOutTerminated = true } } }); await db(page, 'actions.compare').click(); await db(page, 'workspace.cancel').waitFor(); await page.clock.fastForward(31000); await page.getByText(d('workspace.errors.timeout'), { exact: true }).waitFor(); assert.equal(await page.evaluate(() => window.__timedOutTerminated), true)
    await page.evaluate(() => { window.Worker = window.__ObservedWorker }); reconstruct(await compare(page), '원문', '변경')
    return { unsupportedAndConstructorFailureInjected: true, timeoutViaControlledWorkerAndClock: true, nativeRecovery: true }
  })

  await run('diff-copy-failure-selection-and-stale-rejection', async ({ page, open }) => {
    await open('diff-viewer'); await fillDiff(page, '첫 줄\n삭제', '첫 줄\n추가'); await compare(page); await clipboardMode(page, 'reject'); await db(page, 'actions.copyDiff').click()
    const field = page.locator('#diff-copy-fallback'); await field.waitFor(); assert.equal(await field.getAttribute('readonly'), ''); await db(page, 'workspace.selectAll').click(); const text = await field.inputValue(); const selection = await field.evaluate(node => [node.selectionStart, node.selectionEnd]); assert.deepEqual(selection, [0, text.length]); reconstructExport(text, '첫 줄\n삭제', '첫 줄\n추가')
    await clipboardMode(page, 'defer'); await db(page, 'actions.copyDiff').click(); await page.locator('#diff-left').fill('새 입력'); await page.evaluate(() => window.__copyPending[0].reject(new Error('late rejection'))); await wait(150)
    assert.equal(await field.count(), 0); assert.equal(await page.evaluate(() => window.__fallbackCalls), 0); await clipboardMode(page, 'native')
    return { manualReadOnlySelection: true, staleFallbackCalls: 0 }
  })

  await run('diff-english-320-dark-internal-table-and-controls', async ({ page, open }) => {
    await open('diff-viewer'); await changeLanguage(page, 'en'); await page.getByRole('heading', { name: d('title', 'en'), exact: true, level: 1 }).waitFor()
    const left = '매우 긴 한글 원문 '.repeat(60) + '\n끝', right = '매우 긴 한글 원문 '.repeat(60) + '\n변경'; await fillDiff(page, left, right); reconstruct(await compare(page, 'en'), left, right)
    await clipboardMode(page, 'reject'); await db(page, 'actions.copyDiff', 'en').click(); await page.locator('#diff-copy-fallback').waitFor()
    const box = await mobile(page, [page.locator('#diff-left'), page.locator('#diff-copy-fallback')], [db(page, 'actions.compare', 'en'), db(page, 'workspace.selectAll', 'en'), db(page, 'workspace.download', 'en')])
    await page.locator('#diff-result').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' })); await page.screenshot({ path: resolve(out, 'diff-english-320-dark-result.png'), caret: 'initial' }); await screenshot(page, 'diff-english-320-dark')
    return { box, language: 'en' }
  }, { width: 320, dark: true })

  await run('markdown-native-three-copy-formats-and-real-downloads', async ({ page, open }) => {
    await open('markdown-editor'); await mdEditor(page).fill(draft)
    await mdCopy(page, 'md').click(); await copied(page, 'md'); assert.equal(normalize(await page.evaluate(() => navigator.clipboard.readText())), draft)
    await mdCopy(page, 'html').click(); await copied(page, 'html'); const html = await page.evaluate(() => navigator.clipboard.readText()); assert.ok(html.includes('<strong>강조</strong>')); assert.ok(html.includes('검증 문서'))
    await mdCopy(page, 'rich').click(); await copied(page, 'rich')
    const formats = await page.evaluate(async () => { const items = await navigator.clipboard.read(); const result = {}; for (const item of items) for (const type of item.types) result[type] = await (await item.getType(type)).text(); return result })
    assert.equal(normalize(formats['text/plain']), draft); assert.ok(formats['text/html'].includes('<strong>강조</strong>'))
    const md = await download(page, () => mb(page, 'exportMd').click(), 'markdown-current.md'), document = await download(page, () => mb(page, 'exportHtml').click(), 'markdown-current.html')
    assert.equal(md.text, draft); assert.ok(document.text.includes('<strong>강조</strong>')); assert.ok(document.text.includes('<title>검증 문서</title>'))
    await poll(async () => await page.evaluate(() => localStorage.getItem('toolhub-markdown-draft')) === draft, 'native copied draft autosaved')
    return { nativeClipboardTypes: Object.keys(formats), mdFilename: md.filename, htmlFilename: document.filename, nativeDownloads: true }
  })

  await run('markdown-three-copy-failures-readonly-selection-and-retry', async ({ page, open }) => {
    await open('markdown-editor'); await mdEditor(page).fill(draft); await clipboardMode(page, 'reject')
    for (const target of ['md', 'html', 'rich']) {
      await mdCopy(page, target).click(); const panel = recovery(page, target); await panel.waitFor(); const field = panel.locator('textarea')
      assert.equal(await field.getAttribute('readonly'), ''); assert.notEqual(await mdCopy(page, target).innerText(), m('copied'))
      if (target === 'html') assert.ok((await field.inputValue()).includes('<strong>강조</strong>')); else assert.equal(await field.inputValue(), draft)
      await button(panel, m('copyRecovery.selectAll')).click(); assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, (await field.inputValue()).length])
      if (target === 'rich') { await button(panel, m('copyRecovery.textTypes.html')).click(); assert.ok((await field.inputValue()).includes('<strong>강조</strong>')); assert.ok((await panel.innerText()).includes(m('copyRecovery.failed.rich'))) }
    }
    assert.equal(await page.evaluate(() => window.__fallbackCalls), 3); await clipboardMode(page, 'native'); await button(recovery(page, 'rich'), m('copyRecovery.retry')).click(); await copied(page, 'rich'); assert.equal(await page.locator('[data-markdown-copy-recovery]').count(), 0)
    return { failedTargets: ['md', 'html', 'rich'], readonlySelection: true, nativeRichRetry: true }
  })

  await run('markdown-missing-api-fallback-and-late-copy-generations', async ({ page, open }) => {
    await open('markdown-editor'); await mdEditor(page).fill(draft); await clipboardMode(page, 'absent'); await mdCopy(page, 'md').click(); await recovery(page, 'md').waitFor(); assert.equal(await page.evaluate(() => window.__fallbackCalls), 1)
    await clipboardMode(page, 'fallbackTrue'); await button(recovery(page, 'md'), m('copyRecovery.retry')).click(); await copied(page, 'md'); assert.equal(await page.locator('[data-markdown-copy-recovery]').count(), 0)
    await clipboardMode(page, 'defer'); await mdCopy(page, 'md').click(); await mdCopy(page, 'html').click(); await page.evaluate(() => window.__copyPending[1].resolve()); await copied(page, 'html'); await page.evaluate(() => window.__copyPending[0].reject(new Error('Older Markdown rejection'))); await wait(100)
    assert.equal(await page.evaluate(() => window.__fallbackCalls), 0); assert.equal(await mdCopy(page, 'html').innerText(), m('copied')); assert.equal(await page.locator('[data-markdown-copy-recovery]').count(), 0)
    await clipboardMode(page, 'defer'); await mdCopy(page, 'rich').click(); await mdEditor(page).fill('# 편집한 최신 원고'); await page.evaluate(() => window.__copyPending[0].resolve()); await wait(100); assert.notEqual(await mdCopy(page, 'rich').innerText(), m('copied')); assert.equal(await page.locator('[data-markdown-copy-recovery]').count(), 0)
    await clipboardMode(page, 'defer'); await mdCopy(page, 'md').click(); await spa(page, 'diff-viewer'); await page.evaluate(() => window.__copyPending[0].reject(new Error('Unmounted rejection'))); await wait(100); assert.equal(await page.evaluate(() => window.__fallbackCalls), 0)
    return { fallbackTrueIsInjectedSuccess: true, staleCrossTargetAndEditAndUnmountIgnored: true }
  })

  await run('markdown-native-files-size-type-cancel-and-empty', async ({ page, open }) => {
    await open('markdown-editor'); await mdEditor(page).fill('파일 전에 쓰던 원고')
    await chooseFile(page, 'actual.markdown', '# 실제 파일\r\n\r\n한글과 **강조**'); await page.getByText(m('fileRead.loaded'), { exact: true }).waitFor(); assert.equal(await mdEditor(page).inputValue(), '# 실제 파일\n\n한글과 **강조**')
    const before = await mdEditor(page).inputValue(); await mdFile(page).setInputFiles({ name: 'oversize.md', mimeType: 'text/markdown', buffer: Buffer.alloc(1048577, 65) }); await page.getByText(m('fileRead.tooLarge'), { exact: true }).waitFor(); assert.equal(await mdEditor(page).inputValue(), before)
    await chooseFile(page, 'unsupported.json', '{"keep":"draft"}'); await page.getByText(m('fileRead.unsupported'), { exact: true }).waitFor(); assert.equal(await mdEditor(page).inputValue(), before)
    const pending = page.waitForEvent('filechooser'); await mb(page, 'upload').click(); await (await pending).setFiles([]); assert.equal(await mdEditor(page).inputValue(), before)
    await chooseFile(page, 'empty.txt', ''); await page.getByText(m('fileRead.loaded'), { exact: true }).waitFor(); assert.equal(await mdEditor(page).inputValue(), '')
    return { nativeFileReader: true, rejectedSizeBytes: 1048577, canceledPickerPreservedDraft: true, explicitEmptyFileLoaded: true }
  })

  await run('markdown-controlled-reader-reverse-edit-cancel-and-errors', async ({ page, open }) => {
    await open('markdown-editor'); await mdEditor(page).fill('원고 기준'); await controlledReaders(page)
    await chooseFile(page, 'first.md', 'A'); await chooseFile(page, 'second.md', 'B'); await page.evaluate(() => window.__finishRead(1, '# 두 번째 파일')); await poll(async () => await mdEditor(page).inputValue() === '# 두 번째 파일', 'second file applied'); await page.evaluate(() => window.__finishRead(0, '# 늦은 첫 번째 파일')); await wait(100); assert.equal(await mdEditor(page).inputValue(), '# 두 번째 파일')
    await chooseFile(page, 'editing.txt', 'C'); await mdEditor(page).fill('읽는 동안 직접 편집'); await page.evaluate(() => window.__finishRead(2, '오래된 파일')); await wait(100); assert.equal(await mdEditor(page).inputValue(), '읽는 동안 직접 편집')
    await chooseFile(page, 'cancel.md', 'D'); const picker = page.waitForEvent('filechooser'); await mb(page, 'upload').click(); await (await picker).setFiles([]); await page.evaluate(() => window.__finishRead(3, '취소한 파일')); await wait(100); assert.equal(await mdEditor(page).inputValue(), '읽는 동안 직접 편집')
    await chooseFile(page, 'broken.md', 'E'); await page.evaluate(() => window.__finishRead(4, null, true)); await page.getByText(m('fileRead.failed'), { exact: true }).waitFor(); assert.equal(await mdEditor(page).inputValue(), '읽는 동안 직접 편집')
    await chooseFile(page, 'stale-error.md', 'F'); await mdEditor(page).fill('더 최신 원고'); await page.evaluate(() => window.__finishRead(5, null, true)); await wait(100); assert.equal(await page.getByText(m('fileRead.failed'), { exact: true }).count(), 0)
    return { controlledFileReaderReverseOrder: true, lateSuccessAndErrorIgnored: true, draftPreserved: true }
  })

  await run('markdown-native-image-paste-and-image-read-race-limit', async ({ page, open }) => {
    await open('markdown-editor'); await mdEditor(page).fill('# 이미지\n본문'); await mdEditor(page).focus(); await mdEditor(page).evaluate(node => node.setSelectionRange(node.value.length, node.value.length))
    await page.evaluate(async () => { const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 3; const context = canvas.getContext('2d'); context.fillStyle = '#3182f6'; context.fillRect(0, 0, 2, 3); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]) }); await page.keyboard.press('Control+v')
    await poll(async () => (await mdEditor(page).inputValue()).includes('data:image/png;base64,'), 'native pasted image FileReader completed'); const image = page.locator('.md-body img[src^="data:image/png"]'); await poll(async () => await image.evaluate(node => node.naturalWidth) === 2, 'native pasted image decoded'); assert.equal(await image.evaluate(node => node.naturalHeight), 3)
    await controlledReaders(page); await mdEditor(page).fill('이미지 대기 기준')
    await mdEditor(page).evaluate(node => { const data = new DataTransfer(); data.items.add(new File(['small'], 'late.png', { type: 'image/png' })); node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })) })
    await mdEditor(page).fill('이미지 읽기 중 새 원고'); await page.evaluate(() => window.__finishRead(0, 'data:image/png;base64,old')); await wait(100); assert.equal(await mdEditor(page).inputValue(), '이미지 읽기 중 새 원고')
    await mdEditor(page).evaluate(node => { const data = new DataTransfer(); data.items.add(new File([new Uint8Array(2097153)], 'oversize.png', { type: 'image/png' })); node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })) }); await page.getByText(m('imageTooLarge'), { exact: true }).waitFor(); assert.equal(await mdEditor(page).inputValue(), '이미지 읽기 중 새 원고')
    return { actualClipboardPngDimensions: [2, 3], controlledLateImageIgnored: true, imageLimitRejectedBytes: 2097153 }
  })

  await run('markdown-320-dark-english-recovery-and-example-draft-preservation', async ({ page, open }) => {
    await open('markdown-editor'); const englishSample = m('sample', 'en'); await mdEditor(page).fill(englishSample); await wait(700); assert.equal(await page.evaluate(() => localStorage.getItem('toolhub-markdown-draft')), englishSample)
    await changeLanguage(page, 'en'); await page.getByRole('heading', { name: m('title', 'en'), exact: true, level: 1 }).waitFor(); await wait(700); assert.equal(await mdEditor(page, 'en').inputValue(), englishSample); assert.equal(await page.evaluate(() => localStorage.getItem('toolhub-markdown-draft')), englishSample)
    await clipboardMode(page, 'reject'); await mdCopy(page, 'rich').click(); const panel = recovery(page, 'rich'); await panel.waitFor(); await button(panel, m('copyRecovery.textTypes.html', 'en')).click(); await button(panel, m('copyRecovery.selectAll', 'en')).click()
    const field = panel.locator('textarea'); assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, (await field.inputValue()).length])
    const box = await mobile(page, [mdEditor(page, 'en'), field], [mdCopy(page, 'rich'), button(panel, m('copyRecovery.retry', 'en')), button(panel, m('copyRecovery.selectAll', 'en'))]); await screenshot(page, 'markdown-english-320-dark', panel)
    return { box, englishSampleUserDraftPreserved: true, manualHtmlSelected: true }
  }, { width: 320, dark: true })
} finally {
  await browser.close(); const suffix = only ? only.replace(/[^a-z0-9-]+/gi, '_') : 'all'; writeFileSync(resolve(out, `results-${suffix}.json`), JSON.stringify(results, null, 2))
  const all = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(all, null, 2))
  console.log(`Chrome closed. ${results.filter(result => result.status === 'pass').length}/${results.length} passed.`)
}
if (results.some(result => result.status === 'fail')) process.exitCode = 1
