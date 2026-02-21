import { Suspense } from 'react';
import { Metadata } from 'next';
import BogeumjariLoanCalculator from '@/components/BogeumjariLoanCalculator';

export const metadata: Metadata = {
  title: 'LH 보금자리론 계산기 | 생애최초 우대대출 한도·금리 계산',
  description: '2024년 LH 보금자리론을 정확하게 계산하세요. 생애최초 우대조건, 최대 3억원 한도, 최저 1.8% 금리까지! 소득기준, 주택가격 상한, DTI까지 실시간 확인 가능합니다.',
  keywords: 'LH보금자리론, 생애최초대출, 보금자리론계산기, LH대출, 주택담보대출, 생애최초주택자금대출, 무주택자대출, 우대금리대출',
  openGraph: {
    title: 'LH 보금자리론 계산기 - 생애최초 우대대출 완벽 계산',
    description: '최대 3억원, 최저 1.8% 우대금리! 생애최초 구입자를 위한 LH 보금자리론을 정확하게 계산하세요.',
    url: 'https://toolhub.ai.kr/bogeumjari-loan',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{
      url: 'https://toolhub.ai.kr/og-image-1200x630.png',
      width: 1200,
      height: 630,
      alt: 'LH 보금자리론 계산기'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LH 보금자리론 계산기',
    description: '생애최초 구입자를 위한 우대대출 한도와 금리를 정확하게 계산하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/bogeumjari-loan',
  },
};

export default function BogeumjariLoanPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LH 보금자리론 계산기',
    description: 'LH 보금자리론 대출한도 및 금리 계산기',
    url: 'https://toolhub.ai.kr/bogeumjari-loan',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '보금자리론 대출한도 계산',
      '우대금리 자동 적용',
      '생애최초 특별혜택',
      '월 상환액 계산',
      'DTI 부채비율 확인',
      '지역별 주택가격 상한 적용'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '보금자리론 신청 자격 조건은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '보금자리론은 무주택 세대주로서 부부합산 연소득 7천만원 이하(신혼부부·2자녀 이상 8.5천만원 이하)여야 합니다. 주택가격은 6억원 이하, LTV 70% 이내이며, 생애최초 주택구입자는 LTV 80%까지 가능합니다. 만 19세 이상이면 신청할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '보금자리론 금리는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '보금자리론 금리는 고정금리와 혼합금리(5년 고정 후 변동) 중 선택할 수 있습니다. 2026년 기준 고정금리는 연 3.25~4.15% 수준이며, 생애최초 구입자, 신혼부부, 다자녀 가구는 0.1~0.5%p 우대금리를 적용받을 수 있습니다. 상환기간은 10~40년까지 선택 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '보금자리론과 디딤돌대출의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '디딤돌대출은 소득 6천만원 이하(신혼 8.5천만원 이하) 무주택자를 대상으로 최대 2.5억원까지 연 2.15~3.0%로 지원합니다. 보금자리론은 소득 7천만원 이하, 최대 3.6억원까지 가능하지만 금리가 다소 높습니다. 소득이 낮으면 디딤돌, 한도가 더 필요하면 보금자리론이 유리합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="max-w-6xl mx-auto p-8">
            <div className="animate-pulse space-y-8">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <BogeumjariLoanCalculator />
        </div>
      </Suspense>
    </>
  );
}
