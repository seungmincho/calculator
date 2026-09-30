// LLM API 단가표 + 토큰 추정 + 비용 계산 (순수 로직). 회귀 체크: node scripts/check-llm-pricing.ts
// 단가 갱신은 이 파일의 VENDORS/MODELS만 고치면 된다. 가격은 USD / 1M 토큰, 공식 요금 페이지에서 직접 확인한 값만 넣을 것.

export type VendorId = 'anthropic' | 'openai' | 'google' | 'deepseek'
export type Tokenizer = 'openai' | 'claude' | 'claudeLegacy' | 'gemini' | 'deepseek'

export interface Price {
  input: number
  output: number
  /** 캐시 적중(읽기) 단가 */
  cached: number
  /** 캐시 쓰기 단가. 없으면 일반 입력 단가로 계산 (자동 캐싱) */
  cacheWrite?: number
}

export interface LlmModel {
  id: string
  name: string
  vendor: VendorId
  /** 컨텍스트 윈도우 (입력+출력) */
  ctx: number
  /** 최대 입력 토큰 (컨텍스트보다 작을 때만) */
  maxInput?: number
  maxOutput: number
  tok: Tokenizer
  price: Price
  /** 요청당 입력 토큰이 over를 넘으면 전체 요청에 적용되는 장문 단가 */
  long?: Price & { over: number }
  /** 배치 할인 배율 (0.5 = 50% 할인). null = 배치 API 없음 */
  batch: number | null
  /** 배치에서도 캐시 적중 단가는 할인 없음 (Gemini 3.1 Pro 'Same as Standard') */
  batchCachedFull?: boolean
  /** 이 날짜까지 프로모션 가격 */
  promoUntil?: string
  preview?: boolean
}

export const VENDORS: Record<VendorId, { name: string; url: string; checked: string }> = {
  anthropic: { name: 'Anthropic', url: 'https://platform.claude.com/docs/en/docs/about-claude/pricing', checked: '2026-10-01' },
  openai: { name: 'OpenAI', url: 'https://platform.openai.com/docs/pricing', checked: '2026-10-01' },
  google: { name: 'Google', url: 'https://ai.google.dev/gemini-api/docs/pricing', checked: '2026-10-01' },
  deepseek: { name: 'DeepSeek', url: 'https://api-docs.deepseek.com/quick_start/pricing', checked: '2026-10-01' },
}
export const VENDOR_IDS = Object.keys(VENDORS) as VendorId[]

const M = 1_000_000
const OAI_CTX = { ctx: 1_050_000, maxInput: 922_000, maxOutput: 128_000, tok: 'openai' as const, batch: 0.5 }
const GEM_CTX = { ctx: 1_048_576, maxOutput: 65_536, tok: 'gemini' as const, batch: 0.5 }

export const MODELS: LlmModel[] = [
  // Anthropic — 4.7 이후 모델은 새 토크나이저(같은 글 약 30%↑), Haiku 4.5는 이전 토크나이저. 1M 컨텍스트 전 구간 동일 단가.
  { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', vendor: 'anthropic', ctx: M, maxOutput: 128_000, tok: 'claude', batch: 0.5, price: { input: 10, output: 50, cached: 0.25, cacheWrite: 12.5 } },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', vendor: 'anthropic', ctx: M, maxOutput: 128_000, tok: 'claude', batch: 0.5, price: { input: 4, output: 20, cached: 0.2, cacheWrite: 5 } },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', vendor: 'anthropic', ctx: M, maxOutput: 128_000, tok: 'claude', batch: 0.5, price: { input: 2, output: 10, cached: 0.2, cacheWrite: 2.5 } },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', vendor: 'anthropic', ctx: 200_000, maxOutput: 64_000, tok: 'claudeLegacy', batch: 0.5, price: { input: 1, output: 5, cached: 0.1, cacheWrite: 1.25 } },
  // OpenAI — 입력 272K 초과 시 장문 단가
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', vendor: 'openai', ...OAI_CTX, price: { input: 10, output: 50, cached: 1, cacheWrite: 12.5 }, long: { over: 272_000, input: 20, output: 75, cached: 2, cacheWrite: 25 } },
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', vendor: 'openai', ...OAI_CTX, price: { input: 2, output: 10, cached: 0.1, cacheWrite: 2.5 }, long: { over: 272_000, input: 4, output: 15, cached: 0.2, cacheWrite: 5 } },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', vendor: 'openai', ...OAI_CTX, price: { input: 0.1, output: 0.5, cached: 0.01, cacheWrite: 0.125 }, long: { over: 272_000, input: 0.2, output: 0.75, cached: 0.02, cacheWrite: 0.25 } },
  // Google — 유료 Standard 단가. 명시적 캐시는 저장료(시간당) 별도
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', vendor: 'google', ...GEM_CTX, promoUntil: '2026-12-31', price: { input: 0.75, output: 3.75, cached: 0.075 } },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', vendor: 'google', ...GEM_CTX, price: { input: 1.5, output: 9, cached: 0.15 } },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', vendor: 'google', ...GEM_CTX, price: { input: 0.3, output: 2.5, cached: 0.03 } },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', vendor: 'google', ...GEM_CTX, preview: true, batchCachedFull: true, price: { input: 2, output: 12, cached: 0.2 }, long: { over: 200_000, input: 4, output: 18, cached: 0.4 } },
  // DeepSeek — 피크 시간 단가(보수적). 비피크는 50%. 배치 API 없음
  { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', vendor: 'deepseek', ctx: M, maxOutput: 384_000, tok: 'deepseek', batch: null, price: { input: 0.3, output: 1.2, cached: 0.006 } },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', vendor: 'deepseek', ctx: M, maxOutput: 384_000, tok: 'deepseek', batch: null, price: { input: 1.32, output: 3.96, cached: 0.044 } },
]

