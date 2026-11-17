import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const ROOT = 'docs/verify/2026-11-17-repeat-batch48/', KEY = 'characterCounter.v2', VERSIONS = 'characterCounter.writingVersions.v1'
const baselineFiles = ['before-fix.json', 'clear-before-fix.json', 'check-character-baseline.mjs', 'check-character-clear-baseline.mjs']
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const baselineHashes = Object.fromEntries(baselineFiles.map(file => [file, hash(ROOT + file)]))
const merge = (a, b) => { for (const [key, value] of Object.entries(b)) if (value && typeof value === 'object' && !Array.isArray(value)) merge(a[key] ??= {}, value); else a[key] = value; return a }
const copy = value => JSON.parse(JSON.stringify(value))
const initialDraft = (active = 4) => ({ tabs: Array.from({ length: 5 }, (_, i) => ({ title: '제목' + i, text: ` 원고${i}\r\n😀 가나다 `, target: 300 + i * 7, basis: ['chars', 'charsNoSpace', 'bytesKr', 'x', 'chars'][i] })), active })
const version = { id: 'review-version', name: '합성 수정본', title: '저장 제목', text: ' 저장 😀 원문\r\n끝 ', target: 901, basis: 'bytesKr', sourceTab: 2, createdAt: '2026-11-17T00:00:00.000Z' }
const versionRaw = JSON.stringify({ version: 1, versions: [version] })
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const walk = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(walk) : [value, ...walk(value.props?.children)]

// Independent port setup. Only the generic hook host is shared with the author.
async function mount({ initial = initialDraft(), holdInitial = false } = {}) {
  const values = new Map([[KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)], [VERSIONS, versionRaw]]), writes = [], clipboard = [], fallback = [], pending = [], locks = [], restores = [], selected = [], popups = []
  const io = { holdLocks: false, copy: 'ok', legacy: false, locale: 'ko', readDenied: false, readback: false, confirm: true }, language = { language: 'ko' }
  const messages = merge(JSON.parse(fs.readFileSync('messages/ko.json')), JSON.parse(fs.readFileSync(ROOT + 'translations-character.json')).ko)
  const storage = { getItem(key) { if (key === KEY && (io.readDenied || io.readback && writes.length)) throw Error('blocked'); return values.get(key) ?? null }, setItem(key, raw) { values.set(key, raw); writes.push({ kind: 'set', key, raw }) }, removeItem(key) { values.delete(key); writes.push({ kind: 'remove', key }) } }
  const nav = { clipboard: { writeText(raw) { clipboard.push(raw); if (io.copy === 'pending') { const task = deferred(); pending.push(task); return task.promise }; return io.copy === 'fail' ? Promise.reject(Error('denied')) : Promise.resolve() } }, locks: { request(key, action) { const task = deferred(), lock = { key, release() { try { task.resolve(action()) } catch (error) { task.reject(error) } } }; if (io.holdLocks) locks.push(lock); else lock.release(); return task.promise } } }
  let field, alive = true, recovery
  const document = { activeElement: null, body: { appendChild() {} }, createElement() { field = { value: '', style: {}, readOnly: false, focus() {}, select() {}, setSelectionRange() {}, remove() {} }; return field }, execCommand() { fallback.push(field.value); if (io.legacy === 'throw') throw Error('legacy'); return io.legacy } }
  const modules = { '@/components/WritingVersionsPanel': { __esModule: true, default: 'VersionBoundary' }, '@/components/CharacterCopyRecovery': { __esModule: true, default: 'RecoveryBoundary' }, '@/components/GuideSection': { __esModule: true, default: 'GuideBoundary' }, '@/contexts/LanguageContext': { useOptionalLanguage: () => language } }
  const h = await componentHarness('src/components/CharacterCounter.tsx', { modules, messages, storagePort: storage, navigator: nav, document,
    globals: { queueMicrotask(callback) { if (holdInitial && callback.name === 'restoreInitialCharacterDraft') restores.push(callback); else queueMicrotask(callback) } }, window: { confirm: () => io.confirm, open(...args) { popups.push(args); return null } } })
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve(); await Promise.resolve(); if (!alive) continue; h.render()
      const props = h.all().find(node => node.type === 'RecoveryBoundary')?.props
      if (!props && recovery) { recovery.cleanup(); recovery = null }
      else if (props && recovery) recovery.setProps(props)
      else if (props) {
        recovery = await componentHarness('src/components/CharacterCopyRecovery.tsx', { props, messages,
          beforeEffects(tree) { for (const node of walk(tree)) if (node.type === 'textarea') node.props.ref.current = { focus() {}, select() {}, setSelectionRange(start, end) { selected.push([start, end]) } } },
        }); recovery.render()
      }
    }
  }
  const attr = (suffix, value = '') => h.find(node => node.props['data-character-' + suffix] === value)
  const click = async (suffix, value = '') => { attr(suffix, value).props.onClick(); h.render(); await settle() }
  const edit = async (suffix, value) => { attr(suffix).props.onChange({ target: { value } }); h.render(); await settle() }
  const locale = async name => { io.locale = name; language.language = name; Object.assign(messages, merge(JSON.parse(fs.readFileSync(`messages/${name}.json`)), JSON.parse(fs.readFileSync(ROOT + 'translations-character.json'))[name])); h.render(); await settle() }
  h.render(); await settle()
  return { h, io, values, storage, nav, writes, clipboard, fallback, pending, locks, restores, selected, popups, messages, attr, click, edit, settle, locale,
    get recovery() { return recovery }, current: () => copy(h.find(node => node.type === 'VersionBoundary').props.current), versions: () => h.find(node => node.type === 'VersionBoundary').props,
    async boot() { restores.splice(0).forEach(callback => callback()); await settle() }, cleanup() { alive = false; recovery?.cleanup(); h.cleanup() } }
}

