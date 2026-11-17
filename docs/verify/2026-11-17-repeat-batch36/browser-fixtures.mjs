import assert from 'node:assert/strict'

// Independent known-valid legacy tuples; never import the product storage parser/encoder.
export function legacySettlement({ title = 'Synthetic settlement', expenses = 1, people = 3, amount = 1000, version = 1 } = {}) {
  const tuple = [version, 's', title, 0, 1, 'ceil', Array.from({ length: people }, (_, index) => `Person ${index + 1}`), Array.from({ length: expenses }, (_, index) => [`Item ${index + 1}`, amount, 0])]
  return { tuple, d: Buffer.from(JSON.stringify(tuple), 'utf8').toString('base64url'), title, total: expenses * amount, n: people }
}
export function legacyRecent(count = 10) {
  return Array.from({ length: count }, (_, index) => { const { d, title, total, n } = legacySettlement({ title: `Synthetic ${index + 1}`, amount: 1000 + index }); return { d, title, total, n, at: Date.UTC(2026, 10, 17) - index * 1000 } })
}
export async function installDutchStorageObserver(context, seed = {}) {
  await context.addInitScript(seed => {
    if (!/^https?:$/.test(location.protocol)) return
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem
    if (!get.call(localStorage, '__dutch36Seed')) { for (const [key, raw] of Object.entries(seed)) set.call(localStorage, key, raw); set.call(localStorage, '__dutch36Seed', '1') }
    window.__dutchFaults = {}; window.__dutchWrites = []; window.__dutchReadAfterWrite = {}; window.__dutchReads = []
    window.__nativeDutchRead = key => get.call(localStorage, key)
    window.__nativeDutchWrite = (key, raw) => set.call(localStorage, key, raw)
    Storage.prototype.getItem = function (key) {
      if (this === localStorage && key.startsWith('dutchPay.')) {
        const fault = window.__dutchFaults[key]; window.__dutchReads.push({ key, afterWrite: !!window.__dutchReadAfterWrite[key] })
        if (fault === 'read' || fault === 'readback' && window.__dutchReadAfterWrite[key]) throw new DOMException('Synthetic local storage read blocked', 'SecurityError')
      }
      return get.call(this, key)
    }
    Storage.prototype.setItem = function (key, raw) {
      if (this !== localStorage || !key.startsWith('dutchPay.')) return set.call(this, key, raw)
      const event = { key, bytes: new TextEncoder().encode(String(raw)).length, committed: false }; window.__dutchWrites.push(event)
      if (window.__dutchFaults[key] === 'quota') throw new DOMException('Synthetic local storage quota', 'QuotaExceededError')
      const result = set.call(this, key, raw); event.committed = true; window.__dutchReadAfterWrite[key] = true; return result
    }
  }, seed)
}
export async function holdDutchLock(page, key) {
  await page.evaluate(key => { window.__dutchLockAcquired = false; window.__dutchLockDone = navigator.locks.request(key, () => new Promise(resolve => { window.__dutchUnlock = resolve; window.__dutchLockAcquired = true })) }, key)
  await page.waitForFunction(() => window.__dutchLockAcquired)
}
export async function releaseDutchLock(page) { await page.evaluate(async () => { window.__dutchUnlock(); await window.__dutchLockDone }) }

if (process.argv.includes('--self-test')) {
  const records = legacyRecent(); assert.equal(records.length, 10); assert.equal(new Set(records.map(row => row.d)).size, 10)
  for (const record of records) { const decoded = JSON.parse(Buffer.from(record.d, 'base64url').toString('utf8')); assert.equal(decoded.length, 8); assert.equal(decoded[2], record.title); assert.equal(decoded[7][0][1], record.total) }
  assert.equal(JSON.parse(Buffer.from(legacySettlement({ expenses: 101 }).d, 'base64url').toString('utf8'))[7].length, 101)
  console.log('PASS Dutch browser legacy fixture preparation; no browser/product execution')
}
