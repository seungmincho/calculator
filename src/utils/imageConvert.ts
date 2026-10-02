// 이미지 형식 변환 로직. 순수 함수(맨 위)는 scripts/check-image-convert.ts 로 회귀 체크.
// 디코드(EXIF 회전 반영)·파일명·절감률은 imageCompress.ts 것을 재사용한다.
import { decodeImage, outputName, type Mime } from './imageCompress.ts'

export type ConvertFormat = 'jpeg' | 'png' | 'webp' | 'avif'
export type SourceFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'heic' | 'avif' | 'tiff' | 'ico' | 'svg' | 'unknown'

export const CONVERT_FORMATS: ConvertFormat[] = ['jpeg', 'png', 'webp', 'avif']
export const FORMAT_LABEL: Record<SourceFormat, string> = {
  jpeg: 'JPG', png: 'PNG', webp: 'WebP', gif: 'GIF', bmp: 'BMP', heic: 'HEIC', avif: 'AVIF', tiff: 'TIFF', ico: 'ICO', svg: 'SVG', unknown: '?',
}
export const MIME: Record<ConvertFormat, Mime> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }
export const DEFAULTS = { format: 'jpeg' as ConvertFormat, quality: 85, bg: '#ffffff' }
export const MAX_FILE = 100 * 1024 * 1024
/** iOS 사파리 캔버스 면적 한계(4096²). 이보다 크면 인코딩이 실패할 수 있어 실패 시에만 이 면적으로 줄여 재시도 */
export const MAX_AREA = 16_777_216

const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len))

/** 파일 앞 바이트(32바이트면 충분)로 실제 형식 판별. 확장자가 .jpg인데 내용은 HEIC인 아이폰 파일 등을 잡는다 */
export function sniffFormat(b: Uint8Array): SourceFormat | null {
  if (b.length < 4) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png'
  if (ascii(b, 0, 4) === 'GIF8') return 'gif'
  if (b[0] === 0x42 && b[1] === 0x4d) return 'bmp'
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) return 'tiff'
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico'
  if (ascii(b, 4, 4) === 'ftyp') {
    // ISO BMFF: major brand(8~11) + compatible brands(16~). avif가 있으면 AVIF, heic/mif1 계열이면 HEIC
    const brands: string[] = [ascii(b, 8, 4)]
    const boxLen = Math.min(b.length, (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3])
    for (let i = 16; i + 4 <= boxLen; i += 4) brands.push(ascii(b, i, 4))
    if (brands.some((x) => x === 'avif' || x === 'avis')) return 'avif'
    if (brands.some((x) => /^(heic|heix|heim|heis|hevc|hevx|mif1|msf1)$/.test(x))) return 'heic'
  }
  if (/^\s*<(\?xml|svg)/i.test(ascii(b, 0, Math.min(b.length, 16)))) return 'svg'
  return null
}

const BY_EXT: Record<string, SourceFormat> = {
  jpg: 'jpeg', jpeg: 'jpeg', jfif: 'jpeg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp',
  heic: 'heic', heif: 'heic', avif: 'avif', tif: 'tiff', tiff: 'tiff', ico: 'ico', svg: 'svg',
}

