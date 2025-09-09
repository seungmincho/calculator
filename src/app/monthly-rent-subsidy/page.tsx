import { Suspense } from 'react';
import { Metadata } from 'next';
import MonthlyRentSubsidyCalculator from '@/components/MonthlyRentSubsidyCalculator';

export const metadata: Metadata = {
  title: 'LH 월세지원금 계산기 | 청년·신혼부부·일반 가구 월세지원 한눈에',
  description: '2024년 LH 월세지원금을 정확하게 계산하세요. 청년월세지원, 신혼부부월세지원, 일반가구 지원금까지 소득기준과 지역별 상한액을 실시간으로 확인할 수 있습니다.',
  keywords: 'LH월세지원금, 청년월세지원, 신혼부부월세지원, 월세지원금계산기, LH지원금, 월세보조, 주거지원, 청년주거지원',
  openGraph: {
    title: 'LH 월세지원금 계산기 - 청년·신혼부부 월세지원 한눈에',
    description: '2024년 최신 기준으로 LH 월세지원금을 정확하게 계산하세요. 소득기준, 지역별 상한액까지 완벽 반영!',
    url: 'https://toolhub.ai.kr/monthly-rent-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{
      url: 'https://toolhub.ai.kr/og-rent-subsidy.png',
      width: 1200,
      height: 630,
      alt: 'LH 월세지원금 계산기'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LH 월세지원금 계산기',
    description: '청년, 신혼부부, 일반가구 월세지원금을 정확하게 계산해보세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/monthly-rent-subsidy',
  },
  other: {
    'application-ld+json': JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "LH 월세지원금 계산기",
      "description": "LH 청년·신혼부부·일반가구 월세지원금 계산기",
      "url": "https://toolhub.ai.kr/monthly-rent-subsidy",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "KRW"
      },
      "featureList": [
        "청년월세지원금 계산",
        "신혼부부월세지원금 계산", 
        "일반가구 월세지원금 계산",
        "소득기준 자동 판단",
        "지역별 상한액 적용",
        "실시간 계산 결과"
      ]
    })
  }
};

export default function MonthlyRentSubsidyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <MonthlyRentSubsidyCalculator />
      </div>
    </Suspense>
  );
}