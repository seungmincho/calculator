import { Metadata } from 'next'
import DonationTaxCreditCalculator from '@/components/DonationTaxCreditCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, EXAMPLES } from '@/utils/donationTaxCredit'
import { TAX_YEAR } from '@/utils/yearEndTax'

export const metadata: Metadata = {
  title: '기부금 세액공제 계산기 2026 - 종교·정치자금 한도 | 툴허브',
  description: '연봉과 기부처별 기부액으로 2026년 기부분 기부금 세액공제와 실제로 줄어드는 세금을 계산합니다. 정치자금 10만원 110분의 100, 특례기부금 100%·일반기부금 30%·종교단체 10% 한도, 1천만원 초과 30%, 한도 초과분 10년 이월까지.',
  keywords: '기부금 세액공제 계산기, 기부금 세액공제, 기부금 공제, 연말정산 기부금, 종교단체 기부금 한도, 헌금 연말정산, 정치자금 세액공제, 정치후원금 10만원, 특례기부금, 일반기부금, 기부금 이월공제, 기부금 1천만원 30%',
  openGraph: {
    title: '기부금 세액공제 계산기 2026 - 종교·정치자금 한도 | 툴허브',
    description: '기부처별 한도와 공제율 → 돌려받는 세금, 한도 초과 이월, 정치자금 10만원.',
    url: 'https://toolhub.ai.kr/donation-tax-credit/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/donation-tax-credit.png', width: 1200, height: 630, alt: '기부금 세액공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '기부금 세액공제 계산기 | 툴허브', description: '종교·정치자금·특례·일반 기부금 세액공제와 줄어드는 세금', images: ['https://toolhub.ai.kr/og/donation-tax-credit.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/donation-tax-credit/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-donation-tax-credit.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const D = analyze(EXAMPLES.d.salary, EXAMPLES.d.g)
const R = analyze(EXAMPLES.religious.salary, EXAMPLES.religious.g)
const B = analyze(EXAMPLES.big.salary, EXAMPLES.big.g)
const P = analyze(EXAMPLES.political.salary, EXAMPLES.political.g)
const S = analyze(EXAMPLES.special.salary, EXAMPLES.special.g)
const RR = R.rows.find((x) => x.key === 'religious')!

const faqs = [
  { q: '기부금 세액공제는 어떻게 계산하나요?', a: `특례기부금과 일반기부금을 한도 안에서 합친 금액의 15%를 세금에서 빼고, 합계가 1천만원을 넘으면 넘는 부분은 30%를 뺍니다(소득세법 제59조의4제4항). 지방소득세 10%도 함께 줄어 실제로는 16.5%·33%입니다. 예를 들어 연봉 5,000만원인 사람이 사회복지단체에 월 3만원(연 36만원)을 정기후원하고 종교단체에 120만원을 냈다면 156만원 × 15% = ${won(D.donation)}이 공제되어 세금이 ${won(D.saving)} 줄어듭니다.` },
  { q: '종교단체 기부금(헌금) 한도는 얼마인가요?', a: `근로소득금액(총급여에서 근로소득공제를 뺀 금액)에서 특례기부금을 뺀 금액의 10%에, 그 금액의 20%와 종교단체 외 일반기부금 중 적은 금액을 더한 것이 일반기부금 전체 한도입니다. 종교단체 외 기부금이 없으면 사실상 10%이고, 종교단체가 없으면 30%입니다. 연봉 3,000만원이면 근로소득금액이 ${won(R.income)}이라 종교단체에 500만원을 내도 ${won(RR.limit!)}까지만 공제되고, 넘은 ${won(RR.excess)}은 다음 해부터 10년 동안 이월해 공제받을 수 있습니다.` },
  { q: '3천만원 넘게 기부하면 40% 공제되나요?', a: `아닙니다. 3천만원을 넘는 부분에 10%p를 더 주는 규정(소득세법 제59조의4제8항)은 2024년 1월 1일부터 12월 31일까지 낸 기부금에만 적용됐습니다. ${TAX_YEAR}년에 낸 기부금은 1천만원까지 15%, 넘는 부분 30%가 가장 높은 공제율입니다. 예를 들어 연봉 1억 5,000만원인 사람이 1,500만원을 기부하면 1천만원 × 15% + 500만원 × 30% = ${won(B.donation)}이 공제되어 세금이 ${won(B.saving)} 줄어듭니다.` },
  { q: '정치후원금 10만원을 내면 정말 다 돌려받나요?', a: `정당·후원회·선거관리위원회에 낸 정치자금은 10만원까지 그 금액의 110분의 100을 세금에서 빼므로(조세특례제한법 제76조) 10만원이면 ${won(P.political)}이 공제되고 지방소득세까지 더해 세금이 ${won(P.saving)} 줄어듭니다(연봉 5,000만원 기준). 10만원을 넘는 금액은 15%, 그 금액이 3천만원을 넘는 부분은 25%입니다. 본인 이름으로 낸 것만 공제되고, 낼 세금이 있어야 효과가 있습니다.` },
  { q: '배우자·부모님이 낸 기부금도 공제되나요?', a: '됩니다. 배우자와 부양가족이 낸 기부금은 나이와 관계없이 공제되지만 소득 요건(연간 소득금액 100만원 이하, 근로소득만 있으면 총급여 500만원 이하)은 갖춰야 하고, 다른 사람의 기본공제를 받는 가족의 기부금은 제외됩니다(소득세법 제59조의4제4항, 제50조). 예를 들어 생계를 같이 하는 어머니가 60세가 안 되어 인적공제는 못 받더라도, 소득이 없고 다른 형제가 기본공제를 받지 않는다면 어머니가 낸 헌금을 공제받을 수 있습니다. 정치자금은 본인 이름으로 낸 것만 공제됩니다.' },
  { q: '종교단체 기부금이 간소화 자료에 안 나와요', a: '종교단체는 연말정산 간소화 서비스에 자료를 내지 않는 곳이 많습니다. 다니는 교회·성당·사찰 등에서 기부금 영수증(단체 고유번호, 기부자, 금액이 적힌 것)을 받아 회사에 직접 제출하면 됩니다. 연말정산 때 빠뜨렸다면 5월 종합소득세 신고나 경정청구로 추가할 수 있습니다.' },
  { q: '한도를 넘거나 낼 세금이 모자라면 기부금은 사라지나요?', a: '사라지지 않습니다. 일반기부금 한도를 넘어 공제받지 못한 금액과, 세금(공제기준산출세액)이 모자라 공제받지 못한 기부금은 다음 과세기간부터 10년 동안 이월해 공제받을 수 있습니다(소득세법 제61조제2항). 이월된 금액은 그해 낸 기부금보다 먼저 공제됩니다(소득세법 제60조). 의료비·교육비 공제는 남아도 이월되지 않는 것과 다른 점입니다.' },
  { q: '기부금 공제와 표준세액공제 13만원은 같이 받을 수 있나요?', a: `특례·일반 기부금 세액공제는 특별세액공제라서, 받으면 표준세액공제 13만원은 받지 못합니다(소득세법 제59조의4제9항). 그래서 다른 특별공제가 거의 없는 사람은 기부금 공제 효과가 줄어듭니다. 연봉 3,000만원인 사람이 종교단체에 500만원을 내면 공제액은 ${won(R.donation)}이지만, 원래 받던 표준세액공제가 빠져 세금은 ${won(R.saving)} 줄어듭니다. 정치자금과 고향사랑기부금은 특별세액공제가 아니어서 표준세액공제와 함께 받습니다.` },
  { q: '특례기부금에는 어떤 것이 있나요?', a: `국가·지방자치단체에 낸 기부금, 국방헌금과 국군장병 위문금품, 천재지변 이재민 구호금품, 사립학교·국립대학병원 등에 낸 시설비·교육비·장학금, 사회복지공동모금회처럼 정부가 지정한 모금 단체에 낸 기부금이 특례기부금입니다(법인세법 제24조제2항제1호). 근로소득금액까지 공제되고, 일반기부금보다 먼저 공제됩니다. 연봉 4,000만원인 사람이 이재민 구호금으로 200만원을 내면 ${won(S.donation)}이 공제되어 세금이 ${won(S.saving)} 줄어듭니다.` },
  { q: '고향사랑기부금도 여기서 계산하나요?', a: '고향사랑기부금은 조세특례제한법 제58조에 따라 10만원까지 110분의 100, 20만원까지 40%, 넘는 금액 15%로 공제율이 다르고 답례품도 받으므로 고향사랑기부 계산기에서 따로 계산합니다. 같은 금액을 일반기부금으로 또 공제받을 수는 없습니다.' },
]

const sources = [
  { label: '소득세법 제59조의4 (특별세액공제 — 기부금 15%·30%, 일반기부금 한도, 2024년 한시 추가공제, 표준세액공제)', url: 'https://www.law.go.kr/법령/소득세법/제59조의4' },
  { label: '소득세법 제34조 (특례기부금·일반기부금 한도 산식, 이월)', url: 'https://www.law.go.kr/법령/소득세법/제34조' },
  { label: '소득세법 제61조 (기부금 세액공제 10년 이월)', url: 'https://www.law.go.kr/법령/소득세법/제61조' },
  { label: '소득세법 제50조 (기본공제 — 가족 소득 요건)', url: 'https://www.law.go.kr/법령/소득세법/제50조' },
  { label: '조세특례제한법 제76조 (정치자금 세액공제 — 10만원 110분의 100)', url: 'https://www.law.go.kr/법령/조세특례제한법/제76조' },
  { label: '법인세법 제24조 (특례기부금의 범위)', url: 'https://www.law.go.kr/법령/법인세법/제24조' },
]

export default function DonationTaxCreditPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '기부금 세액공제 계산기',
    description: '연봉과 기부처별 기부액으로 정치자금·특례·일반·종교단체 기부금 세액공제와 실제로 줄어드는 세금, 한도 초과분을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/donation-tax-credit/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [`${TAX_YEAR}년 기부분 기부금 세액공제`, '정치자금 10만원 110분의 100', '특례기부금 100%·일반기부금 30%·종교단체 10% 한도', '1천만원 초과 30% 구간 표시', '한도 초과분 10년 이월 안내', '줄어드는 세금(지방소득세·결정세액 한도·표준세액공제 반영)', '12월 추가 기부 시뮬레이션', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DonationTaxCreditCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">기부금 세액공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            기부금 세액공제 계산기는 총급여와 기부처별로 한 해 동안 낸 기부금으로 연말정산에서 받을 기부금 세액공제와 그만큼 실제로 줄어드는 세금을 계산하는 도구입니다. 기부금은 어디에 냈느냐에 따라 한도와 공제율이 다릅니다. 정치자금은 10만원까지 거의 전액, 특례기부금은 근로소득금액까지, 일반기부금은 30%까지, 종교단체 기부금은 10%까지 공제되고, 특례·일반 기부금 합계가 1천만원을 넘으면 넘는 부분은 30%입니다. 이 계산기는 기부처별 한도를 따로 적용하고, 결정세액 한도와 표준세액공제(13만원) 선택까지 반영해 &lsquo;진짜로 돌려받는 금액&rsquo;과 한도를 넘어 이월되는 금액을 보여 줍니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">연봉별 예시 ({TAX_YEAR}년 기부분, 다른 공제가 없다고 가정)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>연봉 5,000만원, 사회복지단체 월 3만원 + 종교단체 120만원:</strong> 156만원 × 15% = 공제 {won(D.donation)}, 세금 {won(D.saving)} 감소 (지방소득세 포함). 종교단체 한도 {won(D.rows[3].limit!)} 안이라 전액 공제
            </li>
            <li>
              <strong>연봉 3,000만원, 종교단체 500만원:</strong> 근로소득금액 {won(R.income)}의 10%인 {won(RR.limit!)}만 공제 대상 → 공제 {won(R.donation)}, 세금 {won(R.saving)} 감소. 넘은 {won(RR.excess)}은 10년 동안 이월
            </li>
            <li>
              <strong>연봉 1억 5,000만원, 일반기부금 1,500만원:</strong> 1천만원 × 15% + {won(B.high)} × 30% = 공제 {won(B.donation)}, 세금 {won(B.saving)} 감소
            </li>
            <li>
              <strong>연봉 5,000만원, 정치후원금 10만원:</strong> 10만원 × 100/110 = 공제 {won(P.political)}, 세금 {won(P.saving)} 감소
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">12월 31일 전에 할 일</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>기부금은 실제로 낸 날이 속한 해에 공제됩니다. 올해 공제를 받으려면 12월 31일까지 이체해야 합니다.</li>
            <li>정치후원금을 아직 안 냈다면 10만원까지는 거의 전액 돌려받습니다. 낼 세금이 있는지 위 계산기로 먼저 확인하세요.</li>
            <li>종교단체·소규모 단체는 기부금 영수증을 미리 요청해 두세요. 간소화 자료에 나오지 않으면 영수증을 회사에 직접 내야 합니다.</li>
          </ul>

          <p className="text-sm text-muted mb-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 고향사랑기부금은 <a href="/hometown-donation/" className="text-primary hover:underline">고향사랑기부 계산기</a>, 그 밖의 세액공제는 <a href="/medical-tax-credit/" className="text-primary hover:underline">의료비 세액공제</a>·<a href="/pension-tax-credit/" className="text-primary hover:underline">연금저축·IRP 세액공제</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 11월 현재 시행 중인 법령 기준입니다. 국회 심의 중인 세법 개정안은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
