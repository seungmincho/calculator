import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as engine from '../../../src/utils/tetrisEngine.ts'

const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]
export const element = (tagName = 'DIV', attrs = {}, parentElement) => ({ tagName, parentElement, getAttribute: name => attrs[name] ?? null })
export function event(extra = {}) { return { defaultPrevented: false, repeat: false, target: element(), timeStamp: 0, nativeEvent: {}, preventDefault() { this.defaultPrevented = true }, ...extra } }
export async function tetrisFixture({ locale = 'ko', storage = {} } = {}) {
  const games = [], calls = [], records = [], submissions = [], savedNames = [], sounds = [], frames = [], timers = [], captures = [], released = [], scrolls = []
  let serial = 0, now = 0
  const io = { failCapture: false, width: 320, qualifies: false }
  const context = new Proxy({}, { get(target, key) { return target[key] ?? (() => {}) }, set(target, key, value) { target[key] = value; return true } })
  const captured = new Map()
  const makeTarget = name => ({ name, ...element(name === 'board' ? 'CANVAS' : 'BUTTON'),
    setPointerCapture(id) { if (io.failCapture) throw new Error('capture refused'); captured.set(id, this); captures.push([name, id]) },
    hasPointerCapture(id) { return captured.get(id) === this }, releasePointerCapture(id) { captured.delete(id); released.push([name, id]) },
    getBoundingClientRect() { return { width: io.width } }, getContext() { return context } })
  const canvas = makeTarget('board'), targets = new Map()
  const instrumented = { ...engine, newGame() { const game = engine.newGame(() => .37); games.push(game); return game } }
  for (const name of ['move', 'rotate', 'hardDrop', 'holdPiece', 'softDropOne', 'step']) instrumented[name] = (...args) => { calls.push({ name, args, game: args[0] }); return engine[name](...args) }
  const leaderboard = { checkQualifies: () => io.qualifies, fetchLeaderboard() {}, async submitScore(...args) { submissions.push(args) }, savePlayerName(name) { savedNames.push(name) }, config: { formatScore: String }, savedPlayerName: '' }
  const modules = { '@/utils/tetrisEngine': instrumented,
    '@/hooks/useLeaderboard': { useLeaderboard: () => leaderboard },
    '@/hooks/useGameAchievements': { useGameAchievements: () => ({ achievements: [], newlyUnlocked: [], unlockedCount: 0, totalCount: 0, recordGameResult: record => records.push(record), dismissNewAchievements() {} }) },
    '@/hooks/useGameSounds': { useGameSounds: () => ({ enabled: false, setEnabled() {}, ...Object.fromEntries(['Lose', 'Win', 'Capture', 'Move'].map(name => [`play${name}`, () => sounds.push(name)])) }) },
    '@/components/GameAchievements': { __esModule: true, default: 'GameAchievements', AchievementToast: 'AchievementToast' } }
  for (const name of ['LeaderboardPanel', 'NameInputModal', 'GameConfetti']) modules[`@/components/${name}`] = { __esModule: true, default: name }
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')), fragment = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch40/translations-tetris.json', 'utf8'))
  Object.assign(messages.tetris, fragment[locale].tetris)
  const h = await componentHarness('src/components/Tetris.tsx', { props: {}, modules, messages, storage, globals: {
    performance: { now: () => now }, requestAnimationFrame(callback) { const frame = { id: ++serial, callback, canceled: false, fired: false }; frames.push(frame); return frame.id },
    cancelAnimationFrame(id) { const frame = frames.find(item => item.id === id); if (frame) frame.canceled = true },
    setTimeout(callback, delay) { const timer = { id: ++serial, callback, delay, canceled: false }; timers.push(timer); return timer.id },
    clearTimeout(id) { const timer = timers.find(item => item.id === id); if (timer) timer.canceled = true },
  }, beforeEffects(tree) { for (const node of nodes(tree)) { if (node.type === 'canvas') node.props.ref.current = canvas; else if (node.type === 'div' && node.props.ref) node.props.ref.current = { scrollIntoView(options) { scrolls.push(options) } } } } })
  h.render()
  const attr = (name, value = '') => h.find(node => node.props[name] === value)
  const button = (name, value = '') => { attr(name, value).props.onClick(); h.render() }
  const key = (type, code, extra = {}) => { const e = event({ code, ...extra }); h.window.dispatch(type, e); h.render(); return e }
  const pad = action => attr('data-tetris-pad', action)
  const target = action => { if (!targets.has(action)) targets.set(action, makeTarget(action)); return targets.get(action) }
  const pointer = (action, type, id, extra = {}, props = pad(action).props) => { const e = event({ pointerId: id, currentTarget: target(action), target: target(action), timeStamp: now, ...extra }); props[type](e); h.render(); return e }
  const click = (action, extra = {}, props = pad(action).props) => { const e = event({ detail: 0, timeStamp: now, nativeEvent: { pointerId: -1, pointerType: '' }, ...extra }); props.onClick(e); h.render(); return e }
  const padKey = (action, type, code, extra = {}, props = pad(action).props) => { const e = event({ code, target: target(action), currentTarget: target(action), ...extra }); props[type](e); h.render(); return e }
  const board = () => attr('data-tetris-board').props
  const gesture = (type, id, extra = {}, props = board()) => { const e = event({ pointerId: id, currentTarget: canvas, clientX: 100, clientY: 100, timeStamp: now, ...extra }); props[type](e); h.render(); return e }
  const advance = ms => { now += ms; const frame = frames.find(item => !item.canceled && !item.fired); if (frame) { frame.fired = true; frame.callback(now); h.render() } return frame }
  const start = () => button('data-tetris-start')
  const status = () => h.all()[0].props['data-tetris-status']
  return { h, io, games, calls, records, submissions, savedNames, sounds, frames, timers, captures, released, captured, scrolls, canvas, target, attr, button, key, pad, pointer, click, padKey, board, gesture, advance, start, status,
    now: value => { now = value }, count: name => calls.filter(call => call.name === name).length, game: () => games.at(-1), cleanup: () => h.cleanup() }
}
