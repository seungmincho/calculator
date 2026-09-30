// 단위 변환 순수 로직 + 단위 표. 정의값 출처: NIST SP 811 App. B, BIPM SI Brochure 9판,
// 1959 국제 야드·파운드 협정(inch = 0.0254 m, lb = 0.45359237 kg), IEC 80000-13(KiB 등).
// 한국 전통 단위(척관법): 1자 = 10/33 m, 1평 = 6자 × 6자 = 400/121 ㎡, 1되 = 2401/1331 L, 1돈 = 3.75 g.
import { M2_PER_PYEONG } from './pyeong.ts'

export type Category =
  | 'length' | 'weight' | 'area' | 'volume' | 'temperature' | 'speed' | 'data'
  | 'time' | 'pressure' | 'energy' | 'fuel' | 'cooking' | 'traditional' | 'css'

export interface Unit {
  id: string
  sym: string
  /** 기준 단위 배수 (선형 단위) */
  f?: number
  /** 비선형(온도·L/100km): 기준값 ↔ 이 단위 */
  to?: (v: number) => number
  from?: (b: number) => number
  /** CSS rem/em: 배수 = 기준 글꼴 px */
  rem?: true
  /** 검색용 별칭 (이름·기호 외) */
  aka?: string[]
}

const INCH = 0.0254
const FT = 0.3048
const YD = 0.9144
const MI = 1609.344
const LB = 0.45359237
const OZ = LB / 16
const US_GAL = 3.785411784 // L (= 231 in³)
const UK_GAL = 4.54609
const JA = 10 / 33 // m
const DOE = 2401 / 1331 // L
const G0 = 9.80665 // 표준 중력가속도

const lin = (id: string, sym: string, f: number, aka?: string[]): Unit => ({ id, sym, f, aka })

export const CATEGORIES: Category[] = [
  'length', 'weight', 'area', 'volume', 'temperature', 'speed', 'data',
  'time', 'pressure', 'energy', 'fuel', 'cooking', 'traditional', 'css',
]

