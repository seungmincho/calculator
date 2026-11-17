// node --experimental-strip-types scripts/check-password-actions.ts
import assert from 'node:assert/strict'
import { copyPasswordText, createPasswordCopyGuard, regeneratePasswordResult } from '../src/utils/passwordActions.ts'
import { generatePassword, generatePassphrase, validate, type PwOptions } from '../src/utils/password.ts'
import { WORD_LIST } from '../src/utils/wordlist.ts'

function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const original = ['fixture-first', 'fixture-middle', 'fixture-last']
const base: PwOptions = { length: 16, upper: true, lower: true, digits: true, symbols: true, symbolSet: '!@#', excludeAmbiguous: false, noRepeat: false }
const checks: [string, () => void | Promise<void>][] = [
  ['invalid positions never consume randomness or modify the input list', () => {
    let calls = 0
    for (const index of [-1, 3, 0.5, NaN, Infinity]) assert.equal(regeneratePasswordResult(original, index, () => { calls++; return 'unused' }), original)
    assert.equal(calls, 0)
    assert.deepEqual(original, ['fixture-first', 'fixture-middle', 'fixture-last'])
  }],
  ['three existing generators replace only one position and consume one generation', () => {
    const modes = [
      { generate: () => generatePassword(base), valid: (value: string) => value.length === 16 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[!@#]/.test(value) },
      { generate: () => generatePassword({ ...base, length: 6, upper: false, lower: false, symbols: false, noRepeat: true }), valid: (value: string) => /^\d{6}$/.test(value) && !/(.)\1/.test(value) },
      { generate: () => generatePassphrase({ words: 4, separator: '-', capitalize: true, addNumber: true }, WORD_LIST), valid: (value: string) => value.split('-').length === 4 && /\d/.test(value) },
    ]
    for (const mode of modes) {
      let calls = 0
      const result = regeneratePasswordResult(original, 1, () => { calls++; return mode.generate() })
      assert.equal(calls, 1); assert.equal(result[0], original[0]); assert.equal(result[2], original[2]); assert.equal(result.length, original.length)
      assert.ok(mode.valid(result[1])); assert.equal(original[1], 'fixture-middle')
    }
    assert.equal(validate({ ...base, upper: false, lower: false, digits: false, symbols: false }), 'noCharType')
  }],
  ['a chance duplicate is accepted without rerolling; generator errors leave the list intact', () => {
    let calls = 0
    const same = regeneratePasswordResult(original, 1, () => { calls++; return original[1] })
    assert.deepEqual(same, original); assert.equal(calls, 1)
    assert.throws(() => regeneratePasswordResult(original, 1, () => { throw new Error('unavailable generator') }), /unavailable generator/)
    assert.equal(original[1], 'fixture-middle')
  }],
  ['one guard orders individual/full copies and invalidates obsolete result revisions', () => {
    const guard = createPasswordCopyGuard(), first = guard.begin(), second = guard.begin()
    assert.equal(guard.isCurrent(first), false); assert.equal(guard.isCurrent(second), true)
    guard.invalidate(); assert.equal(guard.isCurrent(second), false)
    const third = guard.begin(); assert.equal(guard.isCurrent(third), true)
    guard.invalidate(); assert.equal(guard.isCurrent(third), false)
  }],
  ['already stale performs no I/O; modern success skips fallback', async () => {
    let writes = 0, legacy = 0
    const ports = { writeText: async () => { writes++ }, fallbackText: () => { legacy++; return true } }
    assert.equal(await copyPasswordText('fixture', () => false, ports), 'stale')
    assert.equal(writes, 0); assert.equal(legacy, 0)
    assert.equal(await copyPasswordText('fixture', () => true, ports), 'copied')
    assert.equal(writes, 1); assert.equal(legacy, 0)
  }],
  ['regeneration/unmount invalidation swallows a late rejection without legacy copy', async () => {
    const guard = createPasswordCopyGuard(), token = guard.begin(), task = deferred()
    let legacy = 0
    const pending = copyPasswordText('old-fixture', () => guard.isCurrent(token), { writeText: () => task.promise, fallbackText: () => { legacy++; return true } })
    guard.invalidate(); task.reject(new Error('denied'))
    assert.equal(await pending, 'stale'); assert.equal(legacy, 0)
  }],
  ['a newer copy remains current after older success or failure completes', async () => {
    for (const reject of [false, true]) {
      const guard = createPasswordCopyGuard(), old = guard.begin(), task = deferred()
      let legacy = 0
      const pending = copyPasswordText('old-fixture', () => guard.isCurrent(old), { writeText: () => task.promise, fallbackText: () => { legacy++; return true } })
      const latest = guard.begin()
      assert.equal(await copyPasswordText('new-fixture', () => guard.isCurrent(latest), { writeText: async () => {}, fallbackText: () => false }), 'copied')
      if (reject) task.reject(new Error('late denial')); else task.resolve()
      assert.equal(await pending, 'stale'); assert.equal(guard.isCurrent(latest), true); assert.equal(legacy, 0)
    }
  }],
  ['denial uses current fallback; true/false/throw produce accurate outcomes', async () => {
    for (const result of ['true', 'false', 'throw'] as const) {
      let calls = 0
      const outcome = await copyPasswordText('fixture', () => true, {
        writeText: async () => { throw new Error('denied') },
        fallbackText: () => { calls++; if (result === 'throw') throw new Error('legacy denied'); return result === 'true' },
      })
      assert.equal(outcome, result === 'true' ? 'copied' : 'failed'); assert.equal(calls, 1)
    }
  }],
  ['legacy requires exact true and observes invalidation during its synchronous callback', async () => {
    assert.equal(await copyPasswordText('fixture', () => true, { fallbackText: () => 1 as unknown as boolean }), 'failed')
    const guard = createPasswordCopyGuard(), token = guard.begin()
    assert.equal(await copyPasswordText('fixture', () => guard.isCurrent(token), { fallbackText: () => { guard.invalidate(); return true } }), 'stale')
  }],
  ['browser legacy cleanup restores focus after success, false, copy throw or append throw', async () => {
    const originals = new Map(['navigator', 'document', 'HTMLElement'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
    const define = (key: string, value: unknown) => Object.defineProperty(globalThis, key, { value, configurable: true })
    try {
      define('navigator', {})
      for (const mode of ['true', 'false', 'copyThrow', 'appendThrow']) {
        let removed = 0, restored = 0, selected = 0
        class HostElement { focus() { restored++ } }
        define('HTMLElement', HostElement)
        const field = { value: '', readOnly: false, style: {}, focus() {}, select() { selected++ }, setSelectionRange(start: number, end: number) { assert.equal(start, 0); assert.equal(end, 'fixture'.length) }, remove() { removed++ } }
        define('document', {
          activeElement: new HostElement(), createElement: () => field,
          body: { appendChild() { if (mode === 'appendThrow') throw new Error('append denied') } },
          execCommand() { if (mode === 'copyThrow') throw new Error('copy denied'); return mode === 'true' },
        })
        assert.equal(await copyPasswordText('fixture', () => true), mode === 'true' ? 'copied' : 'failed')
        assert.equal(removed, 1); assert.equal(restored, 1); assert.equal(selected, mode === 'appendThrow' ? 0 : 1)
      }
    } finally {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
    }
  }],
]
for (const [name, run] of checks) { await run(); console.log('PASS', name) }
console.log(`${checks.length} password action groups passed`)
