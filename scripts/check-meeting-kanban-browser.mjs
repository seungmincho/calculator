import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Real browser flows use the local development server. Storage failure cases
// deliberately replace only Storage.setItem; no product/domain code is mocked.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-16-parallel-kanban/browser')
const only = process.argv[2]
const keys = { board: 'kanban-board-state', meeting: 'meetingMinutes_auto', slots: 'meetingMinutes_slots', handoff: 'toolhub-meeting-kanban-v1' }
const messages = JSON.parse(readFileSync(resolve('messages/ko.json'), 'utf8'))
const tr = (namespace, key, values = {}) => {
  const value = key.split('.').reduce((current, part) => current?.[part], messages[namespace])
  assert.equal(typeof value, 'string', `Missing translation: ${namespace}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}
const k = (key, values) => tr('kanbanBoard', key, values)
const button = (page, name) => page.getByRole('button', { name, exact: true })
const longTask = '검증할 긴 업무 본문입니다. '.repeat(18) + '마지막 문장도 보존합니다.'
const tasks = () => [
  { id: 'pending-action', task: '견적서 2건 요청', assignee: '김민수', dueDate: '2026-11-20', status: 'pending' },
  { id: 'progress-action', task: longTask, assignee: '박서연', dueDate: '2026-11-21', status: 'in-progress' },
  { id: 'done-action', task: '회의 일정 확정', assignee: '', dueDate: '', status: 'done' },
]
const meeting = () => ({ title: '검증 주간 회의', date: '2026-11-16', time: '10:00', location: '회의실', locationType: 'offline', organizer: '검증 담당', attendees: [], agenda: [], discussions: [{ id: 'discussion', speaker: '', content: '보존할 원본 토의' }], actions: tasks(), decisions: '보존할 결정', nextMeeting: '', notes: '보존할 메모' })
const board = () => ({ version: 1, columns: [
  { id: 'existing-first', title: '기존 첫 열', cards: [{ id: 'existing-card', title: '기존 업무', description: '기존 상세 내용', priority: 'high', color: 'red', dueDate: '2026-11-22', createdAt: 1700000000000 }] },
  { id: 'existing-second', title: '기존 두 번째 열', cards: [] },
] })
const handoff = (items = tasks()) => ({ id: 'browser-handoff', source: 'meeting-minutes', meetingId: 'browser-meeting', meetingTitle: meeting().title, createdAt: Date.now(), items })
const readBoard = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), keys.board)
const readMeeting = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), keys.meeting)
const cards = state => state.columns.flatMap(column => column.cards)
const importPanel = page => page.locator('[aria-labelledby="meeting-import-title"]')
const exportPanel = page => page.locator('[aria-labelledby="meeting-kanban-title"]')

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const results = []

async function seed(context, { savedBoard = board(), savedMeeting = meeting(), savedSlots = null, incoming = null, dark = false } = {}) {
  await context.addInitScript(({ savedBoard, savedMeeting, savedSlots, incoming, dark, keys }) => {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return
    if (!localStorage.getItem('__kanbanTestSeed')) {
      if (savedBoard !== null) localStorage.setItem(keys.board, typeof savedBoard === 'string' ? savedBoard : JSON.stringify(savedBoard))
      if (savedMeeting !== null) localStorage.setItem(keys.meeting, JSON.stringify(savedMeeting))
      if (savedSlots !== null) localStorage.setItem(keys.slots, JSON.stringify(savedSlots))
      if (dark) localStorage.setItem('theme', 'dark')
      localStorage.setItem('__kanbanTestSeed', '1')
    }
    if (incoming && location.pathname.includes('/kanban-board') && !sessionStorage.getItem('__kanbanSourceSeed')) {
      sessionStorage.setItem(keys.handoff, JSON.stringify(incoming))
      sessionStorage.setItem('__kanbanSourceSeed', '1')
    }
  }, { savedBoard, savedMeeting, savedSlots, incoming, dark, keys })
}

async function run(name, fn, options = {}) {
  if (only && (only.startsWith('!') ? name.includes(only.slice(1)) : !name.includes(only))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true })
  const errors = [], external = []
  await context.route('**/*', route => {
    if (!route.request().url().startsWith(base)) { external.push(route.request().url()); return route.abort() }
    return route.continue()
  })
  context.on('page', page => {
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && /hydration|didn't match|server rendered HTML/i.test(message.text())) errors.push(message.text()) })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  const open = async (path = '/kanban-board/?from=meeting', target = page) => {
    await target.goto(base + path, { waitUntil: 'domcontentloaded' })
    await target.locator('main h1').first().waitFor()
  }
  const startedAt = Date.now()
  try {
    await fn({ page, context, open })
    assert.deepEqual(errors, [], 'JavaScript / hydration errors')
    assert.equal(external.filter(url => /huggingface|web-llm|transformers|mlc-ai/i.test(url)).length, 0)
    results.push({ name, pass: true, milliseconds: Date.now() - startedAt, errors, externalRequestsBlocked: external.length })
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - startedAt, error: error.message, errors })
    await context.pages().at(-1)?.screenshot({ path: resolve(out, name + '-failed.png'), fullPage: true }).catch(() => {})
  } finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
}

async function waitImport(page) { await importPanel(page).waitFor() }
async function submitImport(page) { await importPanel(page).locator('button[type="submit"]').click() }
async function expectImportClosed(page) {
  await importPanel(page).waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), null)
  assert.equal(new URL(page.url()).searchParams.get('from'), null)
}
async function chooseAll(page) {
  const expand = exportPanel(page).locator('button[aria-expanded]')
  await expand.waitFor()
  if (await expand.getAttribute('aria-expanded') === 'false') await expand.click()
  const boxes = exportPanel(page).getByRole('checkbox')
  await boxes.first().waitFor()
  for (const box of await boxes.all()) if (await box.isEnabled()) await box.check()
}
async function sendMeeting(page) {
  await chooseAll(page)
  const popup = page.waitForEvent('popup')
  await exportPanel(page).getByRole('button', { name: /^선택한 \d+개를 칸반으로 보내기$/ }).click()
  const incoming = await popup
  await incoming.waitForURL('**/kanban-board/?from=meeting')
  await waitImport(incoming)
  return incoming
}
async function editCard(page, title, changes) {
  const item = page.locator('[draggable="true"]').filter({ has: page.getByText(title, { exact: true }) })
  await item.getByRole('button', { name: k('editCard'), exact: true }).click()
  const dialog = page.getByRole('dialog')
  if (changes.title !== undefined) await dialog.getByLabel(k('cardTitle'), { exact: true }).fill(changes.title)
  if (changes.assignee !== undefined) await dialog.getByLabel(k('assignee'), { exact: true }).fill(changes.assignee)
  if (changes.dueDate !== undefined) await dialog.getByLabel(k('dueDate'), { exact: true }).fill(changes.dueDate)
  await dialog.getByRole('button', { name: k('save'), exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
}
async function assertNoOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page must fit viewport')
}

try {
  await run('actual-new-tab-new-columns-edit-reload-retransmit', async ({ page, context, open }) => {
    await seed(context)
    await open('/meeting-minutes/')
    const destination = await sendMeeting(page)
    assert.equal(await destination.evaluate(() => window.opener), null)
    assert.ok(page.url().endsWith('/meeting-minutes/'))
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), keys.handoff), null)
    assert.ok(!decodeURIComponent(destination.url()).includes(tasks()[0].task))
    const source = await readMeeting(page)
    assert.ok(source.kanbanSourceId, 'Source meeting ID must be persisted before handoff')
    assert.deepEqual({ ...source, kanbanSourceId: undefined }, { ...meeting(), kanbanSourceId: undefined })
    assert.deepEqual(await readBoard(destination), board())
    await submitImport(destination)
    await expectImportClosed(destination)
    let stored = await readBoard(destination)
    assert.deepEqual(stored.columns.slice(0, 2), board().columns)
    assert.equal(stored.columns.length, 5)
    for (const task of tasks()) {
      const imported = cards(stored).find(card => card.meetingSource?.actionId === task.id)
      assert.ok(imported)
      assert.equal(imported.assignee, task.assignee)
      assert.equal(imported.dueDate, task.dueDate)
      assert.equal(imported.priority, 'medium')
      assert.equal(imported.meetingSource.meetingId, source.kanbanSourceId)
      assert.equal(imported.description, task.task)
    }
    await editCard(destination, tasks()[0].task, { title: '칸반에서 고친 업무', assignee: '변경 담당자', dueDate: '2026-12-01' })
    stored = await readBoard(destination)
    await destination.reload({ waitUntil: 'domcontentloaded' })
    await destination.getByText('칸반에서 고친 업무', { exact: true }).waitFor()
    assert.deepEqual(await readBoard(destination), stored)
    const again = await sendMeeting(page)
    assert.equal((await readMeeting(page)).kanbanSourceId, source.kanbanSourceId)
    await submitImport(again)
    await expectImportClosed(again)
    assert.deepEqual(await readBoard(again), stored, 'Retransmission must preserve card edits and avoid empty columns')
    assert.deepEqual((await readMeeting(page)).actions, meeting().actions)
    const download = again.waitForEvent('download')
    await button(again, k('export')).click()
    assert.deepEqual(JSON.parse(readFileSync(await (await download).path(), 'utf8')), stored)
    await again.screenshot({ path: resolve(out, 'desktop-imported-board.png'), animations: 'disabled' })
  })

  await run('existing-columns-explicit-status-mapping', async ({ page, context, open }) => {
    await seed(context, { incoming: handoff() })
    await open(); await waitImport(page)
    await button(importPanel(page), '기존 열에 배치').click()
    const selects = importPanel(page).getByRole('combobox')
    assert.equal(await selects.count(), 3)
    for (const select of await selects.all()) assert.equal(await select.inputValue(), '', 'Existing status mapping must be explicit')
    await selects.nth(0).selectOption('existing-second')
    await selects.nth(1).selectOption('existing-first')
    await selects.nth(2).selectOption('existing-second')
    await submitImport(page); await expectImportClosed(page)
    const stored = await readBoard(page)
    assert.equal(stored.columns.length, 2)
    assert.deepEqual(stored.columns[0].cards[0], board().columns[0].cards[0])
    assert.deepEqual(stored.columns[0].cards.slice(1).map(card => card.meetingSource.actionId), ['progress-action'])
    assert.deepEqual(stored.columns[1].cards.map(card => card.meetingSource.actionId), ['pending-action', 'done-action'])
  })

  await run('legacy-named-slot-retransmission-reuses-meeting-id', async ({ page, context, open }) => {
    const unrelated = { ...meeting(), title: '별도 회의', kanbanSourceId: 'known-unrelated-id', actions: [{ ...tasks()[0], id: 'unrelated-action' }] }
    await seed(context, { savedSlots: [{ name: '구형 주간 회의 저장본', data: meeting() }, { name: '별도 회의 저장본', data: unrelated }] })
    await open('/meeting-minutes/')
    const first = await sendMeeting(page)
    await submitImport(first); await expectImportClosed(first)
    const before = await readBoard(first), identity = (await readMeeting(page)).kanbanSourceId
    await button(page, tr('meetingMinutes', 'saveSlots')).click()
    await page.getByText('별도 회의 저장본', { exact: true }).locator('..').getByRole('button', { name: tr('meetingMinutes', 'load'), exact: true }).click()
    await button(page, tr('meetingMinutes', 'saveSlots')).click()
    await page.getByText('구형 주간 회의 저장본', { exact: true }).locator('..').getByRole('button', { name: tr('meetingMinutes', 'load'), exact: true }).click()
    const second = await sendMeeting(page)
    assert.equal((await readMeeting(page)).kanbanSourceId, identity)
    await submitImport(second); await expectImportClosed(second)
    assert.deepEqual(await readBoard(second), before)
    const slots = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), keys.slots)
    assert.equal(slots[0].data.kanbanSourceId, identity)
    assert.deepEqual(slots[0].data.actions, meeting().actions)
    assert.deepEqual(slots[1].data, unrelated)
  })

  await run('quota-failure-retains-board-and-handoff', async ({ page, context, open }) => {
    await seed(context, { incoming: handoff() })
    await open(); await waitImport(page)
    await page.evaluate(key => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('quota', 'QuotaExceededError'); return set.call(this, name, value) } }, keys.board)
    await submitImport(page)
    await page.getByRole('alert').filter({ hasText: /저장/ }).first().waitFor()
    assert.deepEqual(await readBoard(page), board())
    assert.ok(await importPanel(page).isVisible())
    assert.ok(await page.evaluate(key => !!sessionStorage.getItem(key), keys.handoff))
    assert.equal(new URL(page.url()).searchParams.get('from'), 'meeting')
  })

  await run('real-other-tab-change-prevents-overwrite', async ({ page, context, open }) => {
    await seed(context, { incoming: handoff() })
    await open(); await waitImport(page)
    const other = await context.newPage()
    await open('/kanban-board/', other)
    await other.getByText('기존 업무', { exact: true }).waitFor()
    await editCard(other, '기존 업무', { title: '다른 탭 최신 업무' })
    const newer = await readBoard(other)
    await page.getByRole('alert').filter({ hasText: /다른 탭/ }).first().waitFor()
    assert.ok(await importPanel(page).locator('button[type="submit"]').isDisabled(), 'Storage event must block stale import')
    assert.deepEqual(await readBoard(page), newer)
    assert.ok(await importPanel(page).isVisible())
    assert.ok(await page.evaluate(key => !!sessionStorage.getItem(key), keys.handoff))
    await button(page, k('storage.reload')).click()
    await submitImport(page); await expectImportClosed(page)
    assert.deepEqual((await readBoard(page)).columns.slice(0, 2), newer.columns)
  })

  for (const [name, raw] of [['malformed', '{broken json'], ['future-version', JSON.stringify({ ...board(), version: 99 })]]) {
    await run(name + '-board-is-never-overwritten', async ({ page, context, open }) => {
      await seed(context, { savedBoard: raw, incoming: handoff() })
      await open()
      await page.getByRole('alert').first().waitFor()
      assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.board), raw)
      const add = button(page, k('addColumn'))
      if (await add.isEnabled()) {
        await add.click()
        await page.getByRole('dialog').getByRole('textbox').fill('덮어쓰면 안 되는 열')
        await page.getByRole('dialog').getByRole('button', { name: k('save'), exact: true }).click()
      }
      assert.equal(await page.evaluate(key => localStorage.getItem(key), keys.board), raw)
      assert.ok(await page.evaluate(key => !!sessionStorage.getItem(key), keys.handoff))
    })
  }

  await run('expired-handoff-and-dismiss-cleanup', async ({ page, context, open }) => {
    await seed(context, { incoming: { ...handoff(), createdAt: Date.now() - 11 * 60 * 1000 } })
    await open()
    await page.getByRole('alert').first().waitFor()
    assert.equal(await importPanel(page).locator('button[type="submit"]').count(), 0)
    assert.deepEqual(await readBoard(page), board())
    await importPanel(page).getByRole('button', { name: /닫기|취소/ }).click()
    await expectImportClosed(page)
    await page.evaluate(({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)), { key: keys.handoff, payload: handoff() })
    await open(); await waitImport(page)
    await importPanel(page).getByRole('button', { name: /닫기|취소/ }).click()
    await expectImportClosed(page)
    assert.deepEqual(await readBoard(page), board())
  })

  await run('popup-failure-then-retry-keeps-source-id', async ({ page, context, open }) => {
    await seed(context); await open('/meeting-minutes/'); await chooseAll(page)
    await page.evaluate(() => { window.__originalOpen = window.open; window.open = () => null })
    await exportPanel(page).getByRole('button', { name: /^선택한 \d+개를 칸반으로 보내기$/ }).click()
    await page.getByRole('alert').filter({ hasText: /새 탭|팝업/ }).waitFor()
    const source = await readMeeting(page)
    assert.ok(source.kanbanSourceId)
    assert.deepEqual(source.actions, meeting().actions)
    assert.equal(context.pages().length, 1)
    await page.evaluate(() => { window.open = window.__originalOpen })
    const destination = await sendMeeting(page)
    assert.equal((await readMeeting(page)).kanbanSourceId, source.kanbanSourceId)
    const payload = await destination.evaluate(key => JSON.parse(sessionStorage.getItem(key)), keys.handoff)
    assert.equal(payload.meetingId, source.kanbanSourceId)
  })

  await run('meeting-save-failure-prevents-popup-and-preserves-selection', async ({ page, context, open }) => {
    await seed(context); await open('/meeting-minutes/'); await chooseAll(page)
    await page.evaluate(key => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException('quota', 'QuotaExceededError'); return set.call(this, name, value) } }, keys.meeting)
    await exportPanel(page).getByRole('button', { name: /^선택한 \d+개를 칸반으로 보내기$/ }).click()
    await exportPanel(page).getByRole('alert').filter({ hasText: /저장/ }).waitFor()
    assert.equal(context.pages().length, 1)
    assert.deepEqual(await readMeeting(page), meeting())
    assert.equal(await exportPanel(page).getByRole('checkbox', { checked: true }).count(), 3)
    assert.deepEqual(await readBoard(page), board())
  })

  await run('source-ui-title-and-total-length-limits', async ({ page, context, open }) => {
    const source = { ...meeting(), title: '회'.repeat(121), actions: Array.from({ length: 6 }, (_, index) => ({ ...tasks()[0], id: `limit-${index}`, task: '가'.repeat(6000) })) }
    await seed(context, { savedMeeting: source }); await open('/meeting-minutes/'); await chooseAll(page)
    await exportPanel(page).getByRole('alert').filter({ hasText: tr('meetingMinutes', 'kanban.titleTooLong') }).waitFor()
    await exportPanel(page).getByRole('alert').filter({ hasText: tr('meetingMinutes', 'kanban.totalTooLong') }).waitFor()
    assert.ok(await exportPanel(page).getByRole('button', { name: tr('meetingMinutes', 'kanban.send', { count: 6 }), exact: true }).isDisabled())
    assert.equal(context.pages().length, 1)
    assert.deepEqual(await readMeeting(page), source)
  })

  await run('source-ui-maximum-fifty-selection', async ({ page, context, open }) => {
    const source = { ...meeting(), actions: Array.from({ length: 51 }, (_, index) => ({ ...tasks()[0], id: `limit-${index}`, task: `선택 제한 업무 ${index + 1}` })) }
    await seed(context, { savedMeeting: source }); await open('/meeting-minutes/')
    await exportPanel(page).locator('button[aria-expanded]').click()
    await exportPanel(page).getByRole('button', { name: tr('meetingMinutes', 'kanban.selectFirst'), exact: true }).click()
    assert.equal(await exportPanel(page).getByRole('checkbox', { checked: true }).count(), 50)
    assert.ok(await page.getByLabel('할 일 51 선택', { exact: true }).isDisabled())
    await page.getByLabel('할 일 1 선택', { exact: true }).uncheck()
    await page.getByLabel('할 일 51 선택', { exact: true }).check()
    assert.equal(await exportPanel(page).getByRole('checkbox', { checked: true }).count(), 50)
    assert.equal(context.pages().length, 1)
    assert.deepEqual(await readMeeting(page), source)
  })

  await run('invalid-actions-visible-and-not-silently-sent', async ({ page, context, open }) => {
    const source = { ...meeting(), actions: [tasks()[0], { ...tasks()[1], task: '' }, { ...tasks()[2], dueDate: '2026-02-30' }] }
    await seed(context, { savedMeeting: source }); await open('/meeting-minutes/'); await chooseAll(page)
    assert.equal(await exportPanel(page).getByRole('checkbox', { checked: true }).count(), 1)
    assert.equal(await exportPanel(page).getByRole('checkbox', { disabled: true }).count(), 2)
    await exportPanel(page).getByText(tr('meetingMinutes', 'kanban.invalidDate'), { exact: true }).waitFor()
    await exportPanel(page).getByText(tr('meetingMinutes', 'kanban.emptyTask'), { exact: true }).last().waitFor()
    const destination = await sendMeeting(page)
    const payload = await destination.evaluate(key => JSON.parse(sessionStorage.getItem(key)), keys.handoff)
    assert.deepEqual(payload.items, [tasks()[0]])
    assert.deepEqual((await readMeeting(page)).actions, source.actions)
  })

  await run('desktop-card-drag-between-existing-columns', async ({ page, context, open }) => {
    await seed(context); await open('/kanban-board/')
    const card = page.locator('[draggable="true"]').filter({ has: page.getByText('기존 업무', { exact: true }) })
    await card.waitFor()
    await card.dragTo(page.locator('[data-col-id="existing-second"]'))
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).columns[1].cards.length === 1, keys.board)
    const stored = await readBoard(page)
    assert.deepEqual(stored.columns[1].cards, board().columns[0].cards)
    assert.deepEqual(stored.columns[0].cards, [])
  })

  await run('v1-json-import-export-empty-board-persistence', async ({ page, context, open }) => {
    await seed(context); await open('/kanban-board/')
    await page.getByText('기존 업무', { exact: true }).waitFor()
    const older = { version: 1, columns: [{ id: 'legacy-column', title: '예전 보드', cards: [{ ...board().columns[0].cards[0], id: 'legacy-card', title: 'v1 예전 카드' }] }] }
    const file = page.locator('input[type="file"]')
    await file.setInputFiles({ name: 'legacy-v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(older)) })
    await page.getByText('v1 예전 카드', { exact: true }).waitFor()
    assert.deepEqual(await readBoard(page), older)
    const download = page.waitForEvent('download')
    await button(page, k('export')).click()
    assert.deepEqual(JSON.parse(readFileSync(await (await download).path(), 'utf8')), older)
    await file.setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...older, version: 99 })) })
    await page.getByText(k('importError'), { exact: true }).waitFor()
    assert.deepEqual(await readBoard(page), older)
    await page.locator('[data-col-id="legacy-column"]').getByRole('button', { name: k('deleteNamedColumn', { title: '예전 보드' }), exact: true }).click()
    assert.deepEqual(await readBoard(page), { version: 1, columns: [] })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('main h1').first().waitFor()
    assert.equal(await page.locator('[data-col-id]').count(), 0)
    assert.deepEqual(await readBoard(page), { version: 1, columns: [] })
  })

  await run('mobile-320-dark-visible-edit-and-column-move', async ({ page, context, open }) => {
    await seed(context, { incoming: handoff([tasks()[0]]), dark: true })
    await open(); await waitImport(page)
    await assertNoOverflow(page)
    assert.ok(await page.locator('html').evaluate(element => element.classList.contains('dark')))
    await importPanel(page).screenshot({ path: resolve(out, 'mobile-import.png') })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: resolve(out, 'mobile-import-full.png'), fullPage: true, animations: 'disabled' })
    await submitImport(page); await expectImportClosed(page)
    assert.equal((await readBoard(page)).columns.length, 3, 'Only statuses with imported cards get a new column')
    await editCard(page, tasks()[0].task, { assignee: '모바일 담당자', dueDate: '2026-12-02' })
    const move = page.getByRole('combobox', { name: `열 이동: ${tasks()[0].task}`, exact: true })
    assert.ok(await move.isVisible())
    assert.ok(await move.evaluate(element => getComputedStyle(element).fontSize === '16px'))
    assert.ok((await move.boundingBox()).height >= 44)
    await move.selectOption('existing-second')
    const stored = await readBoard(page)
    assert.equal(stored.columns[1].cards[0].assignee, '모바일 담당자')
    assert.equal(stored.columns[1].cards[0].dueDate, '2026-12-02')
    await assertNoOverflow(page)
    await page.locator('[data-col-id="existing-second"]').screenshot({ path: resolve(out, 'mobile-edited-moved.png') })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.screenshot({ path: resolve(out, 'mobile-board-full.png'), fullPage: true, animations: 'disabled' })
    assert.ok(!/kanbanMeetingImportPanel\.|meetingActionExportPanel\.|storage\.(failed|saved)/.test(await page.locator('main').innerText()))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('모바일 담당자', { exact: false }).first().waitFor()
    assert.deepEqual(await readBoard(page), stored)
  }, { width: 320 })
} finally {
  await browser.close()
  writeFileSync(resolve(out, only ? 'results-' + only + '.json' : 'results.json'), JSON.stringify(results, null, 2))
}
if (results.some(result => !result.pass)) process.exitCode = 1
