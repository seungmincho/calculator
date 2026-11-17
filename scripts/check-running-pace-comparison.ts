import assert from 'node:assert/strict'
import { calculateRunning, formatClock } from '../src/utils/runningPace.ts'
import { captureRunningComparison, copyRunningGoals, currentRunningGoal, evaluateRunningGoals, runningClockFields, updateRunningGoal, type RunningGoalDraft } from '../src/utils/runningPaceComparison.ts'
import { captureRunningQuery, createRunningDraft, createRunningInitialOwner, restoreRunningQuery, updateRunningQuery } from '../src/utils/runningPaceQuery.ts'
import { copyRunningText, createRunningActionGuard, createRunningDownloads, serializeRunningComparison, type RunningExportLabels } from '../src/utils/runningPaceActions.ts'

let groups = 0, oracleRows = 0
async function check(name: string, run: () => void | Promise<void>) { if (process.argv.includes('--actions-only') && !name.startsWith('copy request') && !name.startsWith('CSV download')) return; await run(); groups++; console.log('PASS', name) }
const goal = (seconds: number, id = `goal-${seconds}`): RunningGoalDraft => ({ id, ...runningClockFields(seconds) })
const labels: RunningExportLabels = { distanceKm: '총 거리 km', splitIntervalKm: '간격 km', splitDistanceKm: '구간 거리 km', goals: ['목표1', '목표2', '목표3'], totalSeconds: '완주 초', paceSecondsPerKm: '초/km', speedKmh: 'km/h', elapsedSeconds: '누적 초', elapsedClock: '누적 시:분:초' }

