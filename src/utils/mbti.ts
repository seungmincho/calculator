// 16유형 성격 테스트 채점 (비공식). 문항 텍스트는 i18n `mbtiTest.questions[i]`.
// 48문항 = 축당 12문항, 각 축 안에서 첫 글자(E/S/T/J) 방향 6 · 반대 방향 6 (역문항으로 동의 편향 상쇄).

export const AXES = ['EI', 'SN', 'TF', 'JP'] as const
export type Axis = (typeof AXES)[number]

export const TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const
export type TypeCode = (typeof TYPES)[number]

// i번 문항: 축 = i % 4 (축이 번갈아 나옴), key = +1이면 "그렇다"가 첫 글자 쪽, -1이면 둘째 글자 쪽.
// 4문항마다 방향이 바뀜 → i18n questions 배열도 이 순서로 작성.
export const QUESTIONS = Array.from({ length: 48 }, (_, i) => ({
  axis: AXES[i % 4],
  key: Math.floor(i / 4) % 2 === 0 ? 1 : -1,
}))

export const LIKERT = [1, 2, 3, 4, 5] as const // 1 전혀 아니다 … 5 매우 그렇다

/**
 * answers[i] = 1..5 (미응답 null). 축별 독립 채점.
 * pct[a] = 첫 글자(E/S/T/J) 비율 0~100. 50 초과면 첫 글자, 50 이하(동점 포함)면 둘째 글자(I/N/F/P).
 */
export function scoreAnswers(answers: (number | null)[]): { type: TypeCode; pct: number[] } {
  const sum = [0, 0, 0, 0]
  const max = [0, 0, 0, 0]
  QUESTIONS.forEach((q, i) => {
    const v = answers[i]
    if (v == null || v < 1 || v > 5) return
    const a = i % 4
    sum[a] += (v - 3) * q.key
    max[a] += 2
  })
  const pct = sum.map((s, a) => (max[a] ? Math.round(50 + (50 * s) / max[a]) : 50))
  return { type: typeFromPct(pct), pct }
}

export function typeFromPct(pct: number[]): TypeCode {
  return AXES.map((ax, a) => (pct[a] > 50 ? ax[0] : ax[1])).join('') as TypeCode
}

export const isBorderline = (firstPct: number) => Math.abs(firstPct - 50) < 10

/** 공유 링크 ?r=INTJ&s=38-45-70-30 (s = E·S·T·J 비율). 예전 ?result=INTJ도 허용. */
export function parseShare(r: string | null, s: string | null, legacy?: string | null): { type: TypeCode; pct: number[] | null } | null {
  const type = (r ?? legacy ?? '').toUpperCase()
  if (!(TYPES as readonly string[]).includes(type)) return null
  const nums = (s ?? '').split('-').map(Number)
  const ok = nums.length === 4 && nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 100) && typeFromPct(nums) === type
  return { type: type as TypeCode, pct: ok ? nums : null }
}

export const shareQuery = (type: TypeCode, pct: number[]) => `r=${type}&s=${pct.join('-')}`

/** sessionStorage 복원값 검증: 길이 48, 각 값 null 또는 1..5 */
export function sanitizeAnswers(raw: unknown): (number | null)[] | null {
  if (!Array.isArray(raw) || raw.length !== QUESTIONS.length) return null
  const out = raw.map((v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? (v as number) : null))
  return out
}
