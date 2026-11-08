import { Metadata } from 'next'
import CardFeeCalculator from '@/components/CardFeeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, fees, RATES, DEFAULTS, type Bracket } from '@/utils/cardFee'

export const metadata: Metadata = {
  title: '카드 수수료 계산기 - 2026 우대수수료율 | 툴허브',
  description: '영세 신용 0.40%·체크 0.15%, 중소 1.00~1.45%(2026.8.14~). 연매출 구간과 월 카드매출로 월·연 카드 수수료, 부가세 신용카드매출세액공제(1.3%, 연 1천만원) 뒤 실부담을 계산합니다.',
  keywords: '카드 수수료 계산기, 카드수수료 계산, 가맹점 수수료, 우대수수료율, 영세가맹점 수수료율, 중소가맹점 수수료율, 2026 카드 수수료율, 체크카드 수수료율, 신용카드매출세액공제, 신규가맹점 수수료 환급, 일반가맹점 수수료율',
  openGraph: {
    title: '카드 수수료 계산기 - 2026 우대수수료율 | 툴허브',
    description: '연매출 구간별 우대수수료율로 월·연 카드 수수료, 부가세 세액공제 뒤 실부담, 구간이 오르면 더 내는 금액.',
    url: 'https://toolhub.ai.kr/card-fee-calculator/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/card-fee-calculator.png', width: 1200, height: 630, alt: '카드 수수료 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '카드 수수료 계산기 | 툴허브', description: '영세·중소가맹점 우대수수료율로 월·연 카드 수수료와 세액공제 뒤 실부담', images: ['https://toolhub.ai.kr/og/card-fee-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/card-fee-calculator/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-card-fee.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const at = (bracket: Bracket, monthly = DEFAULTS.monthly) => analyze({ ...DEFAULTS, bracket, monthly, rates: RATES[bracket] })
const D = at('small')
const M1 = at('mid1')
const BIG = at('mid2', 70_000_000)
const refundExample = fees(140_000_000, 0, { credit: 2.2, check: 0 }).fee - fees(140_000_000, 0, RATES.small).fee
const NAME: Record<Bracket, string> = { small: '영세', mid1: '중소1', mid2: '중소2', mid3: '중소3', general: '일반' }
const RANGE: Record<Bracket, string> = { small: '3억원 이하', mid1: '3억 초과 ~ 5억원 이하', mid2: '5억 초과 ~ 10억원 이하', mid3: '10억 초과 ~ 30억원 이하', general: '30억원 초과' }
const p = (n: number) => n.toFixed(2)

const faqs = [
  { q: '2026년 카드 우대수수료율은 얼마인가요?', a: `연매출 3억원 이하 영세가맹점은 신용카드 ${p(RATES.small.credit)}%·체크카드 ${p(RATES.small.check)}%, 3억~5억원은 ${p(RATES.mid1.credit)}%·${p(RATES.mid1.check)}%, 5억~10억원은 ${p(RATES.mid2.credit)}%·${p(RATES.mid2.check)}%, 10억~30억원은 ${p(RATES.mid3.credit)}%·${p(RATES.mid3.check)}%입니다. 2024년 말 카드수수료 적격비용 재산정에 따라 2025년 2월 14일부터 0.05~0.10%p 내린 값이고, 2026년 하반기(2026년 8월 14일~)에도 같은 수수료율이 적용됩니다.` },
  { q: '영세·중소가맹점 구간은 어떻게 정해지나요?', a: '카드 매출만이 아니라 현금 매출까지 합친 연매출이 기준이며, 국세청 과세자료 등으로 확인합니다. 연매출 3억원 이하는 영세가맹점, 30억원 이하는 중소가맹점입니다(여신전문금융업법 제18조의3). 구간은 반기마다 다시 정해져 2월 14일·8월 14일 무렵부터 새 수수료율이 적용되고, 여신금융협회가 대상 가맹점에 안내문을 보냅니다.' },
  { q: `월 카드매출 2,000만원이면 카드 수수료가 얼마인가요?`, a: `체크카드 비중을 25%로 잡으면 영세가맹점은 신용 1,500만원 × 0.40% + 체크 500만원 × 0.15% = 월 ${won(D.monthlyFee)}, 연 ${won(D.annualFee)}입니다. 같은 카드매출로 중소1(3억~5억원) 구간이면 연 ${won(M1.annualFee)}로 ${won(M1.annualFee - D.annualFee)} 더 냅니다. 체크카드 비중과 수수료율은 위 계산기에서 바꿀 수 있습니다.` },
  { q: '카드 수수료보다 부가세 세액공제가 더 크다는데 사실인가요?', a: `직전 연도 공급가액이 10억원 이하인 개인사업자가 신용카드·현금영수증으로 매출을 받으면 결제금액의 1.3%(2026년 12월 31일 공급분까지, 연 1,000만원 한도)를 부가세에서 빼 줍니다(부가가치세법 제46조). 영세가맹점이 월 2,000만원을 카드로 받으면 연 카드매출 2억 4,000만원 × 1.3% = ${won(D.taxCredit)}으로 연 카드 수수료 ${won(D.annualFee)}보다 많습니다. 다만 납부할 부가세를 넘는 부분은 돌려받지 못하고, 법인사업자와 소비자를 상대하지 않는 업종은 대상이 아닙니다.` },
  { q: '2027년부터 신용카드매출세액공제가 줄어드나요?', a: `1.3%·연 1,000만원 우대는 2026년 12월 31일 공급분까지입니다. 정부의 2026년 세제개편안은 2027년 1월 1일 공급분부터 2029년 말까지 1.2%·연 500만원 한도로 바꾸는 내용이며, 2026년 11월 현재 국회 심의 중입니다. 정부안대로라면 월 카드매출 7,000만원(연 8억 4,000만원)인 사업자의 공제는 ${won(BIG.taxCredit)}에서 ${won(BIG.taxCredit2027)}으로 줄어듭니다. 연말 국회 통과 결과를 확인하세요.` },
  { q: '새로 개업하면 카드 수수료를 더 내나요?', a: `새 가맹점은 매출 자료가 확인되기 전까지 일반가맹점 수수료율을 냅니다. 다음 반기 선정에서 영세·중소가맹점으로 확인되면 우대수수료율을 소급 적용해 차액을 카드대금 계좌로 돌려줍니다. 금융위원회 예시처럼 카드매출 1억 4,000만원에 일반가맹점 수수료율 2.2%를 냈다가 영세가맹점(0.4%)으로 확인되면 ${won(refundExample)}을 돌려받습니다. 2026년 상반기 신규가맹점 15.9만 곳은 2026년 9월 28일까지 평균 약 38.7만원을 환급받는다고 발표됐습니다.` },
  { q: '연매출 30억원이 넘는 일반가맹점 수수료율은 얼마인가요?', a: '일반가맹점 수수료율은 법으로 정한 값이 없고 카드사가 원가(적격비용)를 바탕으로 가맹점마다 정합니다. 카드사 공시에 따르면 직전 연도 신용카드업계 평균은 연매출 30억~100억원 가맹점이 신용 2.10%·체크 1.44% 수준입니다. 계산기 기본값은 이 참고값이니 카드사 통지서의 수수료율로 바꿔 계산하세요. 2024년 12월 카드업계는 수수료율이 오를 연매출 1,000억원 이하 일반가맹점의 수수료율을 3년간 동결하기로 했습니다.' },
  { q: '온라인 쇼핑몰이나 택시도 우대수수료율을 받나요?', a: '받습니다. 결제대행업체(PG)를 거쳐 카드결제를 받는 하위가맹점과 택시사업자도 연매출 구간에 따라 우대수수료율이 적용됩니다. 2026년 하반기에는 신용카드가맹점 309.4만 곳, PG 하위가맹점 199.9만 곳, 택시사업자 16.6만 곳이 대상입니다. PG 하위가맹점은 이용 중인 PG사에서 적용 수수료율을 확인합니다.' },
  { q: '내 가맹점에 적용 중인 수수료율은 어디서 확인하나요?', a: '여신금융협회 카드매출 조회 사이트(cardsales.or.kr)에서 가맹점수수료율 조회를 하거나, 여신금융협회 콜센터(02-2011-0700) 또는 각 카드사 홈페이지·콜센터에서 확인할 수 있습니다. 반기마다 받는 안내문에도 적힌 구간과 수수료율을 계산기에 넣으면 됩니다.' },
]

const sources = [
  { label: '금융위원회 보도자료 (2026.8.11) — 2026년 하반기 영세·중소가맹점 선정결과, 2026년 상반기 신규가맹점 환급', url: 'https://www.fsc.go.kr/no010101/87498' },
  { label: '금융위원회 보도자료 (2026.2.12) — 2026년 상반기 영세·중소가맹점 선정결과, 2025년 하반기 신규가맹점 환급', url: 'https://www.fsc.go.kr/no010101/86274' },
  { label: '금융위원회 보도자료 (2025.2.13) — 새로운 우대수수료율(2025.2.14~) 적용 영세·중소가맹점 선정결과', url: 'https://www.fsc.go.kr/no010101/83999' },
  { label: '금융위원회 보도자료 (2024.12.17) — 영세·중소가맹점 우대수수료율 인하, 일반가맹점 3년 동결', url: 'https://www.fsc.go.kr/no010101/83642' },
  { label: '여신전문금융업법 제18조의3 (가맹점수수료율 — 영세·중소신용카드가맹점)', url: 'https://www.law.go.kr/법령/여신전문금융업법/제18조의3' },
  { label: '부가가치세법 제46조 (신용카드매출전표 등 발행세액공제 — 1.3%, 연 1천만원, 2026.12.31까지)', url: 'https://www.law.go.kr/법령/부가가치세법/제46조' },
  { label: '재정경제부 「2026년 세제개편안 정부안 확정」(2026.9.1, 국회 심의 중)', url: 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=156776418' },
  { label: '신한카드 가맹점수수료율 안내 (직전 연도 신용카드업계 평균 가맹점수수료율 공시)', url: 'https://www.shinhancard.com/pconts/html/helpdesk/guide/CONFM90022/CONFM90022R02.html' },
  { label: '여신금융협회 카드매출 조회 (가맹점수수료율·신규가맹점 환급 조회)', url: 'https://www.cardsales.or.kr' },
]

export default function CardFeeCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '카드 수수료 계산기',
    description: '연매출 구간별 영세·중소가맹점 우대수수료율로 월·연 카드 수수료와 부가세 신용카드매출세액공제 뒤 실부담을 계산하는 가맹점용 도구.',
    url: 'https://toolhub.ai.kr/card-fee-calculator/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026년 하반기 우대수수료율(영세·중소1~3) 자동 입력', '연매출로 구간 자동 판정', '신용·체크카드 비중별 월·연 카드 수수료', '부가세 신용카드매출세액공제(1.3%, 연 1천만원) 뒤 실부담', '2027년 세제개편안(정부안) 비교', '구간이 오르면 더 내는 수수료', '신규가맹점 환급 안내', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CardFeeCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">카드 수수료 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            카드 수수료 계산기는 가게·쇼핑몰을 운영하는 사업자가 한 달 카드매출로 카드사에 내는 가맹점 수수료를 계산하는 도구입니다. 카드 수수료율은 연매출에 따라 영세·중소가맹점 우대수수료율이 정해져 있고, 같은 구간이라도 체크카드가 신용카드보다 낮습니다. 이 계산기는 2026년 하반기 우대수수료율을 구간별로 자동으로 넣고, 신용·체크카드 비중에 따라 월·연 수수료를 나눠 계산한 뒤, 개인사업자가 받는 부가세 신용카드매출세액공제를 빼서 실제로 부담하는 금액까지 보여 줍니다. 연매출이 늘어 구간이 바뀌면 수수료가 얼마나 늘어나는지도 함께 비교할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">2026년 하반기 우대수수료율 (2026년 8월 14일~)</h3>
          <div className="relative overflow-x-auto mb-6">
            <table className="w-full text-sm text-body tabular-nums">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="text-left font-medium py-2 pr-2">구간</th>
                  <th scope="col" className="text-left font-medium py-2 px-2">연매출</th>
                  <th scope="col" className="text-right font-medium py-2 px-2">신용카드</th>
                  <th scope="col" className="text-right font-medium py-2 pl-2">체크카드</th>
                </tr>
              </thead>
              <tbody>
                {(['small', 'mid1', 'mid2', 'mid3'] as const).map((b) => (
                  <tr key={b} className="border-b border-line">
                    <th scope="row" className="text-left font-medium py-2 pr-2">{NAME[b]}</th>
                    <td className="py-2 px-2">{RANGE[b]}</td>
                    <td className="text-right py-2 px-2">{p(RATES[b].credit)}%</td>
                    <td className="text-right py-2 pl-2">{p(RATES[b].check)}%</td>
                  </tr>
                ))}
                <tr className="border-b border-line">
                  <th scope="row" className="text-left font-medium py-2 pr-2">{NAME.general}</th>
                  <td className="py-2 px-2">{RANGE.general}</td>
                  <td className="py-2 pl-2 text-right" colSpan={2}>카드사별 계약 (업계 평균 약 2.1%·1.44%)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-fg mb-3">월 카드매출 2,000만원 예시 (체크카드 25%)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li><strong>영세가맹점:</strong> 월 {won(D.monthlyFee)}, 연 {won(D.annualFee)} (실효 수수료율 {D.effective.toFixed(2)}%)</li>
            <li><strong>부가세 세액공제(개인사업자):</strong> 연 카드매출 2억 4,000만원 × 1.3% = {won(D.taxCredit)} → 수수료보다 {won(-D.net)} 많음</li>
            <li><strong>중소1로 오르면:</strong> 연 {won(M1.annualFee)}, 영세보다 {won(M1.annualFee - D.annualFee)} 더 냄</li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">수수료를 줄이려면</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>반기마다 오는 여신금융협회 안내문과 카드매출 조회 사이트에서 내 구간과 수수료율이 맞는지 확인하세요.</li>
            <li>개업 첫 반기에 더 낸 수수료는 영세·중소가맹점으로 확인되면 자동으로 환급되니, 환급 조회 기간에 금액을 확인하세요.</li>
            <li>개인사업자라면 카드·현금영수증 매출 세액공제를 부가세 신고 때 빠뜨리지 마세요. 2026년 12월 31일 공급분까지 1.3%입니다.</li>
          </ul>

          <p className="text-sm text-muted mb-6">
            부가세 신고 예상은 <a href="/vat-calculator/" className="text-primary hover:underline">부가세 계산기</a>, 수수료를 뺀 마진은 <a href="/margin-calculator/" className="text-primary hover:underline">마진 계산기</a>, 종합소득세는 <a href="/income-tax/" className="text-primary hover:underline">종합소득세 계산기</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">기준: 2026년 11월 8일 확인. 국회 심의 중인 세법 개정안은 비교용으로만 보여 줍니다.</p>
        </div>
      </section>
    </>
  )
}
