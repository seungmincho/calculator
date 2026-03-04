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
      url: 'https://toolhub.ai.kr/og-image-1200x630.png',
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
    canonical: 'https://toolhub.ai.kr/monthly-rent-subsidy/',
  },
};

export default function MonthlyRentSubsidyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LH 월세지원금 계산기',
    description: 'LH 청년·신혼부부·일반가구 월세지원금 계산기',
    url: 'https://toolhub.ai.kr/monthly-rent-subsidy',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '청년월세지원금 계산',
      '신혼부부월세지원금 계산',
      '일반가구 월세지원금 계산',
      '소득기준 자동 판단',
      '지역별 상한액 적용'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '월세지원금 신청 자격은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '청년 월세지원은 만 19~34세 독립거주 청년으로 소득이 기준 중위소득 60% 이하여야 합니다. 신혼부부는 혼인 7년 이내, 소득이 중위소득 70% 이하가 조건입니다. 일반가구는 소득인정액이 중위소득 50% 이하인 무주택 세대주가 대상입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '월세지원금은 얼마나 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '청년은 월 최대 20만원, 신혼부부는 월 최대 25만원의 월세를 지원받을 수 있습니다. 지역과 소득 수준에 따라 차등 지급되며, 실제 월세 범위 내에서 지급됩니다. 지원기간은 최대 12개월이며, 재신청을 통해 연장할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '월세지원금 신청 방법은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주민센터 방문 또는 복지로(www.bokjiro.go.kr) 온라인으로 신청할 수 있습니다. 필요 서류는 신분증, 임대차계약서, 소득증빙서류(원천징수영수증 등), 주민등록등본입니다. 심사 기간은 약 30일이며, 매월 25일경 지정 계좌로 입금됩니다.',
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
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              LH 월세지원금 계산기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              LH 월세지원금 계산기는 청년·신혼부부·일반가구 대상 정부 월세 지원 프로그램의 지원 가능 금액을 소득과 가구 유형에 따라 자동으로 계산해주는 도구입니다. 청년은 월 최대 20만 원, 신혼부부는 월 최대 25만 원의 월세를 최대 12개월 동안 지원받을 수 있으며, 소득기준과 지역별 상한액을 반영해 실제 수령 예상 금액을 빠르게 확인할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              월세지원금 신청 전 확인사항
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>소득 기준 확인:</strong> 청년은 기준 중위소득 60% 이하, 신혼부부는 70% 이하, 일반가구는 50% 이하여야 신청 자격이 됩니다.</li>
              <li><strong>무주택 요건:</strong> 신청자 본인 및 가구원 모두 주택을 소유하지 않은 무주택자여야 합니다.</li>
              <li><strong>임대차계약 확인:</strong> 전용면적 60㎡ 이하, 보증금 5천만 원 이하, 월세 60만 원 이하 등 주택 요건을 충족해야 합니다.</li>
              <li><strong>신청 방법:</strong> 주민센터 방문 또는 복지로(bokjiro.go.kr) 온라인 신청이 가능하며, 심사 후 매월 25일경 지급됩니다.</li>
            </ul>
          </div>
        </section>
    </>
  );
}
