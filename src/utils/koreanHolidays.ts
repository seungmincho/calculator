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
  2027: { seollal: '2027-02-07', buddha: '2027-05-13', chuseok: '2027-10-15' },
  2028: { seollal: '2028-01-27', buddha: '2028-05-02', chuseok: '2028-10-03' },
  2029: { seollal: '2029-02-13', buddha: '2029-05-20', chuseok: '2029-09-22' },
  2030: { seollal: '2030-02-03', buddha: '2030-05-09', chuseok: '2030-10-12' },
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

export function getKoreanHolidays(year: number): KoreanHoliday[] {
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

  // Add substitute holidays (대체공휴일): if a holiday falls on Sunday, next Monday is observed
  const holidayDates = new Set(holidays.map(h => h.date))
  const substitutes: KoreanHoliday[] = []

  for (const h of holidays) {
    const d = new Date(h.date + 'T00:00:00')
    if (d.getDay() === 0) { // Sunday
      let sub = new Date(d)
      sub.setDate(sub.getDate() + 1)
      // Find next available weekday not already a holiday
      while (holidayDates.has(formatDate(sub)) || sub.getDay() === 0 || sub.getDay() === 6) {
        sub.setDate(sub.getDate() + 1)
      }
      const subDate = formatDate(sub)
      if (!holidayDates.has(subDate)) {
        substitutes.push({
          date: subDate,
          name: `대체공휴일 (${h.name})`,
          nameKey: 'substituteHoliday',
          isLunar: false,
        })
        holidayDates.add(subDate)
      }
    }
  }

  return [...holidays, ...substitutes].sort((a, b) => a.date.localeCompare(b.date))
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

  // CSAT (수능) - November, third Thursday
  for (const y of [year, year + 1]) {
    const nov1 = new Date(y, 10, 1) // November 1
    let day = nov1.getDay()
    let firstThursday = day <= 4 ? 1 + (4 - day) : 1 + (11 - day)
    const thirdThursday = firstThursday + 14
    const csatDate = `${y}-11-${String(thirdThursday).padStart(2, '0')}`
    if (new Date(csatDate + 'T00:00:00') >= new Date(new Date().toDateString())) {
      presets.push({ key: 'csat', date: csatDate, name: '수능' })
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
