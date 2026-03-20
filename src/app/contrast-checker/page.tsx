import { Metadata } from 'next'
import { Suspense } from 'react'
import ContrastChecker from '@/components/ContrastChecker'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '색상 대비 체커 - WCAG 접근성 검사 | 툴허브',
  description:
    '텍스트와 배경 색상의 WCAG 대비율을 검사하세요. AA/AAA 등급 확인, 접근성 준수 색상 추천, 실시간 미리보기를 제공합니다.',
  keywords: '색상 대비, WCAG, 접근성, 컬러 대비, 대비율 검사, 웹 접근성',
  openGraph: {
    title: '색상 대비 체커 - WCAG 접근성 검사 | 툴허브',
    description: 'WCAG 색상 대비율 검사 및 접근성 준수 확인',
    url: 'https://toolhub.ai.kr/contrast-checker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '색상 대비 체커',
    description: 'WCAG 접근성 색상 대비 검사',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/contrast-checker/',
  },
}

export default function ContrastCheckerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '색상 대비 체커',
    description: 'WCAG 접근성 색상 대비율 검사',
    url: 'https://toolhub.ai.kr/contrast-checker',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'WCAG 2.1 대비율 계산',
      'AA/AAA 등급 검사',
      '텍스트 미리보기',
      '접근성 색상 추천',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '웹 접근성 색상 대비 기준은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'WCAG 2.1 기준으로 AA 등급은 일반 텍스트 4.5:1, 큰 텍스트(18pt+) 3:1의 명도 대비가 필요합니다. AAA 등급은 일반 텍스트 7:1, 큰 텍스트 4.5:1입니다. UI 컴포넌트와 그래픽은 최소 3:1이 필요합니다. 한국의 웹 접근성 인증(KWCAG)도 이 기준을 따릅니다. 장애인차별금지법에 따라 공공기관과 일정 규모 이상 기업은 웹 접근성을 준수해야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '색맹/색약 사용자를 위한 디자인 팁은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 색상만으로 정보를 전달하지 않기 (아이콘, 패턴, 텍스트 병행) ② 빨강-초록 조합 피하기 (가장 흔한 색맹 유형) ③ 파랑-주황 조합이 색맹에 안전 ④ 충분한 명도 대비 확보 ⑤ 그래프에서 색상 외에 패턴이나 라벨 사용 ⑥ 시뮬레이션 도구로 테스트. 전 세계 남성의 약 8%, 여성의 약 0.5%가 색각 이상이므로 반드시 고려해야 합니다.',
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
              <ContrastChecker />
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
            색상 대비 체커(WCAG 접근성 검사)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            색상 대비 체커는 텍스트와 배경 색상 간의 명도 대비율을 WCAG 2.1 국제 접근성 기준에 따라 검사하는 도구입니다. 웹 디자이너, 퍼블리셔, 프론트엔드 개발자가 색각 이상 사용자 포함 모든 사람이 텍스트를 쉽게 읽을 수 있도록 AA·AAA 등급 준수 여부를 실시간으로 확인할 수 있습니다. 한국의 웹 접근성 인증(KWCAG)과 장애인차별금지법 준수에도 필수적인 도구입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            색상 대비 체커 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>AA 등급 최소 요건:</strong> 일반 텍스트(18pt 미만)는 4.5:1, 큰 텍스트(18pt 이상 또는 굵은 14pt)는 3:1의 대비율이 필요합니다. 대부분의 웹사이트가 이 기준을 목표로 합니다.</li>
            <li><strong>AAA 등급 도전:</strong> 일반 텍스트 7:1, 큰 텍스트 4.5:1의 최고 등급으로, 시력이 약한 사용자까지 배려하는 고품질 접근성을 제공합니다.</li>
            <li><strong>버튼·아이콘 검사:</strong> UI 컴포넌트와 그래픽 요소도 배경 대비 3:1 이상을 확보해야 접근성 기준을 충족합니다.</li>
            <li><strong>색맹 배려:</strong> 빨강-초록 조합은 피하고, 색상 외에 텍스트·아이콘·패턴을 병행하여 색각 이상 사용자도 정보를 인식할 수 있도록 설계하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