await check('guarded rational correction and separate BigInt rounding oracle across every split', () => {
  for (const seconds of [29, 28_803]) assert.equal(formatClock(calculateRunning(100, 'time', seconds, 5)!.splits.find(row => row.distanceKm === 50)!.elapsedSeconds, true), seconds === 29 ? '0:00:15' : '4:00:02')
  let seed = 71
  for (let sample = 0; sample < 300; sample++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const units = sample === 0 ? 5_000_000 : 1 + seed % 5_000_000
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const seconds = 1 + seed % 359_999
    for (const interval of [1, 5] as const) {
      const result = calculateRunning(units / 10_000, 'time', seconds, interval)!
      for (const row of result.splits) {
        const numerator = BigInt(seconds) * BigInt(Math.round(row.distanceKm * 10_000)), denominator = BigInt(units)
        const rounded = Number((2n * numerator + denominator) / (2n * denominator))
        assert.equal(Math.round(row.elapsedSeconds), rounded, JSON.stringify({ units, seconds, row })); oracleRows++
      }
      assert.equal(result.splits.at(-1)!.elapsedSeconds, seconds)
      assert.equal(result.splits.at(-1)!.distanceKm, units / 10_000)
    }
  }
})
await check('public core non-integer clocks/distances and pace calculations retain original precision', () => {
  for (const [distance, seconds] of [[100, 0.7], [4.123456, 102], [100, 400_001]]) {
    const result = calculateRunning(distance, 'time', seconds, 1)!
    assert.equal(result.splits[0].elapsedSeconds, seconds / distance)
  }
  const paced = calculateRunning(42.195, 'pace', 340, 5)!
  assert.equal(paced.finishSeconds, 42.195 * 340); assert.equal(paced.splits.at(-1)!.elapsedSeconds, paced.finishSeconds)
})
await check('three targets preserve immutable raw fields, duplicates, invalid rows and exact time differences', () => {
  const draft = [goal(3000, 'one'), goal(3600, 'two'), goal(3000, 'three')]
  const comparison = evaluateRunningGoals(10, draft, 5)
  assert.deepEqual(comparison.rows.map(row => row.deltaSeconds), [0, 600, 0]); assert.deepEqual(comparison.rows.map(row => row.shortest), [true, false, true])
  assert.equal(comparison.validCount, 3); assert.equal(comparison.allValid, true)
  const captured = captureRunningComparison(10, draft, 5)!; draft[0].minutes = 'bad'; assert.equal(captured.goals[0].finishSeconds, 3000)
  assert.throws(() => { (captured.goals as unknown as { finishSeconds: number }[])[0].finishSeconds = 99 })
  const partial = evaluateRunningGoals(10, draft, 5); assert.equal(partial.rows.length, 3); assert.equal(partial.rows[0].draft.minutes, 'bad'); assert.equal(partial.rows[0].deltaSeconds, null); assert.equal(captureRunningComparison(10, draft, 5), null)
  assert.equal(evaluateRunningGoals(null, draft, 5).validCount, 0)
  assert.throws(() => copyRunningGoals([...draft, goal(12)])); assert.throws(() => copyRunningGoals([goal(1,'a'), goal(2,'a')]))
  const changed = updateRunningGoal(draft, 'two', { hours: '2' }); assert.equal(changed[1].hours, '2'); assert.equal(draft[1].hours, '1'); changed[1].minutes = '55'; assert.equal(draft[1].minutes, '0')
})
await check('clock boundaries, unchanged original pace beyond 99 hours, and second rounding import', () => {
  for (const fields of [{ hours: '0', minutes: '', seconds: '0' }, { hours: '0', minutes: '60', seconds: '0' }, { hours: '0', minutes: '0', seconds: '60' }, { hours: '100', minutes: '0', seconds: '0' }, { hours: '0', minutes: '0', seconds: '0' }]) assert.equal(evaluateRunningGoals(10, [{ id: 'x', ...fields }], 1).allValid, false)
  assert.equal(evaluateRunningGoals(500, [goal(359_999)], 1).allValid, true)
  assert.equal(evaluateRunningGoals(10, [{ id: 'zeros', hours: '0', minutes: '0', seconds: '0'.repeat(100) + '1' }], 1).rows[0].finishSeconds, 1)
  assert.equal(currentRunningGoal(calculateRunning(500, 'pace', 5999, 1)).kind, 'aboveClockRange')
  assert.equal(calculateRunning(500, 'pace', 5999, 1)!.finishSeconds, 2_999_500)
  assert.equal(currentRunningGoal(calculateRunning(0.0001, 'pace', 1, 1)).kind, 'belowOneSecond')
  assert.deepEqual(currentRunningGoal(calculateRunning(0.5, 'pace', 1, 1)), { kind: 'ready', seconds: 1, fields: { hours: '0', minutes: '0', seconds: '1' } })
})
await check('500 rows, final remainder, tiny distances and repeated numeric snapshot in CSV/TSV', () => {
  for (const [distance, interval, count] of [[500,1,500], [500,5,100], [21.0975,1,22], [42.195,5,9], [0.0001,5,1]] as const) {
    const snap = captureRunningComparison(distance, [goal(3000), goal(359_999)], interval)!
    assert.equal(snap.splits.length, count); assert.deepEqual(snap.splits.at(-1)!.elapsedSeconds, [3000,359_999])
    const csv = serializeRunningComparison(snap, labels, 'csv'), tsv = serializeRunningComparison(snap, labels, 'tsv')
    assert.equal(csv.charCodeAt(0), 0xFEFF); assert.notEqual(tsv.charCodeAt(0), 0xFEFF)
    assert.equal(csv.split('\r\n').length, count + 1); assert.equal(tsv.split('\r\n').length, count + 1)
    assert.ok(tsv.split('\r\n').every(line => line.split('\t').length === 13))
    assert.equal(tsv.split('\r\n').at(-1)!.split('\t')[2], String(distance)); assert.ok(csv.includes('목표1'))
  }
})
await check('CSV/TSV quote escaping and spreadsheet formula-like header protection', () => {
  const snap = captureRunningComparison(10, [goal(3000)], 5)!
  const special = { ...labels, distanceKm: '=danger', goals: ['한글,"목표"\t줄\n둘'] }
  const csv = serializeRunningComparison(snap, special, 'csv'), tsv = serializeRunningComparison(snap, special, 'tsv')
  assert.ok(csv.startsWith("\uFEFF'=danger,")); assert.ok(csv.includes('"한글,""목표""\t줄\n둘 · 완주 초"'))
  assert.ok(tsv.includes('"한글,""목표""\t줄\n둘 · 완주 초"'))
})
await check('numeric-only URL roundtrip preserves modes, custom choice and goals; unknown query/hash survive', () => {
  for (const mode of ['time','pace'] as const) {
    const draft = { ...createRunningDraft(), preset: 'custom' as const, customDistance: '21.0975', mode, hours: '2', minutes: '1', seconds: '3', paceMinutes: '5', paceSeconds: '59', goals: [goal(7200, 'private-id'),goal(7800)] }
    const update = updateRunningQuery('https://toolhub.ai.kr/running-pace/?foreign=1&foreign=2#keep', draft); assert.equal(update.kind, 'ready')
    assert.ok(!update.href.includes('private-id')); const url = new URL(update.href); assert.deepEqual(url.searchParams.getAll('foreign'), ['1','2']); assert.equal(url.hash, '#keep')
    const restored = restoreRunningQuery(url.searchParams); assert.equal(restored.kind, 'ready')
    if (restored.kind === 'ready') assert.deepEqual(captureRunningQuery(restored.draft), captureRunningQuery(draft))
  }
})
await check('strict malformed/unsupported URL and invalid target drafts never keep an old numeric snapshot', () => {
  const valid = updateRunningQuery('https://toolhub.ai.kr/running-pace/?x=1#keep', { ...createRunningDraft(), goals: [goal(3600)] })
  const url = new URL(valid.href), value = JSON.parse(url.searchParams.get('rp')!)
  for (const changed of [{...value, goals:[1,2,3,4]}, {...value, goals:[0]}, {...value, goals:['3']}, {...value, splitKm:2}, {...value, valueSeconds:360000}, {...value,distanceKm:6}, {...value,extra:1}]) { url.searchParams.set('rp',JSON.stringify(changed)); assert.equal(restoreRunningQuery(url.searchParams).kind,'invalid') }
  assert.equal(restoreRunningQuery(new URLSearchParams('rpV=2&rp=%7B%7D')).kind,'unsupported')
  assert.equal(restoreRunningQuery(new URLSearchParams('rpV=1&rp=%7B&rp=more')).kind,'invalid')
  assert.equal(restoreRunningQuery(new URLSearchParams({rpV:'1',rp:'x'.repeat(4097)})).kind,'tooLong')
  const bad = { ...createRunningDraft(), goals: [{id:'bad',hours:'0',minutes:'',seconds:'0'}] }
  const removed = updateRunningQuery(valid.href,bad); assert.equal(removed.kind,'invalid'); assert.equal(new URL(removed.href).searchParams.has('rp'),false); assert.equal(new URL(removed.href).hash,'#keep')
  assert.equal(updateRunningQuery('https://x.test/?other='+'a'.repeat(16400),createRunningDraft()).kind,'tooLong')
})
await check('initial partial edit wins once and copies mutable goals; malformed URL remains blocked until an edit', () => {
  const source = { ...createRunningDraft(), mode:'pace' as const, paceMinutes:'7',goals:[goal(7200)] }
  const restored = restoreRunningQuery(new URL(updateRunningQuery('https://x.test/',source).href).searchParams)
  const owner = createRunningInitialOwner(), pending=[goal(3000)]
  assert.equal(owner.edit({paceMinutes:'8',goals:pending}),true); pending[0].minutes='99'
  const final=owner.finish(restored)!; assert.equal(final.draft.paceMinutes,'8'); assert.equal(final.draft.mode,'pace'); assert.equal(final.draft.goals[0].minutes,'50'); assert.equal(final.blocked,false)
  assert.equal(owner.finish(restored),null); assert.equal(owner.edit({hours:'9'}),false)
  assert.equal(createRunningInitialOwner().finish({kind:'invalid'})!.blocked,true)
})
await check('copy request guard prevents late fallback and ABA feedback; truthful native/legacy failure', async () => {
  const guard=createRunningActionGuard(); guard.activate(); guard.setContext('ko:A')
  let reject!: (error: Error)=>void, legacy=0
  const old=guard.begin(), pending=copyRunningText('old',()=>guard.current(old),{writeText:()=>new Promise((_yes,no)=>{reject=no}),fallback:()=>{legacy++;return true}})
  const current=guard.begin(); assert.equal(await copyRunningText('latest',()=>guard.current(current),{writeText:async()=>undefined,fallback:()=>false}),'copied')
  reject(new Error('late')); assert.equal(await pending,'stale'); assert.equal(legacy,0)
  guard.setContext('en:B'); guard.setContext('ko:A'); assert.equal(guard.current(current),false)
  const failure=guard.begin(); assert.equal(await copyRunningText('keep',()=>guard.current(failure),{writeText:async()=>{throw new Error('denied')},fallback:()=>false}),'failed')
  guard.dispose(); assert.equal(guard.current(failure),false)
})
await check('CSV download current check and URL cleanup survive invalidate during URL creation/click failure', () => {
  const revoked:string[]=[], clicked:string[]=[], timers=new Map<number,()=>void>();let sequence=0,live=true,fail=false
  const downloads=createRunningDownloads({createUrl:()=>{live=false;return 'blob:one'},revokeUrl:value=>revoked.push(value),click:(_href,name)=>{if(fail)throw Error('blocked');clicked.push(name)},schedule:fn=>{timers.set(++sequence,fn);return sequence},cancel:id=>{timers.delete(id as number)}})
  downloads.activate();assert.equal(downloads.download('csv',()=>live),'stale');assert.deepEqual(revoked,['blob:one']);assert.equal(clicked.length,0)
  const normal=createRunningDownloads({createUrl:()=> 'blob:two',revokeUrl:value=>revoked.push(value),click:(_href,name)=>{if(fail)throw Error('blocked');clicked.push(name)},schedule:fn=>{timers.set(++sequence,fn);return sequence},cancel:id=>{timers.delete(id as number)}})
  normal.activate();live=true;assert.equal(normal.download('csv',()=>live),'started');assert.deepEqual(clicked,['running-pace-comparison.csv']);normal.dispose();assert.ok(revoked.includes('blob:two'));assert.equal(timers.size,0)
  normal.activate();fail=true;assert.equal(normal.download('csv',()=>live),'failed');downloads.dispose();normal.dispose()
})
console.log(`Running comparison: ${groups} groups; ${oracleRows} BigInt split checks passed`)
