// 영양성분 계산 — 순수 로직 + 음식 데이터.
// 음식 값은 1인분(serving g/ml) 기준 대표값(근사치). 식약처 식품영양성분 DB·외식 영양성분 공개자료의
// 일반적인 수준에 맞춘 값이며 브랜드·조리법·국물 섭취량에 따라 달라짐.

export interface Nutrients {
  cal: number // kcal
  carbs: number // g
  protein: number // g
  fat: number // g
  sodium: number // mg
}

export const CATEGORIES = ['all', 'basic', 'rice', 'noodle', 'soup', 'side', 'meat', 'snack', 'drink', 'fast'] as const
export type Category = Exclude<(typeof CATEGORIES)[number], 'all'> | 'custom'

export interface Food extends Nutrients {
  id: string
  category: Category
  serving: number // 1인분 g (unit=ml이면 ml)
  unit?: 'ml'
  name?: string // 직접 입력 음식만
}

const f = (id: string, category: Category, serving: number, cal: number, carbs: number, protein: number, fat: number, sodium: number, unit?: 'ml'): Food =>
  ({ id, category, serving, cal, carbs, protein, fat, sodium, ...(unit ? { unit } : {}) })

export const FOODS: Food[] = [
  // 기본 식품 (다이어트 단골)
  f('egg', 'basic', 50, 75, 0.6, 6.3, 5.3, 70), // 삶은 달걀 1개
  f('chickenBreast', 'basic', 100, 165, 0, 31, 3.6, 75), // 익힌 닭가슴살
  f('sweetPotato', 'basic', 150, 200, 47, 2, 0.3, 20), // 찐 고구마 1개
  f('banana', 'basic', 100, 90, 23, 1.1, 0.3, 1), // 바나나 1개(껍질 제외)
  f('apple', 'basic', 200, 114, 30, 0.4, 0.2, 2), // 사과 1개(가식부)
  f('milk', 'basic', 200, 130, 10, 6, 7, 100, 'ml'), // 흰우유 1팩
  f('tofu', 'basic', 100, 90, 2, 9.5, 5, 5), // 두부 1/3모
  f('brownRice', 'rice', 210, 320, 68, 6.5, 2, 5), // 현미밥 1공기
  // 밥류
  f('rice', 'rice', 210, 300, 65, 5, 0.5, 5),
  f('bibimbap', 'rice', 400, 550, 78, 18, 15, 1200),
  f('kimchiFriedRice', 'rice', 350, 450, 72, 10, 12, 1300),
  f('kimbap', 'rice', 250, 380, 62, 12, 8, 1000),
  f('curryRice', 'rice', 400, 520, 80, 12, 15, 1300),
  // 면류
  f('ramyeon', 'noodle', 550, 500, 78, 10, 16, 1790),
  f('jajangmyeon', 'noodle', 500, 650, 95, 15, 18, 2000),
  f('jjamppong', 'noodle', 1000, 690, 90, 30, 22, 4000),
  f('naengmyeon', 'noodle', 500, 430, 82, 12, 5, 1700),
  f('udong', 'noodle', 450, 380, 72, 12, 4, 2000),
  f('japchae', 'noodle', 250, 350, 58, 6, 10, 600),
  // 국/찌개
  f('kimchiJjigae', 'soup', 300, 200, 12, 12, 10, 1500),
  f('doenjangJjigae', 'soup', 300, 150, 15, 10, 5, 1500),
  f('sundubuJjigae', 'soup', 350, 180, 10, 14, 8, 1300),
  f('miyeokguk', 'soup', 300, 70, 6, 5, 3, 900),
  f('samgyetang', 'soup', 800, 800, 60, 55, 35, 1200),
  // 반찬
  f('kimchi', 'side', 40, 15, 2, 1, 0.3, 250),
  f('gyeranjjim', 'side', 150, 120, 2, 10, 8, 400),
  f('japchae2', 'side', 120, 180, 28, 4, 6, 300),
  f('dubuJorim', 'side', 120, 100, 5, 8, 5, 450),
  // 고기/구이
  f('samgyeopsal', 'meat', 150, 520, 0, 22, 45, 80),
  f('bulgogi', 'meat', 200, 350, 20, 28, 15, 700),
  f('jeyuk', 'meat', 200, 380, 18, 25, 22, 1200),
  f('dakgalbi', 'meat', 300, 400, 35, 30, 12, 1500),
  f('tonkatsu', 'meat', 200, 450, 35, 25, 22, 700),
  // 간식
  f('tteokbokki', 'snack', 250, 350, 70, 6, 5, 1100),
  f('friedChicken', 'snack', 250, 600, 30, 35, 35, 900),
  f('hotdog', 'snack', 120, 300, 28, 8, 18, 600),
  f('bungeoppang', 'snack', 100, 180, 35, 4, 3, 150),
  // 음료
  f('americano', 'drink', 355, 5, 1, 0, 0, 10, 'ml'),
  f('cafeLatte', 'drink', 355, 180, 20, 8, 7, 140, 'ml'),
  f('cola', 'drink', 355, 140, 39, 0, 0, 15, 'ml'),
  f('soju', 'drink', 360, 340, 0, 0, 0, 10, 'ml'), // 열량 대부분이 알코올(7kcal/g)
  f('beer', 'drink', 355, 150, 13, 1, 0, 15, 'ml'),
  // 패스트푸드
  f('hamburger', 'fast', 200, 550, 45, 25, 30, 1000),
  f('pizza', 'fast', 107, 270, 33, 12, 10, 600),
  f('frenchFries', 'fast', 117, 340, 44, 4, 17, 250),
  f('gimbapRoll', 'fast', 150, 200, 35, 5, 4, 550),
]

