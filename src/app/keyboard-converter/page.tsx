import { Metadata } from 'next'
import { Suspense } from 'react'
import KeyboardConverter from '@/components/KeyboardConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '한영 타자 변환기 - 영타를 한글로, 한타를 영문으로 | 툴허브',
  description: '한영 타자 변환기 - 영문 타자를 한글로, 한글 타자를 영문으로 변환합니다. 실시간 변환, 양방향 지원.',
  keywords: '한영 타자 변환, 영타 한글 변환, 한타 영문 변환, dkssudgktpdy, keyboard converter',
  openGraph: { title: '한영 타자 변환기 | 툴허브', description: '영문 타자를 한글로, 한글 타자를 영문으로 변환', url: 'https://toolhub.ai.kr/keyboard-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '한영 타자 변환기 | 툴허브', description: '영문 타자를 한글로, 한글 타자를 영문으로 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/keyboard-converter' },
}

export default function KeyboardConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '한영 타자 변환기', description: '영문 타자를 한글로, 한글 타자를 영문으로 변환', url: 'https://toolhub.ai.kr/keyboard-converter', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['영타→한글 변환', '한타→영문 변환', '실시간 변환', '양방향 지원'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '한영 오타 변환이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한영 오타 변환은 키보드 입력 모드를 잘못 놓고 타이핑한 텍스트를 올바른 언어로 변환하는 것입니다. 예: 한글 모드에서 영어를 치면 \'dkssudgktpdy\'가 되는데 이를 \'안녕하세요\'로 변환합니다. 반대로 영어 모드에서 한글을 치면 의미 없는 영문이 됩니다. 한글 자모(초성, 중성, 종성)를 분리하고 영문 키 매핑을 적용하여 변환합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '두벌식과 세벌식 자판의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '두벌식(2벌식): 자음과 모음 2벌로 구성된 현재 한국 표준 자판입니다. 왼손이 자음, 오른손이 모음을 주로 담당합니다. 세벌식(3벌식): 초성, 중성, 종성 3벌로 구성되어 한 글자를 입력할 때 키가 겹치지 않아 오타가 적고 속도가 빠를 수 있습니다. 하지만 두벌식이 압도적으로 널리 사용되며, 세벌식은 공세벌식(390, 최종) 등 변형이 있습니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><KeyboardConverter /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
