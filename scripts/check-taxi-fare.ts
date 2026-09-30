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
eq('deluxe no night', nightRateFor(0, getSchedule('seoul', 'deluxe')), 0)
// 심야 40% + 시외 20% 합산 = 1.6배
const f = computeFare(5, 15, 0, 'seoul', 'regular', true)
eq('night+out', f.total, 8300 + Math.floor(8300 * 0.4) + Math.floor(8300 * 0.2))
eq('negative km', computeFare(-3, 0, 14, 'seoul', 'regular', false).total, 4800)
eq('estimate 5km normal', estimateMinutes(5, 'normal'), 15)
eq('estimate 0km', estimateMinutes(0, 'normal'), 0)
eq('split 3', perPerson(10000, 3), 3340)
eq('split 0', perPerson(8300, 0), 8300)

console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
