// 타이머 회귀 체크: node scripts/check-timer.ts
import { IDLE, start, left, pause, resume, addTime, SW_IDLE, elapsed, swToggle, swLap, lapStats, lapsCsv, formatClock, hmsToSec, parseQuery, shareQuery, MAX_SEC } from '../src/utils/timer.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// 포맷: 카운트다운은 올림(시작 05:00, 끝나는 순간 00:00), 스톱워치는 내림 + cs
eq(formatClock(300000, { down: true }), '05:00', '5분 시작')
eq(formatClock(299001, { down: true }), '05:00', '4:59.001 → 05:00 (올림)')
eq(formatClock(299000, { down: true }), '04:59', '정확히 4:59')
eq(formatClock(1, { down: true }), '00:01', '1ms 남음 = 00:01')
eq(formatClock(0, { down: true }), '00:00', '0')
eq(formatClock(3600000), '01:00:00', '1시간 → hh 표시')
eq(formatClock(3723456, { cs: true }), '01:02:03.45', 'hh:mm:ss.cs')
eq(formatClock(61999, { cs: true }), '01:01.99', 'mm:ss.cs 내림')
eq(formatClock(-5), '00:00', '음수 방지')

// 카운트다운: 시작 시각 기준 → 틱이 몇 번 왔든 남은 시간은 now로만 결정 (드리프트 없음)
const c0 = start(600000, 1000)
eq(left(c0, 1000), 600000, '시작 직후')
eq(left(c0, 1000 + 7 * 60000), 180000, '백그라운드 7분 뒤 바로 3분')
eq(left(c0, 1000 + 999999), 0, '지나도 0')
const p = pause(c0, 61000) // 1분 뒤 정지
eq([p.status, left(p, 999999)], ['paused', 540000], '정지 중엔 그대로')
const r = resume(p, 100000)
eq([r.endAt, left(r, 100000)], [640000, 540000], '재개 = 남은 시간 이어서')
eq(left(addTime(r, 60000, 100000), 100000), 600000, '+1분 (실행 중)')
eq(addTime(r, 60000, 100000).durationMs, 660000, '+1분 진행률 분모')
eq(left(addTime(p, 60000, 0), 0), 600000, '+1분 (정지 중)')
eq(addTime({ ...c0, status: 'done' }, 60000, 5000), start(60000, 5000), '끝난 뒤 +1분 = 1분 새로 시작')
eq(addTime(IDLE, 60000, 0), IDLE, 'idle은 그대로')
eq(resume(c0, 5), c0, 'running resume 무시')

// 스톱워치
let sw = swToggle(SW_IDLE, 0) // 0에 시작
sw = swLap(sw, 10000) // 10초
sw = swLap(sw, 18000) // +8초
sw = swToggle(sw, 20000) // 정지 20초
eq(elapsed(sw, 99999), 20000, '정지 중 고정')
sw = swToggle(sw, 50000) // 30초 쉬고 재개
sw = swLap(sw, 62000) // 누적 32초, 랩 14초
eq(elapsed(sw, 62000), 32000, '쉰 시간 제외')
eq(swLap(swToggle(sw, 70000), 80000).laps.length, 3, '정지 중 랩 무시')
const st = lapStats(sw.laps)
eq([st.splits, st.fastest, st.slowest, Math.round(st.average)], [[10000, 8000, 14000], 1, 2, 10667], '랩 간격·최고·최저·평균')
eq(lapStats([5000]).fastest, -1, '랩 1개면 최고/최저 없음')
eq(lapStats([]).average, 0, '랩 없음')
eq(lapsCsv([1500, 4000], ['lap', 'split', 'total']), 'lap,split,total\n1,00:01.50,00:01.50\n2,00:02.50,00:04.00', 'CSV')

// 입력
eq(hmsToSec('1', '30', '0'), 5400, '1:30:00')
eq(hmsToSec('', '90', ''), 5400, '90분 = 1:30')
eq(hmsToSec('-3', 'abc', '5'), 5, '이상한 값 0')
eq(hmsToSec(200, 0, 0), MAX_SEC, '최대 99:59:59')

// URL
eq(parseQuery('?m=10'), { sec: 600, mode: 'timer' }, '?m=10')
eq(parseQuery('?t=90'), { sec: 90, mode: 'timer' }, '?t=90')
eq(parseQuery('?m=1.5'), { sec: 90, mode: 'timer' }, '?m=1.5')
eq(parseQuery('?t=90&m=10'), { sec: 90, mode: 'timer' }, 't 우선')
eq(parseQuery('?t=0'), { sec: null, mode: null }, '0초 무시')
eq(parseQuery('?t=abc'), { sec: null, mode: null }, '숫자 아님')
eq(parseQuery('?t=9999999').sec, MAX_SEC, '상한')
eq(parseQuery('?mode=stopwatch'), { sec: null, mode: 'stopwatch' }, '스톱워치 링크')
eq(parseQuery(''), { sec: null, mode: null }, '파라미터 없음')
eq([shareQuery(600), shareQuery(90)], ['m=10', 't=90'], '공유 쿼리')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-timer: all passed')
