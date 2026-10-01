import { Metadata } from 'next'
import BrokerageFeeCalculator from '@/components/BrokerageFeeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '중개수수료 계산기 2026 - 부동산 복비 자동 계산 | 툴허브',
  description: '2026년 기준 부동산 중개수수료(복비)를 자동 계산합니다. 매매·전세·월세, 오피스텔·상가 상한 요율과 한도액, 부가세(일반 10%·간이 4%), 협의 요율, 매도인·매수인 부담액과 전세 vs 월세 복비 비교까지.',
  keywords: '중개수수료 계산기, 복비, 복비 계산기, 중개보수, 중개보수 계산기, 월세 복비, 전세 복비, 부동산 중개수수료, 오피스텔 중개수수료, 상가 중개수수료, 2026 중개보수 요율표, 복비 부가세',
  openGraph: {
    title: '중개수수료 계산기 2026 | 툴허브',
    description: '매매·전세·월세 부동산 복비 자동 계산. 상한 요율·부가세·협의 요율 반영.',
    url: 'https://toolhub.ai.kr/brokerage-fee',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/brokerage-fee.png', width: 1200, height: 630, alt: '중개수수료 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '중개수수료 계산기 2026 | 툴허브', description: '부동산 복비 자동 계산', images: ['https://toolhub.ai.kr/og/brokerage-fee.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/brokerage-fee/' },
}

export default function BrokerageFeePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '중개수수료 계산기',
    description: '2026년 기준 부동산 중개수수료(복비) 자동 계산. 매매·전세·월세, 오피스텔·상가, 부가세·협의 요율 반영.',
    url: 'https://toolhub.ai.kr/brokerage-fee/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['매매·전세·월세 중개보수 상한', '월세 거래금액 환산(×100/×70)', '주거용 오피스텔·상가·토지 요율', '구간별 상한 요율·한도액 표', '부가세 일반 10%·간이 4%', '협의 요율 슬라이더', '매도인·매수인·쌍방 부담액', '전세 vs 월세 복비 비교', '거래금액별 복비 그래프'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '주택 매매 중개수수료는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '2021년 10월 개편 요율 기준으로 5천만원 미만 0.6%(한도 25만원), 5천만~2억원 미만 0.5%(한도 80만원), 2억~9억원 미만 0.4%, 9억~12억원 미만 0.5%, 12억~15억원 미만 0.6%, 15억원 이상 0.7%가 상한이에요. 매도인과 매수인이 각자 냅니다.' } },
      { '@type': 'Question', name: '전세·월세 복비는 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '임대차는 5천만원 미만 0.5%(한도 20만원), 5천만~1억원 미만 0.4%(한도 30만원), 1억~6억원 미만 0.3%, 6억~12억원 미만 0.4%, 12억~15억원 미만 0.5%, 15억원 이상 0.6%예요. 월세는 보증금 + 월세 × 100을 거래금액으로 보고, 그 값이 5천만원 미만이면 보증금 + 월세 × 70을 씁니다.' } },
      { '@type': 'Question', name: '중개수수료에 부가세가 따로 붙나요?', acceptedAnswer: { '@type': 'Answer', text: '네. 법정 요율과 한도액은 부가세 별도예요. 일반과세자 중개사무소는 중개보수의 10%, 간이과세자는 약 4%(부가가치율 40% × 10%)를 더 받을 수 있어요.' } },
      { '@type': 'Question', name: '중개수수료를 깎을 수 있나요?', acceptedAnswer: { '@type': 'Answer', text: '법정 요율은 최고 한도라서 그 안에서 얼마든지 협의할 수 있어요. 계약 전에 요율과 금액을 정해 계약서나 확인·설명서에 적어두는 것이 좋아요. 6억 매매라면 0.1%p만 낮춰도 한쪽당 60만원(부가세 별도)이 줄어요.' } },
      { '@type': 'Question', name: '오피스텔 중개수수료는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '전용 85㎡ 이하이고 전용 입식 부엌·수세식 화장실·목욕시설을 갖춘 주거용 오피스텔은 매매 0.5%, 임대차 0.4%가 상한이에요. 요건을 못 갖춘 오피스텔은 상가와 같이 0.9% 이내에서 협의합니다.' } },
      { '@type': 'Question', name: '상가·토지 중개수수료는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '주택 외 부동산은 거래금액의 0.9% 이내에서 중개사와 협의해 정해요. 0.9%는 상한일 뿐이니 계약 전에 요율을 정하세요.' } },
      { '@type': 'Question', name: '중개수수료는 언제 내나요?', acceptedAnswer: { '@type': 'Answer', text: '중개사와 약정한 시기에 내고, 약정이 없으면 잔금을 다 치른 날이 지급 시기예요(공인중개사법 시행령 제27조의2). 보통 잔금일에 냅니다.' } },
      { '@type': 'Question', name: '계약이 파기되면 복비를 내야 하나요?', acceptedAnswer: { '@type': 'Answer', text: '중개사의 고의·과실로 계약이 무효·취소·해제되면 낼 필요가 없어요. 당사자 사정으로 해제됐다면 청구될 수 있지만, 법원은 중개 노력 정도에 따라 감액하기도 합니다.' } },
      { '@type': 'Question', name: '중개수수료 현금영수증을 받을 수 있나요?', acceptedAnswer: { '@type': 'Answer', text: '부동산 중개업은 현금영수증 의무발행 업종이라 10만원 이상 현금 결제 시 요청하지 않아도 발급해야 해요. 계좌이체도 현금 결제에 해당합니다.' } },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <BrokerageFeeCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>

      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">부동산 중개수수료(복비) 계산 방법</h2>
          <p className="text-body leading-relaxed mb-6">
            중개수수료(법정 용어 중개보수)는 거래금액에 구간별 상한 요율을 곱해 계산하고, 저가 구간은 한도액까지만 받을 수 있습니다. 주택 매매는 2억~9억원 미만 0.4%, 9억~12억원 미만 0.5%, 12억~15억원 미만 0.6%, 15억원 이상 0.7%이고, 전세·월세 같은 임대차는 1억~6억원 미만 0.3%입니다. 월세는 보증금에 월세의 100배를 더한 금액(5천만원 미만이면 70배)을 거래금액으로 봅니다. 요율은 최고 한도이므로 중개사와 협의해 낮출 수 있고, 부가세는 별도입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">복비 아끼는 체크리스트</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>계약 전 협의:</strong> 요율과 금액을 계약서 작성 전에 정하고 확인·설명서에 적힌 금액과 대조하세요.</li>
            <li><strong>과세 유형 확인:</strong> 간이과세자 중개사무소는 부가세가 10%가 아니라 약 4% 수준입니다.</li>
            <li><strong>현금영수증:</strong> 10만원 이상 현금·계좌이체 결제는 현금영수증 의무 발급 대상입니다.</li>
            <li><strong>오피스텔 요건:</strong> 전용 85㎡ 이하 주거용 오피스텔은 매매 0.5%, 임대 0.4%가 상한입니다.</li>
            <li><strong>초과 청구 신고:</strong> 법정 한도를 넘는 금액은 받을 수 없으며, 시·군·구청 부동산 담당 부서에 신고할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
