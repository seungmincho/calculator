// 음력 변환 회귀 체크: node scripts/check-lunar.ts
// 기대값 출처: 한국천문연구원 음양력/월력요항(astro.kasi.re.kr), 관공서 공휴일(설·부처님오신날·추석)
import { lunarToSolar, solarToLunar, leapMonth, dayGanzi, yearGanzi, lunarAnniversary, nextLunarAnniversary } from '../src/utils/lunarCalendar.ts'
let fail = 0
const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { fail++; console.log('FAIL', label, JSON.stringify(got), '!=', JSON.stringify(want)) }
}
const s = (iso: string) => { const [year, month, day] = iso.split('-').map(Number); return { year, month, day } }

// 설(1/1)·부처님오신날(4/8)·추석(8/15) (2027·2030 추석은 koreanHolidays.ts 표가 틀림 — 9/15, 9/12가 맞음)
const holidays: [number, string, string, string][] = [
  [2024, '2024-02-10', '2024-05-15', '2024-09-17'],
  [2025, '2025-01-29', '2025-05-05', '2025-10-06'],
  [2026, '2026-02-17', '2026-05-24', '2026-09-25'],
  [2027, '2027-02-07', '2027-05-13', '2027-09-15'], // koreanHolidays.ts의 10-15는 오류
  [2028, '2028-01-27', '2028-05-02', '2028-10-03'],
  [2029, '2029-02-13', '2029-05-20', '2029-09-22'],
  [2030, '2030-02-03', '2030-05-09', '2030-09-12'], // koreanHolidays.ts의 10-12는 오류
]
for (const [y, seol, buddha, chuseok] of holidays) {
  eq(`${y} 설`, lunarToSolar(y, 1, 1), s(seol))
  eq(`${y} 부처님오신날`, lunarToSolar(y, 4, 8), s(buddha))
  eq(`${y} 추석`, lunarToSolar(y, 8, 15), s(chuseok))
}
// 윤달 (KASI): 2012 윤3, 2017 윤5, 2020 윤4, 2023 윤2, 2025 윤6, 2028 윤5
eq('윤달', [2012, 2017, 2020, 2023, 2025, 2026, 2028].map(leapMonth), [3, 5, 4, 2, 6, 0, 5])
eq('2025 윤6/1', lunarToSolar(2025, 6, 1, true), s('2025-07-25'))
eq('2028 윤5/1', lunarToSolar(2028, 5, 1, true), s('2028-06-23'))
eq('2028 6/1', lunarToSolar(2028, 6, 1), s('2028-07-22'))
eq('윤달 없는 달', lunarToSolar(2026, 6, 1, true), null)
// 중국 음력과 다른 날: 2026 음력 9/1 = 양력 10/11 (중국 10/10)
eq('2026 9/1', lunarToSolar(2026, 9, 1), s('2026-10-11'))
eq('양→음 2026-10-10', solarToLunar(2026, 10, 10), { year: 2026, month: 8, day: 30, isLeap: false })
eq('양→음 2025-07-25', solarToLunar(2025, 7, 25), { year: 2025, month: 6, day: 1, isLeap: true })
eq('양→음 범위 밖', solarToLunar(2051, 1, 1), null)
// 간지
eq('2026 병오 말', yearGanzi(2026).ganzi + yearGanzi(2026).zodiac, '병오말')
eq('일진 2026-09-30', dayGanzi(s('2026-09-30')), '정미')
// 기념일 관례
eq('윤달 생일 평년', lunarAnniversary(2026, 6, 10, true), { lunarYear: 2026, solar: s('2026-07-23'), leapFallback: true, dayFallback: false })
eq('다음 생일', nextLunarAnniversary(s('2026-09-30'), 1, 1, false)?.solar, s('2027-02-07'))
eq('당일 포함', nextLunarAnniversary(s('2026-09-25'), 8, 15, false)?.solar, s('2026-09-25'))
// 왕복 (1900-01-31 ~ 2050-12-31 전체)
for (let t = Date.UTC(1900, 0, 31); t <= Date.UTC(2050, 11, 31); t += 86400000) {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate()
  const l = solarToLunar(y, m, dd)
  const back = l && lunarToSolar(l.year, l.month, l.day, l.isLeap)
  if (!back || back.year !== y || back.month !== m || back.day !== dd) { fail++; console.log('FAIL roundtrip', y, m, dd, l); break }
}
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
