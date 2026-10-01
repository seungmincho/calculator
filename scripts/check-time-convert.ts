// 시간 변환 회귀 체크: node scripts/check-time-convert.ts
import {
  wallToUtc, parseEpoch, formatAll, relative, addTime, diffTime, parseAny, businessDaysBetween, tzAbbr, parseWallInput,
} from '../src/utils/timeConvert.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const U = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s)
const iso = (ms: number) => new Date(ms).toISOString()
const W = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => ({ y, mo, d, h, mi, s })
const NY = 'America/New_York', SEL = 'Asia/Seoul', SYD = 'Australia/Sydney'

// 벽시계 → UTC (서머타임 경계)
eq(wallToUtc(SEL, W(2026, 10, 1, 12)), { ms: U(2026, 10, 1, 3), status: 'ok' }, '서울 정오')
eq(wallToUtc(NY, W(2026, 3, 8, 1, 59)), { ms: U(2026, 3, 8, 6, 59), status: 'ok' }, 'NY DST 직전 EST')
eq(wallToUtc(NY, W(2026, 3, 8, 3, 0)), { ms: U(2026, 3, 8, 7, 0), status: 'ok' }, 'NY DST 직후 EDT')
eq(wallToUtc(NY, W(2026, 3, 8, 2, 30)), { ms: U(2026, 3, 8, 7, 30), status: 'gap' }, 'NY 02:30 없는 시각 → 03:30 EDT')
eq(wallToUtc(NY, W(2026, 11, 1, 1, 30)), { ms: U(2026, 11, 1, 5, 30), status: 'ambiguous' }, 'NY 01:30 두 번 → 앞(EDT)')
eq(wallToUtc(NY, W(2026, 11, 1, 2, 30)), { ms: U(2026, 11, 1, 7, 30), status: 'ok' }, 'NY 종료 후 EST')
eq(wallToUtc(SYD, W(2026, 10, 4, 2, 30)).status, 'gap', '시드니 10/4 02:30 갭')
eq(wallToUtc(SYD, W(2026, 4, 5, 2, 30)).status, 'ambiguous', '시드니 4/5 02:30 중복')
eq(parseWallInput('2026-02-29T10:00'), null, '평년 2/29 거부')
eq(parseWallInput('2028-02-29T10:00'), W(2028, 2, 29, 10), '윤년 2/29')

// 타임스탬프 단위 자동 감지
eq(parseEpoch('1759287600'), { ms: 1759287600000, unit: 's' }, '초')
eq(parseEpoch('1759287600123'), { ms: 1759287600123, unit: 'ms' }, '밀리초')
eq(parseEpoch('1759287600123456'), { ms: 1759287600123, unit: 'us' }, '마이크로초')
eq(parseEpoch('1759287600123456789'), { ms: 1759287600123, unit: 'ns' }, '나노초')
eq(parseEpoch('1759287600.5'), { ms: 1759287600500, unit: 's' }, '소수 초')
eq(parseEpoch('0'), { ms: 0, unit: 's' }, 'epoch 0')
eq(parseEpoch('-86400'), { ms: -86400000, unit: 's' }, '음수')
eq(parseEpoch('12ab'), null, '숫자 아님')

// 출력 형식
const f = formatAll(U(2026, 10, 1, 3), SEL)
eq(f.unixS, '1790823600', 'unix s')
eq(f.isoUtc, '2026-10-01T03:00:00.000Z', 'iso utc')
eq(f.iso, '2026-10-01T12:00:00+09:00', 'iso KST')
eq(f.rfc2822, 'Thu, 01 Oct 2026 12:00:00 +0900', 'rfc2822 KST')
eq(f.sql, '2026-10-01 12:00:00', 'sql')
eq(formatAll(U(2026, 7, 1, 16, 0, 0) + 250, NY).iso, '2026-07-01T12:00:00.250-04:00', 'iso NY EDT ms')
eq(formatAll(U(2026, 1, 15, 17), 'Asia/Kolkata').iso, '2026-01-15T22:30:00+05:30', 'iso 인도 +05:30')
eq(tzAbbr(NY, U(2026, 7, 1)), 'EDT', 'EDT 약어')
eq(tzAbbr(SEL, U(2026, 7, 1)), '', '서울 약어 없음')

// 상대 시간
const now = U(2026, 10, 1, 3)
eq(relative(now - 3 * 3600000 - 50 * 60000, now, 'ko-KR'), '3시간 전', '3시간 전(버림)')
eq(relative(now + 2 * 86400000, now, 'ko-KR'), '모레', '모레')
eq(relative(now + 5 * 86400000, now, 'ko-KR'), '5일 후', '5일 후')
eq(relative(now, now, 'ko-KR'), '지금', '지금')
eq(relative(now - 30 * 60000, now, 'en-US'), '30 minutes ago', 'en')

