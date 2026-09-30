export interface KoreanHoliday {
  date: string        // YYYY-MM-DD
  name: string        // Korean name
  nameKey: string     // translation key for holidays section
  isLunar: boolean
}

// Pre-computed lunar holiday dates (lunar->solar conversion)
const LUNAR_HOLIDAYS: Record<number, { seollal: string; buddha: string; chuseok: string }> = {
  2024: { seollal: '2024-02-10', buddha: '2024-05-15', chuseok: '2024-09-17' },
  2025: { seollal: '2025-01-29', buddha: '2025-05-05', chuseok: '2025-10-06' },
  2026: { seollal: '2026-02-17', buddha: '2026-05-24', chuseok: '2026-09-25' },
  2027: { seollal: '2027-02-07', buddha: '2027-05-13', chuseok: '2027-09-15' },
  2028: { seollal: '2028-01-27', buddha: '2028-05-02', chuseok: '2028-10-03' },
  2029: { seollal: '2029-02-13', buddha: '2029-05-20', chuseok: '2029-09-22' },
  2030: { seollal: '2030-02-03', buddha: '2030-05-09', chuseok: '2030-09-12' },
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM-DD' 문자열을 UTC로 다뤄 브라우저 시간대와 무관하게 계산
function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** 0=일 … 6=토 */
function dow(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

// 선거일(공직선거법 제34조, 임기만료 선거) · 임시공휴일(국무회의 지정).
// ponytail: 임시공휴일·재보궐 아닌 조기선거는 지정될 때마다 여기 추가해야 함
const EXTRA: Record<string, { name: string; nameKey: string }> = {
  '2024-04-10': { name: '제22대 국회의원 선거일', nameKey: 'election' },
  '2024-10-01': { name: '국군의 날 임시공휴일', nameKey: 'tempHoliday' },
  '2025-01-27': { name: '임시공휴일', nameKey: 'tempHoliday' },
  '2025-06-03': { name: '제21대 대통령 선거일', nameKey: 'election' },
  '2026-06-03': { name: '제9회 전국동시지방선거일', nameKey: 'election' },
  // 공직선거법 제34조 산정(임기만료일 전 50일 이후 첫 수요일). 법 개정 시 바뀔 수 있음
  '2028-04-12': { name: '제23대 국회의원 선거일', nameKey: 'election' },
}

// 관공서의 공휴일에 관한 규정 제3조 (2026-04-28 개정: 노동절·제헌절 공휴일 + 대체공휴일 대상)
// 토·일 또는 다른 공휴일과 겹치면 대체: 국경일·부처님오신날·어린이날·성탄절·노동절
// 설·추석 연휴: 일요일 또는 다른 공휴일과 겹치면 연휴 다음 첫 평일 (토요일은 대체 없음)
// 대체 없음: 1월 1일, 현충일, 선거일, 임시공휴일
const SAT_SUN = new Set(['marchFirst', 'constitutionDay', 'liberationDay', 'nationalFoundation', 'hangeulDay', 'buddhasBirthday', 'childrensDay', 'christmas', 'laborDay'])
const BLOCK = new Set(['seollalEve', 'seollal', 'seollalAfter', 'chuseokEve', 'chuseok', 'chuseokAfter'])

const cache = new Map<number, KoreanHoliday[]>()

/** 해당 연도 관공서 공휴일 (대체공휴일 포함, 날짜순). 음력 공휴일은 2024~2030만 */
export function getKoreanHolidays(year: number): KoreanHoliday[] {
  const hit = cache.get(year)
  if (hit) return hit
  const holidays: KoreanHoliday[] = [
    { date: `${year}-01-01`, name: '새해', nameKey: 'newYear', isLunar: false },
    { date: `${year}-03-01`, name: '삼일절', nameKey: 'marchFirst', isLunar: false },
    { date: `${year}-05-05`, name: '어린이날', nameKey: 'childrensDay', isLunar: false },
    { date: `${year}-06-06`, name: '현충일', nameKey: 'memorialDay', isLunar: false },
    { date: `${year}-08-15`, name: '광복절', nameKey: 'liberationDay', isLunar: false },
    { date: `${year}-10-03`, name: '개천절', nameKey: 'nationalFoundation', isLunar: false },
    { date: `${year}-10-09`, name: '한글날', nameKey: 'hangeulDay', isLunar: false },
    { date: `${year}-12-25`, name: '크리스마스', nameKey: 'christmas', isLunar: false },
  ]
  if (year >= 2026) {
    holidays.push(
      { date: `${year}-05-01`, name: '노동절', nameKey: 'laborDay', isLunar: false },
      { date: `${year}-07-17`, name: '제헌절', nameKey: 'constitutionDay', isLunar: false },
    )
  }
  for (const [date, h] of Object.entries(EXTRA)) {
    if (date.startsWith(`${year}-`)) holidays.push({ date, ...h, isLunar: false })
  }

  const lunar = LUNAR_HOLIDAYS[year]
  if (lunar) {
    holidays.push(
      { date: addDaysToDate(lunar.seollal, -1), name: '설날 연휴', nameKey: 'seollalEve', isLunar: true },
      { date: lunar.seollal, name: '설날', nameKey: 'seollal', isLunar: true },
      { date: addDaysToDate(lunar.seollal, 1), name: '설날 연휴', nameKey: 'seollalAfter', isLunar: true },
      { date: lunar.buddha, name: '부처님오신날', nameKey: 'buddhasBirthday', isLunar: true },
      { date: addDaysToDate(lunar.chuseok, -1), name: '추석 연휴', nameKey: 'chuseokEve', isLunar: true },
      { date: lunar.chuseok, name: '추석', nameKey: 'chuseok', isLunar: true },
      { date: addDaysToDate(lunar.chuseok, 1), name: '추석 연휴', nameKey: 'chuseokAfter', isLunar: true },
    )
  }

  const byDate = new Map<string, KoreanHoliday[]>()
  for (const h of holidays) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h])
  const taken = new Set(byDate.keys())
  const substitutes: KoreanHoliday[] = []
  // "다음의 첫 번째 비공휴일" (토요일이면 그다음 비공휴일)
  const place = (after: string, name: string) => {
    let d = addDaysToDate(after, 1)
    while (taken.has(d) || dow(d) === 0 || dow(d) === 6) d = addDaysToDate(d, 1)
    taken.add(d)
    substitutes.push({ date: d, name: `대체공휴일 (${name})`, nameKey: 'substituteHoliday', isLunar: false })
  }

  // 설·추석 연휴는 3일 묶음: 일요일 또는 다른 공휴일과 겹치면 연휴 끝 다음 첫 평일
  for (const [pre, name] of [['seollal', '설날'], ['chuseok', '추석']]) {
    const days = holidays.filter(h => BLOCK.has(h.nameKey) && h.nameKey.startsWith(pre)).map(h => h.date).sort()
    if (days.some(d => dow(d) === 0 || byDate.get(d)!.length > 1)) place(days[days.length - 1], name)
  }
  // 그 밖: 대상 공휴일이 토·일 또는 (연휴가 아닌) 다른 공휴일과 겹치면 날짜당 하루
  for (const [d, hs] of [...byDate].sort(([a], [b]) => a.localeCompare(b))) {
    const eligible = hs.filter(h => SAT_SUN.has(h.nameKey))
    if (!eligible.length) continue
    const overlap = hs.length > 1 && !hs.some(h => BLOCK.has(h.nameKey))
    if (dow(d) === 0 || dow(d) === 6 || overlap) place(d, hs.map(h => h.name).join('·'))
  }

  const out = [...holidays, ...substitutes].sort((a, b) => a.date.localeCompare(b.date))
  cache.set(year, out)
  return out
}

