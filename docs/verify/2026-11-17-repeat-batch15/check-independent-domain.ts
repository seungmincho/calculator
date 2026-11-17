import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { CSAT_EXAM_DATE, CSAT_YEAR, CUT_YEAR, CUTS, gradeOf, estimate } from '../../../src/utils/csatGrade.ts'
import { countdown, INQ_DETAIL, PRACTICE_TIMERS, SCHEDULE, TIMELINE, toMin } from '../../../src/utils/csatDday.ts'
import { parseQuery } from '../../../src/utils/timer.ts'

let groups = 0
function check(name: string, run: () => void) { run(); groups++; console.log(`PASS ${name}`) }

check('Academic year, calendar exam date, and score date are separate official facts', () => {
  assert.equal(CSAT_YEAR, 2027)
  assert.equal(CUT_YEAR, 2026)
  assert.equal(CSAT_EXAM_DATE, '2026-11-19')
  assert.equal(TIMELINE.find(row => row.key === 'score')?.start, '2026-12-11')
})
check('All 24 existing numeric tables are unchanged', () => {
  assert.equal(Object.keys(CUTS).length, 24)
  assert.equal(createHash('sha256').update(JSON.stringify(CUTS)).digest('hex'), '137d11fd379ac5627f9a789f2b088ecdeab84145593ce5de224bbfafeff5bcd5')
})
check('Official English and Korean history boundaries include both sides and never estimate standard scores', () => {
  for (const [key, boundaries] of [['english', [90,80,70,60,50,40,30,20,0]], ['koreanHistory', [40,35,30,25,20,15,10,5,0]]] as const) {
    boundaries.forEach((score, index) => {
      assert.equal(gradeOf(key, score), index + 1)
      if (score > 0) assert.equal(gradeOf(key, score - 1), index + 2)
      assert.equal(estimate(key, score), null)
    })
    assert.equal(gradeOf(key, CUTS[key].max), 1)
  }
})
check('D-2 and D-1 switch at KST midnight, independent of machine timezone', () => {
  for (const [instant, expected] of [
    ['2026-11-16T14:59:59.999Z', 3], ['2026-11-16T15:00:00.000Z', 2],
    ['2026-11-17T14:59:59.999Z', 2], ['2026-11-17T15:00:00.000Z', 1],
    ['2026-11-18T15:00:00.000Z', 0],
  ] as const) assert.equal(countdown(Date.parse(instant)).dday, expected)
})
check('Arrival, 4th period, and question change interval match official instructions', () => {
  assert.equal(SCHEDULE[0].start, '08:10')
  for (const [key, start, end] of [
    ['hist','14:50','15:20'], ['inq1','15:35','16:05'], ['inq2','16:07','16:37'],
  ]) {
    const slot = INQ_DETAIL.find(row => row.key === key)
    assert.equal(slot?.start, start); assert.equal(slot?.end, end)
  }
  assert.ok(INQ_DETAIL.some(row => row.start === '16:05' && row.end === '16:07'))
  const periods = SCHEDULE.filter(row => ['kor','math','eng','lang2'].includes(row.key))
  assert.deepEqual(periods.map(row => toMin(row.end!) - toMin(row.start)), [80,100,70,40])
})
check('Every subject practice duration enters existing timer without starting it', () => {
  assert.deepEqual(PRACTICE_TIMERS.map(row => [row.key, row.minutes]), [['kor',80],['math',100],['eng',70],['hist',30],['inq1',30],['lang2',40]])
  for (const row of PRACTICE_TIMERS) {
    const url = new URL(row.href, 'https://toolhub.ai.kr')
    assert.equal(url.pathname, '/timer/')
    assert.deepEqual([...url.searchParams.keys()], ['m'])
    assert.deepEqual(parseQuery(url.search), { sec: row.minutes * 60, mode: 'timer' })
  }
})
console.log(`Independent CSAT: ${groups} domain groups passed`)
