// 나이표: 출생연도별 만 나이·연 나이·띠·초등 입학 연도. 검증: node scripts/check-age-table.ts
import { lunarToSolar, yearGanzi } from './lunarCalendar.ts'
import { ZODIAC_KEYS } from './age.ts'

export const FIRST_YEAR = 1930
export type ZodiacKey = typeof ZODIAC_KEYS[number]
/** 천간 → 오행 색 (갑을 청, 병정 적, 무기 황, 경신 백, 임계 흑): 2026 병오 = 붉은 말, 2027 정미 = 붉은 양 */
const STEM_COLORS = ['blue', 'blue', 'red', 'red', 'yellow', 'yellow', 'white', 'white', 'black', 'black'] as const
export type StemColor = typeof STEM_COLORS[number]

export function yearInfo(y: number) {
  const g = yearGanzi(y)
  return { year: y, ganzi: g.ganzi, zodiac: g.zodiacEn.toLowerCase() as ZodiacKey, color: STEM_COLORS[(((y - 4) % 10) + 10) % 10] }
}

export interface AgeRow {
  year: number; ganzi: string; zodiac: ZodiacKey; color: StemColor
  /** 해당 연도에 생일이 지난 뒤 만 나이 (생일 전에는 1 적다). 그 해에 태어나지 않았으면 null */
  manNext: number | null; manBase: number | null
  yeonNext: number
  /** 초등학교 입학(3~12월생). 1~2월생은 2002년생까지 한 해 먼저(빠른년생) */
  school: number
}

/** base = 올해, base + 1 = 내년. 최신 연도부터. */
export function ageRows(base: number): AgeRow[] {
  const next = base + 1
  return Array.from({ length: next - FIRST_YEAR + 1 }, (_, i) => {
    const y = next - i, info = yearInfo(y)
    return { ...info, manNext: next - y, manBase: y <= base ? base - y : null, yeonNext: next - y, school: y + 7 }
  })
}

/** 그 해 설날(음력 1월 1일, 양력). 이 날 전에 태어나면 전년도 띠 */
export function seollalOf(year: number): string | null {
  const d = lunarToSolar(year, 1, 1) // 음력표 1900~2050
  return d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null
}
