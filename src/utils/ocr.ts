// OCR 전처리·후처리 순수 함수 (브라우저/Node 공용)

export type PrepMode = 'off' | 'gray' | 'binary'

/** Otsu 임계값: 256칸 히스토그램 → 클래스 간 분산이 최대인 t (값 <= t 는 어두운 쪽) */
export function otsuThreshold(hist: ArrayLike<number>): number {
  let total = 0, sum = 0
  for (let i = 0; i < 256; i++) { total += hist[i]; sum += i * hist[i] }
  let wB = 0, sumB = 0, best = 0, bestVar = -1
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const d = sumB / wB - (sum - sumB) / wF
    const v = wB * wF * d * d
    if (v > bestVar) { bestVar = v; best = t }
  }
  return best
}

/** 작은 이미지는 2배 확대(한글 획이 뭉개지지 않게), 긴 변은 4000px 이하로 */
export function prepScale(w: number, h: number, mode: PrepMode): number {
  const max = Math.max(w, h)
  const s = mode !== 'off' && max < 1600 ? 2 : 1
  return Math.min(s, 4000 / max)
}

/**
 * RGBA 버퍼를 제자리에서 보정: 흑백 → 대비 늘리기(1~99% 구간) → (binary면) Otsu 이진화.
 * 배경(다수 픽셀)이 어두우면 반전해 항상 "흰 바탕 검은 글씨"로 만든다 (다크모드 캡처 대응).
 */
export function preprocessPixels(px: Uint8ClampedArray, mode: PrepMode): { threshold: number; inverted: boolean } {
  if (mode === 'off') return { threshold: -1, inverted: false }
  const n = px.length / 4
  const gray = new Uint8Array(n)
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < n; i++) {
    const g = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2])
    gray[i] = g; hist[g]++
  }
  const threshold = otsuThreshold(hist)
  let dark = 0
  for (let i = 0; i <= threshold; i++) dark += hist[i]
  const inverted = dark > n / 2

  // 1%·99% 백분위로 대비 늘리기
  let lo = 0, hi = 255, acc = 0
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.01) { lo = i; break } }
  acc = 0
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.01) { hi = i; break } }
  const range = Math.max(1, hi - lo)

  for (let i = 0; i < n; i++) {
    let v = mode === 'binary'
      ? (gray[i] > threshold ? 255 : 0)
      : Math.min(255, Math.max(0, Math.round(((gray[i] - lo) * 255) / range)))
    if (inverted) v = 255 - v
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v
    px[i * 4 + 3] = 255
  }
  return { threshold, inverted }
}

export interface CleanOptions {
  fixKoreanSpaces: boolean
  joinLines: boolean
}

const SYL = /^[가-힣]$/

/** Tesseract가 한글 음절 사이에 끼워 넣는 공백("대 한 민 국") 제거: 한 글자 토큰이 3개 이상 연속이면 붙인다 */
export function joinSplitHangul(line: string): string {
  const tokens = line.split(' ')
  const out: string[] = []
  let run: string[] = []
  const flush = () => {
    if (run.length >= 3) out.push(run.join(''))
    else out.push(...run)
    run = []
  }
  for (const tok of tokens) {
    if (SYL.test(tok)) run.push(tok)
    else { flush(); out.push(tok) }
  }
  flush()
  return out.join(' ')
}

/** OCR 원문 정리: 공백 정리, 한글 음절 공백 제거, 하이픈 줄바꿈 연결, (선택) 문단 안 줄바꿈 합치기 */
export function cleanOcrText(raw: string, opts: CleanOptions): string {
  let lines = raw.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim())
  if (opts.fixKoreanSpaces) lines = lines.map(joinSplitHangul)
  let text = lines.join('\n')
  text = text.replace(/([A-Za-z])-\n([a-z])/g, '$1$2') // infor-\nmation → information
  if (opts.joinLines) {
    text = text.split(/\n{2,}/).map(p => p.replace(/\n/g, ' ')).join('\n\n')
  }
  return text.replace(/\n{3,}/g, '\n\n').trim()
}