const FOOD_MAP = new Map(FOODS.map((x) => [x.id, x]))
export const findFood = (id: string) => FOOD_MAP.get(id)

/** 식품등의 표시기준(식약처) 1일 영양성분 기준치. 열량은 영양성분표 %의 기준인 2,000kcal. */
export const DV: Nutrients = { cal: 2000, carbs: 324, protein: 55, fat: 54, sodium: 2000 }

/** 2025 한국인 영양소 섭취기준(보건복지부 2025-12-31 발표) 에너지적정비율(성인) — 탄수화물 50~65%, 단백질 10~20%, 지방 15~30%
 *  (2020 기준 55~65%·7~20%에서 변경: https://www.ddaily.co.kr/page/view/2025123111291718936) */
export const AMDR = { carbs: [50, 65], protein: [10, 20], fat: [15, 30] } as const
export type Macro = keyof typeof AMDR

export const PORTIONS = [0.5, 1, 1.5, 2] as const
export const MAX_AMOUNT = 5000

const KEYS = ['cal', 'carbs', 'protein', 'fat', 'sodium'] as const

/** food(1인분 값)를 amount(g/ml)만큼 섭취했을 때 */
export function scale(food: Food, amount: number): Nutrients {
  const k = food.serving > 0 ? amount / food.serving : 0
  return { cal: food.cal * k, carbs: food.carbs * k, protein: food.protein * k, fat: food.fat * k, sodium: food.sodium * k }
}

export const per100 = (food: Food) => scale(food, 100)

export function sum(list: Nutrients[]): Nutrients {
  const t: Nutrients = { cal: 0, carbs: 0, protein: 0, fat: 0, sodium: 0 }
  for (const n of list) for (const k of KEYS) t[k] += n[k]
  return t
}

/** 탄단지 에너지 비율(%) — 탄수화물·단백질 4kcal/g, 지방 9kcal/g. 알코올 열량은 제외. */
export function macroRatio(n: Nutrients): Record<Macro, number> {
  const c = n.carbs * 4, p = n.protein * 4, fa = n.fat * 9
  const tot = c + p + fa
  if (tot <= 0) return { carbs: 0, protein: 0, fat: 0 }
  return { carbs: (c / tot) * 100, protein: (p / tot) * 100, fat: (fa / tot) * 100 }
}

/** 권장 범위 대비: -1 미만, 0 적정, 1 초과 */
export function ratioStatus(m: Macro, pct: number): -1 | 0 | 1 {
  const [lo, hi] = AMDR[m]
  return pct < lo ? -1 : pct > hi ? 1 : 0
}

export function dvPct(n: Nutrients): Nutrients {
  return { cal: (n.cal / DV.cal) * 100, carbs: (n.carbs / DV.carbs) * 100, protein: (n.protein / DV.protein) * 100, fat: (n.fat / DV.fat) * 100, sodium: (n.sodium / DV.sodium) * 100 }
}

// ── URL 인코딩 ─────────────────────────────────────────────────────────────
// m = "rice:210,kimchiJjigae:300"  (DB 음식 id:섭취량)
// c = JSON [[이름, 1인분, kcal, 탄, 단, 지, 나트륨, 섭취량], ...]  (직접 입력 음식)

export interface Entry { food: Food; amount: number }

export const DEFAULT_MEAL = 'rice:210,kimchiJjigae:300,kimchi:40'

const num = (v: unknown, max: number) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 10) / 10, max) : null
}

export function encodeMeal(entries: Entry[]): { m: string; c: string } {
  const db = entries.filter((e) => e.food.category !== 'custom').map((e) => `${e.food.id}:${e.amount}`)
  const cu = entries.filter((e) => e.food.category === 'custom')
    .map(({ food: x, amount }) => [x.name ?? '', x.serving, x.cal, x.carbs, x.protein, x.fat, x.sodium, amount])
  return { m: db.join(','), c: cu.length ? JSON.stringify(cu) : '' }
}

/** m이 null(파라미터 없음)이면 null → 호출측이 기본 식단 사용. 잘못된 항목은 건너뜀. */
export function decodeMeal(m: string | null, c: string | null): Entry[] | null {
  if (m == null && !c) return null
  const out: Entry[] = []
  for (const part of (m ?? '').split(',')) {
    const [id, a] = part.split(':')
    const food = findFood(id)
    const amount = num(a, MAX_AMOUNT)
    if (food && amount != null && amount > 0) out.push({ food, amount })
  }
  if (c) {
    try {
      const arr = JSON.parse(c)
      if (Array.isArray(arr)) arr.slice(0, 30).forEach((r, i) => {
        if (!Array.isArray(r) || r.length < 8) return
        const v = r.slice(1, 8).map((x: unknown, j: number) => num(x, j === 5 ? 100000 : 10000))
        if (v.some((x: number | null) => x == null) || !v[0] || !v[6]) return
        const [serving, cal, carbs, protein, fat, sodium, amount] = v as number[]
        const name = String(r[0] ?? '').slice(0, 40)
        out.push({ food: { id: `c${i}`, category: 'custom', name, serving, cal, carbs, protein, fat, sodium }, amount: Math.min(amount, MAX_AMOUNT) })
      })
    } catch { /* 깨진 링크: 무시 */ }
  }
  return out
}

/** 검색용: 공백 제거 + 소문자 */
export const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
