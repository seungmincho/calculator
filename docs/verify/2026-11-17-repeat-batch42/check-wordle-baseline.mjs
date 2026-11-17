// Synthetic storage, clipboard and timers; never submits a public score.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { computeStats, dailyAnswer, statusOf, isSyllable, VALID, randomAnswer } from '../../../src/utils/koreanWordle.ts'

const source = readFileSync(new URL('../../../src/components/KoreanWordle.tsx', import.meta.url), 'utf8')
const readStart = source.indexOf('function readJSON<T>'), readEnd = source.indexOf('/** 구버전', readStart)
const copyStart = source.indexOf('const copyResult = async () => {'), copyEnd = source.indexOf('const handleLeaderboardSubmit', copyStart)
const practiceStart = source.indexOf('const newPractice = useCallback('), practiceEnd = source.indexOf('// 오늘의 단어', practiceStart)
const submitStart = source.indexOf('const submit = () => {'), submitEnd = source.indexOf('const press = (k: string)', submitStart)
assert.ok(readStart >= 0 && copyStart >= 0 && practiceStart >= 0 && submitStart >= 0)
const compile = value => ts.transpileModule(value, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const timers = [], state = {}, probes = []
let raw = null
const answer = dailyAnswer(400)
const context = vm.createContext({
  localStorage: { getItem: () => raw, setItem() {} }, dailyText: 'synthetic spoiler-free grid',
  navigator: { clipboard: { writeText: async () => { throw new Error('synthetic rejection') } } },
  document: { createElement: () => ({ style: {}, select() {} }), body: { appendChild() {}, removeChild() {} }, execCommand: () => false },
  setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length },
  useCallback: value => value, randomAnswer, startTime: { current: 0 },
  game: { answer, len: 2, guesses: [], hard: false }, guesses: [], input: answer, status: 'playing', revealRow: -1,
  mode: 'daily', today: 400, STORE: 'synthetic-daily', FLIP_STEP: 250, FLIP_MS: 500,
  statusOf, isSyllable, VALID, t: key => key, reject() {}, recordGameResult() {},
  leaderboard: { checkQualifies: () => true, fetchLeaderboard() {} },
})
for (const key of ['Copied', 'Practice', 'Keys', 'Celebrate', 'RevealRow', 'BounceRow', 'ShowNameModal', 'ShowStats']) context[`set${key}`] = value => { state[key] = value }
context.setRecords = callback => { state.Records = callback({}) }
context.showToast = value => { state.Toast = value }
vm.runInContext(compile(`${source.slice(readStart, readEnd)};globalThis.read = readJSON;${source.slice(copyStart, copyEnd)};globalThis.copy = copyResult;${source.slice(practiceStart, practiceEnd)};globalThis.practice = newPractice;${source.slice(submitStart, submitEnd)};globalThis.submit = submit;`), context)
raw = '{}'
assert.equal(computeStats(context.read('synthetic', {}), 400).played, 0)
probes.push({ name: 'normal empty legacy record is supported', pass: true })
raw = 'null'
assert.throws(() => computeStats(context.read('synthetic', {}), 400), TypeError)
probes.push({ name: 'valid JSON null bypasses fallback and crashes statistics', error: 'TypeError' })
raw = '{"400":{"guesses":5}}'
assert.throws(() => computeStats(context.read('synthetic', {}), 400), TypeError)
probes.push({ name: 'wrong guesses shape reaches statistics unchecked', error: 'TypeError' })
await context.copy()
assert.equal(state.Copied, true)
probes.push({ name: 'native rejection and legacy false still show copied', copied: true })
timers.length = 0
context.submit()
context.practice(3)
const oldReveal = timers.find(timer => timer.delay === 750)
assert.ok(oldReveal)
oldReveal.callback()
const oldStats = timers.find(timer => timer.delay === 1500)
assert.ok(oldStats)
oldStats.callback()
assert.equal(state.Practice.len, 3)
assert.equal(state.ShowNameModal, true)
assert.equal(state.ShowStats, true)
probes.push({ name: 'old daily reveal opens result overlays after a new practice was created', practiceLength: 3, nameModal: true, statistics: true })
const report = { reproductionOnly: true, sourceSha256: createHash('sha256').update(source).digest('hex'), groups: probes.length, probes }
if (process.argv.includes('--record')) writeFileSync(new URL('before-fix.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
