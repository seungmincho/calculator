// 연휴·연차 플래너 회귀 체크: node scripts/check-holiday-planner.ts
import { plan, buildDays, candidates, toIcs, MAX_LEAVE, type Plan } from '../src/utils/holidayPlanner.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { fail++; console.log('FAIL', name, JSON.stringify(got), '!=', JSON.stringify(want)) }
}
const ok = (name: string, cond: boolean) => { if (!cond) { fail++; console.log('FAIL', name) } }
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

// 통계: 우주항공청 2027 월력요항 보도(공휴일 72일, 주5일 119일, 3일 이상 연휴 10번)
const s27 = plan(2027, 5).stats
eq('2027 red', s27.redDays, 72); eq('2027 off', s27.offDays, 119); eq('2027 3+', s27.longWeekends, 10)
eq('2027 subs', s27.substitutes, 7); eq('2027 weekend overlap', s27.onWeekend, 9); eq('2027 weekday hol', s27.weekdayHolidays, 15); eq('2027 longest', s27.longest, 4)
// 2026: 월력요항 70일 + 노동절·제헌절(2026-04 개정, 둘 다 금요일) = 72, 주5일 118 + 2 = 120
const s26 = plan(2026, 5).stats
eq('2026 red', s26.redDays, 72); eq('2026 off', s26.offDays, 120); eq('2026 subs', s26.substitutes, 4); eq('2026 3+', s26.longWeekends, 10); eq('2026 longest', s26.longest, 5)

// 2027 추석(9/14~16 화~목): 9/13 하루 → 6일, 9/13·9/17 이틀 → 9/11~19 9일
const p27 = plan(2027, 5)
const top = p27.recs[0]
eq('rec1 chuseok', [top.start, top.end, top.days, top.leave], ['2027-09-11', '2027-09-16', 6, ['2027-09-13']])
eq('rec1 longer', [top.longer?.start, top.longer?.end, top.longer?.days, top.longer?.leave], ['2027-09-11', '2027-09-19', 9, ['2027-09-13', '2027-09-17']])
// 5월: 5/4(화) 하루로 노동절(토)·대체(월)~어린이날(수) 5일, 3일이면 5/1~9
const may = p27.recs.find((r) => r.start === '2027-05-01')
eq('may rec', [may?.end, may?.leave, may?.longer?.end, may?.longer?.leave.length], ['2027-05-05', ['2027-05-04'], '2027-05-09', 3])
// 설: 2/10~12 3일 → 2/6~14 9일
eq('seollal longer', p27.recs.find((r) => r.start === '2027-02-05')?.longer?.start, '2027-02-06')
// 10월: 10/5~8 4일 → 10/2(토)~11(월, 한글날 대체) 10일
eq('oct longer', [p27.recs.find((r) => r.start === '2027-10-01')?.longer?.start, p27.recs.find((r) => r.start === '2027-10-01')?.longer?.end], ['2027-10-02', '2027-10-11'])
// 연말: 12/28~31 4일 → 12/25~2028-01-02 9일 (해 넘김)
const ye = candidates(buildDays(2027), 4, '').find((c) => c.leave.length === 4 && buildDays(2027)[c.s].date === '2027-12-25')
eq('year-end bridge', ye && buildDays(2027)[ye.e].date, '2028-01-02')
// 연차 5일 총 휴일 (DP), 1일·2일
eq('2027 k5 total', [p27.totalDays, p27.leaveUsed], [24, 5])
eq('2027 k1', plan(2027, 1).breaks.map((b) => [b.start, b.end]), [['2027-09-11', '2027-09-16']])
eq('2027 k2 total', plan(2027, 2).totalDays, 11)
// 긴 연휴 우선: 연차 5일로 9/8~19 12일
eq('2027 long k5', plan(2027, 5, 'long').breaks.map((b) => [b.start, b.end, b.days]), [['2027-09-08', '2027-09-19', 12]])