/** 바이트 → MIME → 확장자 순으로 판별 (윈도우 크롬은 HEIC의 MIME이 빈 문자열) */
export function detectFormat(head: Uint8Array | null, name: string, type: string): SourceFormat {
  const s = head && sniffFormat(head)
  if (s) return s
  const t = type.toLowerCase().replace(/^image\//, '').replace(/^x-ms-|^x-|^vnd\.microsoft\./, '')
  const fromType = BY_EXT[t === 'svg+xml' ? 'svg' : t === 'icon' ? 'ico' : t]
  if (fromType) return fromType
  return BY_EXT[name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''] ?? 'unknown'
}

/** 변환 대상으로 받을지 (SVG는 크기 정보가 불확실해 제외) */
export function acceptFile(f: { name: string; type: string; size: number }): boolean {
  if (f.size > MAX_FILE || f.size === 0) return false
  const fmt = detectFormat(null, f.name, f.type)
  return fmt !== 'svg' && (fmt !== 'unknown' || f.type.startsWith('image/'))
}

/** 다운로드 파일명: IMG_1234.HEIC → IMG_1234.jpg */
export const convertName = (fileName: string, format: ConvertFormat) => outputName(fileName, MIME[format], '')

export const usesQuality = (f: ConvertFormat) => f !== 'png'
export const needsBg = (f: ConvertFormat) => f === 'jpeg'

/** URL 파라미터 → 설정. avifOk=false면 avif 요청은 기본값으로 */
export function parseSettings(f: string | null, q: string | null, bg: string | null, avifOk = true) {
  const format = CONVERT_FORMATS.includes(f as ConvertFormat) && (f !== 'avif' || avifOk) ? (f as ConvertFormat) : DEFAULTS.format
  const n = Number(q)
  const quality = q && Number.isFinite(n) ? Math.min(100, Math.max(10, Math.round(n))) : DEFAULTS.quality
  return { format, quality, bg: bg && /^[0-9a-f]{6}$/i.test(bg) ? `#${bg.toLowerCase()}` : DEFAULTS.bg }
}

/** 면적이 maxArea를 넘으면 비율 유지로 축소 */
export function fitArea(w: number, h: number, maxArea = MAX_AREA) {
  if (w * h <= maxArea) return { width: w, height: h }
  const s = Math.sqrt(maxArea / (w * h))
  return { width: Math.max(1, Math.floor(w * s)), height: Math.max(1, Math.floor(h * s)) }
}

/** HEIC를 <img>로 직접 디코딩하는 브라우저인지: 사파리 17+(맥), iOS 17+(iOS는 모든 브라우저가 WebKit) */
export function nativeHeic(ua: string): boolean {
  const ios = ua.match(/(?:iPhone|iPad|iPod).*? OS (\d+)_/)
  if (ios) return Number(ios[1]) >= 17
  if (/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR|SamsungBrowser|Android/.test(ua)) return false
  const v = ua.match(/Version\/(\d+)(?:\.\d+)*.*Safari/)
  return !!v && Number(v[1]) >= 17
}

// ───────────── 브라우저 전용 ─────────────

export const readHead = async (file: Blob) => new Uint8Array(await file.slice(0, 64).arrayBuffer())

export interface ConvertOptions { format: ConvertFormat; quality: number /* 10~100 */; bg: string }
export interface ConvertOutput { blob: Blob; width: number; height: number; srcWidth: number; srcHeight: number; downscaled: boolean }

async function encode(src: ImageBitmap | HTMLImageElement, w: number, h: number, o: ConvertOptions): Promise<Blob> {
  const mime = MIME[o.format]
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  try {
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('encode')
    ctx.imageSmoothingQuality = 'high'
    if (needsBg(o.format)) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h) } // JPG: 투명 → 배경색
    ctx.drawImage(src, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, mime, usesQuality(o.format) ? o.quality / 100 : undefined))
    if (!blob) throw new Error('encode')
    if (blob.type !== mime) throw new Error('format') // 이 브라우저가 해당 형식을 못 만들면 PNG를 돌려줌
    return blob
  } finally {
    c.width = c.height = 0
  }
}

/** 에러 message: 'decode' | 'encode' | 'format' */
export async function convertImage(file: Blob, o: ConvertOptions): Promise<ConvertOutput> {
  let img: Awaited<ReturnType<typeof decodeImage>>
  try { img = await decodeImage(file) } catch { throw new Error('decode') }
  try {
    const base = { srcWidth: img.width, srcHeight: img.height }
    try {
      return { ...base, blob: await encode(img.src, img.width, img.height, o), width: img.width, height: img.height, downscaled: false }
    } catch (e) {
      if ((e as Error).message === 'format' || img.width * img.height <= MAX_AREA) throw e
      const d = fitArea(img.width, img.height)
      return { ...base, blob: await encode(img.src, d.width, d.height, o), ...d, downscaled: true }
    }
  } finally {
    img.close()
  }
}
