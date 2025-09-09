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
      url: 'https://toolhub.ai.kr/og-bogeumjari-loan.png',
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
  other: {
    'application-ld+json': JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "LH 보금자리론 계산기",
      "description": "LH 보금자리론 대출한도 및 금리 계산기",
      "url": "https://toolhub.ai.kr/bogeumjari-loan",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW"
      },
      "featureList": [
        "보금자리론 대출한도 계산",
        "우대금리 자동 적용",
        "생애최초 특별혜택",
        "월 상환액 계산",
        "DTI 부채비율 확인",
        "지역별 주택가격 상한 적용"
      ]
    })
  }
};

export default function BogeumjariLoanPage() {
  return (
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
  );
}