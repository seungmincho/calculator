import { Metadata } from 'next'
import CardDeductionCalculator from '@/components/CardDeductionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '신용카드 소득공제 계산기 2026 - 25% 문턱·절세액 | 툴허브',
  description: '연봉과 신용카드·체크카드·전통시장·대중교통 사용액으로 2026년 귀속 신용카드 소득공제액과 줄어드는 세금을 계산합니다. 1~9월 사용액으로 연간 추정, 총급여 25% 문턱까지 남은 금액, 10~12월 체크카드 전환 효과까지.',
  keywords: '신용카드 소득공제 계산기, 신용카드 소득공제, 카드 소득공제, 체크카드 소득공제, 신용카드 체크카드 비율, 총급여 25%, 신용카드 공제 한도, 연말정산 카드, 2026 신용카드 소득공제, 연말정산 미리보기',
  openGraph: {
    title: '신용카드 소득공제 계산기 2026 - 25% 문턱·절세액 | 툴허브',
    description: '연봉·카드 사용액 → 소득공제액·절세액, 25% 문턱, 10~12월 신용·체크 전략.',
    url: 'https://toolhub.ai.kr/card-deduction/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/card-deduction.png', width: 1200, height: 630, alt: '신용카드 소득공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '신용카드 소득공제 계산기 | 툴허브', description: '카드 소득공제액과 절세액, 연말까지 쓸 카드', images: ['https://toolhub.ai.kr/og/card-deduction.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/card-deduction/' },
}

const faqs = [
  { q: '신용카드 소득공제는 어떻게 계산하나요?', a: '한 해 카드 사용액 중 총급여의 25%(최저사용금액)를 넘는 금액에 결제수단별 공제율을 곱합니다. 신용카드 15%, 체크카드·현금영수증 30%, 도서·공연·박물관·체육시설 30%(총급여 7천만원 이하), 전통시장·대중교통 40%입니다. 25% 문턱은 공제율이 낮은 신용카드 사용액부터 채웁니다(조세특례제한법 제126조의2, 시행령 제121조의2). 예를 들어 연봉 5,000만원에 신용카드만 2,000만원 썼다면 문턱 1,250만원을 뺀 750만원의 15%인 112만 5천원이 공제되고, 15% 세율 구간이라 세금은 지방소득세 포함 약 18만 6천원 줄어듭니다.' },
  { q: '신용카드와 체크카드 중 무엇을 써야 유리한가요?', a: '문턱(총급여 25%)은 신용카드 사용액부터 채우기 때문에, 신용카드 사용액이 문턱보다 적다면 남은 기간 어느 카드를 써도 공제액이 같습니다. 신용카드만으로 문턱을 넘겼다면 그 뒤로 쓰는 금액은 체크카드·현금영수증(30%)이 신용카드(15%)보다 두 배로 공제됩니다. 기본 한도를 이미 채웠거나 낼 세금이 없다면 결제수단보다 할인·적립 혜택이 큰 카드가 낫습니다. 계산기의 10~12월 전략에서 내 경우를 바로 확인할 수 있습니다.' },
  { q: '신용카드 소득공제 한도는 얼마인가요?', a: '기본 한도는 총급여 7천만원 이하 300만원, 7천만원 초과 250만원이고, 기본공제 대상 자녀 1명당 50만원(7천만원 초과는 25만원)씩 최대 2명까지 늘어납니다. 전통시장·대중교통·문화체육 사용분은 기본 한도를 넘어도 합쳐서 300만원(7천만원 초과 200만원)까지 추가로 공제됩니다.' },
  { q: '1~9월 사용액만 알면 연간 공제를 알 수 있나요?', a: '1~9월 사용액을 9로 나눠 12를 곱하면 같은 속도로 썼을 때의 연간 사용액이 됩니다. 국세청 홈택스 연말정산 미리보기도 1~9월 카드 사용액으로 연간을 추정합니다. 이 계산기에서 사용액 기간을 "1~9월"로 두고 카드사 앱의 누적 사용액을 넣으면 됩니다.' },
  { q: '가족이 쓴 카드 사용액도 합산되나요?', a: '연간 소득금액 100만원 이하(근로소득만 있으면 총급여 500만원 이하)인 배우자와 직계존비속이 쓴 금액은 나이와 관계없이 합산할 수 있습니다. 형제자매가 쓴 금액은 합산되지 않습니다.' },
  { q: '카드로 결제했는데 공제되지 않는 항목은 무엇인가요?', a: '보험료, 국세·지방세와 공과금, 전기·수도·가스요금, 통신요금, 아파트 관리비, 상품권 구입, 해외 사용분, 현금서비스, 신차 구입은 사용액에서 빠집니다. 중고차는 구입금액의 10%만 사용액에 포함됩니다.' },
  { q: '카드 사용액은 언제까지 반영되나요?', a: '12월 31일 결제분까지 그해 연말정산에 반영됩니다. 다음 해 1월 15일 홈택스 연말정산 간소화 서비스가 열리면 카드사별 실제 사용액을 확인할 수 있습니다.' },
]

export default function CardDeductionPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '신용카드 소득공제 계산기',
    description: '연봉과 결제수단별 카드 사용액으로 신용카드 소득공제액과 줄어드는 세금, 25% 문턱, 10~12월 결제 전략을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/card-deduction/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026년 귀속 신용카드 등 소득공제', '신용·체크·전통시장·대중교통·문화체육 공제율', '총급여 25% 문턱 진행률', '1~9월 사용액으로 연간 추정', '기본·추가 한도와 자녀 한도', '줄어드는 세금(지방소득세 포함)', '10~12월 체크카드 전환 효과', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지', '12월 31일 마감 캘린더 추가'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CardDeductionCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">신용카드 소득공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            신용카드 소득공제 계산기는 연봉(총급여)과 신용카드·체크카드·현금영수증·전통시장·대중교통·문화체육 사용액으로 연말정산 때 받을 신용카드 등 소득공제액과 그만큼 줄어드는 세금을 계산하는 도구입니다. 카드 공제는 총급여의 25%를 넘게 쓴 금액부터 적용되고, 그 문턱은 공제율이 낮은 신용카드 사용액부터 채우기 때문에 같은 금액을 써도 결제수단 순서에 따라 공제액이 달라집니다. 1~9월 누적 사용액만 넣으면 연간 사용액을 추정해, 남은 10~12월에 신용카드와 체크카드 중 무엇을 쓰는 것이 유리한지까지 알려 줍니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">연봉 5,000만원 예시 (문턱 1,250만원)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>신용카드 1,000만원:</strong> 문턱 미달로 공제 0원</li>
            <li><strong>신용카드 2,000만원:</strong> 초과 750만원 × 15% = 공제 112만 5천원, 세금 약 18만 6천원 감소</li>
            <li><strong>신용카드 1,250만원 + 체크카드 750만원:</strong> 같은 2,000만원이지만 초과분이 체크카드라 750만원 × 30% = 공제 225만원</li>
          </ul>
          <p className="text-sm text-muted mt-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>에서 인적공제·연금저축·의료비 등과 함께 계산할 수 있습니다.
          </p>
        </div>
      </section>
    </>
  )
}