// 기준: m · kg · ㎡ · L · K · m/s · byte · s · Pa · J · km/L · mL · px
export const UNITS: Record<Exclude<Category, 'traditional'>, Unit[]> = {
  length: [
    lin('nm', 'nm', 1e-9, ['nanometer']), lin('um', 'μm', 1e-6, ['micron', '미크론', 'micrometer']),
    lin('mm', 'mm', 1e-3, ['millimeter']), lin('cm', 'cm', 1e-2, ['centimeter', '센치']), lin('m', 'm', 1, ['meter']),
    lin('km', 'km', 1e3, ['kilometer', '키로']), lin('inch', 'in', INCH, ['"', '인치']), lin('ft', 'ft', FT, ['feet', 'foot', "'"]),
    lin('yd', 'yd', YD, ['yard']), lin('mi', 'mi', MI, ['mile']), lin('nmi', 'NM', 1852, ['nautical mile', '노티컬마일']),
    lin('chi', '치', JA / 10, ['촌', '寸']), lin('ja', '자', JA, ['척', '尺']), lin('gan', '간', 6 * JA, ['칸', '間']),
  ],
  weight: [
    lin('mg', 'mg', 1e-6), lin('g', 'g', 1e-3, ['gram', '그램']), lin('kg', 'kg', 1, ['kilogram', '킬로', '키로']),
    lin('t', 't', 1e3, ['ton', 'tonne', '톤']), lin('ct', 'ct', 2e-4, ['carat', '캐럿']),
    lin('oz', 'oz', OZ, ['ounce']), lin('lb', 'lb', LB, ['pound', 'lbs', '파운드']), lin('st', 'st', 14 * LB, ['stone']),
    lin('shortTon', 'US ton', 2000 * LB), lin('longTon', 'UK ton', 2240 * LB),
    lin('don', '돈', 3.75e-3, ['錢', '금 한돈']), lin('nyang', '냥', 37.5e-3, ['兩']),
    lin('geunMeat', '근', 0.6, ['斤', '고기']), lin('geunVeg', '근', 0.375, ['斤', '채소', '과일']), lin('gwan', '관', 3.75, ['貫']),
  ],
  area: [
    lin('mm2', 'mm²', 1e-6), lin('cm2', 'cm²', 1e-4), lin('m2', 'm²', 1, ['㎡', 'sqm', '제곱미터', '평방미터']),
    lin('a', 'a', 100, ['are']), lin('ha', 'ha', 1e4, ['hectare']), lin('km2', 'km²', 1e6),
    lin('in2', 'in²', 0.00064516), lin('ft2', 'ft²', 0.09290304, ['sqft', 'sq ft']), lin('yd2', 'yd²', 0.83612736),
    lin('acre', 'ac', 4046.8564224, ['에이커']), lin('mi2', 'mi²', 2589988.110336),
    lin('pyeong', '평', M2_PER_PYEONG, ['坪', 'pyeong', '평수']), lin('danbo', '단보', 300 * M2_PER_PYEONG, ['段步']),
    lin('jeongbo', '정보', 3000 * M2_PER_PYEONG, ['町步']),
  ],
  volume: [
    lin('mL', 'mL', 1e-3, ['cc', 'ml', '밀리리터']), lin('L', 'L', 1, ['liter', 'litre', '리터']), lin('m3', 'm³', 1e3, ['cbm', '루베', '세제곱미터']),
    lin('in3', 'in³', 0.016387064), lin('ft3', 'ft³', 28.316846592),
    lin('usFlOz', 'US fl oz', US_GAL / 128), lin('ukFlOz', 'UK fl oz', UK_GAL / 160),
    lin('usPint', 'US pt', US_GAL / 8), lin('usQt', 'US qt', US_GAL / 4),
    lin('usGal', 'US gal', US_GAL, ['gallon', '갤런']), lin('ukGal', 'UK gal', UK_GAL), lin('bbl', 'bbl', 42 * US_GAL, ['barrel', '배럴']),
    lin('hop', '홉', DOE / 10, ['合']), lin('doe', '되', DOE, ['升']), lin('mal', '말', 10 * DOE, ['斗']),
  ],
  temperature: [
    { id: 'degC', sym: '°C', to: (v) => v + 273.15, from: (b) => b - 273.15, aka: ['celsius', '섭씨'] },
    { id: 'degF', sym: '°F', to: (v) => ((v - 32) * 5) / 9 + 273.15, from: (b) => ((b - 273.15) * 9) / 5 + 32, aka: ['fahrenheit', '화씨'] },
    { id: 'K', sym: 'K', f: 1, aka: ['kelvin', '켈빈'] },
    { id: 'degR', sym: '°R', f: 5 / 9, aka: ['rankine'] },
  ],
  speed: [
    lin('mps', 'm/s', 1), lin('kmh', 'km/h', 1 / 3.6, ['kph', '시속']), lin('mph', 'mph', MI / 3600),
    lin('knot', 'kn', 1852 / 3600, ['knots', '노트']), lin('fps', 'ft/s', FT),
  ],
  data: [
    lin('bit', 'bit', 1 / 8, ['비트']), lin('byte', 'B', 1, ['바이트']),
    lin('kbit', 'kbit', 125, ['kbps']), lin('Mbit', 'Mbit', 125e3, ['mbps', '메가비트']), lin('Gbit', 'Gbit', 125e6, ['gbps', '기가비트']),
    lin('kB', 'KB', 1e3, ['kilobyte', '킬로바이트']), lin('MB', 'MB', 1e6, ['megabyte', '메가', '메가바이트']),
    lin('GB', 'GB', 1e9, ['gigabyte', '기가', '기가바이트']), lin('TB', 'TB', 1e12, ['terabyte', '테라']), lin('PB', 'PB', 1e15, ['petabyte']),
    lin('KiB', 'KiB', 2 ** 10, ['kibibyte']), lin('MiB', 'MiB', 2 ** 20, ['mebibyte']), lin('GiB', 'GiB', 2 ** 30, ['gibibyte']),
    lin('TiB', 'TiB', 2 ** 40, ['tebibyte']), lin('PiB', 'PiB', 2 ** 50, ['pebibyte']),
  ],
  time: [
    lin('ms', 'ms', 1e-3), lin('s', 's', 1, ['sec', 'second', '초']), lin('min', 'min', 60, ['minute', '분']),
    lin('h', 'h', 3600, ['hour', 'hr', '시간']), lin('day', 'd', 86400, ['일']), lin('week', 'wk', 604800, ['주']),
    lin('month', 'mo', 30.436875 * 86400, ['개월', '달']), lin('year', 'yr', 365.2425 * 86400, ['년']),
  ],
  pressure: [
    lin('Pa', 'Pa', 1), lin('hPa', 'hPa', 100, ['mbar', '헥토파스칼']), lin('kPa', 'kPa', 1e3), lin('MPa', 'MPa', 1e6),
    lin('bar', 'bar', 1e5, ['바']), lin('atm', 'atm', 101325, ['기압']), lin('psi', 'psi', (LB * G0) / 0.00064516, ['타이어']),
    lin('kgfcm2', 'kgf/cm²', G0 * 1e4, ['kg/cm2']), lin('mmHg', 'mmHg', 133.322387415, ['torr', '혈압']),
    lin('inHg', 'inHg', 3386.389),
  ],
  energy: [
    lin('J', 'J', 1, ['joule', '줄']), lin('kJ', 'kJ', 1e3), lin('MJ', 'MJ', 1e6),
    lin('cal', 'cal', 4.184, ['calorie']), lin('kcal', 'kcal', 4184, ['칼로리', 'Cal', '킬로칼로리']),
    lin('Wh', 'Wh', 3600), lin('kWh', 'kWh', 3.6e6, ['전기', '킬로와트시']),
    lin('BTU', 'BTU', 1055.05585262), lin('eV', 'eV', 1.602176634e-19, ['electronvolt']),
  ],
  fuel: [
    { id: 'kmL', sym: 'km/L', f: 1, aka: ['연비'] },
    { id: 'L100km', sym: 'L/100km', to: (v) => 100 / v, from: (b) => 100 / b },
    lin('mpgUS', 'mpg (US)', MI / 1000 / US_GAL, ['mpg']),
    lin('mpgUK', 'mpg (UK)', MI / 1000 / UK_GAL),
  ],
  cooking: [
    lin('mL', 'mL', 1), lin('tsp', 'tsp', 5, ['작은술', '티스푼', 'teaspoon']), lin('tbsp', 'Tbsp', 15, ['큰술', '테이블스푼', 'tablespoon']),
    lin('cupKr', '컵', 200, ['cup', '계량컵']), lin('cupMetric', 'metric cup', 250), lin('cupUs', 'US cup', (US_GAL / 16) * 1000),
    lin('usFlOz', 'US fl oz', (US_GAL / 128) * 1000), lin('L', 'L', 1000),
  ],
  css: [
    lin('px', 'px', 1), { id: 'rem', sym: 'rem', rem: true }, { id: 'em', sym: 'em', rem: true },
    lin('pt', 'pt', 4 / 3), lin('pc', 'pc', 16), lin('inch', 'in', 96), lin('cm', 'cm', 96 / 2.54), lin('mm', 'mm', 96 / 25.4),
  ],
}

