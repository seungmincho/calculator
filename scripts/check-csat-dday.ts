// 수능 D-day 회귀 체크: node scripts/check-csat-dday.ts
import {
  kstParts, kstToMs, toMin, fmtMin, slotAt, countdown, timelineStatus, TIMELINE, progress,
  isShortAnswer, cleanAnswer, SCHEDULE, INQ_DETAIL,
} from '../src/utils/csatDday.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// KST 변환: UTC 2026-11-18 23:40 = KST 11-19 08:40
eq(kstParts(Date.UTC(2026, 10, 18, 23, 40, 5)), { date: '2026-11-19', min: 520, sec: 5 }, 'UTC→KST 날짜 넘김')
eq(kstParts(Date.UTC(2026, 10, 19, 14, 59)).date, '2026-11-19', 'KST 23:59')
eq(kstParts(Date.UTC(2026, 10, 19, 15, 0)).date, '2026-11-20', 'KST 자정')
eq(kstToMs('2026-11-19', '08:40'), Date.UTC(2026, 10, 18, 23, 40), 'KST→UTC')
eq(fmtMin(toMin('16:37')), '16:37', 'fmtMin 왕복')
eq(fmtMin(24 * 60 + 5), '00:05', 'fmtMin 자정 넘김')

// 교시 경계: 시작 포함·종료 제외
eq(slotAt(toMin('08:10')), { type: 'next', idx: 1, left: 30 }, '입실 직후 → 1교시 30분 전')
eq(slotAt(toMin('08:40')), { type: 'now', idx: 1, left: 80 }, '08:40 국어 시작')
eq(slotAt(toMin('09:59')), { type: 'now', idx: 1, left: 1 }, '09:59 국어 1분 남음')
eq(slotAt(toMin('10:00')), { type: 'next', idx: 2, left: 30 }, '10:00 국어 종료 → 수학 대기')
eq(slotAt(toMin('12:30')), { type: 'now', idx: 3, left: 30 }, '점심')
eq(slotAt(toMin('16:36')), { type: 'now', idx: 5, left: 1 }, '16:36 탐구')
eq(slotAt(toMin('16:37')), { type: 'next', idx: 6, left: 28 }, '16:37 탐구 종료')
eq(slotAt(toMin('17:45')), { type: 'done' }, '17:45 종료')
eq(slotAt(toMin('15:25'), INQ_DETAIL).type, 'now', '4교시 세부 교체 시간')
// 교시 길이
eq(SCHEDULE.filter((s) => s.exam).map((s) => toMin(s.end!) - toMin(s.start)), [80, 100, 70, 107, 40], '교시별 분')

// 카운트다운
const c1 = countdown(kstToMs('2026-10-01', '09:00'))
eq([c1.phase, c1.dday], ['before', 49], '2026-10-01 → D-49')
eq(countdown(kstToMs('2026-11-18', '08:40')), { phase: 'before', dday: 1, d: 1, h: 0, m: 0, s: 0 }, '전날 같은 시각 = 1일')
eq(countdown(kstToMs('2026-11-19', '08:39') + 59_000).s, 1, '1초 전')
eq(countdown(kstToMs('2026-11-19', '08:40')).phase, 'during', '08:40 진행 중')
eq(countdown(kstToMs('2026-11-19', '17:44')).phase, 'during', '17:44 진행 중')
eq(countdown(kstToMs('2026-11-19', '17:45')).phase, 'after', '17:45 종료')
eq(countdown(kstToMs('2026-11-20', '00:00')).dday, -1, '다음 날 D+1')

// 일정 상태
const reg = TIMELINE.find((x) => x.key === 'susiReg')!
eq(timelineStatus(reg, '2026-12-20'), 'future', '등록 전')
eq(timelineStatus(reg, '2026-12-22'), 'now', '등록 중')
eq(timelineStatus(reg, '2026-12-24'), 'past', '등록 후')
eq(timelineStatus(TIMELINE[0], '2026-11-19'), 'now', '수능 당일')

eq(progress({ a: true, b: false, c: true }, ['a', 'b', 'c', 'd']), { done: 2, total: 4 }, '체크리스트 진행')

// 가채점표
eq([15, 16, 22, 23, 28, 29, 30].map((q) => isShortAnswer('math', q)), [false, true, true, false, false, true, true], '수학 단답형')
eq(isShortAnswer('kor', 16), false, '국어 단답 없음')
eq(cleanAnswer('kor', 1, '6'), '', '선다형 6 거부')
eq(cleanAnswer('kor', 1, '34'), '4', '선다형 마지막 숫자')
eq(cleanAnswer('math', 21, '1024'), '102', '단답 3자리')
eq(cleanAnswer('math', 22, '07a'), '07', '단답 숫자만')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('csat-dday ok')