const results = []
async function check(name, run) { if (process.argv[2] && !name.includes(process.argv[2])) return; await run(); results.push({ name, pass: true }); console.log('PASS', name) }
await check('initial20 field coordinates, untouched tabs and explicit default tab use independent merge oracle', async () => {
  const replacement = { title: '새 제목', text: ' early\r\n😀 ', target: 1111, basis: 'x' }
  for (let tab = 0; tab < 5; tab++) for (const key of Object.keys(replacement)) {
    const initial = initialDraft(), f = await mount({ initial, holdInitial: true }); await f.click('tab', tab)
    if (key === 'basis') await f.click('basis', replacement[key]); else await f.edit(key === 'text' ? 'content' : key, String(replacement[key]))
    assert.equal(f.writes.length, 0); await f.boot()
    const expected = copy(initial); expected.active = tab; expected.tabs[tab][key] = replacement[key]
    assert.deepEqual(JSON.parse(f.values.get(KEY)), expected); assert.deepEqual(f.current(), expected.tabs[tab]); f.cleanup()
  }
  const normal = await mount(); assert.equal(normal.attr('root').props['data-character-active'], 4); assert.equal(normal.writes.length, 0); normal.cleanup()
  const intentional = await mount({ holdInitial: true }); await intentional.click('tab', 0); await intentional.boot(); assert.equal(intentional.attr('root').props['data-character-active'], 0); intentional.cleanup()
})
await check('full manual copy recovery and actual child retry keep exact whitespace/emoji text', async () => {
  const body = '한😀 \r\n'.repeat(3100), initial = initialDraft(0); initial.tabs[0].text = body
  const f = await mount({ initial }); f.io.copy = 'fail'; await f.click('copy'); assert.equal(f.fallback.length, 1); assert.equal(f.fallback[0], body)
  const manual = f.recovery.find(node => Object.hasOwn(node.props, 'data-character-copy-manual')); assert.equal(manual.props.value, body); assert.equal(manual.props.readOnly, true)
  f.recovery.find(node => Object.hasOwn(node.props, 'data-character-copy-select')).props.onClick(); assert.deepEqual(f.selected, [[0, body.length]])
  const retry = f.recovery.find(node => Object.hasOwn(node.props, 'data-character-copy-retry')).props.onClick; f.io.copy = 'ok'; retry(); await f.settle(); assert.equal(f.clipboard.at(-1), body); assert.equal(f.recovery, null)
  f.nav.clipboard = {}; f.io.legacy = 'throw'; await f.click('copy'); assert.ok(f.recovery); f.cleanup()
})
await check('native late rejection cannot fall back after tab/input/locale ABA or newer copy kind', async () => {
  for (const change of ['tab', 'input', 'locale']) {
    const f = await mount({ initial: initialDraft(0) }); f.io.copy = 'pending'; await f.click('copy'); const old = f.pending[0]
    if (change === 'tab') { await f.click('tab', 3); await f.click('tab', 0) }
    if (change === 'input') { const before = f.current().text; await f.edit('content', 'new'); await f.edit('content', before) }
    if (change === 'locale') { await f.locale('en'); await f.locale('ko') }
    old.reject(Error('late')); await f.settle(); assert.equal(f.fallback.length, 0); assert.equal(f.recovery, undefined); f.cleanup()
  }
  for (const first of ['copy', 'speller']) {
    const f = await mount({ initial: initialDraft(0) }); f.io.copy = 'pending'; await f.click(first); const old = f.pending[0]; f.io.copy = 'ok'; await f.click(first === 'copy' ? 'speller' : 'copy'); old.reject(Error('older')); await f.settle(); assert.equal(f.fallback.length, 0); assert.equal(f.clipboard.length, 2); assert.equal(f.popups[0][0], 'https://nara-speller.co.kr/speller/'); assert.equal(f.popups[0][2], 'noopener,noreferrer'); f.cleanup()
  }
})
await check('undo restores all fields and token cannot resurrect after same-tab ABA; other-tab edits are isolated', async () => {
  const f = await mount({ initial: initialDraft(0) }), before = f.current(), restore = f.versions().onRestore
  restore({ title: '복원', text: 'Restored', target: 73, basis: 'x' }); await f.settle(); await f.click('tab', 2); await f.edit('content', 'OTHER'); await f.click('tab', 0); await f.click('undo'); assert.deepEqual(f.current(), before)
  await f.edit('content', 'Abc'); await f.click('transform', 'upper'); const stale = f.attr('undo').props.onClick; await f.edit('content', '새'); await f.edit('content', 'ABC'); stale(); await f.settle(); assert.equal(f.current().text, 'ABC')
  const oldRestore = f.versions().onRestore; await f.edit('target', '777'); oldRestore({ title: 'OLD', text: 'OLD', target: 1, basis: 'chars' }); await f.settle(); assert.equal(f.current().target, 777); assert.equal(f.current().text, 'ABC'); assert.equal(JSON.parse(f.values.get(KEY)).tabs[2].text, 'OTHER'); f.cleanup()
})
await check('clear pending plus old/new autosaves: six release permutations preserve latest input and version bytes', async () => {
  const permutations = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]
  for (const order of permutations) {
    const f = await mount({ initial: initialDraft(0) }); f.io.holdLocks = true
    await f.edit('content', 'BEFORE CLEAR'); await f.click('clear-all'); await f.edit('content', 'AFTER CONFIRM\r\n😀'); assert.equal(f.locks.length, 3)
    for (const index of order) { f.locks[index].release(); await f.settle() }
    assert.equal(f.current().text, 'AFTER CONFIRM\r\n😀'); assert.equal(JSON.parse(f.values.get(KEY)).tabs[0].text, f.current().text); assert.equal(f.writes.filter(write => write.kind === 'remove').length, 0); assert.equal(f.writes.length, 1); assert.equal(f.values.get(VERSIONS), versionRaw); f.cleanup()
  }
  const f = await mount(); await f.click('clear-all'); assert.equal(f.values.has(KEY), false); assert.equal(f.values.get(VERSIONS), versionRaw); assert.deepEqual(f.current(), { title: '', text: '', target: 500, basis: 'chars' }); f.cleanup()
})
await check('real versions child uses latest parent tab for Diff full text, raw preservation and explicit restore undo', async () => {
  const f = await mount({ initial: initialDraft(0) }); await f.click('tab', 3); await f.edit('content', '현재\r\n😀 원문  '); await f.edit('title', '현재 제목')
  const payloads = [], locations = [], popup = { opener: {}, sessionStorage: { setItem(key, raw) { payloads.push([key, raw]) }, getItem() { return payloads.at(-1)?.[1] ?? null } }, location: { replace(value) { locations.push(value) } }, close() {} }
  const panel = await componentHarness('src/components/WritingVersionsPanel.tsx', { props: f.versions(), messages: f.messages, storagePort: f.storage,
    modules: { '@/components/WritingVersionsBackup': { __esModule: true, default: 'BackupBoundary' } }, window: { open: () => popup }, globals: { crypto: { randomUUID: () => 'review' } } })
  panel.render(); for (let i = 0; i < 5; i++) { await Promise.resolve(); panel.render() }
  panel.find(node => Object.hasOwn(node.props, 'data-writing-diff-send')).props.onClick(); panel.render(); assert.equal(payloads.length, 1)
  const payload = JSON.parse(payloads[0][1]); assert.equal(payload.left.text, version.text); assert.equal(payload.right.text, '현재\r\n😀 원문  '); assert.equal(payload.right.sourceTab, 4); assert.equal(payload.right.title, '현재 제목'); assert.deepEqual(locations, ['/diff-viewer/?from=writing-versions']); assert.equal(f.values.get(VERSIONS), versionRaw)
  const original = f.current(), msg = f.messages.characterCounter.versions
  panel.button(msg.restore).props.onClick(); panel.render(); panel.button(msg.confirmRestoreButton).props.onClick(); await f.settle(); assert.deepEqual(f.current(), { title: version.title, text: version.text, target: version.target, basis: version.basis }); await f.click('undo'); assert.deepEqual(f.current(), original)
  assert.equal(f.values.get(VERSIONS), versionRaw); panel.cleanup(); f.cleanup()
})
await check('blocked/corrupt/readback states preserve current text and do not announce false autosave', async () => {
  const f = await mount({ initial: '{bad', holdInitial: true }); await f.edit('content', 'EARLY'); await f.boot(); assert.equal(f.current().text, 'EARLY'); assert.equal(f.values.get(KEY), '{bad'); assert.equal(f.writes.length, 0); f.cleanup()
  const g = await mount({ holdInitial: true }); g.io.readDenied = true; await g.edit('title', 'KEEP'); await g.boot(); assert.equal(g.current().title, 'KEEP'); assert.equal(g.writes.length, 0); assert.equal(g.attr('save-status', 'unavailable').props.role, 'alert'); g.cleanup()
  const u = await mount({ initial: initialDraft(0) }); u.io.readback = true; await u.edit('content', 'UNCONFIRMED'); assert.equal(u.current().text, 'UNCONFIRMED'); assert.equal(u.attr('save-status', 'failed').props.role, 'alert'); assert.equal(u.writes.length, 1); u.cleanup()
})
await check('Strict replay and true unmount cancel old clipboard/lock completions without losing live draft', async () => {
  const f = await mount({ initial: initialDraft(0) }); f.io.copy = 'pending'; await f.click('copy'); const old = f.pending[0]; await f.edit('content', 'ALIVE'); const raw = f.values.get(KEY); f.h.replayEffects(); await f.settle(); old.reject(Error('old')); await f.settle(); assert.equal(f.current().text, 'ALIVE'); assert.equal(f.values.get(KEY), raw); assert.equal(f.fallback.length, 0)
  f.io.holdLocks = true; await f.edit('content', 'UNMOUNTED SAVE'); await f.click('clear-all'); f.io.copy = 'pending'; await f.click('copy'); const copy = f.pending.at(-1), writes = f.writes.length; f.cleanup(); for (const lock of f.locks) lock.release(); copy.reject(Error('unmounted')); await f.settle(); assert.equal(f.writes.length, writes); assert.equal(f.fallback.length, 0)
})
for (const file of baselineFiles) assert.equal(hash(ROOT + file), baselineHashes[file], `baseline was changed: ${file}`)
fs.writeFileSync(ROOT + 'independent-parent-results.json', JSON.stringify({ productSha256: hash('src/components/CharacterCounter.tsx'), baselineHashes, groups: results.length, results, publicRpcCalls: 0, nativeBrowser: false }, null, 2) + '\n')
console.log(`CharacterCounter independent parent: ${results.length} groups passed`)
