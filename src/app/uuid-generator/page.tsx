import { Metadata } from 'next'
import { Suspense } from 'react'
import UuidGenerator from '@/components/UuidGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'UUID 생성기 - 고유 식별자 생성 | 툴허브',
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
    canonical: 'https://toolhub.ai.kr/uuid-generator/',
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
        <Breadcrumb />
              <UuidGenerator />
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
            UUID 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            UUID 생성기는 중앙 서버 없이도 전 세계적으로 고유한 식별자(Universally Unique Identifier)를 즉시 생성하는 개발자 도구입니다. v1(타임스탬프 기반), v4(완전 랜덤), v7(타임스탬프+랜덤 조합), Nil UUID를 지원하며 단일 또는 대량 생성이 가능합니다. 데이터베이스 기본키, 세션 ID, API 요청 추적 ID, 파일명 충돌 방지 등 다양한 개발 상황에서 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            UUID 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>데이터베이스 키:</strong> 자동 증가(auto-increment) 정수 대신 UUID v4나 v7을 기본키로 사용하면 분산 시스템에서 중복 없이 레코드를 생성할 수 있습니다.</li>
            <li><strong>v7 권장:</strong> 새 프로젝트에는 UUID v7을 권장합니다. v4의 랜덤성과 v1의 시간 순서 정렬 가능성을 모두 갖춰 데이터베이스 인덱스 성능이 우수합니다.</li>
            <li><strong>대량 생성:</strong> 테스트 데이터 삽입, 마이그레이션 스크립트 작성 시 한 번에 수십 개의 UUID를 생성하고 파일로 다운로드할 수 있습니다.</li>
            <li><strong>다양한 형식:</strong> 표준 하이픈 구분 형식 외에 중괄호 포함({'{UUID}'}), 하이픈 제거, URN 형식(urn:uuid:...) 등 필요한 형태로 출력하여 바로 코드에 붙여넣을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}