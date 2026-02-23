import { Metadata } from 'next'
import { Suspense } from 'react'
import RegexBuilder from '@/components/RegexBuilder'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '정규식 빌더 - 비주얼 정규표현식 생성기 | 툴허브',
  description: '클릭 한 번으로 정규식을 만들고 테스트하세요. 이메일, 전화번호, URL 등 자주 쓰는 패턴 라이브러리, 실시간 하이라이팅, 치환 기능 제공.',
  keywords: [
    '정규식 빌더',
    '정규표현식 생성기',
    'regex builder',
    '정규식 테스터',
    'regex tester',
    '정규표현식',
    '패턴 매칭',
    '문자열 처리',
    '이메일 정규식',
    '전화번호 정규식',
    '정규식 설명',
    '정규표현식 예제',
    '개발자 도구',
    '텍스트 검색',
    '정규식 플래그'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '정규식 빌더 - 비주얼 정규표현식 생성기 | 툴허브',
    description: '클릭 한 번으로 정규식을 만들고 테스트하세요. 이메일, 전화번호, URL 등 자주 쓰는 패턴 라이브러리, 실시간 하이라이팅, 치환 기능 제공.',
    type: 'website',
    url: 'https://toolhub.ai.kr/regex-builder',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '정규식 빌더 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '정규식 빌더 - 비주얼 정규표현식 생성기 | 툴허브',
    description: '클릭 한 번으로 정규식을 만들고 테스트하세요. 실시간 하이라이팅, 패턴 라이브러리, 치환 기능 제공.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/regex-builder',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RegexBuilderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '정규식 빌더',
    description: '클릭 한 번으로 정규식을 만들고 테스트하세요. 이메일, 전화번호, URL 등 자주 쓰는 패턴 라이브러리, 실시간 하이라이팅, 치환 기능 제공.',
    url: 'https://toolhub.ai.kr/regex-builder',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '비주얼 정규식 패턴 빌더',
      '실시간 매칭 하이라이팅',
      '자주 쓰는 패턴 라이브러리',
      '문자열 치환 기능',
      '정규식 구성 요소 설명',
      'g/i/m/s/u 플래그 토글',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '정규식 빌더란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '정규식 빌더는 복잡한 정규표현식을 시각적으로 만들고 바로 테스트할 수 있는 도구입니다. 패턴을 직접 입력하거나 이메일, 전화번호, URL 등 자주 쓰는 패턴을 클릭 한 번으로 불러올 수 있습니다. 입력한 테스트 문자열에서 매칭 결과를 실시간으로 노란색으로 하이라이팅해 보여주며, 각 정규식 구성 요소(\\d, +, [a-z] 등)를 한국어로 설명해 줍니다.',
        },
      },
      {
        '@type': 'Question',
        name: '정규식 플래그(g, i, m, s, u)는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '정규식 플래그는 매칭 방식을 조절합니다. g(전체): 첫 번째 매칭에서 멈추지 않고 모든 매칭을 찾습니다. i(대소문자 무시): hello와 HELLO를 동일하게 처리합니다. m(여러 줄): ^와 $가 각 줄의 시작과 끝에 매칭됩니다. s(점 전체): 점(.)이 줄바꿈 문자까지 매칭합니다. u(유니코드): 이모지나 한글 등 유니코드를 정확히 처리합니다.',
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
          <Suspense fallback={<div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <I18nWrapper>
              <RegexBuilder />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
