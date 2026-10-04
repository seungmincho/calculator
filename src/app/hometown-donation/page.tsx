import { Metadata } from 'next'
import HometownDonationCalculator from '@/components/HometownDonationCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { donate, breakEven, disasterCredit, EXAMPLES } from '@/utils/hometownDonation'

// 본문·FAQ 숫자는 EXAMPLES와 util 함수로 렌더링하고, 값은 scripts/check-hometown-donation.ts에서 고정한다
const won = (n: number | null) => Math.round(n ?? 0).toLocaleString('ko-KR')
/** 207,475 → "20만 7천원" */
const approx = (n: number) => `${Math.floor(n / 10_000)}만 ${Math.floor((n % 10_000) / 1_000)}천원`
const TEN = donate(EXAMPLES.ten)
const TWENTY = donate(EXAMPLES.twenty)
const MILLION = donate(EXAMPLES.million)
const MORE = donate(EXAMPLES.more)
const LOW = donate(EXAMPLES.low)
const LOW_TEN = donate({ amount: 100_000, salary: EXAMPLES.low.salary })
const BE = breakEven({})

export const metadata: Metadata = {
  title: '고향사랑기부금 계산기 2026 - 실제 부담·답례품 | 툴허브',
  description: `고향사랑기부금을 내면 세금이 얼마 줄고 답례품을 얼마어치 받는지, 실제로 드는 돈을 계산합니다. 2026년 기부분 10만원 전액·10만~20만원 44% 공제로 20만원 기부 시 ${won(-TWENTY.cost)}원 이득. 연봉별 세금 한도, 이미 기부한 금액까지 반영.`,
  keywords: '고향사랑기부금 계산기, 고향사랑기부제, 고향사랑기부금 세액공제, 고향사랑기부 20만원, 고향사랑기부 답례품, 고향사랑e음, 고향사랑기부금 연말정산, 2026 고향사랑기부금 공제율, 고향사랑기부 이득, 고향사랑기부금 한도',
  openGraph: {
    title: '고향사랑기부금 계산기 2026 - 실제 부담·답례품 | 툴허브',
    description: `20만원 기부하면 세금 ${won(TWENTY.nominal)}원 + 답례품 ${won(TWENTY.gift)}원 → ${won(-TWENTY.cost)}원 이득. 내 기부액의 실제 부담을 계산하세요.`,
    url: 'https://toolhub.ai.kr/hometown-donation/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/hometown-donation.png', width: 1200, height: 630, alt: '고향사랑기부금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '고향사랑기부금 계산기 | 툴허브', description: '세액공제와 답례품을 빼면 실제로 드는 돈', images: ['https://toolhub.ai.kr/og/hometown-donation.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/hometown-donation/' },
}

const faqs = [
  { q: '고향사랑기부금 세액공제율은 2026년에 어떻게 바뀌었나요?', a: `2025년 12월 23일 개정된 조세특례제한법 제58조①에 따라 2026년 1월 1일 이후 기부분부터 10만원 이하는 110분의 100, 10만원 초과 20만원 이하는 40%, 20만원 초과 2,000만원 이하는 15%를 소득세에서 공제합니다(부칙 제13조). 지방소득세 10%까지 합치면 10만원까지 전액, 10만~20만원 44%, 20만원 초과 16.5%입니다. 2025년까지는 10만원 초과분이 모두 15%여서, 20만원을 기부하면 공제가 116,499원에서 ${won(TWENTY.nominal)}원으로 27,500원 늘었습니다.` },
  { q: '고향사랑기부 20만원을 하면 정말 이득인가요?', a: `20만원을 기부하면 세금이 ${won(TWENTY.nominal)}원(소득세 ${won(TWENTY.income)}원 + 지방소득세 ${won(TWENTY.local)}원) 줄고 답례품 포인트 ${won(TWENTY.gift)}원을 받아 ${won(TWENTY.benefit)}원이 돌아오므로 낸 돈보다 ${won(-TWENTY.cost)}원 많습니다. 이득이 가장 큰 금액은 10만원으로 ${won(-TEN.cost)}원 이득이고, 올해 처음 기부라면 약 ${approx(BE)}까지는 손해가 없습니다. 답례품을 포인트 금액 그대로 쳤을 때이고, 낼 세금이 공제액보다 많아야 합니다.` },
  { q: '올해 이미 기부했다면 추가 기부의 공제는 어떻게 계산하나요?', a: `공제 구간은 한 해 동안 모든 지자체에 기부한 합계로 나눕니다. 이미 10만원을 기부했다면 다음 10만원은 10만~20만원 구간이라 ${won(MORE.nominal)}원(44%)이 공제되고 답례품 ${won(MORE.gift)}원을 받아 실제 부담이 ${won(MORE.cost)}원입니다. 한 지자체에 나눠 내든 여러 지자체에 내든 합계가 같으면 공제액은 같고, 답례품은 기부할 때마다 그 기부액의 30% 이내로 받습니다.` },
  { q: '내가 사는 지역에도 기부할 수 있나요?', a: '아니요. 지방자치단체는 그 지자체 주민이 아닌 사람에게서만 고향사랑기부금을 받을 수 있습니다(고향사랑 기부금에 관한 법률 제4조①). 주민등록 주소지 기준으로 사는 시·도와 시·군·구 모두 안 되므로, 수원시민은 경기도와 수원시를 뺀 모든 지자체에 기부할 수 있습니다. 실제 고향이 아니어도 되고, 법인은 기부할 수 없습니다.' },
  { q: '답례품은 얼마어치를 어떻게 받나요?', a: '답례품은 매번 기부액의 30% 이내에서 지자체가 정한 비율만큼 줍니다(같은 법 제9조①, 시행령 제5조①). 고향사랑e음에서는 기부 포인트로 쌓이고, 기부한 지자체의 답례품만 살 수 있으며 유효기간은 5년이고 다른 사람에게 넘길 수 없습니다. 지역 특산품이나 그 지역에서만 쓰는 상품권 등이 대상이고 현금, 고가 귀금속·보석, 일반 상품권은 줄 수 없습니다(제9조②③). 답례품을 받지 않고 기부만 할 수도 있습니다.' },
  { q: '연봉이 낮으면 공제를 다 못 받나요?', a: `세액공제는 그해 종합소득산출세액을 한도로 하고(조세특례제한법 제58조②) 남은 공제는 다음 해로 이월되지 않습니다. 연봉 2,000만원에 다른 공제가 없다면 올해 세금이 지방소득세 포함 ${won(LOW.taxLeft)}원이라, 10만원 기부분은 ${won(LOW_TEN.saving)}원을 모두 돌려받지만 50만원을 기부하면 공제 ${won(LOW.nominal)}원 중 ${won(LOW.saving)}원만 줄고 ${won(LOW.lost)}원은 사라져 실제 부담이 ${won(LOW.cost)}원이 됩니다. 카드·부양가족 공제가 있으면 세금이 더 적으니 계산기에 총급여를 넣거나 연말정산 계산기로 함께 확인하세요.` },
  { q: '연말정산에는 어떻게 반영되나요?', a: '12월 31일까지 기부한 금액이 그해 세액공제 대상입니다. 기부 정보는 고향사랑e음을 거쳐 국세청 홈택스 전자기부금영수증으로 넘어가 다음 해 1월 연말정산 간소화 서비스에 나타나므로 따로 영수증을 챙길 필요가 없습니다. 간소화 화면에는 소득세 공제액만 보이며(10만원이면 90,909원) 지방소득세 9,090원은 따로 줄어듭니다. 고향사랑e음은 홈택스 기부영수증 발급까지 기부 후 1~2개월이 걸릴 수 있다고 안내합니다.' },
  { q: '다른 기부금이나 신용카드 공제와 중복으로 받을 수 있나요?', a: '같은 돈으로 두 번 받을 수는 없습니다. 고향사랑기부금으로 세액공제받은 금액과 산출세액 한도를 넘은 금액에는 소득세법상 기부금 세액공제(특례·일반기부금)를 적용하지 않고(조세특례제한법 제58조③), 카드로 냈어도 세액공제를 받았다면 신용카드 소득공제 사용액에서 빠집니다(같은 법 시행령 제121조의2⑥10호의2). 반면 표준세액공제(13만원)는 특별소득공제·특별세액공제·월세 세액공제를 신청하지 않을 때 받는 것이어서(소득세법 제59조의4⑨) 표준세액공제를 받는 사람도 고향사랑기부금 공제를 함께 받습니다.' },
  { q: '특별재난지역에 기부하면 공제가 더 큰가요?', a: `네. 「재난 및 안전관리 기본법」에 따라 특별재난지역으로 선포된 지자체에 선포일부터 3개월 안에 기부하면 20만원 초과분 공제율이 15%가 아니라 30%입니다(조세특례제한법 제58조①3호, 시행령 제53조의2). 지방소득세까지 33%라 100만원을 기부하면 공제가 ${won(MILLION.nominal)}원에서 ${won(disasterCredit(1_000_000))}원으로 늘어납니다. 20만원까지는 공제율이 같습니다. 이 계산기는 일반 공제율로 계산하므로 특별재난지역 기부라면 그만큼 더 돌려받습니다.` },
  { q: '공제율이 더 오른다던데 계산에 반영됐나요?', a: '아직 아닙니다. 정부가 2026년 8월 3일 발표한 세제개편안은 2027년 기부분부터 10만원 초과분 공제율을 지역에 따라 달리해, 10만~20만원 구간은 광역시를 뺀 비수도권을 50%로, 20만원 초과분은 여건이 어려운 비수도권 우대지역만 25%로 올리는 내용입니다. 2026년 7월에는 전액 공제 구간을 20만원까지 넓히는 조세특례제한법 개정안도 발의됐습니다. 두 안 모두 2026년 10월 현재 국회를 통과하지 않아 이 계산기는 현행 조문(2026년 기부분 공제율)으로 계산합니다.' },
]

const sources = [
  ['조세특례제한법 제58조 (고향사랑 기부금에 대한 세액공제)', 'https://www.law.go.kr/법령/조세특례제한법/제58조'],
  ['조세특례제한법 (법률 제21223호, 2025.12.23 개정, 부칙 제13조 적용례)', 'https://www.law.go.kr/법령/조세특례제한법/(21223,20251223)'],
  ['조세특례제한법 시행령 제53조의2 (특별재난지역 기부 기간 3개월)', 'https://www.law.go.kr/법령/조세특례제한법시행령/제53조의2'],
  ['조세특례제한법 시행령 제121조의2 (신용카드 사용액에서 제외)', 'https://www.law.go.kr/법령/조세특례제한법시행령/제121조의2'],
  ['고향사랑 기부금에 관한 법률 제4조 (주민이 아닌 사람만 기부)', 'https://www.law.go.kr/법령/고향사랑기부금에관한법률/제4조'],
  ['고향사랑 기부금에 관한 법률 제8조 (개인별 연 2,000만원)', 'https://www.law.go.kr/법령/고향사랑기부금에관한법률/제8조'],
  ['고향사랑 기부금에 관한 법률 제9조 (답례품)', 'https://www.law.go.kr/법령/고향사랑기부금에관한법률/제9조'],
  ['고향사랑 기부금에 관한 법률 시행령 제5조 (답례품 한도 30%)', 'https://www.law.go.kr/법령/고향사랑기부금에관한법률시행령/제5조'],
  ['소득세법 제59조의4 (특별세액공제·표준세액공제)', 'https://www.law.go.kr/법령/소득세법/제59조의4'],
  ['고향사랑e음 — 고향사랑기부제 안내 (기부 방법·포인트)', 'https://ilovegohyang.go.kr/donation/guide1.html'],
  ['고향사랑e음 — 연말정산 세액공제 안내', 'https://ilovegohyang.go.kr/donation/guide3.html'],
  ['행정안전부 — 고향사랑기부제', 'https://www.mois.go.kr/frt/sub/a06/b06/hometownLovedonation/screen.do'],
  ['한국세정신문 — 2026 세제개편안 고향사랑기부금 지역 차등 (2026.8.3)', 'https://www.taxtimes.co.kr/news/article.html?no=276341'],
  ['MTN — 고향사랑기부금 전액 공제 20만원 확대 법안 발의 (2026.7.9)', 'https://news.mtn.co.kr/news-detail/2026070915103269948'],
]

export default function HometownDonationPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '고향사랑기부금 계산기',
    description: '고향사랑기부금의 세액공제(지방소득세 포함)와 답례품을 빼고 실제로 드는 돈을 계산하는 도구. 2026년 기부분 공제율, 연봉별 세금 한도, 올해 이미 기부한 금액을 반영.',
    url: 'https://toolhub.ai.kr/hometown-donation/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026년 기부분 고향사랑기부금 세액공제(10만원 전액·20만원까지 44%·초과 16.5%)', '답례품 30% 포함 실제 부담액', '구간별 공제 내역', '총급여로 결정세액 한도 반영', '올해 이미 기부한 금액(연간 누적 구간) 반영', '기부액 슬라이더와 실제 부담 그래프', '10만·20만·30만·50만·100만원 비교표', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지', '12월 31일 마감 캘린더 추가'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <HometownDonationCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">고향사랑기부금 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            고향사랑기부금 계산기는 주민등록 주소지가 아닌 지자체에 기부할 때 연말정산에서 돌려받는 세금(지방소득세 포함)과 답례품을 빼고, 실제로 내 주머니에서 나가는 돈을 계산하는 도구입니다. 2026년 기부분부터 10만원 초과 20만원 이하 구간 공제율이 15%에서 40%로 오르면서 20만원까지는 돌려받는 금액이 기부액보다 많아졌습니다. 총급여를 넣으면 올해 낼 세금 안에서만 공제되는 한도를, 올해 이미 기부한 금액을 넣으면 1년 합계로 나뉘는 공제 구간을 반영합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">기부액별 사례 (2026년 기부분, 낼 세금이 충분한 근로자)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>10만원:</strong> 세금 {won(TEN.nominal)}원(소득세 {won(TEN.income)}원 + 지방소득세 {won(TEN.local)}원) + 답례품 {won(TEN.gift)}원 = {won(TEN.benefit)}원. 낸 돈보다 {won(-TEN.cost)}원 이득으로, 이득이 가장 큰 금액입니다.</li>
            <li><strong>20만원:</strong> 세금 {won(TWENTY.nominal)}원 + 답례품 {won(TWENTY.gift)}원 = {won(TWENTY.benefit)}원. {won(-TWENTY.cost)}원 이득이고, 약 {approx(BE)}을 넘기면 실제 부담이 생기기 시작합니다.</li>
            <li><strong>100만원:</strong> 세금 {won(MILLION.nominal)}원 + 답례품 {won(MILLION.gift)}원 = {won(MILLION.benefit)}원. 실제 부담은 {won(MILLION.cost)}원(기부액의 {((MILLION.cost / MILLION.amount) * 100).toFixed(1)}%)입니다.</li>
          </ul>
          <p className="text-sm text-muted mt-3">
            답례품은 포인트 금액 그대로 계산했습니다. 연봉 2,000만원처럼 낼 세금이 적으면 50만원 기부 시 공제 {won(LOW.nominal)}원 중 {won(LOW.saving)}원만 돌려받습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mt-8 mb-3">관련 계산기</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a> — 고향사랑기부금을 포함한 전체 환급액</li>
            <li><a href="/card-deduction/" className="text-primary hover:underline">신용카드 소득공제 계산기</a> — 10~12월 신용·체크카드 전략</li>
            <li><a href="/pension-tax-credit/" className="text-primary hover:underline">연금저축·IRP 세액공제 계산기</a> — 12월 31일까지 더 넣으면 돌려받는 세금</li>
            <li><a href="/medical-tax-credit/" className="text-primary hover:underline">의료비 세액공제 계산기</a> · <a href="/rent-tax-credit/" className="text-primary hover:underline">월세 세액공제 계산기</a></li>
          </ul>
          <h3 className="text-lg font-semibold text-fg mt-8 mb-3">근거 법령·출처 (2026년 10월 기준)</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-sub">
            {sources.map(([label, url]) => (
              <li key={url}><a href={url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{label}</a></li>
            ))}
          </ul>
          <p className="text-sm text-muted mt-6">
            총급여를 넣은 계산은 근로소득만 있고 본인 기본공제와 4대보험만 있는 경우를 가정합니다. 답례품 비율은 지자체마다 30% 안에서 다를 수 있습니다.
          </p>
        </div>
      </section>
    </>
  )
}
