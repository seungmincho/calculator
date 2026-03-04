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
    canonical: 'https://toolhub.ai.kr/yaml-json-converter/',
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

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            YAML ↔ JSON 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            YAML ↔ JSON 변환기는 YAML과 JSON 형식을 실시간으로 상호 변환해 주는 개발자 도구입니다. Kubernetes 배포 파일, Docker Compose 설정, GitHub Actions 워크플로우, Ansible 플레이북 등 YAML 기반 설정 파일을 JSON으로 변환하거나, 반대로 JSON 데이터를 사람이 읽기 쉬운 YAML 형식으로 변환할 수 있습니다. 파일 업로드와 다운로드, 들여쓰기 설정, 키 정렬 기능을 지원합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            YAML ↔ JSON 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Kubernetes 설정 변환:</strong> kubectl 명령어는 YAML과 JSON을 모두 지원합니다. 복잡한 YAML을 JSON으로 변환하여 jq로 파싱하거나 API로 직접 전송할 때 유용합니다.</li>
            <li><strong>주석 처리 주의:</strong> YAML은 # 주석을 지원하지만 JSON은 지원하지 않습니다. YAML → JSON 변환 시 주석이 모두 제거되므로, 주석이 중요하다면 원본 YAML 파일을 별도로 보관하세요.</li>
            <li><strong>들여쓰기 설정:</strong> YAML 출력 시 2칸 또는 4칸 들여쓰기를 선택할 수 있습니다. 팀 코딩 스타일 가이드에 맞춰 설정하세요.</li>
            <li><strong>데이터 타입 보존:</strong> 숫자, 불리언(true/false), null 값은 변환 시 타입이 유지됩니다. YAML의 &apos;yes&apos;/&apos;no&apos;는 JSON의 true/false로 자동 변환됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
