import assert from 'node:assert/strict'
import { downloadOcrText } from '../../../src/utils/ocrOutput.ts'

// Exercise the actual helper with per-request DOM/URL ownership; never clicks a browser anchor.
const original = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL, timeout: globalThis.setTimeout }
const ledger = { calls: [], blobs: new Map(), clicks: [], timers: [], active: new Set() }
let request = 0, fault = '', staleAt = '', current = true
function phase(name) {
  ledger.calls.push([request, name])
  if (staleAt === name) current = false
  if (fault === name) throw Error('controlled ' + name)
}
function begin(options = {}) { request++; fault = options.fault ?? ''; staleAt = options.staleAt ?? ''; current = options.current ?? true; return request }
let count = 0
async function check(name, run) { await run(); count++; console.log('PASS ' + name) }
try {
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'a'); phase('create')
      const owner = request
      return {
        set href(value) { phase('href'); this.url = value },
        set download(value) { phase('name'); this.name = value },
        click() { phase('click'); ledger.clicks.push({ owner, name: this.name, url: this.url }) },
        remove() { phase('remove') },
      }
    },
    body: { appendChild() { phase('append') } },
  }
  URL.createObjectURL = blob => { phase('url'); const url = 'blob:independent-ocr-' + request; ledger.active.add(url); ledger.blobs.set(url, blob); return url }
  URL.revokeObjectURL = url => { ledger.calls.push([request, 'revoke', url]); ledger.active.delete(url); if (fault === 'revoke') throw Error('controlled revoke') }
  globalThis.setTimeout = (callback, delay) => { phase('timer'); assert.equal(delay, 1000); ledger.timers.push(callback); return ledger.timers.length }

  await check('exact UTF8 per-request snapshots and old timers release only their own URLs', async () => {
    const source = '\uFEFF  한글🙂\r\n\t<&>\u00a0e\u0301\n끝\n'
    const first = begin(); assert.equal(downloadOcrText(source, () => current), 'started')
    const firstClick = ledger.clicks.at(-1), firstTimer = ledger.timers.at(-1)
    assert.equal(firstClick.owner, first); assert.equal(firstClick.name, 'ocr-result.txt')
    const blob = ledger.blobs.get(firstClick.url)
    assert.equal(blob.type, 'text/plain;charset=utf-8')
    assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new TextEncoder().encode(source))
    begin(); assert.equal(downloadOcrText('second', () => current), 'started')
    const secondUrl = ledger.clicks.at(-1).url, secondTimer = ledger.timers.at(-1)
    assert.equal(ledger.active.size, 2)
    firstTimer(); assert.equal(ledger.active.has(firstClick.url), false); assert.equal(ledger.active.has(secondUrl), true)
    secondTimer(); assert.equal(ledger.active.size, 0)
    const before = ledger.clicks.length
    begin({ staleAt: 'append' }); assert.equal(downloadOcrText('changed before click', () => current), 'stale')
    assert.equal(ledger.clicks.length, before); assert.equal(ledger.active.size, 0)
    begin({ staleAt: 'click' }); assert.equal(downloadOcrText('dispatched before invalidation', () => current), 'stale')
    assert.equal(ledger.clicks.length, before + 1, 'already dispatched output cannot be undone')
    assert.equal(ledger.active.size, 1); ledger.timers.at(-1)(); assert.equal(ledger.active.size, 0)
  })

  await check('failure stages preserve outcome truth and clean owned resources even when cleanup itself throws', async () => {
    for (const at of ['create', 'url', 'href', 'name', 'append', 'click', 'remove', 'timer', 'revoke']) {
      const beforeClicks = ledger.clicks.length, beforeTimers = ledger.timers.length
      const options = at === 'revoke' ? { fault: at, staleAt: 'append' } : { fault: at }
      begin(options)
      const expected = at === 'revoke' ? 'stale' : ['remove', 'timer'].includes(at) ? 'started' : 'failed'
      assert.equal(downloadOcrText('preserved source', () => current), expected, at)
      assert.equal(ledger.clicks.length - beforeClicks, ['remove', 'timer'].includes(at) ? 1 : 0, at)
      // Any scheduled timer remains owned by this invocation, regardless of the next request.
      fault = ''; ledger.timers.slice(beforeTimers).forEach(callback => callback())
      assert.equal(ledger.active.size, 0, at)
    }
    begin({ current: false }); const beforeCalls = ledger.calls.length
    assert.equal(downloadOcrText('nonempty', () => current), 'stale'); assert.equal(ledger.calls.length, beforeCalls)
    begin(); const beforeEmpty = ledger.calls.length
    assert.equal(downloadOcrText('', () => current), 'empty'); assert.equal(ledger.calls.length, beforeEmpty)
  })
} finally {
  if (original.document === undefined) delete globalThis.document
  else globalThis.document = original.document
  URL.createObjectURL = original.create; URL.revokeObjectURL = original.revoke; globalThis.setTimeout = original.timeout
}
console.log(`Independent OCR TXT helper: ${count} groups PASS; native download/model/parent integration calls 0`)
