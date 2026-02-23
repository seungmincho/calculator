import { Metadata } from 'next'
import { Suspense } from 'react'
import YamlJsonConverter from '@/components/YamlJsonConverter'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'YAML ↔ JSON 변환기 - YAML to JSON, JSON to YAML 온라인 변환 | 툴허브',
  description: 'YAML과 JSON을 실시간으로 상호 변환합니다. Kubernetes YAML, Docker Compose, CI/CD 설정 파일을 JSON으로 변환하거나, JSON 데이터를 YAML로 변환하세요. 파일 업로드, 다운로드, 키 정렬 지원.',
  keywords: 'YAML to JSON, JSON to YAML, YAML 변환기, JSON 변환기, Kubernetes YAML, Docker Compose, YAML 파서, YAML 온라인',
  openGraph: {
    title: 'YAML ↔ JSON 변환기 | 툴허브',
    description: 'YAML과 JSON을 실시간으로 상호 변환. Kubernetes, Docker Compose 등 설정 파일 변환에 최적화.',
    url: 'https://toolhub.ai.kr/yaml-json-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YAML ↔ JSON 변환기 | 툴허브',
    description: 'YAML과 JSON을 실시간으로 상호 변환. 파일 업로드, 다운로드 지원.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/yaml-json-converter',
  },
}

const faqData = [
  {
    question: 'YAML과 JSON의 차이점은 무엇인가요?',
    answer: 'YAML은 들여쓰기 기반의 사람이 읽기 쉬운 형식이고, JSON은 중괄호와 따옴표를 사용하는 기계 친화적 형식입니다. YAML은 주석을 지원하지만 JSON은 지원하지 않습니다. 두 형식 모두 동일한 데이터를 표현할 수 있습니다.',
  },
  {
    question: 'Kubernetes YAML 파일을 JSON으로 변환할 수 있나요?',
    answer: '네, 가능합니다. Kubernetes의 모든 리소스 정의(Deployment, Service, ConfigMap 등)는 YAML과 JSON 형식을 모두 지원합니다. 이 도구로 변환한 JSON 파일도 kubectl에서 그대로 사용할 수 있습니다.',
  },
  {
    question: 'YAML에서 JSON으로 변환할 때 주석은 어떻게 되나요?',
    answer: 'JSON은 주석을 지원하지 않으므로, YAML의 주석(# 으로 시작하는 줄)은 변환 시 제거됩니다. JSON에서 다시 YAML로 변환해도 원래 주석은 복원되지 않습니다.',
  },
]

export default function YamlJsonConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'YAML ↔ JSON 변환기',
    description: 'YAML과 JSON을 실시간으로 상호 변환하는 온라인 도구',
    url: 'https://toolhub.ai.kr/yaml-json-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'YAML to JSON 변환',
      'JSON to YAML 변환',
      '실시간 변환',
      '파일 업로드/다운로드',
      '키 정렬',
      '들여쓰기 설정',
      'YAML Flow Style 지원',
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
              <YamlJsonConverter />
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