/** 전통 단위 탭: [카테고리, 전통 단위, 보여줄 미터법 단위] */
export const TRADITIONAL: [Exclude<Category, 'traditional'>, string, string][] = [
  ['area', 'pyeong', 'm2'], ['area', 'danbo', 'm2'], ['area', 'jeongbo', 'ha'],
  ['weight', 'geunMeat', 'g'], ['weight', 'geunVeg', 'g'], ['weight', 'don', 'g'], ['weight', 'nyang', 'g'], ['weight', 'gwan', 'kg'],
  ['length', 'chi', 'cm'], ['length', 'ja', 'cm'], ['length', 'gan', 'm'],
  ['volume', 'hop', 'mL'], ['volume', 'doe', 'L'], ['volume', 'mal', 'L'],
]

export interface Opts { remBase?: number }

export const unitsOf = (cat: Category): Unit[] => (cat === 'traditional' ? [] : UNITS[cat])

export function findUnit(cat: Category, id: string): Unit | undefined {
  return unitsOf(cat).find((u) => u.id === id)
}

const factor = (u: Unit, o: Opts) => (u.rem ? o.remBase ?? 16 : u.f!)
const toBase = (u: Unit, v: number, o: Opts) => (u.to ? u.to(v) : v * factor(u, o))
const fromBase = (u: Unit, b: number, o: Opts) => (u.from ? u.from(b) : b / factor(u, o))