// 불변식: 예산, 겹침·붙음 없음, 연차는 그해 평일 근무일, 연휴는 쉬는 날+연차로 빈틈없이, 앞뒤는 근무일
const check = (p: Plan, k: number, tag: string, from = '') => {
  const byDate = new Map(p.days.map((d) => [d.date, d]))
  ok(`${tag} budget`, p.leaveUsed <= k && p.leaveUsed === p.breaks.reduce((s, b) => s + b.leave.length, 0))
  ok(`${tag} total`, p.totalDays === p.breaks.reduce((s, b) => s + b.days, 0))
  p.breaks.forEach((b, i) => {
    ok(`${tag} len ${b.start}`, b.days === dayDiff(b.start, b.end) + 1 && b.leave.length >= 1)
    if (i) ok(`${tag} apart ${b.start}`, dayDiff(p.breaks[i - 1].end, b.start) >= 2)
    for (const l of b.leave) {
      const d = byDate.get(l)!
      ok(`${tag} leave ${l}`, d.inYear && !d.off && l >= b.start && l <= b.end && l >= from)
    }
    for (let x = 0; x < b.days; x++) {
      const date = new Date(Date.parse(b.start) + x * 86_400_000).toISOString().slice(0, 10)
      ok(`${tag} filled ${date}`, byDate.get(date)!.off || b.leave.includes(date))
    }
    const before = new Date(Date.parse(b.start) - 86_400_000).toISOString().slice(0, 10)
    const after = new Date(Date.parse(b.end) + 86_400_000).toISOString().slice(0, 10)
    ok(`${tag} maximal ${b.start}`, !byDate.get(before)?.off && !byDate.get(after)?.off)
    ok(`${tag} from ${b.start}`, b.start >= from)
  })
  for (let i = 1; i < p.recs.length; i++) ok(`${tag} rec order ${i}`, p.recs[i - 1].eff >= p.recs[i].eff)
  for (const r of p.recs) ok(`${tag} rec budget`, r.leave.length <= k && (!r.longer || r.longer.leave.length <= k))
}
for (const y of [2026, 2027]) {
  let prev = 0
  for (let k = 1; k <= MAX_LEAVE; k++) {
    const p = plan(y, k)
    check(p, k, `${y} k${k}`)
    ok(`${y} k${k} monotone`, p.totalDays >= prev)
    prev = p.totalDays
    const l = plan(y, k, 'long')
    check(l, k, `${y} k${k} long`)
    ok(`${y} k${k} long has longest`, Math.max(...l.breaks.map((b) => b.days)) >= Math.max(...p.breaks.map((b) => b.days)))
  }
}
// 지난 날짜 제외 (2026-10-04 기준)
const past = plan(2026, 5, 'total', '2026-10-04')
check(past, 5, '2026 from', '2026-10-04')
eq('2026 from first', past.breaks[0]?.start, '2026-10-08')

// DP = 완전탐색 (연차 3일, 2027)
const days = buildDays(2027)
const cs = candidates(days, 3, '').sort((a, b) => a.s - b.s)
let brute = 0
const dfs = (i: number, lastEnd: number, budget: number, sum: number) => {
  brute = Math.max(brute, sum)
  for (let j = i; j < cs.length; j++) {
    const c = cs[j]
    if (c.s >= lastEnd + 2 && c.leave.length <= budget) dfs(j + 1, c.e, budget - c.leave.length, sum + c.e - c.s + 1)
  }
}
dfs(0, -10, 3, 0)
eq('dp == brute k3', plan(2027, 3).totalDays, brute)

// .ics
const ics = toIcs([{ date: '2027-09-13', summary: '연차 · 추석 9일 연휴, 즐겁게; 쉬기', description: '긴 설명 '.repeat(20) }, { date: '2027-12-31', summary: '연차' }], Date.UTC(2026, 9, 4, 3, 5, 9))
const lines = ics.split('\r\n')
ok('ics crlf', !ics.replace(/\r\n/g, '').includes('\n'))
eq('ics head', lines.slice(0, 2), ['BEGIN:VCALENDAR', 'VERSION:2.0'])
eq('ics tail', lines.slice(-2), ['END:VCALENDAR', ''])
eq('ics events', (ics.match(/BEGIN:VEVENT/g) ?? []).length, 2)
ok('ics dtstart', lines.includes('DTSTART;VALUE=DATE:20270913') && lines.includes('DTEND;VALUE=DATE:20270914'))
ok('ics year roll', lines.includes('DTEND;VALUE=DATE:20280101'))
ok('ics stamp', lines.includes('DTSTAMP:20261004T030509Z'))
ok('ics escape', ics.includes('추석 9일 연휴\\, 즐겁게\\; 쉬기'))
ok('ics fold <=75 octets', lines.every((l) => new TextEncoder().encode(l).length <= 75))
ok('ics unfold', ics.replace(/\r\n /g, '').includes(`DESCRIPTION:${'긴 설명 '.repeat(20)}`))

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('holiday-planner: all ok')
