import assert from 'node:assert/strict'
import {
  createMeetingKanbanHandoff, parseMeetingKanbanHandoff, openMeetingKanbanHandoff,
  parseKanbanState, importMeetingTasks, persistKanbanState, MEETING_KANBAN_KEY, KANBAN_STORAGE_KEY,
  type MeetingTask, type MeetingKanbanHandoff, type KanbanState, type MeetingImportTarget,
} from '../src/utils/meetingKanban.ts'

const now = Date.now()
const ttl = 10 * 60 * 1000
const task = (overrides: Partial<MeetingTask> = {}): MeetingTask => ({ id: 'action-1', task: '제안서 검토', assignee: '김 담당', dueDate: '2026-11-30', status: 'pending', ...overrides })
const handoff = (items = [task()]): MeetingKanbanHandoff => createMeetingKanbanHandoff('meeting-1', '주간 회의', items, now)
const empty = (): KanbanState => ({ version: 1, columns: [] })
const legacy = (): KanbanState => ({ version: 1, columns: [
  { id: 'todo', title: '할 일', cards: [{ id: 'legacy-card', title: '기존 업무', description: '사용자가 적은 메모', priority: 'high', color: 'blue', dueDate: '', createdAt: now - 1000 }] },
  { id: 'doing', title: '진행', cards: [] },
  { id: 'done', title: '완료', cards: [] },
] })
const newColumns: MeetingImportTarget = { kind: 'new-columns', titles: { pending: '회의 할 일', 'in-progress': '회의 진행', done: '회의 완료' } }
const existing: MeetingImportTarget = { kind: 'existing', columnIds: { pending: 'todo', 'in-progress': 'doing', done: 'done' } }
const allCards = (state: KanbanState) => state.columns.flatMap(column => column.cards)
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    Object.values(value).forEach(freeze)
  }
  return value
}
function fakeWindow(open: () => unknown, run: () => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { open } })
  try { run() } finally {
    if (original) Object.defineProperty(globalThis, 'window', original)
    else Reflect.deleteProperty(globalThis, 'window')
  }
}

