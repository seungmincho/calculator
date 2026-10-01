// 이사 비용 회귀 체크: node scripts/check-moving-cost.ts
import { estimate, sizeTier, monthDays, dayInfo, quoteStats, addDays, isSonEomneun, CHECKLIST_OFFSETS, type MoveInput } from '../src/utils/movingCost.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const base: MoveInput = {
  pyeong: 20, type: 'full', km: 10,
  from: { floor: 3, access: 'elevator' }, to: { floor: 5, access: 'elevator' },
  storageDays: 0, ac: 0, piano: 'none', clean: false, waste: 0,
}
const line = (r: ReturnType<typeof estimate>, key: string) => r.lines.find(l => l.key === key)!.r

// 기본: 20평 포장, 시내, 엘리베이터, 날짜 없음
const r0 = estimate(base)
eq(r0.ton, '5t', '20평 = 5톤')
eq(r0.total, { min: 140, typ: 180, max: 230 }, '20평 포장 기본')
eq(estimate({ ...base, type: 'semi' }).total, { min: 91, typ: 130, max: 184 }, '반포장 비율')
eq(estimate({ ...base, pyeong: 6, type: 'truck' }).total, { min: 11, typ: 18, max: 32 }, '원룸 용달')
eq(estimate({ ...base, pyeong: 20, type: 'truck' }).warnings, ['truckLarge'], '용달 대형 경고')

// 구간 경계
eq(sizeTier(8).ton, '1t', '8평 1톤')
eq(sizeTier(8.1).ton, '2.5t', '8.1평 2.5톤')
eq(sizeTier(60).base, { min: 380, typ: 470, max: 600 }, '55평 초과 평당 가산')

// 층·사다리차·거리
eq(line(estimate({ ...base, from: { floor: 5, access: 'stairs' } }), 'access'), { min: 9, typ: 14, max: 23 }, '계단 5층 (3층분 × vf1.5)')
eq(line(estimate({ ...base, from: { floor: 2, access: 'stairs' } }), 'access'), { min: 0, typ: 0, max: 0 }, '계단 2층 할증 없음')
eq(line(estimate({ ...base, to: { floor: 12, access: 'ladder' } }), 'access'), { min: 22, typ: 28, max: 35 }, '사다리차 12층')
eq(estimate({ ...base, to: { floor: 6, access: 'stairs' } }).warnings, ['stairsHigh'], '계단 고층 경고')
eq(line(estimate({ ...base, km: 150 }), 'distance'), { min: 42, typ: 60, max: 83 }, '150km 5톤')
eq(line(estimate({ ...base, km: 19.9 }), 'distance'), { min: 0, typ: 0, max: 0 }, '20km 미만 시내')

// 부대비용
eq(line(estimate({ ...base, pyeong: 6, clean: true }), 'clean'), { min: 12, typ: 15, max: 20 }, '입주청소 최소')
eq(line(estimate({ ...base, pyeong: 30, clean: true }), 'clean'), { min: 36, typ: 45, max: 60 }, '입주청소 30평')
const rx = estimate({ ...base, ac: 2, waste: 3 })
eq(rx.extra, { min: 26, typ: 39, max: 56 }, '부대비용 합 (에어컨2+폐기물3)')

// 손없는날: 2026 추석(음 8/15) = 양 9/25, 음 9/1 = 양 10/11 (KASI) → 10월 손없는날 9·10·19·20·29·30일
eq(monthDays(2026, 10).filter(d => d.son).map(d => d.day), [9, 10, 19, 20, 29, 30], '2026-10 손없는날')
eq(dayInfo('2026-10-11')!.lunar, { month: 9, day: 1, isLeap: false }, '음력 9/1')
eq([9, 10, 19, 20, 29, 30, 1, 11, 21].map(isSonEomneun), [true, true, true, true, true, true, false, false, false], '손없는날 규칙')
eq(dayInfo('2026-10-09')!.holiday, 'hangeulDay', '한글날 공휴일')
eq(dayInfo('2026-10-05')!.weekend, true, '개천절 대체공휴일 = 할증일')
eq(monthDays(2026, 10).filter(d => d.monthEnd).map(d => d.day), [29, 30, 31], '월말 3일')
eq(monthDays(2026, 2).length, 28, '2026-02 28일')
eq(dayInfo('2026-02-30'), null, '없는 날짜')

// 수요 할증: 2026-03-14(토, 음 1/26, 성수기) → (1.1·1.05, 1.2·1.1, 1.3·1.2)
const rp = estimate({ ...base, date: '2026-03-14' })
eq(rp.day!.son, false, '3/14 손없는날 아님')
eq(line(rp, 'premium'), { min: 22, typ: 58, max: 129 }, '성수기+주말 할증')
eq(rp.total, { min: 162, typ: 238, max: 359 }, '성수기+주말 합계')
// 부대비용엔 할증 안 붙음
eq(estimate({ ...base, date: '2026-03-14', clean: true }).extra, { min: 24, typ: 30, max: 40 }, '청소는 할증 제외')
eq(dayInfo('2026-06-17')!.factor, { min: 1, typ: 1, max: 1 }, '비수기 평일 (6/17 수, 음 5/3)')

// 견적 비교
eq(quoteStats([150, 0, 210]), { count: 2, min: 150, max: 210, avg: 180, minIdx: 0 }, '견적 통계')
eq(quoteStats([0, NaN]), null, '견적 없음')

eq(addDays('2026-10-31', -30), '2026-10-01', 'D-30')
eq(addDays('2026-12-25', 14), '2027-01-08', 'D+14 연도 넘김')
eq(CHECKLIST_OFFSETS.length, 6, '체크리스트 단계 수')

console.log(fail ? `${fail} FAILED` : 'all passed')
if (fail) process.exit(1)
