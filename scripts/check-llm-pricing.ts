// LLM 비용 계산 회귀 체크: node scripts/check-llm-pricing.ts
import assert from 'node:assert/strict'
import {
  MODELS, VENDORS, textStats, estimateTokens, requestCost, scenarioCost, contextFit, compareModels, tierPrice, toMarkdown, fmtUSD, fmtKRW,
} from '../src/utils/llmPricing.ts'

const m = (id: string) => MODELS.find((x) => x.id === id)!
const close = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`)

// 데이터 무결성
assert.equal(new Set(MODELS.map((x) => x.id)).size, MODELS.length, 'id 중복')
for (const x of MODELS) {
  assert.ok(VENDORS[x.vendor], x.id)
  assert.ok(x.price.cached < x.price.input && x.price.input <= x.price.output, `${x.id} 단가 순서`)
  if (x.long) assert.ok(x.long.input > x.price.input && x.long.over < x.ctx, `${x.id} 장문 단가`)
}

// 1M 입력 + 1M 출력, 캐시 없음 = 입력단가 + 출력단가
const base = { rpd: 1, inTok: 1_000_000, outTok: 1_000_000, prefixPct: 0, hitPct: 0, batch: false }
close(requestCost(m('claude-sonnet-5-5'), base).total, 12, 'Sonnet 5.5 기본')
// 배치 50%
close(requestCost(m('claude-sonnet-5-5'), { ...base, batch: true }).total, 6, 'Sonnet 5.5 배치')
// 배치 미지원 → 할인 없음
close(requestCost(m('deepseek-flash'), { ...base, batch: true }).total, 1.5, 'DeepSeek 배치 없음')
assert.equal(scenarioCost(m('deepseek-flash'), { ...base, batch: true }).batchApplied, false)

// 캐시: 앞부분 100%, 적중 100% → 캐시 읽기 단가
close(requestCost(m('claude-opus-5-5'), { ...base, outTok: 0, prefixPct: 100, hitPct: 100 }).total, 0.2, 'Opus 5.5 캐시 적중')
// 적중 0% → 캐시 쓰기 단가(1.25x)
close(requestCost(m('claude-opus-5-5'), { ...base, outTok: 0, prefixPct: 100, hitPct: 0 }).total, 5, 'Opus 5.5 캐시 쓰기')
// 캐시 쓰기 단가 없는 모델은 입력 단가
close(requestCost(m('gemini-3.5-flash'), { ...base, outTok: 0, prefixPct: 100, hitPct: 0 }).total, 1.5, 'Gemini 캐시 쓰기=입력')
// 50/50 혼합
close(requestCost(m('claude-sonnet-5-5'), { ...base, outTok: 0, prefixPct: 50, hitPct: 50 }).total, 0.5 * 2 + 0.25 * 0.2 + 0.25 * 2.5, 'Sonnet 혼합')
// Gemini 3.1 Pro 배치: 캐시 적중은 할인 없음
close(requestCost(m('gemini-3.1-pro-preview'), { ...base, inTok: 100_000, outTok: 0, prefixPct: 100, hitPct: 100, batch: true }).total, 0.1 * 0.2, 'Gemini Pro 배치 캐시')

// 장문 단가: 272K 초과 시 전체 요청에 적용
assert.equal(tierPrice(m('gpt-6.1-sol'), 272_000).input, 2)
assert.equal(tierPrice(m('gpt-6.1-sol'), 272_001).input, 4)
close(requestCost(m('gpt-6.1-sol'), { ...base, inTok: 500_000, outTok: 0 }).total, 0.5 * 4, 'GPT-6.1 Sol 장문')

// 월 = 일 × 30, 절감액
const s = { rpd: 1000, inTok: 2000, outTok: 500, prefixPct: 50, hitPct: 90, batch: false }
const sc = scenarioCost(m('claude-sonnet-5-5'), s)
close(sc.monthly.total, sc.daily.total * 30, '월 비용')
close(sc.daily.total, sc.perReq.total * 1000, '일 비용')
assert.ok(sc.savedMonthly > 0 && sc.monthly.total < sc.noCacheMonthly, '캐싱 절감')
// 잘못된 입력은 0으로
assert.equal(requestCost(m('gpt-6-luna'), { ...s, inTok: NaN, outTok: -5 }).total, 0)

// 컨텍스트
assert.equal(contextFit(m('claude-haiku-4-5'), 190_000, 5_000).ok, true)
assert.equal(contextFit(m('claude-haiku-4-5'), 199_000, 5_000).ok, false)
assert.equal(contextFit(m('gpt-6-astra'), 950_000, 1_000).ok, false, 'OpenAI 최대 입력 922K')
assert.equal(contextFit(m('gemini-3.5-flash'), 1000, 70_000).outOver, true, '최대 출력 초과')

// 비교: 오름차순
const rows = compareModels(MODELS, s)
for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].cost.monthly.total <= rows[i].cost.monthly.total)

// 토큰 추정
const en = textStats('Hello world, this is a test.')
assert.equal(en.ascii, 28)
assert.equal(en.words, 6)
const ko = textStats('안녕하세요 반갑습니다')
assert.equal(ko.hangul, 10)
assert.equal(ko.ascii, 1)
const e = estimateTokens(ko, 'openai')
assert.ok(e.low <= e.mid && e.mid <= e.high && e.mid > 0)
assert.ok(estimateTokens(ko, 'claude').mid > estimateTokens(ko, 'claudeLegacy').mid, 'Claude 새 토크나이저 +30%')
assert.equal(estimateTokens(textStats(''), 'gemini').mid, 0)
assert.equal(textStats('😀').other, 1, '이모지 1글자')

// 마크다운
assert.equal(toMarkdown(['a', 'b'], [['x|y', '1']]), '| a | b |\n| --- | ---: |\n| x\\|y | 1 |')
assert.equal(fmtUSD(0), '$0')
assert.equal(fmtUSD(12.345), '$12.35')
assert.equal(fmtKRW(-2, 1355), '-₩2,710')
assert.equal(fmtKRW(0.0001, 1355), '<₩1')

console.log('check-llm-pricing: OK')
