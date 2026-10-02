// 배란일 계산 회귀 체크: node scripts/check-ovulation.ts
import { cycleFrom, currentStart, forecast, cycleStats, rangeWindow, dayType, buildIcs } from '../src/utils/ovulation.ts'
import { dueDate } from '../src/utils/dueDate.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const base = { cycle: 28, period: 5, luteal: 14 }

// 28일 주기: 다음 생리 3/1 → 배란 = 3/1 − 14 = 2/15, 가임기 2/10~2/16, 최고 2/13~2/15
const c = cycleFrom('2026-02-01', base)
eq([c.nextStart, c.ovulation, c.fertileStart, c.fertileEnd, c.peakStart, c.periodEnd],
  ['2026-03-01', '2026-02-15', '2026-02-10', '2026-02-16', '2026-02-13', '2026-02-05'], '28일 주기')
// 35일 주기·황체기 12일: 다음 생리 +35, 배란 = 그 12일 전
const c35 = cycleFrom('2026-01-01', { cycle: 35, period: 5, luteal: 12 })
eq([c35.nextStart, c35.ovulation], ['2026-02-05', '2026-01-24'], '35일·황체기 12')
// 윤년 2/29 넘김
eq(cycleFrom('2028-02-10', base).nextStart, '2028-03-09', '윤년')

// 현재 주기: 마지막 생리 1/1, 오늘 2/20 → 1/29 시작 주기 / 오늘 = 시작일이면 그날 / 미래면 그대로
const s = { lastPeriod: '2026-01-01', ...base }
eq(currentStart(s, '2026-02-20'), '2026-01-29', '현재 주기')
eq(currentStart(s, '2026-01-29'), '2026-01-29', '주기 첫날')
eq(currentStart(s, '2025-12-20'), '2026-01-01', '미래 입력')
const f = forecast(s, '2026-02-20', '2026-04-30')
eq(f.map(x => x.start), ['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26', '2026-04-23'], '예측 목록(직전 주기 포함)')

// 기록 → 평균·최단·최장, 범위 밖(60일 = 기록 누락) 제외, 중복·정렬 무관
const st = cycleStats(['2026-03-29', '2026-01-01', '2026-01-27', '2026-03-01', '2026-03-01', '2026-05-28'])
eq(st && [st.lengths, st.avg, st.min, st.max, st.excluded, st.irregular], [[26, 33, 28], 29, 26, 33, 1, false], '통계')
eq(cycleStats(['2026-01-01', '2026-01-25', '2026-03-01'])?.irregular, true, '24·35일 → 불규칙(차이 11)')
eq(cycleStats(['2026-01-01']), null, '기록 1개 → null')

// 불규칙 범위: 황체기 14면 오기노식(최단−18 ~ 최장−11 일차). 26~32일 → 8일차~21일차
const r = rangeWindow('2026-01-01', 26, 32, 14)
eq([r.start, r.end], ['2026-01-08', '2026-01-21'], '오기노 범위')

// 달력 분류
eq(['2026-02-01', '2026-02-12', '2026-02-13', '2026-02-15', '2026-02-16', '2026-02-20'].map(d => dayType(d, [c])),
  ['period', 'fertile', 'peak', 'ovulation', 'fertile', null], '날짜 분류')
eq(dayType('2026-02-20', [c], [{ start: '2026-02-18', end: '2026-02-21' }]), 'range', '범위 표시')

// 이번 주기 임신 시 출산 예정일 = 배란(수정)일 + 266 = 28일 주기면 LMP + 280
eq(dueDate({ method: 'conception', date: c.ovulation }), dueDate({ method: 'lmp', date: c.start }), '출산 예정일 일치')

// ICS: 종일 여러 날(DTEND 배타적), CRLF
const ics = buildIcs([{ uid: 'f1', start: '2026-02-10', end: '2026-02-16', title: '가임기' }], '2026-02-01')
eq(ics.includes('DTSTART;VALUE=DATE:20260210\r\nDTEND;VALUE=DATE:20260217'), true, 'ICS 기간')
eq(ics.endsWith('END:VCALENDAR\r\n'), true, 'ICS 끝')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-ovulation: all passed')
