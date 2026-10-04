// 배송비 회귀 체크: node scripts/check-shipping.ts
// 기준: 우정사업본부 국내소포 요금표(2025.6.1 적용) https://koreapost.go.kr/kpost/subIndex/201.do
//       "중량 단계와 크기 단계가 상이한 경우 높은 단계를 기준" · CJ대한통운 "크기와 중량 중 큰 값"
import { CARRIER_DATA, getCarrierPrice, sizeCutSaving } from '../src/utils/shippingRates.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => { if (got !== want) { fail++; console.log('FAIL', name, got, '!=', want) } }
const c = (id: string) => CARRIER_DATA.find((x) => x.id === id)!
const price = (id: string, kg: number, cm: number, dest: 'mainland' | 'jeju' | 'island' = 'mainland') => getCarrierPrice(c(id), kg, cm, dest)

// 우체국 등기소포: 무게만 보면 3kg 4,000원
eq('reg 2kg 65cm', price('post_registered', 2, 65), 4000)
// 크기 단계가 더 높으면 크기 기준: 2kg·90cm → 80~100cm 첫 단계(3~5kg) 4,500
eq('reg 2kg 90cm', price('post_registered', 2, 90), 4500)
// 2kg·110cm → 100~120cm 첫 단계(7~10kg) 6,000
eq('reg 2kg 110cm', price('post_registered', 2, 110), 6000)
// 3kg·150cm → 120~160cm(25~30kg) 13,000 (예전 부피무게 ÷6000 방식은 이보다 낮게 나왔음)
eq('reg 3kg 150cm', price('post_registered', 3, 150), 13000)
// 무게 단계가 더 높으면 무게 기준: 18kg·60cm → 15~20kg 8,000
eq('reg 18kg 60cm', price('post_registered', 18, 60), 8000)
eq('reg jeju same', price('post_registered', 2, 65, 'jeju'), 4000)
eq('reg 31kg', price('post_registered', 31, 60), null)
eq('reg 161cm', price('post_registered', 1, 161), null)
// 일반소포 D+3: 2,700~11,700
eq('regular 1kg 50cm', price('post_regular', 1, 50), 2700)
eq('regular 25kg 120cm', price('post_regular', 25, 120), 9700)
// 방문접수: 5kg(80cm) 5,000 / 10kg(100cm) 8,000 / 20kg(120cm) 10,000 / 30kg(160cm) 14,000
eq('visit 1kg 70cm', price('post_visit', 1, 70), 5000)
eq('visit 1kg 95cm', price('post_visit', 1, 95), 8000)
eq('visit 25kg 100cm', price('post_visit', 25, 100), 14000)
// 롯데: 소 5kg/110cm 6,000 · 중 15kg/130cm 7,000 · 대 20kg/160cm 8,000 (타권역)
eq('lotte 3kg 100cm', price('lotte', 3, 100), 6000)
eq('lotte 3kg 120cm', price('lotte', 3, 120), 7000)
eq('lotte 3kg 150cm jeju', price('lotte', 3, 150, 'jeju'), 10000)
// 로젠: 5kg/100cm 7,000 · 10kg/120cm 8,000 · 20kg/140cm 10,000 · 25kg/160cm 13,000 (타권역)
eq('logen 4kg 130cm', price('logen', 4, 130), 10000)
// 크기 단계가 없는 업체는 무게만 (업체 최대 크기 안에서)
eq('gs half 1kg 80cm', price('gs_halfprice', 1, 80), 2300)
eq('gs half 1kg 81cm', price('gs_halfprice', 1, 81), null)
// 표 생성용 호출(크기 0)은 무게 단계 그대로
eq('table cj 2kg', price('cj', 2, 0), 5000)

// 크기 줄이기 힌트: 2kg·110cm 일반소포(10kg/120 단계 4,700) → 100cm로 10cm 줄이면 5kg/100 단계 3,200
const cut = (id: string, kg: number, cm: number) => JSON.stringify(sizeCutSaving(c(id), kg, cm, 'mainland'))
eq('cut regular 2kg 110cm', cut('post_regular', 2, 110), JSON.stringify({ cut: 10, price: 3200, saving: 1500 }))
// 무게가 단계를 정하면 크기를 줄여도 그대로 → 힌트 없음
eq('cut regular 9kg 110cm', cut('post_regular', 9, 110), 'null')
eq('cut regular 2kg 65cm', cut('post_regular', 2, 65), 'null')
// 소수 세 변 합은 소수 1자리 cut
eq('cut visit 1kg 80.5cm', cut('post_visit', 1, 80.5), JSON.stringify({ cut: 0.5, price: 5000, saving: 3000 }))
// 크기 단계 없는 업체·접수 불가는 힌트 없음
eq('cut seven', cut('seven', 2, 150), 'null')
eq('cut over max', cut('lotte', 2, 170), 'null')

console.log(fail ? `${fail} failed` : 'all shipping checks passed'); if (fail) process.exit(1)
