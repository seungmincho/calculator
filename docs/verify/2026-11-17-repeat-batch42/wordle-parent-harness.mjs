import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as game from '../../../src/utils/koreanWordle.ts'
import { WORDLE_KEYS } from '../../../src/utils/koreanWordleStorage.ts'

export const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children)
export const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export async function wordleFixture({ storage = {}, shared, locale = 'ko' } = {}) {
  let time = Date.UTC(2026, 10, 17, 3), serial = 0
  const values = shared ?? new Map(Object.entries(storage)), writes = [], timers = [], locks = [], native = [], pendingCopies = [], fallback = [], records = [], submissions = [], names = [], statsCalls = []
  const io = { quota: false, readFail: false, readbackFail: false, hold: false, clipboard: 'success', legacy: false, qualifies: false, submit: null }
  const lang = { language: locale }, port = { getItem(key) { if (io.readFail || io.readbackFail && writes.length) throw Error('blocked'); return values.get(key) ?? null }, setItem(key, raw) { if (io.quota) throw new DOMException('quota', 'QuotaExceededError'); writes.push([key, raw]); values.set(key, raw) } }
  const navigator = { clipboard: { async writeText(value) { native.push(value); if (io.clipboard === 'reject') throw Error('denied'); if (io.clipboard === 'wait') { const pending = deferred(); pendingCopies.push(pending); await pending.promise } } }, locks: { request(key, options, work) { if (!io.hold) return Promise.resolve().then(work); const pending = deferred(); locks.push({ key, options, work, ...pending }); return pending.promise.then(work) } } }
  const leaderboard = { checkQualifies: () => io.qualifies, fetchLeaderboard() {}, async submitScore(...args) { submissions.push(args); if (io.submit) await io.submit.promise; return null }, savePlayerName(name) { names.push(name) }, config: { formatScore: String }, savedPlayerName: '' }
  const modules = { '@/contexts/LanguageContext': { useOptionalLanguage: () => lang }, '@/hooks/useDialog': { useDialog() {} },
    '@/hooks/useLeaderboard': { useLeaderboard: () => leaderboard }, '@/hooks/useGameAchievements': { useGameAchievements: () => ({ achievements: [], newlyUnlocked: [], unlockedCount: 0, totalCount: 0, recordGameResult: value => records.push(value), dismissNewAchievements() {} }) },
    '@/utils/koreanWordle': { ...game, randomAnswer: len => game.ANSWERS[len][0], computeStats(...args) { statsCalls.push(args); return game.computeStats(...args) } }, '@/components/GameAchievements': { __esModule: true, default: 'GameAchievements', AchievementToast: 'AchievementToast' } }
  for (const name of ['LeaderboardPanel', 'NameInputModal', 'GameConfetti', 'KoreanWordleHistory', 'KoreanWordleCopyRecovery']) modules['@/components/' + name] = { __esModule: true, default: name }
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch42/translations-wordle.json', 'utf8')); Object.assign(messages.koreanWordle, fragment[locale].koreanWordle)
  class ClockDate extends Date { static now() { return time } }
  const h = await componentHarness('src/components/KoreanWordle.tsx', { messages, modules, navigator, storagePort: port, url: 'https://toolhub.ai.kr/korean-wordle/', globals: { Date: ClockDate, AbortController,
    setTimeout(callback, delay) { const item = { id: ++serial, callback, delay, canceled: false, interval: false }; timers.push(item); return item.id }, clearTimeout(id) { const item = timers.find(t => t.id === id); if (item) item.canceled = true },
    setInterval(callback, delay) { const item = { id: ++serial, callback, delay, canceled: false, interval: true }; timers.push(item); return item.id }, clearInterval(id) { const item = timers.find(t => t.id === id); if (item) item.canceled = true },
    HTMLElement: class {},
  }, document: { activeElement: null, createElement: () => ({ style: {}, focus() {}, select() {}, setSelectionRange() {}, remove() {} }), body: { appendChild() {} }, execCommand(command) { fallback.push(command); return io.legacy } } })
  const settle = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); await Promise.resolve(); h.render() } }
  const attr = (name, value = '') => h.find(node => node.props[name] === value)
  const click = async (name, value = '') => { attr(name, value).props.onClick({ currentTarget: { blur() {} } }); await settle() }
  const key = async word => { for (const jamo of game.wordKeys(word).flat()) await click('data-wordle-key', jamo) }
  const run = async delay => { for (const item of [...timers].filter(item => item.delay === delay && !item.canceled)) { if (!item.interval) item.canceled = true; item.callback() }; await settle() }
  h.render()
  return { h, values, writes, timers, locks, native, pendingCopies, fallback, records, submissions, names, statsCalls, io, attr, click, key, run, settle, game,
    root: () => h.all()[0].props, row: index => text(attr('data-wordle-row', index)), history: () => h.find(node => node.type === 'KoreanWordleHistory').props, recovery: () => h.all().find(node => node.type === 'KoreanWordleCopyRecovery'),
    clock(value) { time = value }, today: () => game.dayNumber(time), async language(value) { lang.language = value; Object.assign(messages, JSON.parse(fs.readFileSync(`messages/${value}.json`, 'utf8'))); Object.assign(messages.koreanWordle, fragment[value].koreanWordle); await settle() },
    async init() { await settle(); const close = h.all().find(node => node.type === 'button' && node.props['aria-label'] === messages.koreanWordle.close); if (close) { close.props.onClick(); await settle() } },
    async submit(word) { await key(word); await click('data-wordle-key', 'Enter') },
    saved: () => JSON.parse(values.get(WORDLE_KEYS.daily) ?? '{}'), cleanup: () => h.cleanup() }
}
