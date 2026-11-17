/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node fixture reuses the existing harness. */
// Independent actual-parent event checks. Storage/audio/recorder are controlled ports, not a browser IDB test.
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { componentHarness, all, text } = require('../2026-11-17-repeat-batch19/component-harness.cjs')

const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const legacy = (id = 'legacy', patch = {}) => ({ version: 1, id, mode: 'intro', createdAt: 100, updatedAt: 200, takes: [
  { id: `${id}-first`, createdAt: 110, transcript: '첫 번째 원문', seconds: 60, audio: new Blob(['audio original'], { type: 'audio/webm' }), feedback: { model: 'model', strengthQuote: '첫', strength: '장점', improveQuote: '', improve: '개선', rewrite: '수정', next: '다음' } },
  { id: `${id}-last`, createdAt: 150, transcript: 'SECOND unique 검색어', seconds: null },
], ...patch })
const stored = session => ({ session, basis: session.revision ? { kind: 'revision', revision: session.revision, updatedAt: session.updatedAt } : { kind: 'legacy', updatedAt: session.updatedAt } })
const list = records => ({ records: records.map(stored), totalCount: records.length, unreadableCount: 0, unsupportedCount: 0 })
const clone = value => structuredClone(value)
async function fixture(records = [legacy()]) {
  const saves = [], removals = [], downloads = [], lists = []
  let nextList = () => Promise.resolve(list(records))
  const h = await componentHarness('src/components/SpeakingPractice.tsx', {
    globals: { crypto: { randomUUID } }, window: { confirm: () => true },
    modules: {
      '@/hooks/useSpeakingRecorder': { useSpeakingRecorder: () => ({ recording: false, requesting: false, seconds: 0, level: 0, start() {}, stop() {}, cancelRequest() {} }) },
      '@/lib/speaking/client': { SpeakingAIClient: class { cancel() {} }, deleteCoachingDownload: async () => {} },
      '@/lib/speaking/audio': { decodeSpeakingAudio: async () => { throw new Error('Unexpected model/audio work') }, downloadSpeakingFile: (blob, name) => downloads.push({ blob, name }) },
      '@/lib/speaking/storage': {
        listSpeakingSessions: () => { lists.push(true); return nextList() },
        saveSpeakingSession: (session, basis) => { const d = defer(); saves.push({ ...d, session: clone(session), basis: clone(basis) }); return d.promise },
        deleteSpeakingSession: (id, basis) => { const d = defer(); removals.push({ ...d, id, basis: clone(basis) }); return d.promise },
      },
      '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
    },
  })
  const flush = async () => { for (let i = 0; i < 3; i++) { await new Promise(setImmediate); h.render() } }
  h.render(); await flush()
  const field = id => h.find(node => node.props?.id === id)
  const edit = (id, value) => { field(id).props.onChange({ target: { value } }); h.render() }
  const rowAction = (id, key) => {
    const row = h.find(node => node.props?.['data-speaking-record'] === id)
    const button = all(row).find(node => node.type === 'button' && text(node) === key)
    assert.ok(button, `${id}:${key}`); assert.equal(!!button.props.disabled, false)
    button.props.onClick(); h.render()
  }
  const click = key => { const button = h.button(key); assert.equal(!!button.props.disabled, false, `${key} should be available`); button.props.onClick(); h.render() }
  const save = () => { const button = h.find(node => Object.hasOwn(node.props ?? {}, 'data-speaking-save')); assert.equal(!!button.props.disabled, false); button.props.onClick(); h.render() }
  const commit = (index, revision = `revision-${index}`) => { const call = saves[index]; const session = { ...clone(call.session), revision, updatedAt: 1000 + index }; call.resolve(stored(session)); return session }
  return { h, saves, removals, downloads, lists, flush, field, edit, rowAction, click, save, commit, listAs: value => { nextList = value } }
}
const checks = []
const check = (name, run) => checks.push([name, run])

