import assert from 'node:assert/strict'
import {
  copyMarkdownContent, createMarkdownActionGuard, readMarkdownTextFile, MARKDOWN_TEXT_FILE_LIMIT,
  type MarkdownClipboardPorts, type MarkdownCopyTarget,
} from '../src/utils/markdownActions.ts'

let count = 0
async function test(label: string, run: () => void | Promise<void>) { await run(); count++; console.log(`PASS ${label}`) }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const snapshot = { markdown: '# 제목\n본문', html: '<h1>제목</h1>\n<p>본문</p>' }
const ports = (overrides: Partial<MarkdownClipboardPorts> = {}): MarkdownClipboardPorts => ({ fallbackText: () => false, fallbackRich: () => false, ...overrides })
const file = { name: '초안.md', size: 30 }

await test('Markdown and HTML text copy use the exact selected text', async () => {
  for (const target of ['md', 'html'] as const) {
    let actual = ''
    const result = await copyMarkdownContent(snapshot, target, ports({ writeText: async text => { actual = text } }))
    assert.equal(result, 'copied')
    assert.equal(actual, target === 'md' ? snapshot.markdown : snapshot.html)
  }
})
await test('rich API receives HTML and Markdown representations without converting the renderer output', async () => {
  let actual: string[] = []
  const result = await copyMarkdownContent(snapshot, 'rich', ports({ writeRich: async (html, text) => { actual = [html, text] } }))
  assert.equal(result, 'copied')
  assert.deepEqual(actual, [snapshot.html, snapshot.markdown])
})
await test('missing, rejected and synchronously throwing APIs never turn false legacy copies into success', async () => {
  for (const target of ['md', 'html', 'rich'] as MarkdownCopyTarget[]) {
    for (const api of [undefined, async () => { throw new Error('denied') }, () => { throw new Error('sync') }]) {
      const result = await copyMarkdownContent(snapshot, target, ports({ writeText: api, writeRich: api }))
      assert.equal(result, 'failed')
    }
  }
})
await test('matching fallback true is success, and fallback throwing is failure', async () => {
  for (const target of ['md', 'html', 'rich'] as MarkdownCopyTarget[]) {
    let actual = ''
    assert.equal(await copyMarkdownContent(snapshot, target, ports({
      fallbackText: text => { actual = text; return true }, fallbackRich: html => { actual = html; return true },
    })), 'copied')
    assert.equal(actual, target === 'md' ? snapshot.markdown : snapshot.html)
    assert.equal(await copyMarkdownContent(snapshot, target, ports({ fallbackText: () => { throw new Error('legacy') }, fallbackRich: () => { throw new Error('legacy') } })), 'failed')
  }
})
await test('rich failure never falls back to plain text or labels text success as formatting success', async () => {
  let plainCalls = 0
  const result = await copyMarkdownContent(snapshot, 'rich', ports({ writeText: async () => { plainCalls++ }, fallbackText: () => { plainCalls++; return true } }))
  assert.equal(result, 'failed')
  assert.equal(plainCalls, 0)
})
await test('a newer copy invalidates an older rejection before its fallback can overwrite the clipboard', async () => {
  const guard = createMarkdownActionGuard(), old = deferred<void>()
  let clipboard = '', fallbackCalls = 0
  const firstToken = guard.beginCopy()
  const first = copyMarkdownContent(snapshot, 'md', ports({ writeText: () => old.promise, fallbackText: text => { fallbackCalls++; clipboard = text; return true } }), () => guard.isCurrent(firstToken))
  const secondToken = guard.beginCopy()
  assert.equal(await copyMarkdownContent(snapshot, 'html', ports({ writeText: async text => { clipboard = text } }), () => guard.isCurrent(secondToken)), 'copied')
  old.reject(new Error('late denial'))
  assert.equal(await first, 'stale')
  assert.equal(fallbackCalls, 0)
  assert.equal(clipboard, snapshot.html)
})
await test('document edit or unmount invalidation suppresses late copy success and failure', async () => {
  for (const success of [true, false]) {
    const guard = createMarkdownActionGuard(), pending = deferred<void>(), token = guard.beginCopy()
    let fallbackCalls = 0
    const result = copyMarkdownContent(snapshot, 'rich', ports({ writeRich: () => pending.promise, fallbackRich: () => { fallbackCalls++; return true } }), () => guard.isCurrent(token))
    guard.invalidateDocument()
    if (success) pending.resolve(); else pending.reject(new Error('late'))
    assert.equal(await result, 'stale')
    assert.equal(fallbackCalls, 0)
  }
})
await test('already stale requests never call clipboard APIs', async () => {
  let calls = 0
  assert.equal(await copyMarkdownContent(snapshot, 'md', ports({ writeText: async () => { calls++ }, fallbackText: () => { calls++; return true } }), () => false), 'stale')
  assert.equal(calls, 0)
})
await test('copy fallback keeps the original snapshot if the caller mutates its object while waiting', async () => {
  const mutable = { ...snapshot }, pending = deferred<void>()
  let actual = ''
  const result = copyMarkdownContent(mutable, 'md', ports({ writeText: () => pending.promise, fallbackText: text => { actual = text; return true } }))
  mutable.markdown = 'later draft'
  pending.reject(new Error('denied'))
  assert.equal(await result, 'copied')
  assert.equal(actual, snapshot.markdown)
})
await test('supported text extensions preserve all text, including BOM, CRLF and an empty file', async () => {
  for (const name of ['a.md', 'a.MARKDOWN', '초안.txt']) {
    const text = '\ufeff# 제목\r\n마지막\n'
    assert.deepEqual(await readMarkdownTextFile({ name, size: 30 }, async () => text), { status: 'ready', text })
  }
  assert.deepEqual(await readMarkdownTextFile({ name: 'empty.md', size: 0 }, async () => ''), { status: 'ready', text: '' })
})
await test('invalid file types and byte sizes are rejected before reading', async () => {
  let reads = 0
  const read = async () => { reads++; return 'text' }
  for (const name of ['image.png', 'document', 'a.md.exe']) assert.deepEqual(await readMarkdownTextFile({ name, size: 1 }, read), { status: 'failed', error: 'type' })
  for (const size of [-1, NaN, Infinity, 1.5, MARKDOWN_TEXT_FILE_LIMIT + 1]) assert.deepEqual(await readMarkdownTextFile({ ...file, size }, read), { status: 'failed', error: 'size' })
  assert.equal(reads, 0)
  assert.deepEqual(await readMarkdownTextFile({ ...file, size: MARKDOWN_TEXT_FILE_LIMIT }, read), { status: 'ready', text: 'text' })
  assert.equal(reads, 1)
})
await test('file read rejection, synchronous error and non-text result are failures', async () => {
  for (const read of [async () => { throw new Error('file') }, () => { throw new Error('sync') }, async () => new ArrayBuffer(1), async () => null]) {
    assert.deepEqual(await readMarkdownTextFile(file, read), { status: 'failed', error: 'read' })
  }
})
await test('two files completing in reverse order apply only the newest file', async () => {
  const guard = createMarkdownActionGuard(), firstRead = deferred<string>(), secondRead = deferred<string>()
  const firstToken = guard.beginRead()
  const first = readMarkdownTextFile(file, () => firstRead.promise, () => guard.isCurrent(firstToken))
  const secondToken = guard.beginRead()
  const second = readMarkdownTextFile({ ...file, name: 'new.md' }, () => secondRead.promise, () => guard.isCurrent(secondToken))
  secondRead.resolve('new file'); firstRead.resolve('old file')
  assert.deepEqual(await second, { status: 'ready', text: 'new file' })
  assert.deepEqual(await first, { status: 'stale' })
})
await test('editing while reading suppresses both late text and late read errors', async () => {
  for (const success of [true, false]) {
    const guard = createMarkdownActionGuard(), pending = deferred<string>(), token = guard.beginRead()
    const result = readMarkdownTextFile(file, () => pending.promise, () => guard.isCurrent(token))
    guard.invalidateDocument()
    if (success) pending.resolve('old'); else pending.reject(new Error('old error'))
    assert.deepEqual(await result, { status: 'stale' })
  }
})
await test('opening a new picker cancels previous reads even when the picker is later cancelled', async () => {
  const guard = createMarkdownActionGuard(), pending = deferred<string>(), token = guard.beginRead()
  const result = readMarkdownTextFile(file, () => pending.promise, () => guard.isCurrent(token))
  guard.invalidateReads()
  pending.resolve('must not replace draft')
  assert.deepEqual(await result, { status: 'stale' })
})
await test('image and text reads share a generation; editing also invalidates a captured image insertion', () => {
  const guard = createMarkdownActionGuard()
  const image = guard.beginRead()
  const text = guard.beginRead()
  assert.equal(guard.isCurrent(image), false)
  assert.equal(guard.isCurrent(text), true)
  const laterImage = guard.beginRead()
  guard.invalidateDocument()
  assert.equal(guard.isCurrent(laterImage), false)
})
await test('a read in progress does not invalidate a copy of the unchanged current draft', () => {
  const guard = createMarkdownActionGuard(), copy = guard.beginCopy()
  guard.beginRead()
  assert.equal(guard.isCurrent(copy), true)
  guard.invalidateDocument()
  assert.equal(guard.isCurrent(copy), false)
})

console.log(`${count} Markdown action groups passed`)
