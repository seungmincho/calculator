// PDF 도구 순수 로직 — scripts/check-pdf-tools.ts 로 회귀 체크.
// 페이지 번호는 화면·입력에서는 1부터, 내부(인덱스)는 0부터.

export type RangeError = 'empty' | 'invalid' | 'outOfRange' | 'reversed'
export type RangeResult =
  | { ok: true; ranges: [number, number][] } // 0-based, 양끝 포함, 입력 순서 그대로
  | { ok: false; error: RangeError; token: string }

/**
 * "1-3, 5, 8-" → [[0,2],[4,4],[7,last]]
 * - "8-" = 8쪽부터 끝까지, "-3" = 1~3쪽
 * - 구분: 쉼표·공백·세미콜론, 범위: - ~ – (한국 사용자는 "1~3"을 많이 씀)
 * - 0쪽·마지막 쪽 초과·"5-3"(역순)·숫자 아닌 값은 조용히 버리지 않고 오류 (예전엔 무시돼 빈 PDF가 나옴)
 */
export function parsePageRanges(input: string, pageCount: number): RangeResult {
  const parts = input.replace(/\s*[-~–—]\s*/g, '-').split(/[,;\s]+/).filter(Boolean)
  if (!parts.length) return { ok: false, error: 'empty', token: '' }
  const ranges: [number, number][] = []
  for (const token of parts) {
    const m = token.match(/^(\d*)(-?)(\d*)$/)
    if (!m || (!m[1] && !m[3]) || (!m[2] && !m[1])) return { ok: false, error: 'invalid', token }
    const a = m[1] ? Number(m[1]) : 1
    const b = m[2] ? (m[3] ? Number(m[3]) : pageCount) : a
    if (a < 1 || b < 1 || a > pageCount || b > pageCount) return { ok: false, error: 'outOfRange', token }
    if (a > b) return { ok: false, error: 'reversed', token }
    ranges.push([a - 1, b - 1])
  }
  return { ok: true, ranges }
}

const span = ([a, b]: [number, number]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/** 범위 목록 → 페이지 인덱스 (입력 순서 유지, 중복은 처음 것만) */
export const rangesToPages = (ranges: [number, number][]) => [...new Set(ranges.flatMap(span))]

export type SplitMode = 'range' | 'every' | 'single'
export interface SplitOptions { ranges?: [number, number][]; separate?: boolean; every?: number }

/** 분할 계획: 결과 파일마다 담을 페이지 인덱스 */
export function planSplit(mode: SplitMode, pageCount: number, o: SplitOptions = {}): number[][] {
  if (pageCount < 1) return []
  if (mode === 'single') return Array.from({ length: pageCount }, (_, i) => [i])
  if (mode === 'every') {
    const n = Math.max(1, Math.floor(o.every ?? 1))
    const out: number[][] = []
    for (let s = 0; s < pageCount; s += n) out.push(span([s, Math.min(pageCount, s + n) - 1]))
    return out
  }
  const ranges = o.ranges ?? []
  if (!ranges.length) return []
  return o.separate ? ranges.map(span) : [rangesToPages(ranges)]
}

/** [0,1,2,4,7,8] → "1-3_5_8-9" (파일명용). 너무 길면 "12p" */
export function pageLabel(pages: number[], max = 30): string {
  const runs: string[] = []
  for (let i = 0; i < pages.length; ) {
    let j = i
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++
    runs.push(i === j ? `${pages[i] + 1}` : `${pages[i] + 1}-${pages[j] + 1}`)
    i = j + 1
  }
  const s = runs.join('_')
  return s.length > max ? `${pages.length}p` : s
}

/** "보고서.PDF" → "보고서" */
export const baseName = (name: string) => name.replace(/\.pdf$/i, '').replace(/\.[^/.]+$/, '') || 'document'

/** ("보고서.pdf", "합침") → "보고서_합침.pdf" */
export const outName = (name: string, suffix: string, ext = 'pdf') => `${baseName(name)}_${suffix}.${ext}`

export const isPdf = (f: { name: string; type: string }) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)

/** 배열 원소 이동 (드래그·위/아래 버튼 공용). 범위 밖이면 그대로 */
export function move<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = arr.slice()
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

// ── 이미지 → PDF 배치 ──
export const MM = 72 / 25.4 // 1mm = 2.8346pt
export const PAPER = { A4: [595.28, 841.89], Letter: [612, 792] } as const
export type Paper = keyof typeof PAPER | 'original'
export type Orientation = 'auto' | 'portrait' | 'landscape'
/** 원본 크기: CSS 픽셀(96dpi) 기준 → 1px = 0.75pt (화면에서 보던 크기 그대로) */
export const PX_TO_PT = 0.75

/** 페이지 크기(pt). 원본 크기면 이미지+여백, 용지면 방향(auto = 이미지 가로세로를 따름) 적용 */
export function pageSize(paper: Paper, orient: Orientation, imgW: number, imgH: number, marginPt: number): [number, number] {
  if (paper === 'original') return [imgW * PX_TO_PT + marginPt * 2, imgH * PX_TO_PT + marginPt * 2]
  const [w, h] = PAPER[paper]
  const landscape = orient === 'landscape' || (orient === 'auto' && imgW > imgH)
  return landscape ? [h, w] : [w, h]
}

/** 여백 안에 비율 유지로 맞춰 가운데 배치 (pdf 좌표: 왼쪽 아래 원점) */
export function fitRect(imgW: number, imgH: number, pageW: number, pageH: number, marginPt: number) {
  const boxW = Math.max(1, pageW - marginPt * 2)
  const boxH = Math.max(1, pageH - marginPt * 2)
  const s = Math.min(boxW / imgW, boxH / imgH)
  const width = imgW * s
  const height = imgH * s
  return { x: (pageW - width) / 2, y: (pageH - height) / 2, width, height }
}

/**
 * JPEG EXIF Orientation (1~8, 없으면 1). 휴대폰 사진은 픽셀은 눕혀 두고 이 값으로 세워 보여 주는데,
 * PDF는 EXIF를 무시하므로 1이 아니면 회전을 반영해 다시 그려야 한다.
 */
export function jpegOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1
  let p = 2
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return 1
    const marker = b[p + 1]
    const len = (b[p + 2] << 8) | b[p + 3]
    if (marker === 0xda) return 1 // 이미지 데이터 시작 — EXIF 없음
    if (marker === 0xe1 && String.fromCharCode(...b.subarray(p + 4, p + 8)) === 'Exif') {
      const t = p + 10 // TIFF 헤더
      const le = b[t] === 0x49
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1])
      const u32 = (o: number) => (le ? u16(o) + u16(o + 2) * 65536 : u16(o) * 65536 + u16(o + 2))
      const ifd = t + u32(t + 4)
      const n = u16(ifd)
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12
        if (e + 10 > b.length) return 1
        if (u16(e) === 0x0112) {
          const v = u16(e + 8)
          return v >= 1 && v <= 8 ? v : 1
        }
      }
      return 1
    }
    p += 2 + len
  }
  return 1
}