export function isHoliday(dateStr: string, holidays: KoreanHoliday[]): boolean {
  return holidays.some(h => h.date === dateStr)
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

export function countBusinessDays(start: Date, end: Date, excludeHolidays?: KoreanHoliday[]): number {
  const holidayDates = new Set(excludeHolidays?.map(h => h.date) || [])
  let count = 0
  const current = new Date(start)
  const endTime = end.getTime()

  // Ensure we iterate in the correct direction
  if (current.getTime() > endTime) return 0

  while (current.getTime() <= endTime) {
    const day = current.getDay()
    const dateStr = formatDate(current)
    if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function getHolidaysInRange(start: Date, end: Date): KoreanHoliday[] {
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  const allHolidays: KoreanHoliday[] = []

  for (let y = startYear; y <= endYear; y++) {
    allHolidays.push(...getKoreanHolidays(y))
  }

  const startStr = formatDate(start)
  const endStr = formatDate(end)

  return allHolidays.filter(h => h.date >= startStr && h.date <= endStr)
}

// 수능 시행일 (교육부·평가원 발표). 없는 해는 11월 셋째 목요일로 추정.
export const CSAT: Record<number, string> = {
  2024: '2024-11-14', // 2025학년도
  2025: '2025-11-13', // 2026학년도
  2026: '2026-11-19', // 2027학년도 (평가원 시행 기본계획, 2026-03)
  2027: '2027-11-18', // 2028학년도 (교육부 2028 대입 안내)
}

export function csatDate(year: number): { date: string; estimated: boolean } {
  if (CSAT[year]) return { date: CSAT[year], estimated: false }
  const first = 1 + ((4 - dow(`${year}-11-01`) + 7) % 7)
  return { date: `${year}-11-${String(first + 14).padStart(2, '0')}`, estimated: true }
}

// Popular D-Day presets
export function getPresetDates(year: number): { key: string; date: string; name: string }[] {
  const presets: { key: string; date: string; name: string }[] = []

  // New Year (next occurrence)
  const newYear = `${year + 1}-01-01`
  presets.push({ key: 'newYear', date: newYear, name: '새해' })

  // Christmas
  const christmas = `${year}-12-25`
  const christmasDate = new Date(christmas + 'T00:00:00')
  if (christmasDate >= new Date(new Date().toDateString())) {
    presets.push({ key: 'christmas', date: christmas, name: '크리스마스' })
  } else {
    presets.push({ key: 'christmas', date: `${year + 1}-12-25`, name: '크리스마스' })
  }

  // Children's Day
  const childrensDay = `${year}-05-05`
  const childrensDayDate = new Date(childrensDay + 'T00:00:00')
  if (childrensDayDate >= new Date(new Date().toDateString())) {
    presets.push({ key: 'childrensDay', date: childrensDay, name: '어린이날' })
  } else {
    presets.push({ key: 'childrensDay', date: `${year + 1}-05-05`, name: '어린이날' })
  }

  // Liberation Day
  const liberationDay = `${year}-08-15`
  const liberationDayDate = new Date(liberationDay + 'T00:00:00')
  if (liberationDayDate >= new Date(new Date().toDateString())) {
    presets.push({ key: 'liberationDay', date: liberationDay, name: '광복절' })
  } else {
    presets.push({ key: 'liberationDay', date: `${year + 1}-08-15`, name: '광복절' })
  }

  // CSAT (수능)
  for (const y of [year, year + 1]) {
    const csat = csatDate(y).date
    if (new Date(csat + 'T00:00:00') >= new Date(new Date().toDateString())) {
      presets.push({ key: 'csat', date: csat, name: '수능' })
      break
    }
  }

  // Lunar holidays
  const lunar = LUNAR_HOLIDAYS[year]
  if (lunar) {
    const seollalDate = new Date(lunar.seollal + 'T00:00:00')
    if (seollalDate >= new Date(new Date().toDateString())) {
      presets.push({ key: 'seollal', date: lunar.seollal, name: '설날' })
    } else {
      const nextLunar = LUNAR_HOLIDAYS[year + 1]
      if (nextLunar) {
        presets.push({ key: 'seollal', date: nextLunar.seollal, name: '설날' })
      }
    }

    const chuseokDate = new Date(lunar.chuseok + 'T00:00:00')
    if (chuseokDate >= new Date(new Date().toDateString())) {
      presets.push({ key: 'chuseok', date: lunar.chuseok, name: '추석' })
    } else {
      const nextLunar = LUNAR_HOLIDAYS[year + 1]
      if (nextLunar) {
        presets.push({ key: 'chuseok', date: nextLunar.chuseok, name: '추석' })
      }
    }
  }

  return presets.sort((a, b) => a.date.localeCompare(b.date))
}
