// node scripts/check-baby-vaccination.ts (Node 24) — 아기 예방접종 일정·건강검진 기간·상태·다음 접종·URL·저장·ICS 회귀 체크
// 기대값은 손으로 계산: 개월 기간은 [생일 + from개월, 생일 + (to+1)개월 - 1일], 말일 넘침은 말일(dday.addMonths)
import assert from 'node:assert/strict'
import {
  ageOf, ageLabel, windowOf, monthEnd, statusOf, scheduleFor, groupRows, nextDoses, fluStatus, nipEligible,
  parseState, toQuery, parseDone, setDone, icsEvents, SCHEDULE, CHECKUPS, DEFAULT, FLU_ID, type State,
} from '../src/utils/babyVaccination.ts'
import { buildIcs } from '../src/utils/carMaintenance.ts'

const dose = (id: string) => SCHEDULE.find((d) => d.id === id)!
const chk = (id: string) => CHECKUPS.find((c) => c.id === id)!

// ── 월령: 말일 출생·윤년
assert.deepEqual(ageOf('2023-01-31', '2023-02-27'), { months: 0, days: 27, totalDays: 27 })
assert.deepEqual(ageOf('2023-01-31', '2023-02-28'), { months: 1, days: 0, totalDays: 28 }, '1/31 출생은 2/28 에 만 1개월')
assert.deepEqual(ageOf('2024-01-31', '2024-02-29'), { months: 1, days: 0, totalDays: 29 }, '윤년 2/29')
assert.deepEqual(ageOf('2024-02-29', '2025-02-28'), { months: 12, days: 0, totalDays: 365 }, '2/29 출생 첫돌은 2/28')
assert.deepEqual(ageOf('2024-02-29', '2025-02-27'), { months: 11, days: 29, totalDays: 364 })
assert.deepEqual(ageOf('2026-09-22', '2026-11-22'), { months: 2, days: 0, totalDays: 61 })
assert.equal(ageOf('2026-12-01', '2026-11-22'), null, '출생 전')

// ── 표 열 이름
assert.deepEqual(ageLabel(dose('hepb1')), { k: 'birth', a: 0, b: 0 })
assert.deepEqual(ageLabel(dose('bcg1')), { k: 'weeks', a: 4, b: 4 })
assert.deepEqual(ageLabel(dose('dtap1')), { k: 'month', a: 2, b: 2 })
assert.deepEqual(ageLabel(dose('ipv3')), { k: 'months', a: 6, b: 18 })
assert.deepEqual(ageLabel(dose('dtap5')), { k: 'years', a: 4, b: 6 })
assert.deepEqual(ageLabel(dose('jei4')), { k: 'year', a: 6, b: 6 })
assert.deepEqual(ageLabel(dose('hpv12')), { k: 'years', a: 11, b: 12 })
assert.deepEqual(ageLabel(chk('gen1')), { k: 'days', a: 14, b: 35 })
assert.deepEqual(ageLabel(chk('gen8')), { k: 'months', a: 66, b: 71 }, '검진은 개월 그대로')