/** v [from] → [to]. 알 수 없는 단위·비유한 값은 NaN */
export function convert(cat: Category, from: string, to: string, v: number, o: Opts = {}): number {
  const a = findUnit(cat, from), b = findUnit(cat, to)
  if (!a || !b || !Number.isFinite(v)) return NaN
  if (from === to) return v
  return fromBase(b, toBase(a, v, o), o)
}

export const isLinear = (cat: Category) => unitsOf(cat).every((u) => !u.to)

/** "1,234.5" / "1e-9" / " 3 " → number, 비숫자 NaN */
export function parseInput(s: string): number {
  const t = s.replace(/[,\s_]/g, '')
  return t === '' ? NaN : Number(t)
}

const group = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/**
 * 유효숫자 sig로 반올림. 아주 크거나(≥1e15) 작으면(<1e-6) 지수 표기 "1.5e+21".
 * 정수부가 sig 자리를 넘으면 정수로 반올림해 전부 표시(123,456,789처럼 0으로 뭉개지 않음).
 * grouping=false면 쉼표 없이 (복사용).
 */
export function formatNum(x: number, sig = 10, grouping = true): string {
  if (Number.isNaN(x)) return '—'
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e15 || a < 1e-6) {
    const [m, e] = x.toExponential(Math.max(0, sig - 1)).split('e')
    return `${m.includes('.') ? m.replace(/\.?0+$/, '') : m}e${e}`
  }
  let s = a >= 10 ** sig ? String(Math.round(x)) : String(Number(x.toPrecision(sig)))
  // String()이 다시 지수 표기로 돌려주는 경우(예: 1e-7 근처)는 위에서 걸러짐. 안전망:
  if (s.includes('e')) s = Number(s).toFixed(20).replace(/\.?0+$/, '')
  if (!grouping) return s
  const [i, d] = s.split('.')
  return d ? `${group(i)}.${d}` : group(i)
}

const norm = (s: string) => s.toLowerCase().replace(/[\s²³^.]/g, '')

/** 단위 검색. name(id)로 현재 언어 이름을 받아 기호·이름·별칭에서 찾음. 정확 일치 > 접두 > 포함 순 */
export function searchUnits(q: string, name: (cat: Category, id: string) => string, limit = 8) {
  const n = norm(q)
  if (!n) return []
  const hits: { cat: Category; id: string; score: number }[] = []
  for (const cat of CATEGORIES) {
    for (const u of unitsOf(cat)) {
      const keys = [u.id, u.sym, name(cat, u.id), ...(u.aka ?? [])].map(norm)
      const score = keys.includes(n) ? 3 : keys.some((k) => k.startsWith(n)) ? 2 : keys.some((k) => k.includes(n)) ? 1 : 0
      if (score) hits.push({ cat, id: u.id, score })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
