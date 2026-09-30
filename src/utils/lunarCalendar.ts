// 한국 음력(태음태양력) ↔ 양력 변환 — 한국천문연구원(KASI) 역서 기준
//
// 데이터 출처: KASI 음양력 자료(https://astro.kasi.re.kr/life/pageView/8)를 수록한
// korean-lunar-calendar(MIT, https://github.com/usingsky/korean_lunar_calendar_js)의
// 1900~2050 데이터를 아래 형식으로 재인코딩. (예전 테이블은 중국 음력(UTC+8) 기반이라
// 합삭 시각이 자정 전후인 달이 하루씩 어긋났음 — 예: 2026 음력 9/1 = 양력 10/11(한국), 10/10(중국))
// 검증: scripts/check-lunar.ts
//
// 인코딩(연도별 1값): bit0-3 = 윤달 월(0=없음), bit(16-m) = m월 대월(30일) 여부, bit16 = 윤달 대월 여부
const LUNAR_DATA = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x0da95, 0x0b550, 0x056a0, 0x0ada2, 0x095d0, 0x04bb7, // 1910-1919
  0x049b0, 0x0a4b0, 0x0b4b5, 0x06a90, 0x0ad40, 0x0bb54, 0x02b60, 0x095b0, 0x05372, 0x04970, // 1920-1929
  0x06566, 0x0e4a0, 0x0ea50, 0x16a95, 0x05b50, 0x02b60, 0x18ae3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b690, 0x056d0, 0x125b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0d557, // 1940-1949
  0x0b4a0, 0x0b550, 0x15555, 0x04db0, 0x025b0, 0x18573, 0x052b0, 0x0a9b8, 0x06950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05270, 0x07263, 0x0d950, 0x06b57, 0x056a0, // 1960-1969
  0x09ad0, 0x04dd5, 0x04ae0, 0x0a4e0, 0x0d4d4, 0x0d250, 0x0d598, 0x0b540, 0x0d6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a9b4, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0b756, 0x02b60, 0x095b0, // 1980-1989
  0x04b75, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06d98, 0x05ad0, 0x02b60, 0x096e5, 0x092e0, // 1990-1999
  0x0c960, 0x0e954, 0x0d4a0, 0x0da50, 0x07552, 0x056c0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x1b4a3, 0x0b550, 0x055d9, 0x04ba0, 0x0a5b0, 0x05575, 0x052b0, 0x0a950, // 2010-2019
  0x0b954, 0x06aa0, 0x0ad50, 0x06b52, 0x04b60, 0x0a6e6, 0x0a570, 0x05270, 0x06a65, 0x0d930, // 2020-2029
  0x05aa0, 0x0b6a3, 0x096d0, 0x04afb, 0x04ae0, 0x0a4d0, 0x1d0d6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b6a0, 0x096d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0b250, 0x1b255, 0x06d40, 0x0ada0, // 2040-2049
  0x18b63, // 2050
]

export const MIN_YEAR = 1900
export const MAX_YEAR = 2050
const DAY = 86400000
const BASE = Date.UTC(1900, 0, 31) // 음력 1900-01-01
const MAX_SOLAR = Date.UTC(2050, 11, 31) // KASI 공개 범위 끝

export interface SolarDate { year: number; month: number; day: number }
export interface LunarDate extends SolarDate { isLeap: boolean }

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']
const ZODIAC_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig']

const inRange = (y: number) => Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR

export function leapMonth(year: number): number {
  return inRange(year) ? LUNAR_DATA[year - MIN_YEAR] & 0xf : 0
}

export function lunarMonthDays(year: number, month: number, isLeap = false): number {
  const d = LUNAR_DATA[year - MIN_YEAR]
  if (isLeap) return d & 0x10000 ? 30 : 29
  return d & (0x10000 >> month) ? 30 : 29
}

function lunarYearDays(year: number): number {
  let days = 0
  for (let m = 1; m <= 12; m++) days += lunarMonthDays(year, m)
  return days + (leapMonth(year) ? lunarMonthDays(year, 0, true) : 0)
}

