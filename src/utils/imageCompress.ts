// 이미지 압축 로직. 순수 함수(맨 위)는 scripts/check-image-compress.ts 로 회귀 체크.
// 브라우저 함수(decode/encode)는 호출 시점에만 DOM/Canvas API를 건드린다.

export type OutputFormat = 'original' | 'jpeg' | 'webp' | 'avif' | 'png'
export type Mime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

/** 1024 단위(윈도우 탐색기와 같은 표기) */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const v = bytes / 1024 ** i
  return `${i === 0 ? v : v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

/** 목표 용량 KB → 바이트. 1000 단위로 잡아 "500KB"를 1000/1024 어느 기준으로 검사해도 통과하게 한다. */
export const targetBytes = (kb: number) => Math.floor(kb * 1000)

/** 절감률(%) — 커졌으면 음수 */
export function savingsPct(original: number, compressed: number): number {
  if (original <= 0) return 0
  return Math.round(((original - compressed) / original) * 100)
}

/** 긴 변이 maxSide를 넘지 않게 비율 유지 축소 (확대 안 함) 후 scale(≤1)을 추가로 곱한다. maxSide 0 = 제한 없음 */
export function fitDimensions(w: number, h: number, maxSide: number, scale = 1) {
  const long = Math.max(w, h)
  const s = (maxSide > 0 && long > maxSide ? maxSide / long : 1) * Math.min(1, scale)
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }
}

const KEEP: Record<string, Mime> = {
  'image/jpeg': 'image/jpeg', 'image/jpg': 'image/jpeg', 'image/png': 'image/png',
  'image/webp': 'image/webp', 'image/avif': 'image/avif',
}

/** 출력 MIME. 원본 유지인데 원본이 HEIC/GIF/BMP 등이면 JPEG */
export function outputMime(format: OutputFormat, originalType: string): Mime {
  if (format === 'original') return KEEP[originalType] ?? 'image/jpeg'
  return `image/${format}` as Mime
}

const EXT: Record<Mime, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' }

export function outputName(fileName: string, mime: Mime, suffix = '_compressed'): string {
  const base = fileName.replace(/\.[^/.]+$/, '') || 'image'
  return `${base}${suffix}${EXT[mime]}`
}

/** ZIP 안 파일명 중복 방지: a.jpg, a (2).jpg, a (3).jpg */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const key = n.toLowerCase()
    const c = (seen.get(key) ?? 0) + 1
    seen.set(key, c)
    if (c === 1) return n
    const m = n.match(/^(.*?)(\.[^.]*)?$/)!
    return `${m[1]} (${c})${m[2] ?? ''}`
  })
}

export const isHeic = (f: { name: string; type: string }) =>
  /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)

export interface FitResult<T> { out: T; quality: number; scale: number; ok: boolean }

/**
 * 목표 용량 맞추기. encode(quality, scale)는 결과(size 포함)를 돌려준다.
 * 1) 최고 화질로 되면 끝 2) 최저 화질로도 크면 축소 후 반복 3) 사이면 화질 이진 탐색(통과한 것 중 최고 화질).
 * 끝까지 못 맞추면 가장 작은 결과를 ok:false로 반환.
 */
export async function fitToSize<T extends { size: number }>(
  encode: (quality: number, scale: number) => Promise<T>,
  target: number,
  { minQ = 0.4, maxQ = 0.92, steps = 6, maxRounds = 8, minScale = 0.05 } = {},
): Promise<FitResult<T>> {
  let scale = 1
  let smallest: FitResult<T> | null = null
  for (let round = 0; round < maxRounds; round++) {
    const hiOut = await encode(maxQ, scale)
    if (hiOut.size <= target) return { out: hiOut, quality: maxQ, scale, ok: true }
    const loOut = await encode(minQ, scale)
    if (!smallest || loOut.size < smallest.out.size) smallest = { out: loOut, quality: minQ, scale, ok: false }
    if (loOut.size <= target) {
      let lo = minQ, hi = maxQ, best: FitResult<T> = { out: loOut, quality: minQ, scale, ok: true }
      for (let i = 0; i < steps; i++) {
        const q = Math.round(((lo + hi) / 2) * 100) / 100
        if (q <= lo || q >= hi) break
        const o = await encode(q, scale)
        if (o.size <= target) { best = { out: o, quality: q, scale, ok: true }; lo = q } else hi = q
      }
      return best
    }
    // 용량은 대략 픽셀 수(=scale²)에 비례 → 한 변 배율은 √비율, 여유 0.9
    const next = scale * Math.min(0.85, Math.max(0.3, Math.sqrt(target / loOut.size) * 0.9))
    if (next < minScale) break
    scale = next
  }
  return smallest!
}

// ───────────── 브라우저 전용 ─────────────

export type Source = ImageBitmap | HTMLImageElement

/** EXIF 회전을 반영해 디코드. createImageBitmap(from-image) → 실패 시 <img> (브라우저 기본이 from-image) */
export async function decodeImage(file: Blob): Promise<{ src: Source; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { src: b, width: b.width, height: b.height, close: () => b.close() }
    } catch { /* Safari HEIC 등은 <img>로 재시도 */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { src: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 지정 크기로 그려 인코딩. 브라우저가 해당 포맷을 못 만들면(다른 type 반환) 에러 */
export async function encodeImage(src: Source, width: number, height: number, mime: Mime, quality: number): Promise<Blob> {
  const draw = (ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) => {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height) } // 투명 → 흰색
    ctx.drawImage(src, 0, 0, width, height)
  }
  const q = mime === 'image/png' ? undefined : quality
  let blob: Blob | null = null
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const c = new OffscreenCanvas(width, height)
      const ctx = c.getContext('2d')
      if (ctx) { draw(ctx); blob = await c.convertToBlob({ type: mime, quality: q }) }
    } catch { blob = null }
  }
  if (!blob) {
    const c = document.createElement('canvas')
    c.width = width; c.height = height
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('canvas')
    draw(ctx)
    blob = await new Promise<Blob | null>((r) => c.toBlob(r, mime, q))
    c.width = c.height = 0
  }
  if (!blob) throw new Error('encode')
  if (blob.type !== mime) throw new Error('format')
  return blob
}

/** 이 브라우저에서 캔버스로 인코딩 가능한 포맷 */
export async function detectEncoders(): Promise<{ webp: boolean; avif: boolean }> {
  const c = document.createElement('canvas')
  c.width = c.height = 2
  const test = (type: string) => new Promise<boolean>((r) => c.toBlob((b) => r(!!b && b.type === type), type, 0.5))
  const [webp, avif] = await Promise.all([test('image/webp'), test('image/avif')])
  return { webp, avif }
}

export interface CompressOptions { format: OutputFormat; quality: number; maxSide: number; targetKB: number /* 0 = 화질 모드 */ }
export interface CompressOutput { blob: Blob; mime: Mime; width: number; height: number; srcWidth: number; srcHeight: number; quality: number; ok: boolean }

export async function compressFile(file: File, o: CompressOptions): Promise<CompressOutput> {
  const img = await decodeImage(file)
  try {
    const mime = outputMime(o.format, file.type)
    const withSize = async (q: number, scale: number) => {
      const d = fitDimensions(img.width, img.height, o.maxSide, scale)
      const blob = await encodeImage(img.src, d.width, d.height, mime, q)
      return { blob, ...d, size: blob.size }
    }
    if (o.targetKB > 0) {
      const r = await fitToSize(withSize, targetBytes(o.targetKB))
      return { blob: r.out.blob, mime, width: r.out.width, height: r.out.height, srcWidth: img.width, srcHeight: img.height, quality: r.quality, ok: r.ok }
    }
    const r = await withSize(o.quality / 100, 1)
    return { blob: r.blob, mime, width: r.width, height: r.height, srcWidth: img.width, srcHeight: img.height, quality: o.quality / 100, ok: true }
  } finally {
    img.close()
  }
}
