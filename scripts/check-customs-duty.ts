// 해외직구 관부가세 회귀 체크: node scripts/check-customs-duty.ts
import { calc, limitUsd, item, ITEMS, type Input } from '../src/utils/customsDuty.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = typeof want === 'number' ? Math.abs((got as number) - want) < 1e-6 : got === want
  if (!ok) { fail++; console.log('FAIL', name, got, '!=', want) }
}
const base: Input = {
  origin: 'us', clearance: 'list', cur: 'USD', price: 0, local: 0, ship: 0, other: 0,
  rate: 1357.14, usdRate: 1357.14, dutyRate: 13, luxury: false,
}
const r = (p: Partial<Input>) => calc({ ...base, ...p })

// 한도: 미국 목록통관 $200, 그 외·일반신고 $150 (미국 일반신고도 $150)
eq('limit us list', limitUsd('us', 'list'), 200)
eq('limit other list', limitUsd('other', 'list'), 150)
eq('limit us general', limitUsd('us', 'general'), 150)
eq('limit other general', limitUsd('other', 'general'), 150)

// 경계: 정확히 한도 = 면세, 1센트 초과 = 과세
eq('us $200 exempt', r({ price: 200 }).exempt, true)
eq('us $200 remain 0', r({ price: 200 }).remainUsd, 0)
eq('us $200.01 taxed', r({ price: 200.01 }).exempt, false)
eq('us $200.01 over', r({ price: 200.01 }).overUsd, 0.01)
eq('float 199.99+0.01 exempt', r({ price: 199.99, local: 0.01 }).exempt, true)
eq('other $150 exempt', r({ origin: 'other', price: 150 }).exempt, true)
eq('other $150.01 taxed', r({ origin: 'other', price: 150.01 }).exempt, false)
eq('us general $150 exempt', r({ clearance: 'general', price: 150 }).exempt, true)
eq('us general $151 taxed', r({ clearance: 'general', price: 151 }).exempt, false)
eq('us list $180 remain', r({ price: 180 }).remainUsd, 20)

// 현지 세금·배송비는 판정에 포함, 국제 배송비는 제외
eq('local tax counts', r({ price: 190, local: 15 }).exempt, false)
eq('intl ship excluded', r({ price: 190, ship: 30 }).exempt, true)
eq('ship risk flagged', r({ price: 190, ship: 30 }).shipRisk, true)
eq('no ship risk when small', r({ price: 150, ship: 30 }).shipRisk, false)

// 과세 시 과세가격엔 국제 배송비 포함: $210 + $30 → 240 × 1357.14 = 325,713
let x = r({ price: 210, ship: 30 })
eq('value incl ship', x.value, 325_713)
eq('duty 13%', x.tax.duty, 42_342) // 42,342.69
eq('vat', x.tax.vat, 36_805) // (325,713 + 42,342) × 10%
eq('total', x.total, 79_147)
eq('totalKrw', x.totalKrw, 325_713 + 79_147)

// 면세면 세금 0
eq('exempt no tax', r({ price: 100, ship: 20 }).total, 0)

// 최저한: 세액 1만원 미만 미징수 — 관세 9,664원 면제, 부가세 13,046원 징수
x = r({ origin: 'other', price: 151, rate: 800, usdRate: 800, dutyRate: 8 })
eq('min value', x.value, 120_800)
eq('min duty raw', x.raw.duty, 9_664)
eq('min duty waived', x.tax.duty, 0)
eq('min vat kept', x.tax.vat, 13_046) // (120,800 + 9,664) × 10%
eq('min waived list', x.waived.join(), 'duty')
// 관세 0%(도서): 관세 0은 면제 목록에 넣지 않음
x = r({ origin: 'other', cur: 'KRW', price: 205_000, rate: 1, dutyRate: 0 })
eq('krw usd conv taxed', x.exempt, false) // 205,000 / 1,357.14 = $151.05
eq('book duty 0', x.tax.duty, 0)
eq('book vat', x.tax.vat, 20_500)
eq('book waived none', x.waived.length, 0)

// 합산과세: 같은 판매자·같은 날 구매 분할 — 각각 한도 이내여도 합계 초과면 과세
x = r({ origin: 'other', price: 100, other: 60 })
eq('combined taxed', x.exempt, false)
eq('combined flag', x.combined, true)
eq('combined value', x.value, Math.floor(160 * 1357.14))
x = r({ origin: 'other', price: 70, other: 60 })
eq('combined within', x.exempt, true)
eq('combined within flag', x.combined, false)
eq('own over not combined flag', r({ origin: 'other', price: 160, other: 10 }).combined, false)

// 통화 환산: 관세청 페이지 $150 = 132 EUR, 23,635 JPY (과세환율 USD 1357.14, EUR 1537.92, JPY 8.6131)
const eur = { origin: 'other' as const, cur: 'EUR' as const, rate: 1537.92 }
eq('eur 132 exempt', r({ ...eur, price: 132 }).exempt, true)
eq('eur 133 taxed', r({ ...eur, price: 133 }).exempt, false)
const jpy = { origin: 'other' as const, cur: 'JPY' as const, rate: 8.6131 }
eq('jpy 23635 exempt', r({ ...jpy, price: 23_635 }).exempt, true)
eq('jpy 23640 taxed', r({ ...jpy, price: 23_640 }).exempt, false)
eq('eur remainFx', Math.round(r({ ...eur, price: 100 }).remainFx * 100) / 100, 32.37) // (150 − 113.24) × 1357.14 / 1537.92

// 고급 시계: 개당 200만원 초과분 개별소비세 20%, 교육세 30%
x = r({ price: 3000, dutyRate: 8, luxury: true })
eq('lux value', x.value, 4_071_420)
eq('lux duty', x.tax.duty, 325_713)
eq('lux excise', x.tax.excise, 479_426) // (4,071,420 + 325,713 − 2,000,000) × 20%
eq('lux edu', x.tax.edu, 143_827)
eq('lux vat', x.tax.vat, 502_038)
eq('lux total', x.total, 1_451_004)
eq('lux under base no excise', r({ price: 1000, dutyRate: 8, luxury: true }).tax.excise, 0)

// FTA(관세 0%) → 부가세만
x = r({ price: 300, dutyRate: 0 })
eq('fta duty 0', x.tax.duty, 0)
eq('fta vat', x.tax.vat, Math.floor(Math.floor(300 * 1357.14) * 0.1))

// 프리셋: 전자제품·건강기능식품은 일반수입신고(목록통관 배제)
eq('it general', item('it').clearance, 'general')
eq('supplement general', item('supplement').clearance, 'general')
eq('it 0%', item('it').rate, 0)
eq('clothes 13%', item('clothes').rate, 13)
eq('ids unique', new Set(ITEMS.map((i) => i.id)).size, ITEMS.length)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('customs-duty: all ok')