const checks: [string, () => void][] = [
  ['valid transfer roundtrip, expiration boundary and reviewed payload lifetime', () => {
    const payload = handoff(), raw = JSON.stringify(payload)
    assert.deepEqual(parseMeetingKanbanHandoff(raw, now), payload)
    assert.ok(parseMeetingKanbanHandoff(raw, now + ttl))
    assert.equal(parseMeetingKanbanHandoff(raw, now + ttl + 1), null)
    assert.equal(parseMeetingKanbanHandoff(raw, now - 1), null)
    assert.equal(importMeetingTasks(empty(), { ...payload, createdAt: now - ttl - 1 }, newColumns).added, 1, 'already reviewed transfers do not expire mid-review')
  }],
  ['reject malformed transfer objects without throwing or dropping individual rows', () => {
    const payload = handoff()
    for (const value of [null, [], {}, { ...payload, source: 'other' }, { ...payload, createdAt: 'today' }, { ...payload, createdAt: -1 }, { ...payload, id: '' }, { ...payload, meetingId: 'x'.repeat(81) }, { ...payload, items: [task(), null] }, { ...payload, items: [task(), task({ id: 'bad', status: 'unknown' as never })] }]) {
      assert.equal(parseMeetingKanbanHandoff(JSON.stringify(value), now), null)
    }
    for (const raw of [null, '', '{', ' '.repeat(500001)]) assert.equal(parseMeetingKanbanHandoff(raw, now), null)
    assert.equal(parseMeetingKanbanHandoff(JSON.stringify(payload), NaN), null)
  }],
  ['selection limits reject empty, oversized and duplicate selections atomically', () => {
    const cases = [[], [task({ task: ' ' })], [task({ task: '한'.repeat(6001) })], [task({ assignee: '담'.repeat(121) })], [task(), task()], Array.from({ length: 51 }, (_, i) => task({ id: `a-${i}` })), Array.from({ length: 6 }, (_, i) => task({ id: `a-${i}`, task: '가'.repeat(5001) }))]
    for (const items of cases) assert.throws(() => handoff(items), /invalidSelection/)
    for (const title of ['', ' ', '회'.repeat(121)]) assert.throws(() => createMeetingKanbanHandoff('m', title, [task()]), /invalidSelection/)
    for (const id of ['', ' ', 'm'.repeat(81)]) assert.throws(() => createMeetingKanbanHandoff(id, '회의', [task()]), /invalidSelection/)
    assert.throws(() => createMeetingKanbanHandoff('m', '회의', [task()], NaN), /invalidSelection/)
  }],
  ['maximum selection and escaped JSON bodies roundtrip without loss', () => {
    const items = Array.from({ length: 50 }, (_, i) => task({ id: `a-${i}`, task: '\u0001'.repeat(600), assignee: '담'.repeat(120) }))
    const payload = createMeetingKanbanHandoff('m'.repeat(80), '회'.repeat(120), items, now)
    assert.deepEqual(parseMeetingKanbanHandoff(JSON.stringify(payload), now), payload)
    assert.equal(importMeetingTasks(empty(), payload, newColumns).added, 50)
  }],
  ['calendar validation handles real dates, leap centuries and empty deadlines', () => {
    for (const dueDate of ['', '2024-02-29', '2000-02-29', '2026-11-30', '0001-01-01', '9999-12-31']) assert.equal(handoff([task({ dueDate })]).items[0].dueDate, dueDate)
    for (const dueDate of ['2026-02-29', '1900-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '0000-01-01', '2026-1-01', '2026-01-01T00:00:00Z', 'tomorrow']) assert.throws(() => handoff([task({ dueDate })]), /invalidSelection/)
  }],
  ['creation snapshots selected items and preserves whitespace literally', () => {
    const selected = task({ task: '  검토\n다음 단계  ', assignee: ' 김 담당 ' }), payload = handoff([selected])
    selected.task = '원본 변경'
    assert.equal(payload.items[0].task, '  검토\n다음 단계  ')
    assert.equal(payload.items[0].assignee, ' 김 담당 ')
  }],
  ['legacy v1, optional metadata and deliberately empty boards roundtrip', () => {
    assert.deepEqual(parseKanbanState(JSON.stringify(legacy())), legacy())
    assert.deepEqual(parseKanbanState(JSON.stringify(empty())), empty())
    const board = importMeetingTasks(legacy(), handoff(), newColumns).state
    assert.deepEqual(parseKanbanState(JSON.stringify(board)), board)
  }],
  ['board parser rejects malformed, newer versions, duplicate IDs and invalid optional metadata', () => {
    const board = legacy(), card = board.columns[0].cards[0]
    const invalid = [null, [], {}, { ...board, version: 2 }, { ...board, columns: null }, { ...board, columns: [...board.columns, board.columns[0]] }, { version: 1, columns: [{ ...board.columns[0], cards: [card, card] }] }, { version: 1, columns: [{ ...board.columns[0], cards: [{ ...card, assignee: 1 }] }] }, { version: 1, columns: [{ ...board.columns[0], cards: [{ ...card, meetingSource: {} }] }] }, { version: 1, columns: [{ ...board.columns[0], cards: [{ ...card, priority: 'urgent' }] }] }, { version: 1, columns: [{ ...board.columns[0], cards: [{ ...card, dueDate: '2026-02-30' }] }] }]
    for (const value of invalid) assert.equal(parseKanbanState(JSON.stringify(value)), null)
    for (const raw of [null, '', '{', 'x'.repeat(10000001)]) assert.equal(parseKanbanState(raw), null)
    const acrossColumns = legacy()
    acrossColumns.columns[1].cards.push(copy(card))
    assert.equal(parseKanbanState(JSON.stringify(acrossColumns)), null)
  }],
  ['new-column import preserves the original board, task, assignee, date and status grouping', () => {
    const board = freeze(legacy()), payload = freeze(handoff([task(), task({ id: 'progress', task: '진행중 원문', status: 'in-progress' }), task({ id: 'done', task: '완료 원문', status: 'done', dueDate: '' })]))
    const snapshot = JSON.stringify(board), result = importMeetingTasks(board, payload, newColumns)
    assert.equal(JSON.stringify(board), snapshot)
    assert.equal(result.added, 3); assert.equal(result.skipped, 0)
    assert.equal(result.state.columns.length, 6)
    assert.equal(result.state.columns[0], board.columns[0], 'untouched column object is preserved')
    for (const [index, item] of payload.items.entries()) {
      const card = result.state.columns[index + 3].cards[0]
      assert.equal(card.description, item.task); assert.equal(card.assignee, item.assignee); assert.equal(card.dueDate, item.dueDate)
      assert.equal(card.priority, 'medium'); assert.equal(card.color, 'gray')
      assert.deepEqual(card.meetingSource, { meetingId: payload.meetingId, actionId: item.id, meetingTitle: payload.meetingTitle })
    }
  }],
  ['long multiline task remains complete and preview never splits a surrogate pair', () => {
    const text = '가'.repeat(118) + '😀' + '\n   ' + '나'.repeat(5876)
    assert.equal(text.length, 6000)
    const result = importMeetingTasks(empty(), handoff([task({ task: text })]), newColumns), card = allCards(result.state)[0]
    assert.equal(card.description, text)
    assert.ok(card.title.length <= 120)
    assert.ok(card.title.endsWith('…'))
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(card.title))
    assert.equal(parseKanbanState(JSON.stringify(result.state))?.columns[0].cards[0].description, text)
  }],
  ['existing destination mapping appends without changing original card or column meaning', () => {
    const board = freeze(legacy()), payload = handoff([task(), task({ id: 'done', status: 'done' })])
    const result = importMeetingTasks(board, payload, { kind: 'existing', columnIds: { pending: 'done', 'in-progress': 'doing', done: 'todo' } })
    assert.equal(result.state.columns.length, board.columns.length)
    assert.equal(result.state.columns[0].cards[0], board.columns[0].cards[0])
    assert.equal(result.state.columns[0].cards[1].meetingSource?.actionId, 'done')
    assert.equal(result.state.columns[2].cards[0].meetingSource?.actionId, 'action-1')
    assert.equal(result.state.columns[1], board.columns[1])
  }],
  ['several statuses can share an explicitly selected existing column', () => {
    const payload = handoff([task({ id: 'done', status: 'done' }), task(), task({ id: 'doing', status: 'in-progress' })])
    const result = importMeetingTasks(legacy(), payload, { kind: 'existing', columnIds: { pending: 'doing', 'in-progress': 'doing', done: 'doing' } })
    assert.deepEqual(result.state.columns[1].cards.map(card => card.meetingSource?.actionId), ['done', 'action-1', 'doing'])
  }],
  ['only states with new tasks produce columns; unused destinations are not required', () => {
    const result = importMeetingTasks(empty(), handoff([task({ status: 'done' })]), { kind: 'new-columns', titles: { pending: '', 'in-progress': '', done: '완료' } })
    assert.equal(result.state.columns.length, 1); assert.equal(result.state.columns[0].title, '완료')
    const existingResult = importMeetingTasks(legacy(), handoff(), { kind: 'existing', columnIds: { pending: 'todo', 'in-progress': '', done: '' } })
    assert.equal(existingResult.added, 1)
  }],
  ['duplicate retry preserves edited content and creates no empty columns', () => {
    const payload = handoff(), imported = importMeetingTasks(legacy(), payload, newColumns).state
    const card = allCards(imported).find(card => card.meetingSource)!
    card.title = '칸반에서 수정'; card.description = '검토 후 수정'; card.priority = 'high'; card.assignee = '새 담당자'
    const snapshot = JSON.stringify(imported), repeated = importMeetingTasks(freeze(imported), handoff(), newColumns)
    assert.equal(repeated.state, imported); assert.equal(repeated.added, 0); assert.equal(repeated.skipped, 1)
    assert.equal(JSON.stringify(repeated.state), snapshot)
  }],
  ['reload deduplication, partial retries and explicit deletion allow correct reimport', () => {
    const payload = handoff(), imported = importMeetingTasks(legacy(), payload, existing).state
    const reloaded = parseKanbanState(JSON.stringify(imported))!
    const partial = importMeetingTasks(reloaded, handoff([task(), task({ id: 'new-task', status: 'done' })]), newColumns)
    assert.equal(partial.added, 1); assert.equal(partial.skipped, 1); assert.equal(partial.state.columns.length, 4)
    const deleted: KanbanState = { ...imported, columns: imported.columns.map(column => ({ ...column, cards: column.cards.filter(card => !card.meetingSource) })) }
    assert.equal(importMeetingTasks(deleted, payload, existing).added, 1)
  }],
  ['deduplication includes meeting ID and uses unambiguous source pairs', () => {
    const first = createMeetingKanbanHandoff('meeting:a', '회의', [task({ id: 'b' })], now)
    const second = createMeetingKanbanHandoff('meeting', '다른 회의', [task({ id: 'a:b' })], now)
    const third = createMeetingKanbanHandoff('meeting-other', '다른 회의', [task({ id: 'b' })], now)
    const imported = importMeetingTasks(empty(), first, newColumns).state
    assert.equal(importMeetingTasks(imported, second, newColumns).added, 1)
    assert.equal(importMeetingTasks(imported, third, newColumns).added, 1)
  }],
  ['invalid destination, source or board fail before mutation', () => {
    const board = freeze(legacy()), payload = freeze(handoff()), snapshot = JSON.stringify(board)
    for (const target of [null, {}, { kind: 'unknown' }, { kind: 'existing', columnIds: {} }, { kind: 'existing', columnIds: { pending: 'missing' } }, { kind: 'new-columns', titles: { pending: '' } }, { kind: 'new-columns', titles: { pending: 'x'.repeat(121) } }]) assert.throws(() => importMeetingTasks(board, payload, target as never), /invalidTarget/)
    assert.throws(() => importMeetingTasks({ ...board, version: 2 } as never, payload, newColumns), /invalidBoard/)
    assert.throws(() => importMeetingTasks(board, { ...payload, items: [task({ task: '' })] }, newColumns), /invalidPayload/)
    assert.equal(JSON.stringify(board), snapshot)
  }],
  ['unknown v1 fields survive parsing, appending and persistence', () => {
    const stored = { ...legacy(), customBoard: 'keep', columns: legacy().columns.map(column => ({ ...column, customColumn: 'keep', cards: column.cards.map(card => ({ ...card, customCard: { note: 'keep' } })) })) }
    const state = importMeetingTasks(parseKanbanState(JSON.stringify(stored))!, handoff(), existing).state
    let rawValue: string | null = null
    const raw = persistKanbanState({ getItem: () => rawValue, setItem: (_key, value) => { rawValue = value } }, state, null)
    assert.deepEqual((JSON.parse(raw).columns[0].cards[0]).customCard, { note: 'keep' })
    assert.equal(JSON.parse(raw).customBoard, 'keep')
    assert.equal(JSON.parse(raw).columns[0].customColumn, 'keep')
  }],
  ['storage uses exact expected value and preserves newer-tab edits', () => {
    let raw: string | null = null
    const store = { getItem: (key: string) => { assert.equal(key, KANBAN_STORAGE_KEY); return raw }, setItem: (key: string, value: string) => { assert.equal(key, KANBAN_STORAGE_KEY); raw = value } }
    const saved = persistKanbanState(store, legacy(), null)
    assert.equal(saved, raw)
    const newer = JSON.stringify({ ...legacy(), columns: [] })
    raw = newer
    assert.throws(() => persistKanbanState(store, legacy(), saved), /conflict/)
    assert.equal(raw, newer)
    assert.equal(persistKanbanState(store, empty(), newer), JSON.stringify(empty()))
  }],
  ['damaged or future-version storage cannot be overwritten even when expected matches', () => {
    for (const raw of ['{', JSON.stringify({ version: 2, columns: [] })]) {
      let wrote = false
      assert.throws(() => persistKanbanState({ getItem: () => raw, setItem: () => { wrote = true } }, empty(), raw), /invalidBoard/)
      assert.equal(wrote, false)
    }
  }],
  ['storage quota, access failure and write verification never report success', () => {
    const original = JSON.stringify(legacy())
    assert.throws(() => persistKanbanState({ getItem: () => original, setItem: () => { throw Error('quota') } }, empty(), original), /quota/)
    assert.throws(() => persistKanbanState({ getItem: () => { throw Error('blocked') }, setItem: () => {} }, empty(), original), /blocked/)
    assert.throws(() => persistKanbanState({ getItem: () => original, setItem: () => {} }, empty(), original), /conflict/)
    let raw = original
    assert.throws(() => persistKanbanState({ getItem: () => raw, setItem: () => { raw = JSON.stringify({ ...legacy(), customNewerData: true }) } }, empty(), original), /conflict/)
    assert.ok(raw.includes('customNewerData'))
  }],
  ['popup transfer stores only in the new tab and does not put meeting text in URL', () => {
    const events: string[] = [], storage = new Map<string, string>()
    const target = { opener: {} as object | null, sessionStorage: { setItem: (key: string, value: string) => { assert.equal(target.opener, null); events.push('write'); storage.set(key, value) }, getItem: (key: string) => storage.get(key) ?? null }, location: { replace: (url: string) => { assert.equal(url, '/kanban-board/?from=meeting'); events.push('navigate') } }, close: () => events.push('close') }
    const payload = handoff()
    fakeWindow(() => { events.push('open'); return target }, () => openMeetingKanbanHandoff(payload))
    assert.deepEqual(events, ['open', 'write', 'navigate'])
    assert.deepEqual(JSON.parse(storage.get(MEETING_KANBAN_KEY)!), payload)
  }],
  ['blocked popups and invalid payloads fail synchronously', () => {
    fakeWindow(() => null, () => assert.throws(() => openMeetingKanbanHandoff(handoff()), /popupBlocked/))
    fakeWindow(() => { throw Error('browser blocked') }, () => assert.throws(() => openMeetingKanbanHandoff(handoff()), /popupBlocked/))
    fakeWindow(() => { assert.fail('invalid handoff must not open a tab') }, () => assert.throws(() => openMeetingKanbanHandoff({ ...handoff(), createdAt: now - ttl - 1 }), /invalidPayload/))
  }],
  ['popup storage/navigation failures close destination and preserve source workflow', () => {
    for (const failure of ['storage', 'verify', 'navigate']) {
      let closed = false, raw: string | null = null
      const target = { opener: {}, sessionStorage: { setItem: (_key: string, value: string) => { if (failure === 'storage') throw Error('quota'); raw = value }, getItem: () => failure === 'verify' ? null : raw }, location: { replace: () => { if (failure === 'navigate') throw Error('navigation') } }, close: () => { closed = true } }
      fakeWindow(() => target, () => assert.throws(() => openMeetingKanbanHandoff(handoff()), /handoffFailed/))
      assert.equal(closed, true)
    }
  }],
]

for (const [name, check] of checks) {
  check()
  console.log(`PASS ${name}`)
}
console.log(`Meeting → kanban: ${checks.length} checks passed`)
