// 색맹 시뮬레이터 순수 로직 — 색각이상 시뮬레이션(Machado 2009) + 팔레트 구분 가능성(CIEDE2000).
// 검증: node scripts/check-color-blindness.ts
//
// 시뮬레이션은 반드시 선형 RGB에서 한다 (sRGB 감마값에 행렬을 곱하면 어두운 색이 틀어짐).
//   sRGB(0~255) → 선형화 → 3x3 행렬 → 감마 → sRGB
// 행렬: Machado, Oliveira & Fernandes (2009) "A Physiologically-based Model for Simulation of
// Color Vision Deficiency", IEEE TVCG 15(6). 저자 공개 표(심각도 0.0~1.0, 0.1 간격),
// 그 사이 값은 선형 보간 (colorspacious 와 동일).
import { toLinear, toGamma, type Vec3 } from './colorBlindTest.ts'

export type Cvd = 'normal' | 'protan' | 'deutan' | 'tritan' | 'achroma'
export const CVD_LIST: Cvd[] = ['normal', 'protan', 'deutan', 'tritan', 'achroma']
export type M9 = number[] // 행 우선 3x3

// [유형][심각도 0,10,…,100]
const MACHADO: Record<'protan' | 'deutan' | 'tritan', M9[]> = {
  protan: [
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0.856167, 0.182038, -0.038205, 0.029342, 0.955115, 0.015544, -0.00288, -0.001563, 1.004443],
    [0.734766, 0.334872, -0.069637, 0.05184, 0.919198, 0.028963, -0.004928, -0.004209, 1.009137],
    [0.630323, 0.465641, -0.095964, 0.069181, 0.890046, 0.040773, -0.006308, -0.007724, 1.014032],
    [0.539009, 0.579343, -0.118352, 0.082546, 0.866121, 0.051332, -0.007136, -0.011959, 1.019095],
    [0.458064, 0.679578, -0.137642, 0.092785, 0.846313, 0.060902, -0.007494, -0.016807, 1.024301],
    [0.38545, 0.769005, -0.154455, 0.100526, 0.829802, 0.069673, -0.007442, -0.02219, 1.029632],
    [0.319627, 0.849633, -0.169261, 0.106241, 0.815969, 0.07779, -0.007025, -0.028051, 1.035076],
    [0.259411, 0.923008, -0.18242, 0.110296, 0.80434, 0.085364, -0.006276, -0.034346, 1.040622],
    [0.203876, 0.990338, -0.194214, 0.112975, 0.794542, 0.092483, -0.005222, -0.041043, 1.046265],
    [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0.866435, 0.177704, -0.044139, 0.049567, 0.939063, 0.01137, -0.003453, 0.007233, 0.99622],
    [0.760729, 0.319078, -0.079807, 0.090568, 0.889315, 0.020117, -0.006027, 0.013325, 0.992702],
    [0.675425, 0.43385, -0.109275, 0.125303, 0.847755, 0.026942, -0.00795, 0.018572, 0.989378],
    [0.605511, 0.52856, -0.134071, 0.155318, 0.812366, 0.032316, -0.009376, 0.023176, 0.9862],
    [0.547494, 0.607765, -0.155259, 0.181692, 0.781742, 0.036566, -0.01041, 0.027275, 0.983136],
    [0.498864, 0.674741, -0.173604, 0.205199, 0.754872, 0.039929, -0.011131, 0.030969, 0.980162],
    [0.457771, 0.731899, -0.18967, 0.226409, 0.731012, 0.042579, -0.011595, 0.034333, 0.977261],
    [0.422823, 0.781057, -0.203881, 0.245752, 0.709602, 0.044646, -0.011843, 0.037423, 0.974421],
    [0.392952, 0.82361, -0.216562, 0.263559, 0.69021, 0.046232, -0.01191, 0.040281, 0.97163],
    [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0.92667, 0.092514, -0.019184, 0.021191, 0.964503, 0.014306, 0.008437, 0.054813, 0.93675],
    [0.89572, 0.13333, -0.02905, 0.029997, 0.9454, 0.024603, 0.013027, 0.104707, 0.882266],
    [0.905871, 0.127791, -0.033662, 0.026856, 0.941251, 0.031893, 0.01341, 0.148296, 0.838294],
    [0.948035, 0.08949, -0.037526, 0.014364, 0.946792, 0.038844, 0.010853, 0.193991, 0.795156],
    [1.017277, 0.027029, -0.044306, -0.006113, 0.958479, 0.047634, 0.006379, 0.248708, 0.744913],
    [1.104996, -0.046633, -0.058363, -0.032137, 0.971635, 0.060503, 0.001336, 0.317922, 0.680742],
    [1.193214, -0.109812, -0.083402, -0.058496, 0.97941, 0.079086, -0.002346, 0.403492, 0.598854],
    [1.257728, -0.139648, -0.118081, -0.078003, 0.975409, 0.102594, -0.003316, 0.501214, 0.502102],
    [1.278864, -0.125333, -0.153531, -0.084748, 0.957674, 0.127074, -0.000989, 0.601151, 0.399838],
    [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
  ],
}

// 선형 sRGB 휘도 (Rec.709 / sRGB Y)
const LUM = [0.2126, 0.7152, 0.0722]
const ID: M9 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

const clampSev = (s: number) => Math.min(100, Math.max(0, Number.isFinite(s) ? s : 100))

/** 유형·심각도(0~100)의 선형 RGB 변환 행렬. 전색맹은 휘도(회색)로 섞는다. */
export function cvdMatrix(type: Cvd, severity: number): M9 {
  const s = clampSev(severity)
  if (type === 'normal') return ID
  if (type === 'achroma') {
    const k = s / 100
    return ID.map((v, i) => v * (1 - k) + LUM[i % 3] * k)
  }
  const table = MACHADO[type]
  const lo = Math.min(9, Math.floor(s / 10))
  const f = s / 10 - lo
  return table[lo].map((v, i) => v * (1 - f) + table[lo + 1][i] * f)
}

