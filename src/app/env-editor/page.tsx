import { Metadata } from 'next'
import { Suspense } from 'react'
import EnvEditor from '@/components/EnvEditor'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '환경변수(.env) 편집기 - .env 파일 변환 도구 | 툴허브',
  description: '.env 파일을 온라인에서 편집하고 변환하세요. Raw 텍스트 및 테이블 뷰 모드 지원. Docker --env-file, docker-compose YAML, JSON, Shell export 형식으로 변환. 중복 키 감지, 유효성 검사 포함.',
  keywords: '.env 편집기, 환경변수 편집기, env 파일 변환, dotenv, Docker env, docker-compose environment, 환경변수 변환, env to JSON, env to YAML',
  openGraph: {
    title: '환경변수(.env) 편집기 | 툴허브',
    description: '.env 파일 편집, 검증, 형식 변환 도구. Docker, YAML, JSON, Shell export 지원.',
    url: 'https://toolhub.ai.kr/env-editor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '환경변수(.env) 편집기 | 툴허브',
    description: '.env 파일 편집, 검증, 형식 변환. Docker, YAML, JSON 지원.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/env-editor',
  },
}

const faqData = [
  {
    question: '.env 파일이란 무엇인가요?',
    answer: '.env 파일은 애플리케이션의 환경변수를 저장하는 텍스트 파일입니다. KEY=VALUE 형식으로 작성하며, API 키, 데이터베이스 URL 등 민감한 설정을 코드와 분리하여 관리합니다. Node.js(dotenv), Python(python-dotenv), Docker 등 대부분의 개발 환경에서 지원합니다.',
  },
  {
    question: '.env 파일을 Docker에서 사용하는 방법은?',
    answer: 'Docker에서는 두 가지 방법으로 .env 파일을 사용할 수 있습니다. 첫째, docker run --env-file .env 명령어로 컨테이너 실행 시 적용합니다. 둘째, docker-compose.yml의 env_file 또는 environment 섹션에 직접 나열합니다. 이 도구에서 Docker 형식으로 변환하면 바로 사용 가능합니다.',
  },
]

export default function EnvEditorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '환경변수(.env) 편집기',
    description: '.env 파일을 온라인에서 편집, 검증, 변환하는 도구',
    url: 'https://toolhub.ai.kr/env-editor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'Raw 텍스트 편집기',
      '테이블 뷰 편집',
      '.env 파싱 (따옴표, 주석, 빈 줄 지원)',
      '중복 키 감지',
      'Docker --env-file 형식 변환',
      'docker-compose YAML 형식 변환',
      'JSON 형식 변환',
      'Shell export 형식 변환',
      '파일 업로드/복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <EnvEditor />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