/** 기본 환율: Frankfurter(ECB 기준환율) 2026-09-30 */
export const FX_DEFAULT = { rate: 1355, date: '2026-09-30' }

// ── 토큰 추정 ──
// ponytail: 문자 종류별 토큰/글자 비율 휴리스틱. 정확한 값은 각 사의 토큰 카운트 API/tiktoken으로 확인 후 '직접 입력'.
// 근거: 영어 ≈ 4글자/토큰(OpenAI·Google 문서), DeepSeek 영어 0.3·중국어 0.6 토큰/글자(공식 문서),
// Claude 새 토크나이저 ≈ 이전 대비 +30%(Anthropic 문서). 한글 비율은 경험치(범위로 표시).
type Range = [number, number, number] // low, mid, high (토큰/글자)
interface Rates { ascii: Range; hangul: Range; cjk: Range; other: Range }
const scale = (r: Rates, k: number): Rates =>
  Object.fromEntries(Object.entries(r).map(([c, v]) => [c, (v as Range).map((x) => +(x * k).toFixed(3))])) as unknown as Rates
const LEGACY_CLAUDE: Rates = { ascii: [0.24, 0.28, 0.33], hangul: [0.8, 1.0, 1.3], cjk: [0.8, 1.0, 1.3], other: [1, 1.5, 2.5] }
export const TOKEN_RATES: Record<Tokenizer, Rates> = {
  openai: { ascii: [0.22, 0.25, 0.3], hangul: [0.6, 0.8, 1.0], cjk: [0.7, 0.9, 1.2], other: [1, 1.5, 2] },
  claudeLegacy: LEGACY_CLAUDE,
  claude: scale(LEGACY_CLAUDE, 1.3),
  gemini: { ascii: [0.22, 0.25, 0.3], hangul: [0.5, 0.7, 0.9], cjk: [0.6, 0.8, 1.0], other: [1, 1.5, 2] },
  deepseek: { ascii: [0.25, 0.3, 0.35], hangul: [0.6, 0.8, 1.1], cjk: [0.5, 0.6, 0.7], other: [1, 1.5, 2] },
}

export interface TextStats { ascii: number; hangul: number; cjk: number; other: number; chars: number; words: number; lines: number }

export function textStats(text: string): TextStats {
  const s = { ascii: 0, hangul: 0, cjk: 0, other: 0 }
  for (const ch of text) {
    const c = ch.codePointAt(0)!
    if (c < 128) s.ascii++
    else if ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3130 && c <= 0x318f)) s.hangul++
    else if ((c >= 0x3040 && c <= 0x30ff) || (c >= 0x3400 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff)) s.cjk++
    else s.other++
  }
  return {
    ...s,
    chars: s.ascii + s.hangul + s.cjk + s.other,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: text ? text.split('\n').length : 0,
  }
}

export interface TokenEstimate { low: number; mid: number; high: number }

export function estimateTokens(stats: TextStats, tok: Tokenizer): TokenEstimate {
  const r = TOKEN_RATES[tok]
  const at = (i: 0 | 1 | 2) =>
    Math.ceil(stats.ascii * r.ascii[i] + stats.hangul * r.hangul[i] + stats.cjk * r.cjk[i] + stats.other * r.other[i])
  return { low: at(0), mid: at(1), high: at(2) }
}

// ── 비용 ──
export interface Scenario {
  /** 하루 요청 수 */
  rpd: number
  /** 요청당 입력 토큰 */
  inTok: number
  /** 요청당 출력 토큰 */
  outTok: number
  /** 입력 중 캐시 가능한 고정 앞부분(시스템 프롬프트·문서) 비율 0~100 */
  prefixPct: number
  /** 그 앞부분이 캐시에 적중하는 요청 비율 0~100 (나머지는 캐시 쓰기) */
  hitPct: number
  batch: boolean
  /** 한 달 일수 */
  days?: number
}

