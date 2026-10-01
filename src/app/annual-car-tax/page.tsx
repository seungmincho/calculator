import { Metadata } from 'next'
import AnnualCarTax from '@/components/AnnualCarTax'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '자동차세 계산기 2026 - 연납 할인·배기량별 | 툴허브',
  description: '2026년 자동차세를 배기량과 최초등록일로 바로 계산하세요. 차령 경감(최대 50%), 지방교육세, 6월·12월 납부액, 1월 연납 할인(약 4.58%)과 3·6·9월 비교, 전기차·영업용·승합·화물, 매도·폐차 일할 계산까지.',
  keywords: '자동차세, 자동차세 계산기, 자동차세 연납, 자동차세 계산, 전기차 자동차세, 자동차세 조회, 자동차세 연납 할인율, 2026 자동차세, 자동차세 차령 경감, 경차 자동차세, 자동차세 환급',
  openGraph: {
    title: '자동차세 계산기 2026 | 툴허브',
    description: '배기량·차령별 연간 자동차세와 1월 연납 할인액을 한 번에.',
    url: 'https://toolhub.ai.kr/annual-car-tax',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/annual-car-tax.png', width: 1200, height: 630, alt: '자동차세 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '자동차세 계산기 2026 | 툴허브', description: '배기량·차령별 자동차세와 연납 할인 계산', images: ['https://toolhub.ai.kr/og/annual-car-tax.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/annual-car-tax/' },
}

// 컴포넌트 가이드 FAQ(messages annualCarTax.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: '2026년 자동차세 연납 할인율은 얼마인가요?', a: '2026년 연납 공제율(이자율)은 5%입니다. 다만 신청한 달의 다음 달부터 12월까지 기간분에만 적용되므로 1월에 내면 연세액의 약 4.58%, 3월 약 3.77%, 6월 약 2.52%, 9월 약 1.26%를 아낄 수 있습니다. 지방교육세도 함께 줄어듭니다.' },
  { q: '자동차세 연납은 어떻게 신청하나요?', a: '1·3·6·9월 16일부터 말일까지 위택스·스마트위택스(서울은 이택스)에서 차량을 조회해 신청과 동시에 납부하면 됩니다. 구청 세무과 방문이나 전화로도 할 수 있습니다. 정기분 자동이체를 해 뒀어도 연납은 직접 납부해야 공제를 받습니다.' },
  { q: '연납 후 차를 팔거나 폐차하면 환급되나요?', a: '네. 소유권 이전이나 말소 등록일 이후 기간의 세액은 일할 계산해 환급됩니다(지방세법 시행령 제126조). 연납 후 다른 지역으로 이사한 경우에는 새 주소지에서 그해 자동차세를 다시 부과하지 않습니다.' },
  { q: '경차는 자동차세가 감면되나요?', a: '자동차세 자체의 경차 감면은 없습니다. 1,000cc 이하 cc당 80원이 적용돼 998cc 경차는 지방교육세를 포함해 연 약 10만원입니다. 경차 혜택은 취득세 감면과 유류세 환급 쪽입니다.' },
  { q: '전기차 자동차세는 얼마인가요?', a: '비영업용 전기·수소 승용차는 배기량과 상관없이 연 10만원에 지방교육세 3만원을 더해 13만원입니다. 영업용은 연 2만원입니다. 배기량 기준 승용차와 달리 차령 경감이 없어 오래 타도 금액이 같습니다.' },
  { q: '차령 경감은 어떻게 계산하나요?', a: '최초 등록일 기준으로 1~6월 등록차는 과세연도에서 등록연도를 빼고 1을 더한 값이 차령입니다. 7~12월 등록차는 6월분은 연도 차, 12월분은 연도 차에 1을 더합니다. 차령 3년부터 매년 5%씩 경감돼 12년 이상이면 50%까지 줄어듭니다.' },
  { q: '회사 업무용 차는 영업용 세율인가요?', a: '아닙니다. 영업용은 여객·화물자동차 운수사업 면허나 등록을 받아 일반 수요에 제공하는 택시·렌터카·화물 운송 차량 등입니다. 회사 명의 업무용 승용차도 대부분 비영업용 세율(cc당 80~200원)이 적용됩니다.' },
  { q: '자동차세와 자동차 취등록세는 무엇이 다른가요?', a: '취득세(취등록세)는 차를 살 때 한 번 내는 세금이고, 자동차세는 차를 가진 동안 매년 6월과 12월에 내는 세금입니다. 차를 살 때 드는 취득세는 툴허브 자동차 취등록세 계산기에서 계산할 수 있습니다.' },
]

export default function AnnualCarTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '자동차세 계산기',
    description: '2026년 기준 배기량·차령별 연간 자동차세, 지방교육세, 1월 연납 할인액 계산.',
    url: 'https://toolhub.ai.kr/annual-car-tax/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['배기량별 자동차세', '차령 경감(최대 50%)', '지방교육세 30%', '6월·12월 기분 세액', '1·3·6·9월 연납 할인 비교', '전기·수소차 정액', '영업용·승합·화물', '매도·폐차 일할 계산', '차령별 세금 추이'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <AnnualCarTax />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">자동차세란?</h2>
          <p className="text-body leading-relaxed mb-6">
            자동차세는 자동차를 가진 사람이 매년 내는 지방세로, 재산세 성격과 도로 이용 부담금 성격을 함께 가집니다. 비영업용 승용차는 배기량 1cc당 80~200원에 지방교육세 30%가 더해지고, 최초 등록 후 3년차부터 매년 5%씩 최대 50%까지 줄어듭니다. 6월(1~6월분)과 12월(7~12월분)에 나눠 내며, 1월에 1년치를 미리 내면 약 4.58%를 할인받습니다. 차를 살 때 한 번 내는 취득세와는 다른 세금입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">자동차세 계산 예시 (2026년)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>2.0 중형차(1,999cc, 2022년 3월 등록):</strong> 1,999 × 200원 = 399,800원, 차령 5년 15% 경감 → 자동차세 339,820원 + 지방교육세 101,940원 = 연 441,760원.</li>
            <li><strong>1월 연납 시:</strong> 위 금액에서 약 4.58%인 2만원가량을 덜 냅니다.</li>
            <li><strong>경차(998cc):</strong> 998 × 80원 = 79,840원 + 교육세 = 연 약 10만 4천원 (자동차세 경차 감면은 없음).</li>
            <li><strong>전기차:</strong> 배기량 무관 10만원 + 교육세 3만원 = 연 13만원, 차령 경감 없음.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
