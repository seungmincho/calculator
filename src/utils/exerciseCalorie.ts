/**
 * 운동 칼로리 계산 (순수 함수 + MET 표). 회귀 체크: node scripts/check-exercise-calorie.ts
 *
 * MET 값: 2024 Adult Compendium of Physical Activities (Herrmann et al., J Sport Health Sci 2024;13:6-12,
 * https://pacompendium.com). code = Compendium 활동 코드.
 * 총 소모(gross) kcal = MET × 체중(kg) × 시간(h)  (1 MET ≈ 1 kcal/kg/h, 3.5 ml O₂/kg/min)
 * 순 소모(net)  kcal = (MET − 1) × 체중 × 시간  → 운동 안 했어도 쓰였을 안정 대사량을 뺀 값
 * 보정 MET(corrected MET) = MET × 3.5 / 개인 RMR(ml/kg/min), RMR은 Harris-Benedict (pacompendium.com/corrected-mets)
 */

export type Category = 'walking' | 'running' | 'cycling' | 'swimming' | 'fitness' | 'dance' | 'sports' | 'outdoor' | 'daily'
export type Sex = 'm' | 'f'

export interface Activity {
  id: string
  cat: Category
  met: number
  code: string
  /** 걷기·달리기처럼 속도가 정해진 활동의 대표 속도 (km/h) */
  kmh?: number
}

export const CATEGORIES: Category[] = ['walking', 'running', 'cycling', 'swimming', 'fitness', 'dance', 'sports', 'outdoor', 'daily']

const A = (id: string, cat: Category, met: number, code: string, kmh?: number): Activity => ({ id, cat, met, code, kmh })

export const ACTIVITIES: Activity[] = [
  // 걷기 (17xxx) — mph 구간을 km/h로 환산, kmh는 구간 중앙값
  A('walkStroll', 'walking', 2.3, '17151', 2.8),
  A('walkSlow', 'walking', 2.8, '17152', 3.5),
  A('walkModerate', 'walking', 3.8, '17190', 5.0),
  A('walkBrisk', 'walking', 4.8, '17200', 6.0),
  A('walkVeryBrisk', 'walking', 5.5, '17220', 6.8),
  A('walkPower', 'walking', 7.0, '17230', 7.5),
  A('walkNordic', 'walking', 5.3, '17304'),
  A('walkUphill', 'walking', 7.0, '17035'),
  A('stairs', 'walking', 6.8, '17131'),
  A('stairsFast', 'walking', 9.3, '17134'),
  // 달리기 (12xxx)
  A('jogging', 'running', 7.5, '12020'),
  A('run65', 'running', 6.5, '12028', 6.5),
  A('run75', 'running', 7.8, '12029', 7.5),
  A('run8', 'running', 8.5, '12030', 8),
  A('run9', 'running', 9.0, '12045', 9),
  A('run10', 'running', 9.3, '12050', 10),
  A('run11', 'running', 10.5, '12060', 11),
  A('run12', 'running', 11.8, '12080', 12),
  A('run13', 'running', 12.0, '12090', 13),
  A('run16', 'running', 14.8, '12120', 16),
  // 자전거 (01xxx)
  A('bikeLeisure', 'cycling', 4.0, '01010'),
  A('bike17', 'cycling', 6.8, '01020', 17.5),
  A('bike21', 'cycling', 8.0, '01030', 20.9),
  A('bike24', 'cycling', 10.0, '01040', 24.1),
  A('bike28', 'cycling', 12.0, '01050', 28.2),
  A('bikeStationary', 'cycling', 6.8, '01200'),
  A('spinning', 'cycling', 9.0, '01270'),
  // 수영 (18xxx)
  A('swimLeisure', 'swimming', 6.0, '18310'),
  A('freestyleSlow', 'swimming', 5.8, '18240'),
  A('freestyleMedium', 'swimming', 8.0, '18290'),
  A('freestyleFast', 'swimming', 9.8, '18230'),
  A('backstroke', 'swimming', 4.8, '18255'),
  A('breaststroke', 'swimming', 5.3, '18265'),
  A('butterfly', 'swimming', 13.8, '18270'),
  A('waterAerobics', 'swimming', 5.5, '18355'),
  // 헬스·피트니스 (02xxx)
  A('weightLight', 'fitness', 3.5, '02054'),
  A('gymGeneral', 'fitness', 5.5, '02060'),
  A('weightHeavy', 'fitness', 6.0, '02050'),
  A('circuit', 'fitness', 6.0, '02032'),
  A('calisthenics', 'fitness', 3.8, '02022'),
  A('hiit', 'fitness', 11.0, '02214'),
  A('jumpRope', 'fitness', 11.0, '02068'),
  A('stairMill', 'fitness', 9.3, '02065'),
  A('elliptical', 'fitness', 5.0, '02048'),
  A('rowing', 'fitness', 5.0, '02071'),
  A('aerobics', 'fitness', 7.3, '02000'),
  A('yoga', 'fitness', 2.3, '02175'),
  A('pilates', 'fitness', 2.8, '02105'),
  A('stretching', 'fitness', 2.3, '02101'),
  // 댄스 (02xxx·03xxx)
  A('zumba', 'dance', 6.5, '02310'),
  A('danceRecreational', 'dance', 6.0, '03042'),
  A('danceVigorous', 'dance', 9.8, '03031'),
  A('balletJazz', 'dance', 5.0, '03010'),
  // 구기·스포츠 (15xxx)
  A('badminton', 'sports', 5.5, '15030'),
  A('tennis', 'sports', 6.8, '15675'),
  A('tableTennis', 'sports', 4.0, '15660'),
  A('soccer', 'sports', 7.0, '15610'),
  A('futsal', 'sports', 7.8, '15195'),
  A('basketball', 'sports', 7.5, '15055'),
  A('volleyball', 'sports', 3.0, '15720'),
  A('baseball', 'sports', 5.0, '15620'),
  A('golfWalk', 'sports', 4.3, '15265'),
  A('golfCart', 'sports', 3.5, '15290'),
  A('bowling', 'sports', 3.0, '15090'),
  A('boxing', 'sports', 5.8, '15110'),
  A('taekwondo', 'sports', 10.3, '15430'),
  A('climbing', 'sports', 8.0, '15533'),
  // 아웃도어 (17xxx·19xxx)
  A('hiking', 'outdoor', 5.3, '17082'),
  A('hikingSteep', 'outdoor', 8.8, '17036'),
  A('skiing', 'outdoor', 6.3, '19160'),
  // 일상 (05xxx)
  A('cleaning', 'daily', 3.3, '05030'),
  A('vacuum', 'daily', 3.0, '05043'),
  A('mopping', 'daily', 3.5, '05021'),
  A('dishes', 'daily', 2.0, '05041'),
  A('playKids', 'daily', 3.5, '05175'),
  A('groceriesStairs', 'daily', 5.3, '05056'),
]

const BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]))

/** 이전 버전 URL(?activity=...) 호환 */
const LEGACY: Record<string, string> = {
  walkNormal: 'walkModerate', walkFast: 'walkVeryBrisk', runSlow: 'run9', runMedium: 'run11', runFast: 'run13',
  runSprint: 'run16', bikeSlow: 'bikeLeisure', bikeNormal: 'bike21', bikeFast: 'bike28', swimSlow: 'freestyleSlow',
  swimMedium: 'freestyleMedium', swimFast: 'freestyleFast', weightModerate: 'gymGeneral', stairClimber: 'stairMill',
  mountainClimbing: 'hikingSteep', gardening: 'cleaning', dancing: 'danceRecreational', golf: 'golfWalk',
}

export function findActivity(id: string | null | undefined): Activity | undefined {
  if (!id) return undefined
  return BY_ID.get(id) ?? BY_ID.get(LEGACY[id] ?? '')
}

export const FAT_KCAL_PER_KG = 7700

/** 총 소모 kcal = MET × kg × h */
export function kcal(met: number, kg: number, minutes: number): number {
  if (!(met > 0 && kg > 0 && minutes > 0)) return 0
  return (met * kg * minutes) / 60
}

/** 순 소모 kcal = (MET − 1) × kg × h (표준 1 MET 가정) */
export function netKcal(met: number, kg: number, minutes: number): number {
  return Math.max(0, kcal(met - 1, kg, minutes))
}

/** Harris-Benedict 안정 대사량 (kcal/day), Compendium corrected-METs 페이지 계수 */
export function harrisBenedict(sex: Sex, kg: number, cm: number, age: number): number {
  return sex === 'm'
    ? 66.473 + 5.0033 * cm + 13.7516 * kg - 6.755 * age
    : 655.0955 + 1.8496 * cm + 9.5634 * kg - 4.6756 * age
}

/** kcal/day → ml O₂/kg/min (÷1440 ÷5 kcal/L ÷kg ×1000) */
export function rmrMl(rmrKcalDay: number, kg: number): number {
  return kg > 0 ? (rmrKcalDay / 1440 / 5 / kg) * 1000 : 0
}

