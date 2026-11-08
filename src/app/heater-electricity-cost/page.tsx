import { Metadata } from 'next'
import HeaterElectricityCostCalculator from '@/components/HeaterElectricityCostCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, compare, optsOf, EXAMPLES, DEFAULTS, SIM_HOURS, PRESET, type Kind } from '@/utils/heaterElectricityCost'
import { calcBill, TARIFF, LIMITS, SUPER_USER_KWH, RATE_DATE } from '@/utils/electricityBill'
import { AMOUNT, EV_YEAR, USE_PERIOD } from '@/utils/energyVoucher'

export const metadata: Metadata = {
  title: '난방기구 전기세 계산기 - 전기장판·온풍기 | 툴허브',
  description: '전기장판·온수매트·온풍기·라디에이터·전기히터를 하루 몇 시간 쓰면 이번 달 전기요금이 얼마나 오르는지 계산합니다. 평소 사용량 위에 얹어 겨울 누진 구간(200·400kWh)까지 반영하고, 기구별 요금 비교와 구간을 내려가는 방법을 보여 줍니다.',
  keywords: '난방기구 전기세, 전기장판 전기세, 온풍기 전기세, 라디에이터 전기세, 전기히터 전기요금, 온수매트 전기세, 카본히터 전기세, 전기난로 전기세, 겨울 전기요금 누진제, 난방 전기요금 계산기',
  openGraph: {
    title: '난방기구 전기세 계산기 - 전기장판·온풍기 | 툴허브',
    description: '전기장판·온풍기·라디에이터를 켜면 이번 달 전기요금이 얼마나 오르는지, 누진 구간까지.',
    url: 'https://toolhub.ai.kr/heater-electricity-cost/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/heater-electricity-cost.png', width: 1200, height: 630, alt: '난방기구 전기세 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '난방기구 전기세 계산기 | 툴허브', description: '전기장판·온풍기·라디에이터 전기세, 누진 구간 반영', images: ['https://toolhub.ai.kr/og/heater-electricity-cost.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/heater-electricity-cost/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-heater-electricity-cost.ts가 고정)
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
const D = analyze(EXAMPLES.d)
const M = analyze(EXAMPLES.mat)
const WM = analyze(EXAMPLES.waterMat)
const C = Object.fromEntries(compare(DEFAULTS.base, SIM_HOURS, optsOf(1, 'low')).map((x) => [x.kind, x])) as Record<Kind, ReturnType<typeof compare>[number]>
const SUMMER = calcBill(D.after.kwh, { season: 'summer', month: 7 })
const save = D.tip?.kind === 'above' ? D.tip.save : 0
const [L1, L2] = LIMITS.winter
const LOW = TARIFF.low
const evEnd = (([y, m, d]) => `${y}년 ${+m}월 ${+d}일`)(USE_PERIOD.end.split('-'))
const w = (k: Kind) => `${PRESET[k].watt.toLocaleString('ko-KR')}W`

const faqs = [
  { q: '전기장판 한 달 전기세는 얼마인가요?', a: `늘어난 사용량(소비전력 × 사용 시간)에 누진 요금을 매겨 계산합니다. 정격 ${w('mat')} 전기장판을 하루 8시간씩 30일 켜면 ${M.kwh}kWh입니다. 평소 ${DEFAULTS.base}kWh를 쓰는 집(주택용 저압, 1월)이라면 요금이 ${won(M.before.total)}에서 ${won(M.after.total)}으로 ${won(M.extra)} 늘어납니다. 온도를 낮게 두면 히터가 꺼졌다 켜졌다 해서 실제 사용량은 이보다 적습니다.` },
  { q: '온풍기 전기세는 왜 비싼가요?', a: `소비전력이 크기 때문입니다. 정격 ${w('fanHeater')} 온풍기는 ${w('mat')} 전기장판 ${PRESET.fanHeater.watt / PRESET.mat.watt}개를 켠 것과 같아 1시간에 ${PRESET.fanHeater.watt / 1000}kWh를 씁니다. 하루 ${SIM_HOURS}시간씩 30일이면 ${C.fanHeater.kwh}kWh로, 평소 ${DEFAULTS.base}kWh인 집의 1월 요금이 ${won(C.fanHeater.extra)} 늘어납니다. 같은 ${SIM_HOURS}시간이면 전기장판은 ${won(C.mat.extra)}입니다. 온풍기는 방 공기를 데우고 전기장판은 몸에 닿는 곳만 데우므로, 오래 머물 때는 전기장판·전기요를 쓰고 온풍기는 잠깐 공기를 데울 때만 쓰는 편이 전기요금에 유리합니다.` },
  { q: '겨울에도 전기요금 누진제가 적용되나요?', a: `적용됩니다. 주택용 전기요금은 동계(12~2월)에도 ${L1}kWh·${L2}kWh를 경계로 3단계 누진이 적용되고, 여름(7~8월)만 ${LIMITS.summer[0]}·${LIMITS.summer[1]}kWh로 완화됩니다. 주택용 저압 기준으로 ${L2}kWh를 넘으면 kWh당 전력량요금이 ${LOW.rate[1]}원에서 ${LOW.rate[2]}원으로, 기본요금이 ${LOW.base[1].toLocaleString('ko-KR')}원에서 ${LOW.base[2].toLocaleString('ko-KR')}원으로 오릅니다. 동계에는 ${SUPER_USER_KWH.toLocaleString('ko-KR')}kWh를 넘은 사용량에 kWh당 ${LOW.superRate}원의 슈퍼유저 요금도 붙습니다. 평소 ${DEFAULTS.base}kWh에 전기장판 8시간·온풍기 2시간을 더하면 ${D.after.kwh}kWh로 3구간에 들어가 요금이 ${won(D.extra)} 늘어나는데, ${D.after.kwh - L2}kWh만 덜 쓰면 2구간으로 내려가 ${won(save)}을 아낄 수 있습니다. 같은 ${D.after.kwh}kWh라도 7~8월이었다면 2구간이라 ${won(SUMMER.total)}입니다.` },
  { q: '전기장판과 온수매트 중 전기세가 덜 나오는 쪽은?', a: `정격 소비전력이 낮은 쪽입니다. 온수매트는 물을 데우는 히터와 순환 펌프로 돌아가고, 소비전력은 두 제품 모두 크기·제품마다 다릅니다. 이 계산기의 예시 값(전기장판 ${w('mat')}, 온수매트 ${w('waterMat')})으로 하루 8시간 30일을 켜면 전기장판 ${M.kwh}kWh(요금 +${won(M.extra)}), 온수매트 ${WM.kwh}kWh(+${won(WM.extra)})입니다(평소 ${DEFAULTS.base}kWh, 1월). 두 제품 모두 설정 온도에 닿으면 히터가 쉬므로 실제 사용량은 온도 설정·이불·실내 온도에 따라 정격보다 적습니다. 정확히 비교하려면 두 제품 라벨의 정격 소비전력을 넣어 계산하세요.` },
  { q: '오일 라디에이터는 전기를 덜 쓰나요?', a: `오일 라디에이터는 안의 기름을 데워 천천히 열을 내므로 꺼도 한동안 따뜻하지만, 히터가 켜져 있는 동안 쓰는 전력은 정격 소비전력 그대로입니다. 정격 ${w('radiator')} 제품을 최대 출력으로 하루 ${SIM_HOURS}시간씩 30일 쓰면 ${C.radiator.kwh}kWh, 요금 +${won(C.radiator.extra)}입니다. 출력 단계를 낮추거나 온도조절기가 히터를 끄는 시간만큼 실제 사용량은 줄어듭니다.` },
  { q: '난방기구 전기요금을 줄이는 방법은?', a: `타이머로 잠든 뒤 꺼지게 하면 하루 사용 시간이 그만큼 줄어듭니다. 문풍지·창문 단열 필름·두꺼운 커튼으로 열이 새는 것을 막으면 온도조절 제품은 히터가 켜지는 시간이 줄어듭니다. 온풍기·전기난로처럼 소비전력이 큰 제품은 잠깐만 쓰고, 오래 머물 때는 몸 가까이 데우는 전기장판·전기요를 쓰세요. 사용량이 누진 경계(${L1}·${L2}kWh) 바로 위라면 조금만 줄여도 아래 구간으로 내려가 요금이 크게 줄어듭니다.` },
  { q: '가스보일러 난방비와 비교하면 어떤가요?', a: '가스보일러는 집 전체를 데우고 도시가스 요금(사용량 MJ 기준)으로 계산하므로 같은 기준으로 바로 비교하기 어렵습니다. 보일러 온도를 낮추고 전기장판을 함께 쓰는 집이 많은데, 이때는 가스 요금 계산기로 보일러 쪽을, 이 계산기로 전기 쪽을 각각 계산해 더해 보세요.' },
  { q: '에너지바우처로 전기요금을 낼 수 있나요?', a: `${EV_YEAR}년 에너지바우처는 기초생활수급(생계·의료·주거·교육급여) 가구 가운데 노인·영유아·장애인·임산부 등이 있는 가구에 주는 냉난방비 지원으로, 세대원 수에 따라 ${won(AMOUNT[1].total)}~${won(AMOUNT[4].total)}입니다. 전기요금에서 바로 차감받을 수 있고 ${evEnd}까지 씁니다. 대상 여부와 금액은 에너지바우처 계산기에서 확인하세요.` },
  { q: '계산 결과가 실제 고지서와 다른 이유는?', a: `한전 주택용 요금표(요금 기준일 ${RATE_DATE})로 기본요금·전력량요금·기후환경요금·연료비조정요금·부가가치세·전력산업기반기금을 계산한 예상액입니다. 검침일에 따라 두 달 요금이 나뉘어 계산되는 경우, 아파트 공용전기·TV 수신료·복지할인은 반영하지 않았습니다. 난방기구는 정격 소비전력으로 계산하므로 온도조절로 히터가 쉬는 시간만큼 실제 사용량은 적습니다. 복지할인은 전기요금 계산기에서 함께 계산할 수 있습니다.` },
]

const sources = [
  { label: '한국전력공사 — 주택용 전력 요금표(저압·고압, 계절별 누진 구간)', url: 'https://cyber.kepco.co.kr/ckepco/front/jsp/CY/E/E/CYEEHP00101.jsp' },
  { label: '한국전력공사 — 기후환경요금', url: 'https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00211.jsp' },
  { label: '한국전력공사 — 연료비조정요금', url: 'https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00210.jsp' },
  { label: '한국에너지공단 — 에너지바우처 지원 대상·금액', url: 'https://www.energyv.or.kr/info/support_info.do' },
]

export default function HeaterElectricityCostPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '난방기구 전기세 계산기',
    description: '전기장판·온수매트·온풍기·라디에이터·전기히터 등 난방기구 사용 시간으로 이번 달 전기요금이 얼마나 오르는지 누진 구간까지 반영해 계산하는 도구.',
    url: 'https://toolhub.ai.kr/heater-electricity-cost/',
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['난방기구 여러 개 동시 계산', '전기장판·전기요·온수매트·온풍기·라디에이터·전기히터·카본히터·전기난로', '평소 사용량 위 증분 요금(누진 구간·기본요금 반영)', '동계·하계·기타 계절 월별 계산', '주택용 저압·고압', '누진 구간을 내려가는 데 줄일 사용량', '기구별 요금 비율', '같은 시간 기구별 요금 비교', '전기요금 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <HeaterElectricityCostCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">난방기구 전기세 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            난방기구 전기세 계산기는 전기장판·온수매트·온풍기·라디에이터 같은 난방기구를 하루 몇 시간, 한 달 며칠 쓰는지 넣으면 평소 전기 사용량 위에 그만큼을 얹어 이번 달 전기요금이 얼마나 오르는지 계산하는 도구입니다. 주택용 전기요금은 쓸수록 단가가 오르는 누진제라서 같은 난방기구라도 평소에 얼마나 쓰는 집이냐에 따라 늘어나는 요금이 다릅니다. 이 계산기는 &lsquo;난방 포함 요금 − 평소 요금&rsquo;으로 계산해 누진 구간·기본요금 변화까지 반영하고, 구간을 넘었다면 몇 kWh를 줄여야 아래 구간으로 내려가는지 알려 줍니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">예시 (평소 {DEFAULTS.base}kWh, 1월, 주택용 저압, 30일 사용)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>전기장판 {w('mat')} 하루 8시간 + 온풍기 {w('fanHeater')} 하루 2시간:</strong> {D.kwh}kWh 추가 → {D.after.kwh}kWh로 3구간, 요금 {won(D.before.total)} → {won(D.after.total)} (+{won(D.extra)})
            </li>
            <li>
              <strong>전기장판 {w('mat')} 하루 8시간만:</strong> {M.kwh}kWh 추가, 2구간 그대로 → +{won(M.extra)}
            </li>
            <li>
              <strong>하루 {SIM_HOURS}시간씩 쓰면:</strong> 전기장판 +{won(C.mat.extra)} · 전기요 +{won(C.blanket.extra)} · 온수매트 +{won(C.waterMat.extra)} · 카본히터 +{won(C.carbon.extra)} · 전기히터 +{won(C.heater.extra)} · 전기난로 +{won(C.stove.extra)} · 온풍기·라디에이터 +{won(C.fanHeater.extra)}
            </li>
          </ul>
          <p className="text-sm text-muted mb-6">
            소비전력은 흔한 제품의 정격 소비전력 예시입니다. 같은 종류라도 제품·출력 단계마다 다르니 제품 라벨이나 설명서의 정격 소비전력(W)을 넣어 계산하세요.
          </p>

          <p className="text-sm text-muted mb-6">
            상세 요금 내역과 복지할인은 <a href="/electricity-calculator/" className="text-primary hover:underline">전기요금 계산기</a>, 보일러 난방비는 <a href="/gas-bill/" className="text-primary hover:underline">가스 요금 계산기</a>, 냉난방비 지원은 <a href="/energy-voucher/" className="text-primary hover:underline">에너지바우처 대상·금액</a>에서 확인할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">요금 근거·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">요금 기준일 {RATE_DATE}(2026년 4분기) 한전 주택용 요금표 기준입니다.</p>
        </div>
      </section>
    </>
  )
}