// ── 권장 기간: 말일·윤년
assert.deepEqual(windowOf('2026-01-31', dose('hepb2')), ['2026-02-28', '2026-03-30'])
assert.deepEqual(windowOf('2026-01-31', dose('dtap1')), ['2026-03-31', '2026-04-29'])
assert.deepEqual(windowOf('2024-02-29', dose('mmr1')), ['2025-02-28', '2025-06-28'])
assert.deepEqual(windowOf('2026-09-22', dose('hepb1')), ['2026-09-22', '2026-09-22'])
assert.deepEqual(windowOf('2026-09-22', dose('bcg1')), ['2026-09-22', '2026-10-20'], '4주 = 28일')
assert.deepEqual(windowOf('2026-09-22', dose('dtap4')), ['2027-12-22', '2028-04-21'])
assert.deepEqual(windowOf('2026-09-22', dose('dtap5')), ['2030-09-22', '2033-09-21'], '만 4~6세')
assert.deepEqual(windowOf('2026-09-22', dose('hpv12')), ['2037-09-22', '2039-09-21'])
// 이어지는 달은 빈틈 없이 붙는다
for (const b of ['2026-01-31', '2024-02-29', '2026-03-30', '2026-09-22']) {
  for (let m = 0; m < 160; m++) {
    const [, end] = windowOf(b, { from: m, to: m })
    const [start] = windowOf(b, { from: m + 1, to: m + 1 })
    const d = new Date(`${end}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    assert.equal(start, d.toISOString().slice(0, 10), `${b} ${m}개월 끝 다음 날 = ${m + 1}개월 시작`)
  }
}

// ── 상태 경계
assert.equal(monthEnd('2026-11-22'), '2026-11-30')
assert.equal(monthEnd('2028-02-03'), '2028-02-29')
assert.equal(monthEnd('2026-12-31'), '2026-12-31')
{
  const [s, e] = ['2026-11-22', '2026-12-21']
  assert.equal(statusOf(s, e, '2026-11-21'), 'now', '이번 달 안에 시작')
  assert.equal(statusOf(s, e, '2026-10-31'), 'soon')
  assert.equal(statusOf(s, e, '2026-12-21'), 'now', '끝나는 날 당일')
  assert.equal(statusOf(s, e, '2026-12-22'), 'past')
  assert.equal(statusOf(s, e, '2026-12-22', true), 'done')
  assert.equal(statusOf('2026-12-01', '2026-12-31', '2026-11-30'), 'soon', '다음 달 1일 시작')
  assert.equal(statusOf('2026-12-01', '2026-12-31', '2026-12-01'), 'now')
}

// ── 제품·종류별 항목 수와 순서
assert.equal(SCHEDULE.length, 36)
assert.equal(scheduleFor('2026-09-22', 'rv1', 'i').length, 33, 'RV1 2회 + 불활성화 5칸')
assert.equal(scheduleFor('2026-09-22', 'rv5', 'l').length, 32, 'RV5 3회 + 생백신 2칸')
assert.ok(scheduleFor('2026-09-22', 'rv5', 'i').some((r) => r.id === 'rv3'))
assert.ok(!scheduleFor('2026-09-22', 'rv1', 'i').some((r) => r.id === 'rv3'))
{
  const rows = scheduleFor('2026-09-22', 'rv1', 'i')
  assert.deepEqual(rows.slice(0, 8).map((r) => r.id), ['hepb1', 'bcg1', 'hepb2', 'dtap1', 'ipv1', 'hib1', 'pcv1', 'rv1'])
  const g = groupRows(rows)
  assert.deepEqual(g.slice(0, 7).map((x) => x.rows.map((r) => r.id)), [
    ['hepb1'], ['bcg1'], ['hepb2'],
    ['dtap1', 'ipv1', 'hib1', 'pcv1', 'rv1'],
    ['dtap2', 'ipv2', 'hib2', 'pcv2', 'rv2'],
    ['hepb3', 'dtap3', 'hib3', 'pcv3'],
    ['ipv3'],
  ])
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].start <= rows[i].start, '시작일 순')

  // ── 다음 접종(완료 체크 반영)
  const n0 = nextDoses(rows, '2026-11-22', new Set())!
  assert.equal(n0.start, '2026-11-22')
  assert.equal(n0.diff, 0)
  assert.equal(n0.end, '2026-12-21')
  assert.deepEqual(n0.list.map((r) => r.id), ['dtap1', 'ipv1', 'hib1', 'pcv1', 'rv1'])
  const n1 = nextDoses(rows, '2026-11-22', new Set(['dtap1', 'ipv1', 'hib1', 'pcv1', 'rv1']))!
  assert.equal(n1.start, '2027-01-22')
  assert.equal(n1.diff, 61)
  assert.deepEqual(n1.list.map((r) => r.id), ['dtap2', 'ipv2', 'hib2', 'pcv2', 'rv2'])
  const n2 = nextDoses(rows, '2026-11-22', new Set(['dtap1']))!
  assert.deepEqual(n2.list.map((r) => r.id), ['ipv1', 'hib1', 'pcv1', 'rv1'], '하나만 체크하면 나머지')
  const n3 = nextDoses(rows, '2026-11-21', new Set())!
  assert.deepEqual(n3.list.map((r) => r.id), ['hepb2'], '1개월 칸 마지막 날')
  assert.equal(n3.diff, -30, '이미 기간 안')
  assert.equal(nextDoses(rows, '2026-11-22', new Set(rows.map((r) => r.id))), null)
  assert.equal(nextDoses(rows, '2040-01-01', new Set()), null, '모든 칸이 끝남')
}

// ── 건강검진 기간 경계
assert.deepEqual(windowOf('2026-09-22', chk('gen1')), ['2026-10-06', '2026-10-27'], '생후 14~35일')
assert.deepEqual(windowOf('2026-09-22', chk('gen2')), ['2027-01-22', '2027-04-21'], '4~6개월 = 7개월 전날까지')
assert.deepEqual(windowOf('2026-09-22', chk('oral1')), ['2028-03-22', '2029-03-21'])
assert.deepEqual(windowOf('2026-09-22', chk('gen8')), ['2032-03-22', '2032-09-21'])
assert.deepEqual(windowOf('2026-01-31', chk('gen2')), ['2026-05-31', '2026-08-30'])
{
  const [s, e] = windowOf('2026-09-22', chk('gen1'))
  assert.equal(statusOf(s, e, '2026-10-27'), 'now')
  assert.equal(statusOf(s, e, '2026-10-28'), 'past')
  assert.equal(statusOf(s, e, '2026-10-05'), 'now', '같은 달이면 시작 전이라도 이번 달')
  assert.equal(statusOf(s, e, '2026-09-30'), 'soon')
}
assert.equal(CHECKUPS.filter((c) => c.kind === 'gen').length, 8)
assert.equal(CHECKUPS.filter((c) => c.kind === 'oral').length, 4)

// ── 국가지원·인플루엔자
assert.equal(nipEligible('2013-01-01'), true)
assert.equal(nipEligible('2012-12-31'), false)
assert.deepEqual(fluStatus('2026-09-22'), { kind: 'bornAfter', from: '2027-03-22' }, '8/31 이후 출생은 이번 절기 지원 아님')
assert.deepEqual(fluStatus('2026-03-01'), { kind: 'ok', from: '2026-09-21', to: '2027-04-30' }, '절기 시작일')
assert.deepEqual(fluStatus('2026-08-31'), { kind: 'ok', from: '2027-02-28', to: '2027-04-30' }, '생후 6개월 되는 날(말일)')
assert.deepEqual(fluStatus('2012-01-01'), { kind: 'ok', from: '2026-09-21', to: '2027-04-30' })
assert.deepEqual(fluStatus('2011-12-31'), { kind: 'old' })

// ── URL 왕복
assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
{
  const s: State = { b: '2025-03-01', r: 'rv5', j: 'l' }
  const q = toQuery(s)
  assert.equal(q, 'b=2025-03-01&r=rv5&j=l')
  const p = new URLSearchParams(q)
  assert.deepEqual(parseState((k) => p.get(k)), s)
  assert.equal(toQuery({ ...DEFAULT, b: '2026-09-22' }), 'b=2026-09-22', '직접 고친 생일만')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const bad = new URLSearchParams('b=2025-02-30&r=x&j=z')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  assert.equal(parseState((k) => (k === 'b' ? '1999-12-31' : null)).b, null, '범위 밖')
}

// ── 완료 체크 저장
assert.deepEqual(parseDone('garbage'), {})
assert.deepEqual(parseDone('[1,2]'), {})
assert.deepEqual(parseDone(null), {})
assert.deepEqual(parseDone(JSON.stringify({ '2026-09-22': ['dtap1', 'nope', 'dtap1', 3, FLU_ID], bad: ['dtap1'], '2026-01-01': [] })), { '2026-09-22': ['dtap1', FLU_ID] })
{
  const a = setDone({}, '2026-09-22', ['dtap1', 'x', 'gen1'])
  assert.deepEqual(a, { '2026-09-22': ['dtap1', 'gen1'] })
  assert.deepEqual(setDone(a, '2026-09-22', []), {}, '비면 키를 지움')
  let m = {}
  for (let i = 1; i <= 21; i++) m = setDone(m, `2026-01-${String(i).padStart(2, '0')}`, ['dtap1'])
  assert.equal(Object.keys(m).length, 20)
  assert.ok(!('2026-01-01' in m), '가장 오래된 생일부터 뺀다')
  assert.deepEqual(parseDone(JSON.stringify(m)), m, '저장 왕복')
}

// ── ICS
{
  const b = '2026-09-22'
  const items = [
    ...scheduleFor(b, 'rv1', 'i').map((r) => ({ id: r.id, start: r.start, end: r.end, title: `${r.vax} ${r.n}차, 접종` })),
    ...CHECKUPS.map((c) => { const [start, end] = windowOf(b, c); return { id: c.id, start, end, title: `${c.kind} ${c.n}차` } }),
  ]
  const ev = icsEvents(b, items, '2026-11-25', new Set(['dtap1']), '툴허브')
  assert.ok(!ev.some((e) => e.uid.endsWith('-dtap1')), '완료 제외')
  assert.ok(!ev.some((e) => e.uid.endsWith('-hepb2')), '끝난 칸 제외')
  assert.ok(!ev.some((e) => e.uid.endsWith('-gen1')), '끝난 검진 제외')
  assert.equal(ev.find((e) => e.uid.endsWith('-ipv1'))!.date, '2026-11-25', '기간 안이면 오늘')
  assert.equal(ev.find((e) => e.uid.endsWith('-gen2'))!.date, '2027-01-22', '검진 시작일')
  const ics = buildIcs(ev, '2026-11-25')
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
  assert.equal(ics.split('BEGIN:VEVENT').length - 1, ev.length)
  assert.equal(ics.split('END:VEVENT').length - 1, ev.length)
  assert.ok(ics.includes('UID:baby-vaccination-2026-09-22-ipv1@toolhub.ai.kr'))
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20270122\r\nDTEND;VALUE=DATE:20270123'), '하루 종일')
  assert.ok(ics.includes('SUMMARY:ipv 1차\\, 접종'), '쉼표 이스케이프')
  assert.ok(ics.includes('TRIGGER:-P1D'))
  const enc = new TextEncoder()
  for (const line of ics.split('\r\n')) assert.ok(enc.encode(line).length <= 75, `75옥텟: ${line}`)
}

console.log('check-baby-vaccination: ok')
