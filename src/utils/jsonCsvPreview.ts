export const JSON_CSV_VISIBLE_CELLS = 1000
export const JSON_CSV_TEXT_PAGE_UNITS = 50_000

/** Adjacent page boundaries agree, keeping both UTF-16 pairs and CRLF together. */
function boundary(text: string, offset: number): number {
  const point = Math.min(text.length, Math.max(0, offset))
  if (point > 0 && point < text.length) {
    const before = text.charCodeAt(point - 1), after = text.charCodeAt(point)
    if ((before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) || (before === 13 && after === 10)) return point - 1
  }
  return point
}
export function jsonCsvTextPage(text: string, requestedPage: number) {
  const pages = Math.max(1, Math.ceil(text.length / JSON_CSV_TEXT_PAGE_UNITS))
  const page = Math.min(pages - 1, Math.max(0, Number.isSafeInteger(requestedPage) ? requestedPage : 0))
  const start = boundary(text, page * JSON_CSV_TEXT_PAGE_UNITS), end = boundary(text, (page + 1) * JSON_CSV_TEXT_PAGE_UNITS)
  return { text: text.slice(start, end), start, end, total: text.length, page, pages }
}
