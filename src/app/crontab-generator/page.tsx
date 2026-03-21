import { Metadata } from 'next'
import { Suspense } from 'react'
import CrontabGenerator from '@/components/CrontabGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/crontab-generator/',
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
        <Breadcrumb />
              <CrontabGenerator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Crontab 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Crontab 생성기는 Linux·Unix 서버의 정기 작업 예약(cron)에 사용하는 크론 표현식을 비주얼 UI로 간편하게 만들어주는 개발 도구입니다. 분·시·일·월·요일을 클릭으로 설정하면 표현식이 자동 생성되고 한국어 설명과 다음 실행 시간 미리보기가 제공됩니다. 백엔드 개발자, DevOps 엔지니어, 서버 관리자가 복잡한 크론 문법을 외우지 않고도 정확한 스케줄을 설정할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Crontab 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>프리셋 활용:</strong> 매분, 매시, 매일, 매주, 매월 등 자주 쓰는 스케줄은 프리셋 버튼으로 즉시 적용할 수 있습니다.</li>
            <li><strong>인터벌 설정:</strong> &apos;*/5&apos; 형태로 5분마다, &apos;*/6&apos;으로 6시간마다 등 일정 간격으로 반복 실행하는 표현식을 만들 수 있습니다.</li>
            <li><strong>다음 실행 시간 확인:</strong> 생성된 표현식으로 실제 서버에 등록하기 전, 미리보기로 다음 5회 실행 시간을 확인하여 의도대로 동작하는지 검증하세요.</li>
            <li><strong>요일 번호 규칙:</strong> 0과 7 모두 일요일, 1=월요일, 5=금요일입니다. 평일만 실행하려면 요일 필드에 1-5를 입력하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