export const applyM = (m: M9, [r, g, b]: Vec3): Vec3 => [
  m[0] * r + m[1] * g + m[2] * b,
  m[3] * r + m[4] * g + m[5] * b,
  m[6] * r + m[7] * g + m[8] * b,
]

// ── HEX ──
export function normalizeHex(raw: string): string | null {
  let h = raw.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/.test(h) ? '#' + h : null
}

export const MAX_COLORS = 12
/** "#e53935, 43a047 #fff" 처럼 쉼표·공백·줄바꿈·하이픈으로 구분된 목록. 잘못된 항목·중복은 버림. */
export function parseHexList(text: string): string[] {
  const out: string[] = []
  for (const tok of text.split(/[\s,;\-]+/)) {
    const h = normalizeHex(tok)
    if (h && !out.includes(h)) out.push(h)
  }
  return out.slice(0, MAX_COLORS)
}

const hexToRgb = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const lin = (hex: string): Vec3 => hexToRgb(hex).map((v) => toLinear(v / 255)) as Vec3
const to8 = (v: number) => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255)

export function simulateHex(hex: string, type: Cvd, severity = 100): string {
  const out = applyM(cvdMatrix(type, severity), lin(hex))
  return '#' + out.map((v) => to8(v).toString(16).padStart(2, '0')).join('')
}

// ── 이미지 (RGBA 바이트 배열) ──
const LIN_LUT = new Float32Array(256).map((_, i) => toLinear(i / 255))
const GAMMA_N = 4096
const GAMMA_LUT = new Uint8Array(GAMMA_N + 1).map((_, i) => Math.round(toGamma(i / GAMMA_N) * 255))
const enc = (v: number) => GAMMA_LUT[v <= 0 ? 0 : v >= 1 ? GAMMA_N : Math.round(v * GAMMA_N)]

/** RGBA 픽셀 배열을 시뮬레이션한 새 배열 (알파 유지). LUT 사용으로 1,200px 이미지도 수십 ms. */
export function simulatePixels(data: ArrayLike<number>, type: Cvd, severity = 100) {
  const out = new Uint8ClampedArray(data.length)
  const m = cvdMatrix(type, severity)
  for (let i = 0; i < data.length; i += 4) {
    const r = LIN_LUT[data[i]], g = LIN_LUT[data[i + 1]], b = LIN_LUT[data[i + 2]]
    out[i] = enc(m[0] * r + m[1] * g + m[2] * b)
    out[i + 1] = enc(m[3] * r + m[4] * g + m[5] * b)
    out[i + 2] = enc(m[6] * r + m[7] * g + m[8] * b)
    out[i + 3] = data[i + 3]
  }
  return out
}

// ── CIELAB (D65) + CIEDE2000 ──
export function hexToLab(hex: string): Vec3 {
  const [r, g, b] = lin(hex)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** CIEDE2000 색차 (Sharma, Wu & Dalal 2005 구현 노트 기준, kL=kC=kH=1) */
export function ciede2000([L1, a1, b1]: Vec3, [L2, a2, b2]: Vec3): number {
  const rad = Math.PI / 180
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2)
  const Cb7 = ((C1 + C2) / 2) ** 7
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 25 ** 7)))
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2)
  const hp = (b: number, a: number) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360)
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p)
  const dLp = L2 - L1, dCp = C2p - C1p
  let dhp = 0
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad)
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2
  let hbp = h1p + h2p
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbp /= 2
    else hbp = h1p + h2p < 360 ? (hbp + 360) / 2 : (hbp - 360) / 2
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.2 * Math.cos((4 * hbp - 63) * rad)
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2))
  const Cbp7 = Cbp ** 7
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2)
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T
  const Rt = -Math.sin(2 * dTheta * rad) * Rc
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))
}

export const hexDeltaE = (a: string, b: string) => ciede2000(hexToLab(a), hexToLab(b))

// ponytail: 고정 임계값. 차트 마크 크기별 판단(Szafir 2018 JND)이 필요하면 크기 인자로 교체.
// ΔE2000 10 미만이면 작은 범례·선 그래프에서 헷갈리기 쉽다 — 범주형 차트 색의 흔한 실무 기준.
export const DE_WARN = 10

export interface PairIssue { i: number; j: number; de: number }
export interface PaletteRow { type: Cvd; colors: string[]; issues: PairIssue[]; minDe: number }

/** 유형별로 팔레트를 시뮬레이션하고 ΔE2000 < DE_WARN 인 쌍을 찾는다 (가까운 순). */
export function checkPalette(hexes: string[], severity = 100, types: Cvd[] = CVD_LIST): PaletteRow[] {
  return types.map((type) => {
    const colors = hexes.map((h) => simulateHex(h, type, severity))
    const labs = colors.map(hexToLab)
    const issues: PairIssue[] = []
    let minDe = Infinity
    for (let i = 0; i < labs.length; i++) {
      for (let j = i + 1; j < labs.length; j++) {
        const de = ciede2000(labs[i], labs[j])
        minDe = Math.min(minDe, de)
        if (de < DE_WARN) issues.push({ i, j, de })
      }
    }
    issues.sort((a, b) => a.de - b.de)
    return { type, colors, issues, minDe }
  })
}

// 프리셋
export const PALETTE_RISKY = ['#e53935', '#43a047', '#fb8c00', '#1e88e5', '#8e24aa']
// Okabe & Ito (2008) "Color Universal Design" — 색각이상 친화 팔레트
export const PALETTE_OKABE_ITO = ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#000000']
