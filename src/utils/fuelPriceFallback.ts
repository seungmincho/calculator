const isDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** 과거 날짜 조회가 더 이전 자료를 반환한 경우의 안내. 기준일을 요청일로 바꾸지 않는다. */
export function fuelPriceFallback(requestedDate: string | undefined, actualDate: string) {
  if (!requestedDate || !isDate(requestedDate) || !isDate(actualDate) || actualDate >= requestedDate) return null
  return { requestedDate, actualDate }
}
