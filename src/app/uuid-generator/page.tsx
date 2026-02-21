import { Metadata } from 'next'
import { Suspense } from 'react'
import UuidGenerator from '@/components/UuidGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'UUID 생성기 | 툴허브 - 개발자용 고유 식별자 생성 도구',
  description: '다양한 버전의 UUID를 안전하게 생성하는 개발자 도구입니다. v1, v4, v7, Nil UUID를 지원하며 대량 생성과 다양한 형식 출력이 가능합니다.',
  keywords: 'UUID, GUID, 고유식별자, 랜덤생성, 개발도구, UUID v1, UUID v4, UUID v7, Nil UUID, 대량생성, 개발자도구',
  openGraph: {
    title: 'UUID 생성기 | 툴허브',
    description: '개발자용 UUID 생성 도구 - 다양한 버전 지원 + 대량 생성 + 다양한 출력 형식',
    url: 'https://toolhub.ai.kr/uuid-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UUID 생성기 - 개발자용 고유 식별자 생성 도구',
    description: '다양한 버전의 UUID를 안전하게 생성하는 개발자 도구입니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/uuid-generator',
  },
}

export default function UuidGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'UUID 생성기',
    description: '다양한 버전의 UUID를 안전하게 생성하는 개발자 도구',
    url: 'https://toolhub.ai.kr/uuid-generator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'UUID v1 생성 (타임스탬프 기반)',
      'UUID v4 생성 (랜덤 기반)', 
      'UUID v7 생성 (타임스탬프 + 랜덤)',
      'Nil UUID 생성',
      '대량 생성 기능',
      '다양한 형식 출력',
      '복사 및 다운로드 지원'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'UUID란 무엇이고 어디에 사용되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UUID(Universally Unique Identifier)는 128비트 길이의 고유 식별자로, 중앙 서버 없이도 충돌 가능성이 극히 낮은 고유 ID를 생성합니다. 형식: 550e8400-e29b-41d4-a716-446655440000 (32개 16진수를 하이픈으로 구분). 데이터베이스 기본키, API 요청 추적, 세션 ID, 파일명 생성 등에 사용됩니다. 전 세계에서 동시에 생성해도 충돌 확률은 사실상 0입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'UUID v1, v4, v7의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UUID v1: MAC 주소 + 타임스탬프 기반. 시간 순서가 있어 정렬 가능하지만 MAC 주소가 노출됩니다. UUID v4: 완전 랜덤. 가장 널리 사용되며 예측 불가능하지만 정렬이 안 됩니다. UUID v7: 타임스탬프 + 랜덤. 2022년 새 표준으로, v4의 보안성과 v1의 정렬성을 모두 갖추어 데이터베이스 인덱스 성능이 우수합니다. 새 프로젝트에는 v7을 권장합니다.',
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
              <UuidGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}