export interface Cost { input: number; cacheRead: number; cacheWrite: number; output: number; total: number }

const clampPct = (x: number) => Math.min(100, Math.max(0, Number.isFinite(x) ? x : 0)) / 100
const nn = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0)

/** 요청당 입력 토큰 수에 따라 적용되는 단가 (장문 단가 포함) */
export function tierPrice(m: LlmModel, inTok: number): Price {
  return m.long && inTok > m.long.over ? m.long : m.price
}

/** 요청 1건 비용(USD). batch 요청했지만 미지원 모델이면 할인 없이 계산 */
export function requestCost(m: LlmModel, s: Scenario): Cost {
  const p = tierPrice(m, nn(s.inTok))
  const b = s.batch && m.batch != null ? m.batch : 1
  const inTok = nn(s.inTok)
  const prefix = inTok * clampPct(s.prefixPct)
  const hit = clampPct(s.hitPct)
  const input = ((inTok - prefix) * p.input * b) / M
  const cacheRead = (prefix * hit * p.cached * (m.batchCachedFull ? 1 : b)) / M
  const cacheWrite = (prefix * (1 - hit) * (p.cacheWrite ?? p.input) * b) / M
  const output = (nn(s.outTok) * p.output * b) / M
  return { input, cacheRead, cacheWrite, output, total: input + cacheRead + cacheWrite + output }
}

const mul = (c: Cost, k: number): Cost => ({
  input: c.input * k, cacheRead: c.cacheRead * k, cacheWrite: c.cacheWrite * k, output: c.output * k, total: c.total * k,
})

export interface ScenarioCost { perReq: Cost; daily: Cost; monthly: Cost; noCacheMonthly: number; savedMonthly: number; batchApplied: boolean }

export function scenarioCost(m: LlmModel, s: Scenario): ScenarioCost {
  const perReq = requestCost(m, s)
  const days = s.days ?? 30
  const daily = mul(perReq, nn(s.rpd))
  const monthly = mul(daily, days)
  const noCacheMonthly = requestCost(m, { ...s, prefixPct: 0 }).total * nn(s.rpd) * days
  return { perReq, daily, monthly, noCacheMonthly, savedMonthly: noCacheMonthly - monthly.total, batchApplied: s.batch && m.batch != null }
}

/** 컨텍스트 적합 여부: 입력+출력 ≤ 컨텍스트, 입력 ≤ 최대 입력, 출력 ≤ 최대 출력 */
export function contextFit(m: LlmModel, inTok: number, outTok: number) {
  const inLimit = Math.min(m.maxInput ?? m.ctx, m.ctx - Math.min(nn(outTok), m.maxOutput))
  const usedPct = ((nn(inTok) + nn(outTok)) / m.ctx) * 100
  return { ok: nn(inTok) <= inLimit && nn(outTok) <= m.maxOutput, usedPct, inLimit, outOver: nn(outTok) > m.maxOutput }
}

/** 모델 비교: 월 비용 오름차순 */
export function compareModels(models: LlmModel[], s: Scenario, inTokOf: (m: LlmModel) => number = () => s.inTok) {
  return models
    .map((m) => {
      const sc = { ...s, inTok: inTokOf(m) }
      return { model: m, inTok: sc.inTok, cost: scenarioCost(m, sc), fit: contextFit(m, sc.inTok, s.outTok) }
    })
    .sort((a, b) => a.cost.monthly.total - b.cost.monthly.total)
}

export function fmtUSD(n: number): string {
  if (n === 0) return '$0'
  if (n < 0.0001) return '<$0.0001'
  if (n < 1) return `$${n.toFixed(4)}`
  if (n < 1000) return `$${n.toFixed(2)}`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export function fmtKRW(usd: number, rate: number): string {
  const w = usd * rate
  if (w > 0 && w < 1) return '<₩1'
  // 캐시 적중률이 낮으면 쓰기 할증(1.25x) 때문에 절감액이 음수일 수 있음
  return `${w <= -0.5 ? '-' : ''}₩${Math.abs(Math.round(w)).toLocaleString('ko-KR')}`
}

export function fmtTokens(n: number): string {
  if (n >= M) return `${+(n / M).toFixed(2)}M`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`
  return String(n)
}

/** 비교표 → 마크다운 */
export function toMarkdown(headers: string[], rows: string[][]): string {
  const esc = (c: string) => c.replace(/\|/g, '\\|')
  const line = (cells: string[]) => `| ${cells.map(esc).join(' | ')} |`
  return [line(headers), `|${headers.map((_, i) => (i === 0 ? ' --- ' : ' ---: ')).join('|')}|`, ...rows.map(line)].join('\n')
}
