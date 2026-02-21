import { Metadata } from 'next'
import { Suspense } from 'react'
import AgeCalculator from '@/components/AgeCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '나이 계산기 - 만 나이, 한국 나이, 띠, 별자리 계산 | 툴허브',
  description: '나이 계산기 - 생년월일을 입력하면 만 나이, 한국 나이(세는 나이), 연 나이, 띠, 별자리, 살아온 날 수, 다음 생일까지 남은 일수를 한눈에 확인하세요.',
  keywords: '나이 계산기, 만 나이 계산, 한국 나이, 세는 나이, 띠 계산, 별자리 계산, 연 나이, age calculator',
  openGraph: {
    title: '나이 계산기 | 툴허브',
    description: '만 나이, 한국 나이, 띠, 별자리 등 다양한 나이 정보를 한눈에 확인하세요',
    url: 'https://toolhub.ai.kr/age-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '나이 계산기 | 툴허브',
    description: '만 나이, 한국 나이, 띠, 별자리 등 다양한 나이 정보를 한눈에 확인하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/age-calculator',
  },
}

export default function AgeCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '나이 계산기',
    description: '생년월일을 입력하면 만 나이, 한국 나이, 연 나이, 띠, 별자리, 살아온 날 수 등을 한눈에 확인할 수 있는 나이 계산기입니다.',
    url: 'https://toolhub.ai.kr/age-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '만 나이 계산 (국제 표준)',
      '한국 나이 (세는 나이) 계산',
      '연 나이 계산',
      '띠 (12간지) 계산',
      '별자리 계산',
      '살아온 일수/주수/개월수',
      '다음 생일까지 남은 일수',
      '세대 구분',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '만 나이와 한국 나이(세는 나이)의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '만 나이는 태어난 날을 0살로 시작하고 생일이 지날 때마다 1살씩 더하는 국제 표준 방식입니다. 한국 나이(세는 나이)는 태어나자마자 1살이고 매년 1월 1일에 1살씩 더합니다. 2023년 6월부터 한국도 법적으로 만 나이를 기준으로 통일했으며, 만 나이 = 한국 나이 - 1 또는 - 2 (생일 전)입니다.' } },
      { '@type': 'Question', name: '연 나이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '연 나이는 올해 연도에서 출생 연도를 뺀 나이입니다. 생일과 무관하게 같은 해 출생자는 모두 같은 나이가 됩니다. 예를 들어 2000년생은 2026년에 연 나이 26세입니다. 병역법, 청소년보호법 등 일부 법률에서는 여전히 연 나이를 사용합니다. 만 나이와는 0~1살 차이가 납니다.' } },
      { '@type': 'Question', name: '12간지 띠는 어떻게 결정되나요?', acceptedAnswer: { '@type': 'Answer', text: '12간지 띠는 출생 연도에 따라 쥐(자), 소(축), 호랑이(인), 토끼(묘), 용(진), 뱀(사), 말(오), 양(미), 원숭이(신), 닭(유), 개(술), 돼지(해) 순서로 12년 주기로 반복됩니다. 양력 기준으로 계산하며, 음력 설 이전 출생은 전년도 띠에 해당할 수 있습니다. 2024년은 용띠, 2025년은 뱀띠, 2026년은 말띠입니다.' } },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <AgeCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