// 날짜 더하기 (달력 기준, DST·윤년)
eq(iso(addTime(U(2026, 3, 7, 17), NY, 1, 'd')), '2026-03-08T16:00:00.000Z', 'NY 3/7 12:00 +1일 = 23시간 후')
eq(iso(addTime(U(2026, 3, 7, 17), NY, 24, 'h')), '2026-03-08T17:00:00.000Z', 'NY +24시간 = 13:00 EDT')
eq(iso(addTime(U(2024, 1, 31, 3), SEL, 1, 'mo')), '2024-02-29T03:00:00.000Z', '1/31 +1개월 = 윤년 2/29')
eq(iso(addTime(U(2025, 1, 31, 3), SEL, 1, 'mo')), '2025-02-28T03:00:00.000Z', '1/31 +1개월 = 평년 2/28')
eq(iso(addTime(U(2028, 2, 29, 3), SEL, 1, 'y')), '2029-02-28T03:00:00.000Z', '2/29 +1년')
eq(iso(addTime(U(2026, 3, 31, 3), SEL, -1, 'mo')), '2026-02-28T03:00:00.000Z', '3/31 -1개월')
eq(iso(addTime(U(2026, 1, 15, 3), SEL, -13, 'mo')), '2024-12-15T03:00:00.000Z', '-13개월 연 넘김')
// 2026 추석 9/24~26(목~토) + 개천절 10/3(토)→10/5 대체 + 한글날 10/9(금)
eq(iso(addTime(U(2026, 9, 23, 3), SEL, 1, 'bd')), '2026-09-28T03:00:00.000Z', '추석 연휴 뒤 첫 영업일')
eq(iso(addTime(U(2026, 10, 2, 3), SEL, 1, 'bd')), '2026-10-06T03:00:00.000Z', '개천절 대체공휴일 건너뜀')
eq(iso(addTime(U(2026, 9, 28, 3), SEL, -1, 'bd')), '2026-09-23T03:00:00.000Z', '영업일 빼기')

// 차이
const d = diffTime(U(2026, 3, 7, 17), U(2026, 3, 8, 16), NY)
eq([d.sign, d.days, d.hours, d.calendarDays], [1, 0, 23, 1], 'DST 날: 23시간이지만 달력 1일')
const d2 = diffTime(U(2024, 2, 28, 3), U(2024, 3, 1, 3), SEL)
eq([d2.days, d2.calendarDays], [2, 2], '윤년 2/28→3/1 = 2일')
const d3 = diffTime(U(2026, 10, 1, 3, 0, 5), U(2026, 9, 30, 1, 58, 0), SEL)
eq([d3.sign, d3.days, d3.hours, d3.minutes, d3.seconds, d3.totalSeconds], [-1, 1, 1, 2, 5, 90125], '음수 차이 분해')
const di = (y: number, m: number, dd: number) => Date.UTC(y, m - 1, dd) / 86400000
eq(businessDaysBetween(di(2026, 9, 21), di(2026, 10, 2)), 7, '9/22~10/2 영업일 (추석 3일 제외)')
eq(businessDaysBetween(di(2026, 10, 2), di(2026, 9, 21)), -7, '역방향 음수')

// 붙여넣기 파싱
eq(parseAny('2026-10-01T12:00:00Z', SEL, now), { ms: U(2026, 10, 1, 12), kind: 'iso' }, 'ISO Z')
eq(parseAny('2026-10-01T12:00:00.5+09:00', NY, now), { ms: U(2026, 10, 1, 3) + 500, kind: 'iso' }, 'ISO 오프셋+소수')
eq(parseAny('2026-10-01 12:00', SEL, now), { ms: U(2026, 10, 1, 3), kind: 'wall', status: 'ok' }, '오프셋 없음 → 서울 벽시계')
eq(parseAny('2026-03-08 02:30', NY, now)?.status, 'gap', '붙여넣기 갭 감지')
eq(parseAny('2026.10.01', SEL, now)?.ms, U(2026, 9, 30, 15), '점 표기 날짜')
eq(parseAny('1759320000', SEL, now), { ms: 1759320000000, kind: 'epoch', unit: 's' }, '타임스탬프')
eq(parseAny('[INFO] ts=1759287600123 user=1', SEL, now)?.ms, 1759287600123, '로그 속 타임스탬프')
eq(parseAny('2026년 10월 1일 (목) 오후 3시 30분', SEL, now)?.ms, U(2026, 10, 1, 6, 30), '한국어 날짜')
eq(parseAny('2026년 10월 1일 오전 12시', SEL, now)?.ms, U(2026, 9, 30, 15), '오전 12시 = 0시')
eq(parseAny('10/01/2026 3:00 PM', NY, now)?.ms, U(2026, 10, 1, 19), '미국식 PM, NY')
eq(parseAny('Thu, 01 Oct 2026 12:00:00 +0900', NY, now)?.ms, U(2026, 10, 1, 3), 'RFC 2822')
eq(parseAny('Oct 1, 2026 09:00 PDT', SEL, now)?.ms, U(2026, 10, 1, 16), '영문 + PDT')
eq(parseAny('Oct 1, 2026 09:00', SEL, now)?.ms, U(2026, 10, 1, 0), '영문 시간대 없음 → 서울')
eq(parseAny('2026-10-01 12:00 KST', NY, now)?.ms, U(2026, 10, 1, 3), 'KST 표기')
eq(parseAny('지금', SEL, now)?.ms, now, '지금')
eq(parseAny('내일', NY, U(2026, 3, 7, 17))?.ms, U(2026, 3, 8, 16), '내일(달력 기준)')
eq(parseAny('2026-13-01', SEL, now), null, '잘못된 월')
eq(parseAny('hello', SEL, now), null, '파싱 불가')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('time-convert OK')