check('save snapshots legacy basis; edits during commit keep current text and adopt committed basis', async () => {
  const f = await fixture(); f.rowAction('legacy', 'open')
  f.edit('speaking-session-title', '저장할 이름'); f.save()
  assert.deepEqual(f.saves[0].basis, { kind: 'legacy', updatedAt: 200 })
  f.edit('speaking-session-title', '더 최신 이름'); f.edit('speaking-transcript', '저장 대기 중 최신 원문')
  f.listAs(() => Promise.reject(new Error('storageFailed')))
  f.commit(0, 'first-commit'); await f.flush()
  assert.equal(f.field('speaking-session-title').props.value, '더 최신 이름')
  assert.equal(f.field('speaking-transcript').props.value, '저장 대기 중 최신 원문')
  assert.match(f.h.text(), /unsaved/)
  f.save()
  assert.deepEqual(f.saves[1].basis, { kind: 'revision', revision: 'first-commit', updatedAt: 1000 })
  assert.equal(f.saves[1].session.title, '더 최신 이름')
  assert.equal(f.saves[1].session.takes[1].transcript, '저장 대기 중 최신 원문')
  assert.equal(await f.saves[1].session.takes[0].audio.text(), 'audio original')
  assert.deepEqual(f.saves[1].session.takes[0].feedback, legacy().takes[0].feedback)
  f.commit(1); await f.flush(); f.h.cleanup()
})
check('committed save plus refresh failure stays saved and next edit uses committed revision', async () => {
  const f = await fixture(); f.rowAction('legacy', 'open'); f.edit('speaking-session-title', '이름')
  f.listAs(() => Promise.reject(new Error('storageFailed'))); f.save(); f.commit(0, 'durable'); await f.flush()
  assert.match(f.h.text(), /records.savedRefreshFailed/)
  assert.equal(text(f.h.find(node => Object.hasOwn(node.props ?? {}, 'data-speaking-save'))), 'saved')
  f.edit('speaking-session-title', ''); f.save()
  assert.deepEqual(f.saves[1].basis, { kind: 'revision', revision: 'durable', updatedAt: 1000 })
  f.saves[1].reject(new Error('storageQuota')); await f.flush()
  assert.equal(f.field('speaking-session-title').props.value, '')
  assert.match(f.h.text(), /errors.storageQuota/); assert.match(f.h.text(), /unsaved/); f.h.cleanup()
})
check('conflict and list refresh never silently replace the opened basis or draft', async () => {
  const f = await fixture(); f.rowAction('legacy', 'open'); f.edit('speaking-session-title', '내 수정')
  f.save(); f.saves[0].reject(new Error('storageConflict')); await f.flush()
  const foreign = legacy('legacy', { title: '다른 탭', revision: 'foreign', updatedAt: 900 })
  f.listAs(() => Promise.resolve(list([foreign]))); f.click('records.refresh'); await f.flush()
  assert.equal(f.field('speaking-session-title').props.value, '내 수정')
  f.save(); assert.deepEqual(f.saves[1].basis, { kind: 'legacy', updatedAt: 200 })
  f.saves[1].reject(new Error('storageConflict')); await f.flush()
  f.h.window.confirm = () => false; f.rowAction('legacy', 'open')
  assert.equal(f.field('speaking-session-title').props.value, '내 수정')
  f.h.window.confirm = () => true; f.rowAction('legacy', 'open'); f.edit('speaking-session-title', '명시 복원 후')
  f.save(); assert.deepEqual(f.saves[2].basis, { kind: 'revision', revision: 'foreign', updatedAt: 900 })
  f.commit(2); await f.flush(); f.h.cleanup()
})
check('deleting current saved copy preserves edits and makes next save an absent creation', async () => {
  const source = legacy('legacy', { revision: 'r1', title: '기존 이름' }); const f = await fixture([source])
  f.rowAction('legacy', 'open'); f.edit('speaking-session-title', '남겨야 할 이름')
  f.rowAction('legacy', 'remove'); f.edit('speaking-transcript', '삭제 대기 중 원문')
  assert.deepEqual(f.removals[0].basis, { kind: 'revision', revision: 'r1', updatedAt: 200 })
  f.listAs(() => Promise.resolve(list([]))); f.removals[0].resolve(); await f.flush()
  assert.equal(f.field('speaking-session-title').props.value, '남겨야 할 이름')
  assert.equal(f.field('speaking-transcript').props.value, '삭제 대기 중 원문')
  f.save(); assert.deepEqual(f.saves[0].basis, { kind: 'absent' })
  assert.equal(f.saves[0].session.revision, undefined)
  f.commit(0); await f.flush(); f.h.cleanup()
})
check('delete conflict and deleting another record leave current revision and data unchanged', async () => {
  const a = legacy('a', { revision: 'a-r' }), b = legacy('b', { revision: 'b-r' })
  const f = await fixture([a, b]); f.rowAction('a', 'open'); f.edit('speaking-session-title', 'A 작성 중')
  f.rowAction('b', 'remove'); f.removals[0].reject(new Error('storageConflict')); await f.flush()
  assert.equal(f.field('speaking-session-title').props.value, 'A 작성 중')
  f.rowAction('b', 'remove'); f.listAs(() => Promise.resolve(list([a]))); f.removals[1].resolve(); await f.flush()
  f.save(); assert.deepEqual(f.saves[0].basis, { kind: 'revision', revision: 'a-r', updatedAt: 200 })
  f.commit(0); await f.flush(); f.h.cleanup()
})
check('search and mode filter preserve draft, all takes, text export name, and private summary URL', async () => {
  const a = legacy('a', { title: '동일 이름' }), b = legacy('b', { title: '동일 이름', mode: 'report', takes: [{ id: 'b1', createdAt: 100, seconds: 20, transcript: '보고만 있음' }] })
  const f = await fixture([a, b]); f.rowAction('a', 'open'); f.edit('speaking-session-title', '비공개 제목')
  f.edit('speaking-history-search', 'ＳＥＣＯＮＤ unique')
  assert.equal(f.h.all().filter(node => node.props?.['data-speaking-record']).length, 1)
  f.edit('speaking-history-filter', 'report')
  assert.match(f.h.text(), /records.noMatches/)
  assert.equal(f.field('speaking-session-title').props.value, '비공개 제목')
  assert.equal(f.field('speaking-transcript').props.value, a.takes[1].transcript)
  f.click('exportText'); const body = await f.downloads[0].blob.text()
  assert.match(body, /비공개 제목/); assert.match(body, /첫 번째 원문/); assert.match(body, /SECOND unique/)
  const share = f.h.find(node => node.type === 'ShareResult')
  assert.equal(String(share.props.url).includes('비공개'), false)
  assert.equal(new URL(share.props.url, 'https://toolhub.ai.kr/').searchParams.has('title'), false)
  f.h.cleanup()
})
check('unmount invalidates pending save/delete completion without a late list reload', async () => {
  for (const operation of ['save', 'delete']) {
    const f = await fixture(); f.rowAction('legacy', 'open')
    if (operation === 'save') { f.edit('speaking-session-title', 'pending'); f.save() } else f.rowAction('legacy', 'remove')
    const before = f.lists.length; f.h.cleanup()
    if (operation === 'save') f.commit(0); else f.removals[0].resolve()
    for (let i = 0; i < 6; i++) await Promise.resolve()
    assert.equal(f.lists.length, before)
  }
})

;(async () => { let count = 0; for (const [name, run] of checks) { if (process.argv[2] && !name.includes(process.argv[2])) continue; await run(); console.log('PASS', name); count++ } console.log(`${count} independent speaking component checks passed`) })().catch(error => { console.error(error); process.exitCode = 1 })
