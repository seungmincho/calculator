// node scripts/check-number-to-korean-actions.ts
import assert from 'node:assert/strict'
import {
  copyNumberText, createNumberCopyController, createNumberCopyGuard, legacyNumberCopy,
  type NumberCopyState, type NumberCopyTarget, type NumberClipboard,
} from '../src/utils/numberToKoreanActions.ts'

let groups = 0
const check = async (name: string, run: () => void | Promise<void>) => { await run(); groups++; console.log(`PASS ${name}`) }
const deferred = () => {
  let resolve!: () => void, reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const fixture = (clipboard: NumberClipboard) => {
  const changes: (NumberCopyState | null)[] = []
  const timers: { callback: () => void; canceled: boolean; delay: number }[] = []
  const controller = createNumberCopyController({ clipboard, after(callback, delay) {
    const timer = { callback, delay, canceled: false }; timers.push(timer)
    return () => { timer.canceled = true }
  } }, value => changes.push(value))
  return { controller, changes, timers }
}
const request = (target: NumberCopyTarget, text = target as string) => ({ target, text, label: `${target} label` })

await check('native success copies exact Korean, tabs, newlines and Unicode without fallback', async () => {
  const text = '금 십만원정\t한글 🧾\r\n끝\n'
  let copied = ''
  assert.equal(await copyNumberText(text, () => true, { writeText: async value => { copied = value }, fallback: () => { assert.fail('fallback after success') } }), 'copied')
  assert.equal(copied, text)
})

await check('absent/rejected/synchronously failing Clipboard require literal fallback true', async () => {
  for (const native of ['absent', 'reject', 'throw']) for (const fallback of ['true', 'false', 'throw', 'truthy']) {
    let calls = 0
    const result = await copyNumberText('exact', () => true, {
      ...(native === 'absent' ? {} : { writeText: native === 'reject' ? async () => { throw new Error('denied') } : () => { throw new Error('blocked') } }),
      fallback: text => { calls++; assert.equal(text, 'exact'); if (fallback === 'throw') throw new Error('blocked'); return (fallback === 'truthy' ? 1 : fallback === 'true') as boolean },
    })
    assert.equal(result, fallback === 'true' ? 'copied' : 'failed')
    assert.equal(calls, 1)
  }
})

await check('stale and empty requests do not access either clipboard API', async () => {
  const clipboard = { writeText: async () => assert.fail('native'), fallback: () => assert.fail('fallback') }
  assert.equal(await copyNumberText('old', () => false, clipboard), 'stale')
  assert.equal(await copyNumberText('', () => true, clipboard), 'failed')
})

await check('guard ownership spans every single/mobile/link/batch target and rejects cloned tokens', () => {
  const guard = createNumberCopyGuard()
  const tokens = (['formal', 'formal-mobile', 'contract', 'chinese', 'mixed', 'reading', 'english', 'link', 'batch'] as const).map(target => guard.begin(target))
  tokens.slice(0, -1).forEach(token => assert.equal(guard.isCurrent(token), false))
  assert.equal(guard.isCurrent(tokens.at(-1)!), true)
  assert.equal(guard.isCurrent({ ...tokens.at(-1)! }), false)
  guard.invalidate()
  assert.equal(guard.isCurrent(tokens.at(-1)!), false)
})

await check('cross-target and same-target late rejection cannot fallback over a newer success', async () => {
  for (const [first, second] of [['formal', 'batch'], ['batch', 'link'], ['link', 'formal-mobile'], ['formal', 'formal']] as const) {
    const pending = deferred(); let copied = '', fallbacks = 0
    const { controller } = fixture({ writeText: async text => { if (text === 'old') await pending.promise; else copied = text }, fallback: () => { fallbacks++; return true } })
    const old = controller.request(request(first, 'old'))
    assert.equal(await controller.request(request(second, 'new')), 'copied')
    pending.reject(new Error('late denied'))
    assert.equal(await old, 'stale')
    assert.equal(copied, 'new')
    assert.equal(fallbacks, 0)
    assert.equal(controller.getSnapshot()?.target, second)
    assert.equal(controller.getSnapshot()?.text, 'new')
  }
})

await check('late native success cannot replace a newer failure or show old success', async () => {
  const pending = deferred()
  const { controller, changes } = fixture({ writeText: text => text === 'old' ? pending.promise : Promise.reject(new Error('denied')), fallback: () => false })
  const old = controller.request(request('reading', 'old'))
  await controller.request(request('batch', 'new'))
  const count = changes.length
  pending.resolve()
  assert.equal(await old, 'stale')
  assert.equal(changes.length, count)
  assert.equal(controller.getSnapshot()?.status, 'failed')
  assert.equal(controller.getSnapshot()?.text, 'new')
})

await check('input/options/locale invalidation and dispose suppress both late outcomes', async () => {
  for (const action of ['invalidate', 'dispose'] as const) for (const outcome of ['resolve', 'reject'] as const) {
    const pending = deferred()
    const { controller, changes } = fixture({ writeText: () => pending.promise, fallback: () => assert.fail('stale fallback') })
    const old = controller.request(request('batch'))
    controller[action]()
    const count = changes.length
    if (outcome === 'resolve') pending.resolve(); else pending.reject(new Error('late'))
    assert.equal(await old, 'stale')
    assert.equal(changes.length, count)
    assert.equal(controller.getSnapshot(), null)
    if (action === 'dispose') assert.equal(await controller.request(request('link')), 'stale')
  }
})

await check('request captures text/label/target even if caller mutates its object while pending', async () => {
  const pending = deferred(), value = request('batch', 'original\ttext\n')
  const { controller } = fixture({ writeText: () => pending.promise, fallback: () => false })
  const result = controller.request(value)
  value.target = 'link'; value.label = 'changed'; value.text = 'changed'
  pending.reject(new Error('denied'))
  assert.equal(await result, 'failed')
  assert.equal(controller.getSnapshot()?.target, 'batch')
  assert.equal(controller.getSnapshot()?.text, 'original\ttext\n')
  assert.equal(controller.getSnapshot()?.label, 'batch label')
})

await check('old success timers are canceled and stale callbacks cannot erase newer feedback', async () => {
  const { controller, timers } = fixture({ writeText: async () => {}, fallback: () => false })
  await controller.request(request('formal'))
  const first = timers[0]
  await controller.request(request('batch'))
  assert.equal(first.canceled, true)
  assert.equal(first.delay, 2000)
  first.callback() // Model a callback already queued before clearTimeout.
  assert.equal(controller.getSnapshot()?.target, 'batch')
  timers[1].callback()
  assert.equal(controller.getSnapshot(), null)
})

await check('retry/close require the current failed request and old recovery callbacks are inert', async () => {
  let allowed = false; const copied: string[] = []
  const { controller } = fixture({ fallback: text => { copied.push(text); return allowed } })
  await controller.request(request('formal', 'old'))
  const oldToken = controller.getSnapshot()!.token
  await controller.request(request('batch', 'current\tfull\n'))
  const currentToken = controller.getSnapshot()!.token
  assert.equal(await controller.retry(oldToken), 'stale')
  controller.close(oldToken)
  assert.equal(controller.getSnapshot()?.target, 'batch')
  allowed = true
  assert.equal(await controller.retry(currentToken), 'copied')
  assert.equal(copied.at(-1), 'current\tfull\n')
  assert.notEqual(controller.getSnapshot()!.token, currentToken)
  controller.close(currentToken)
  assert.equal(controller.getSnapshot()?.status, 'copied')
  assert.equal(await controller.retry(controller.getSnapshot()!.token), 'stale')
  controller.close(controller.getSnapshot()!.token)
  assert.equal(controller.getSnapshot(), null)
})

await check('synchronous UI invalidation before the native call stops all clipboard I/O', async () => {
  const controller: ReturnType<typeof createNumberCopyController> = createNumberCopyController({ clipboard: { writeText: async () => assert.fail('native'), fallback: () => assert.fail('fallback') }, after: () => () => {} }, state => {
    if (state?.status === 'copying') controller.invalidate()
  })
  assert.equal(await controller.request(request('link')), 'stale')
  assert.equal(controller.getSnapshot(), null)
})

const fakeDocument = (options: { copied?: unknown; selectError?: boolean; invalidateAt?: 'focus' | 'select'; connected?: boolean } = {}) => {
  const log: string[] = [], ranges: [number, number][] = []
  let current = true
  const field = { value: '', readOnly: false, style: { position: '', left: '' },
    focus() { log.push('focus'); if (options.invalidateAt === 'focus') current = false },
    select() { log.push('select'); if (options.selectError) throw new Error('select denied'); if (options.invalidateAt === 'select') current = false },
    setSelectionRange(start: number, end: number) { ranges.push([start, end]) }, remove() { log.push('remove') },
  }
  const doc = { activeElement: { isConnected: options.connected !== false, focus() { log.push('restore') } },
    createElement: () => field, body: { appendChild() { log.push('append') } }, execCommand(command: string) { log.push(command); return options.copied ?? true },
  }
  return { doc: doc as unknown as Document, field, log, ranges, isCurrent: () => current }
}

await check('legacy fallback selects the entire readonly text, removes temporary DOM and restores focus', () => {
  const f = fakeDocument(), text = '한글\t🧾\r\n' + '전체\n'.repeat(100)
  assert.equal(legacyNumberCopy(text, f.isCurrent, f.doc), true)
  assert.equal(f.field.value, text)
  assert.equal(f.field.readOnly, true)
  assert.deepEqual(f.ranges, [[0, text.length]])
  assert.deepEqual(f.log, ['append', 'focus', 'select', 'copy', 'remove', 'restore'])
})

await check('false/truthy fallback and selection throw never claim success and always clean up', async () => {
  for (const copied of [false, 1, 'true']) {
    const f = fakeDocument({ copied })
    assert.equal(legacyNumberCopy('x', f.isCurrent, f.doc), false)
    assert.ok(f.log.includes('remove'))
  }
  const f = fakeDocument({ selectError: true })
  assert.equal(await copyNumberText('x', f.isCurrent, { fallback: text => legacyNumberCopy(text, f.isCurrent, f.doc) }), 'failed')
  assert.ok(f.log.includes('remove'))
  assert.ok(!f.log.includes('copy'))
})

await check('focus/selection-triggered edits prevent execCommand and do not steal the new focus', () => {
  for (const invalidateAt of ['focus', 'select'] as const) {
    const f = fakeDocument({ invalidateAt })
    assert.equal(legacyNumberCopy('old', f.isCurrent, f.doc), false)
    assert.ok(f.log.includes('remove'))
    assert.ok(!f.log.includes('copy'))
    assert.ok(!f.log.includes('restore'))
  }
  const detached = fakeDocument({ connected: false })
  assert.equal(legacyNumberCopy('current', detached.isCurrent, detached.doc), true)
  assert.ok(!detached.log.includes('restore'))
})

console.log(`${groups} number clipboard groups passed`)
