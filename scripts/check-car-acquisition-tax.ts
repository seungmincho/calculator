// 자동차 취득세 회귀 체크: node scripts/check-car-acquisition-tax.ts
// 기대값: 지방세법 제12조①2호 세율, 지방세특례제한법 제17·22조의2·66·67·177조의2·180조로 손계산
import { carAcqTax, carAcqRate, bondExempt, reliefAtStake, RELIEF_END, type CarAcqInput } from '../src/utils/carAcquisitionTax.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => { if (got !== want) { fail++; console.log('FAIL', name, got, '!=', want) } }
const base: CarAcqInput = { price: 40_000_000, carType: 'passenger', usage: 'personal', vanSeats: '7-10', motorcycleSize: 'small', electric: false, displacement: 1999, children: 0, disabled: false }
const c = (o: Partial<CarAcqInput>) => carAcqTax({ ...base, ...o })
const r = (o: Partial<CarAcqInput>) => carAcqRate({ ...base, ...o })

// 세율: 비영업 승용 7%, 경차 4%, 7~10인승 승용 7%, 11인승↑ 승합·화물 5%, 영업용 4%, 125cc 이하 이륜 2%, 초과 5%
eq('passenger 7%', r({}), 0.07)
eq('compact 4%', r({ carType: 'compact' }), 0.04)
eq('van 7-10 7%', r({ carType: 'van' }), 0.07)
eq('van 11+ 5%', r({ carType: 'van', vanSeats: '11+' }), 0.05)
eq('truck 5%', r({ carType: 'truck' }), 0.05)
eq('business 4%', r({ usage: 'business' }), 0.04)
eq('moto small 2%', r({ carType: 'motorcycle' }), 0.02)
eq('moto large 5%', r({ carType: 'motorcycle', motorcycleSize: 'large' }), 0.05)
eq('4000만 승용 280만', c({}).tax, 2_800_000)

// 경차 75만원 한도: 1,500만 → 60만 면제, 2,000만 → 80만 − 75만 = 5만
eq('compact 1500 free', c({ carType: 'compact', price: 15_000_000 }).tax, 0)
eq('compact 2000', c({ carType: 'compact', price: 20_000_000 }).tax, 50_000)
eq('compact business no relief', c({ carType: 'compact', usage: 'business', price: 15_000_000 }).tax, 600_000)
// 전기차 140만원 한도: 4,000만 → 280만 − 140만
eq('ev 4000', c({ electric: true }).tax, 1_400_000)
eq('ev 1800 free', c({ electric: true, price: 18_000_000 }).tax, 0)
// 다자녀: 2명 50%(승용 70만 한도), 3명 면제(승용 140만 한도), 7~10인승 3자녀 면제세액 200만 초과 → 85%
eq('child2 sedan', c({ children: 2 }).benefit, 700_000)
eq('child2 small', c({ children: 2, price: 10_000_000 }).benefit, 350_000)
eq('child2 van no cap', c({ children: 2, carType: 'van' }).benefit, 1_400_000)
eq('child3 sedan', c({ children: 3 }).benefit, 1_400_000)
eq('child3 van 85%', c({ children: 3, carType: 'van' }).tax, 420_000)
eq('child3 van <=200만 free', c({ children: 3, carType: 'van', price: 25_000_000 }).tax, 0)
// 장애인·국가유공자: 2,000cc 이하 면제, 초과는 감면 없음
eq('disabled', c({ disabled: true }).tax, 0)
eq('disabled 2500cc', c({ disabled: true, displacement: 2497 }).tax, 2_800_000)
eq('disabled 2500cc flag', c({ disabled: true, displacement: 2497 }).disabledBlocked, true)
// 중복 시 큰 것 하나 (제180조): 전기차 + 2자녀 → 140만
const both = c({ electric: true, children: 2 })
eq('max benefit', both.benefit, 1_400_000); eq('max key', both.benefitKey, 'electric')

// 감면 종료 시 늘어나는 세액 (다른 감면이 대신 들어오면 차액만)
eq('stake ev 4000', reliefAtStake({ ...base, electric: true }, 'electric'), 1_400_000)
eq('stake ev 1800', reliefAtStake({ ...base, electric: true, price: 18_000_000 }, 'electric'), 1_260_000)
eq('stake ev+child2', reliefAtStake({ ...base, electric: true, children: 2 }, 'electric'), 700_000)
eq('stake ev+disabled', reliefAtStake({ ...base, electric: true, disabled: true }, 'electric'), 0)
eq('stake not ev', reliefAtStake(base, 'electric'), 0)
eq('stake compact 2000', reliefAtStake({ ...base, carType: 'compact', price: 20_000_000 }, 'compact'), 750_000)
eq('stake compact 1400', reliefAtStake({ ...base, carType: 'compact', price: 14_000_000 }, 'compact'), 560_000)
eq('drop keeps others', carAcqTax({ ...base, electric: true, children: 2 }, 'electric').benefitKey, 'child2')
eq('ev end', RELIEF_END.electric, '2026-12-31'); eq('compact end', RELIEF_END.compact, '2027-12-31')

// 채권: 비영업 승용 1,600cc 미만 면제
eq('bond exempt 1598', bondExempt({ ...base, displacement: 1598 }), true)
eq('bond 1999', bondExempt(base), false)
eq('bond compact', bondExempt({ ...base, carType: 'compact', displacement: 0 }), true)
eq('bond business', bondExempt({ ...base, usage: 'business', displacement: 1598 }), false)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-car-acquisition-tax: all passed')
