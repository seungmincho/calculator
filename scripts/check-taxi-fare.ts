// 택시 요금 회귀 체크: node scripts/check-taxi-fare.ts
import { computeFare, nightRateFor, getSchedule, estimateMinutes, perPerson } from '../src/utils/taxiFare.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => { if (got !== want) { fail++; console.log('FAIL', name, got, '!=', want) } }

// 서울 기본거리 이내: 기본요금만
eq('seoul base', computeFare(1.5, 3, 14, 'seoul', 'regular', false).total, 4800)
// 서울 5km/15분 주간: 거리 (3400/131)=25*100=2500, 저속 900-600=300s/30=10*100=1000 → 8300
eq('seoul 5km', computeFare(5, 15, 14, 'seoul', 'regular', false).total, 8300)
// 고속 주행(평균 30km/h 이상)은 시간요금 0
eq('fast no timefare', computeFare(30, 40, 14, 'seoul', 'regular', false).timeFare, 0)
// 서울 심야 구간
const s = getSchedule('seoul', 'regular')
eq('seoul 21h', nightRateFor(21, s), 0)
eq('seoul 22h', nightRateFor(22, s), 0.2)
eq('seoul 23h', nightRateFor(23, s), 0.4)
eq('seoul 1h', nightRateFor(1, s), 0.4)
eq('seoul 2h', nightRateFor(2, s), 0.2)
eq('seoul 4h', nightRateFor(4, s), 0)
eq('gyeonggi 23h', nightRateFor(23, getSchedule('gyeonggi', 'regular')), 0.3)
// 서울 모범·대형: 22~04시 20% 단일 심야할증 (서울시 2023.2.1 요금표)
eq('deluxe night 0h', nightRateFor(0, getSchedule('seoul', 'deluxe')), 0.2)
eq('deluxe 21h', nightRateFor(21, getSchedule('seoul', 'deluxe')), 0)
// 심야 40% + 시외 20% 합산 = 1.6배
const f = computeFare(5, 15, 0, 'seoul', 'regular', true)
eq('night+out', f.total, 8300 + Math.floor(8300 * 0.4) + Math.floor(8300 * 0.2))
eq('negative km', computeFare(-3, 0, 14, 'seoul', 'regular', false).total, 4800)
eq('estimate 5km normal', estimateMinutes(5, 'normal'), 15)
eq('estimate 0km', estimateMinutes(0, 'normal'), 0)
eq('split 3', perPerson(10000, 3), 3340)
eq('split 0', perPerson(8300, 0), 8300)

// ── 2026-10-04 지자체 고시 재검증 ──
// 강원(원주시 2024.8.5): 23~24시 20%, 00~02시 30%, 02~04시 20%
const gw = getSchedule('gangwon', 'regular')
eq('gangwon 23h', nightRateFor(23, gw), 0.2)
eq('gangwon 1h', nightRateFor(1, gw), 0.3)
eq('gangwon 3h', nightRateFor(3, gw), 0.2)
eq('gangwon base', computeFare(1, 2, 14, 'gangwon', 'regular', false).total, 4600)
// 전북(전주시 2023.8.1): 심야 00~04시 20%, 시계외 50%
eq('jeonbuk 23h', nightRateFor(23, getSchedule('jeonbuk', 'regular')), 0)
eq('jeonbuk 0h', nightRateFor(0, getSchedule('jeonbuk', 'regular')), 0.2)
// 경남(창원시 2026.7.1): 4,600원, 22시부터 20%
eq('gyeongnam 22h', nightRateFor(22, getSchedule('gyeongnam', 'regular')), 0.2)
eq('gyeongnam base', computeFare(1, 2, 14, 'gyeongnam', 'regular', false).total, 4600)
// 세종(2024.8.1): 1.5km 4,000원, 97m당 100원, 22시부터 30%
eq('sejong 2km', computeFare(2, 2, 14, 'sejong', 'regular', false).distanceFare, 500)
eq('sejong 22h', nightRateFor(22, getSchedule('sejong', 'regular')), 0.3)
// 제주(2024.7.1): 20km 초과 126m당 120원 — 30km 고속: 222단위 중 80단위가 장거리 → 22,200 + 80×20
const jj = computeFare(30, 40, 14, 'jeju', 'regular', false)
eq('jeju 30km distance', jj.distanceFare, 23800)
eq('jeju 30km total', jj.total, 28100)
eq('jeju 10km no long', computeFare(10, 15, 14, 'jeju', 'regular', false).distanceFare, Math.floor(8000 / 126) * 100)
eq('jeju deluxe no long', getSchedule('jeju', 'deluxe').longFrom, undefined)
// 광역시 (2026-10-04 시청 고시·보도자료)
eq('incheon 2km', computeFare(2, 3, 14, 'incheon', 'regular', false).distanceFare, Math.floor(400 / 135) * 100)
eq('busan 23h', nightRateFor(23, getSchedule('busan', 'regular')), 0.2)
eq('busan 1h', nightRateFor(1, getSchedule('busan', 'regular')), 0.3)
eq('daegu 1h', nightRateFor(1, getSchedule('daegu', 'regular')), 0.3)
eq('daegu out', getSchedule('daegu', 'regular').outRate, 0.35)
eq('gwangju base', computeFare(1.7, 3, 14, 'gwangju', 'regular', false).total, 4800)
eq('ulsan base', computeFare(2, 3, 14, 'ulsan', 'regular', false).total, 4500)
eq('ulsan 22h', nightRateFor(22, getSchedule('ulsan', 'regular')), 0.2)
// 대전 2026.3.16: 00~02시 30%, 심야+시계외 복합 50% 상한
const dj = computeFare(5, 10, 1, 'daejeon', 'regular', true)
eq('daejeon 1h night', dj.nightRate, 0.3)
eq('daejeon combo 50', dj.nightRate + dj.outRate, 0.5)
// 모범·대형 지역 요금: 부산 7,500원, 광주 5,400원/1.7km, 경기 시계외 없음
eq('busan deluxe base', getSchedule('busan', 'deluxe').base, 7500)
eq('gwangju deluxe base', computeFare(1.7, 3, 14, 'gwangju', 'deluxe', false).total, 5400)
eq('gyeonggi deluxe out', getSchedule('gyeonggi', 'jumbo').outRate, 0)
eq('seoul deluxe out', getSchedule('seoul', 'deluxe').outRate, 0.2)
// 전남(여수·나주): 심야 20% + 시계외 35% 중복 시 40% 상한 → 시계외 실효 20%
const jn = computeFare(5, 10, 1, 'jeonnam', 'regular', true)
eq('jeonnam night', jn.nightRate, 0.2)
eq('jeonnam combo cap', jn.outRate, 0.2)
eq('jeonnam day out', computeFare(5, 10, 14, 'jeonnam', 'regular', true).outRate, 0.35)

console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