export function correctedMet(met: number, rmrMlKgMin: number): number {
  return rmrMlKgMin > 0 ? (met * 3.5) / rmrMlKgMin : met
}

/** 개인 순 소모 = 총 소모 − 그 시간 동안의 개인 안정 대사량(Harris-Benedict) */
export function personalNetKcal(met: number, kg: number, minutes: number, rmrKcalDay: number): number {
  return Math.max(0, kcal(met, kg, minutes) - (rmrKcalDay / 1440) * Math.max(0, minutes))
}

/** targetKcal을 태우는 데 걸리는 분 */
export function minutesToBurn(targetKcal: number, met: number, kg: number): number {
  if (!(targetKcal > 0 && met > 0 && kg > 0)) return 0
  return (targetKcal / (met * kg)) * 60
}

// ── 음식 (대략값, 1회 제공량 기준 일반적인 범위의 대표값) ──
export interface Food { id: string; kcal: number }
export const FOODS: Food[] = [
  { id: 'rice', kcal: 300 },
  { id: 'ramen', kcal: 500 },
  { id: 'chicken', kcal: 250 },
  { id: 'pizza', kcal: 280 },
  { id: 'jajangmyeon', kcal: 800 },
  { id: 'tteokbokki', kcal: 480 },
  { id: 'samgyeopsal', kcal: 660 },
  { id: 'gimbap', kcal: 480 },
  { id: 'burger', kcal: 550 },
  { id: 'soju', kcal: 400 },
  { id: 'beer', kcal: 210 },
  { id: 'latte', kcal: 190 },
  { id: 'cola', kcal: 150 },
  { id: 'cake', kcal: 350 },
  { id: 'banana', kcal: 90 },
]
export const findFood = (id: string | null | undefined) => FOODS.find((f) => f.id === id)

// ── 걸음 수 ──
/** 보폭(cm) ≈ 키 × 0.415(남) / 0.413(여) — 걷기 보폭 경험식 */
export function strideCm(heightCm: number, sex: Sex): number {
  return heightCm > 0 ? heightCm * (sex === 'f' ? 0.413 : 0.415) : 0
}

export const STEP_PACES = ['walkSlow', 'walkModerate', 'walkBrisk', 'walkVeryBrisk'] as const
export type StepPace = typeof STEP_PACES[number]

export function stepsToCalories(steps: number, heightCm: number, sex: Sex, pace: StepPace, kg: number) {
  const a = BY_ID.get(pace)!
  const km = (Math.max(0, steps) * strideCm(heightCm, sex)) / 100_000
  const minutes = (km / a.kmh!) * 60
  return { km, minutes, kcal: kcal(a.met, kg, minutes), stride: strideCm(heightCm, sex), met: a.met, kmh: a.kmh! }
}

// ── 주간 계획 ──
export interface Session { a: string; m: number; n: number }

/** "run8.30.3~walkBrisk.40.2" ↔ Session[] (잘못된 항목은 버림) */
export function encodePlan(plan: Session[]): string {
  return plan.map((s) => `${s.a}.${s.m}.${s.n}`).join('~')
}
export function decodePlan(s: string | null | undefined): Session[] | null {
  if (!s) return null
  const out: Session[] = []
  for (const part of s.split('~')) {
    const [id, m, n] = part.split('.')
    const act = findActivity(id)
    const mm = Number(m), nn = Number(n)
    if (act && Number.isFinite(mm) && Number.isFinite(nn) && mm > 0 && nn > 0) {
      out.push({ a: act.id, m: Math.min(600, Math.round(mm)), n: Math.min(14, Math.round(nn)) })
    }
  }
  return out.length ? out.slice(0, 10) : null
}

export function weekTotal(plan: Session[], kg: number) {
  let total = 0, minutes = 0
  const rows = plan.map((s) => {
    const act = findActivity(s.a)
    const per = act ? kcal(act.met, kg, s.m) : 0
    total += per * s.n
    minutes += s.m * s.n
    return { ...s, per, week: per * s.n }
  })
  const month = (total * 52) / 12
  return { rows, total, minutes, month, fatKgMonth: month / FAT_KCAL_PER_KG }
}

// ── 입력 정리 ──
export function clampNum(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (v === null || v === '' || !Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, n))
}

/** 공백·대소문자 무시 부분 일치 */
export function matches(query: string, ...texts: string[]): boolean {
  const q = query.replace(/\s+/g, '').toLowerCase()
  if (!q) return true
  return texts.some((t) => t.replace(/\s+/g, '').toLowerCase().includes(q))
}
