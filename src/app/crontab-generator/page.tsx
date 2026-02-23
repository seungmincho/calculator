import { Metadata } from 'next'
import { Suspense } from 'react'
import CrontabGenerator from '@/components/CrontabGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'Crontab 생성기 - 비주얼 크론 표현식 빌더 | 툴허브',
  description: 'Crontab 표현식을 클릭 한 번으로 생성하세요. 비주얼 빌더로 분·시·일·월·요일을 설정하면 크론 표현식과 한국어 설명이 자동 생성됩니다. 다음 실행 시간 미리보기와 프리셋 제공.',
  keywords: 'crontab, cron 생성기, 크론 표현식 빌더, 크론탭, 스케줄러, cron 도우미, 리눅스 cron, 자동화, 정기실행, 개발도구',
  openGraph: {
    title: 'Crontab 생성기 - 비주얼 크론 표현식 빌더 | 툴허브',
    description: '비주얼 UI로 Crontab 표현식 생성 + 한국어 설명 + 다음 실행 시간 미리보기',
    url: 'https://toolhub.ai.kr/crontab-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crontab 생성기 - 비주얼 크론 표현식 빌더',
    description: 'Crontab 표현식을 클릭 한 번으로 생성하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/crontab-generator',
  },
}

export default function CrontabGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Crontab 생성기',
    description: '비주얼 UI로 Crontab 표현식을 생성하는 도구',
    url: 'https://toolhub.ai.kr/crontab-generator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '비주얼 크론 표현식 빌더',
      '한국어 설명 자동 생성',
      '다음 5회 실행 시간 미리보기',
      '매분/매시/매일/매주/매월 프리셋',
      '특정 값, 범위, 인터벌 지원',
      '클립보드 복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Crontab 표현식은 어떻게 만드나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Crontab 표현식은 5개 필드(분 시 일 월 요일)로 구성됩니다. 이 생성기에서는 각 필드를 비주얼 UI로 설정하면 표현식이 자동 생성됩니다. 매분(*), 특정 값(예: 30), 범위(예: 1-5), 인터벌(예: */10)을 지원합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Crontab에서 요일은 어떻게 지정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Crontab 요일 필드는 0(일요일)부터 6(토요일)까지 숫자로 지정합니다. 7도 일요일로 인식됩니다. 예: 1=월요일, 5=금요일, 1-5=평일(월~금). 이 생성기에서는 버튼 클릭으로 요일을 선택할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <CrontabGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