const toUTC = (s: SolarDate) => Date.UTC(s.year, s.month - 1, s.day)
const fromUTC = (t: number): SolarDate => {
  const d = new Date(t)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

export function isValidLunar(y: number, m: number, d: number, isLeap: boolean): boolean {
  if (!inRange(y) || m < 1 || m > 12 || d < 1) return false
  if (isLeap && leapMonth(y) !== m) return false
  return d <= lunarMonthDays(y, m, isLeap)
}

/** 음력 → 양력. 존재하지 않는 날짜(윤달 없음, 30일 없음)나 범위 밖이면 null */
export function lunarToSolar(y: number, m: number, d: number, isLeap = false): SolarDate | null {
  if (!isValidLunar(y, m, d, isLeap)) return null
  let offset = 0
  for (let yy = MIN_YEAR; yy < y; yy++) offset += lunarYearDays(yy)
  const leap = leapMonth(y)
  for (let mm = 1; mm < m; mm++) {
    offset += lunarMonthDays(y, mm)
    if (leap === mm) offset += lunarMonthDays(y, mm, true)
  }
  if (isLeap) offset += lunarMonthDays(y, m) // 윤달은 같은 달 평달 다음
  const t = BASE + (offset + d - 1) * DAY
  return t > MAX_SOLAR ? null : fromUTC(t)
}

/** 양력 → 음력. 범위(1900-01-31 ~ 2050-12-31) 밖이면 null */
export function solarToLunar(y: number, m: number, d: number): LunarDate | null {
  const t = Date.UTC(y, m - 1, d)
  const check = new Date(t)
  if (check.getUTCMonth() !== m - 1 || t < BASE || t > MAX_SOLAR) return null
  let rest = Math.round((t - BASE) / DAY)
  let year = MIN_YEAR
  while (rest >= lunarYearDays(year)) rest -= lunarYearDays(year++)
  const leap = leapMonth(year)
  for (let month = 1; month <= 12; month++) {
    const md = lunarMonthDays(year, month)
    if (rest < md) return { year, month, day: rest + 1, isLeap: false }
    rest -= md
    if (leap === month) {
      const ld = lunarMonthDays(year, month, true)
      if (rest < ld) return { year, month, day: rest + 1, isLeap: true }
      rest -= ld
    }
  }
  return null
}

/** 음력 연도 간지·띠 (설날 기준. 사주에서 쓰는 입춘 기준과 1~2월 사이 다를 수 있음) */
export function yearGanzi(lunarYear: number) {
  const i = (((lunarYear - 4) % 60) + 60) % 60
  return { ganzi: STEMS[i % 10] + BRANCHES[i % 12], zodiac: ZODIAC[i % 12], zodiacEn: ZODIAC_EN[i % 12] }
}

/** 일진(日辰). 1900-01-31 = 갑진일(60갑자 index 40) */
export function dayGanzi(s: SolarDate): string {
  const i = (((Math.round((toUTC(s) - BASE) / DAY) + 40) % 60) + 60) % 60
  return STEMS[i % 10] + BRANCHES[i % 12]
}

export function weekday(s: SolarDate): number {
  return new Date(toUTC(s)).getUTCDay()
}

export interface Occurrence {
  lunarYear: number
  solar: SolarDate
  /** 윤달 생일인데 그 해 윤달이 없어 평달로 계산 */
  leapFallback: boolean
  /** 30일 생일인데 그 해 그 달이 29일(작은달)이라 29일로 계산 */
  dayFallback: boolean
}

/**
 * 음력 기념일(생일·제사)의 해당 음력 연도 양력 날짜.
 * 관례: 윤달 생일은 윤달이 없는 해엔 평달 같은 날, 30일 생일은 작은달이면 29일.
 */
export function lunarAnniversary(lunarYear: number, m: number, d: number, isLeap: boolean): Occurrence | null {
  if (!inRange(lunarYear)) return null
  const useLeap = isLeap && leapMonth(lunarYear) === m
  const max = lunarMonthDays(lunarYear, m, useLeap)
  const day = Math.min(d, max)
  const solar = lunarToSolar(lunarYear, m, day, useLeap)
  return solar && { lunarYear, solar, leapFallback: isLeap && !useLeap, dayFallback: day !== d }
}

/** 기준일(포함) 이후 처음 오는 음력 기념일 */
export function nextLunarAnniversary(from: SolarDate, m: number, d: number, isLeap: boolean): Occurrence | null {
  const base = toUTC(from)
  for (let y = from.year - 1; y <= from.year + 1; y++) {
    const o = lunarAnniversary(y, m, d, isLeap)
    if (o && toUTC(o.solar) >= base) return o
  }
  return null
}

export function daysBetween(a: SolarDate, b: SolarDate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY)
}
