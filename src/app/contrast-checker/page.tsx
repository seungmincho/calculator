import { Metadata } from 'next'
import { Suspense } from 'react'
import ContrastChecker from '@/components/ContrastChecker'
import I18nWrapper from '@/components/I18nWrapper'

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
    canonical: 'https://toolhub.ai.kr/contrast-checker',
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
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
