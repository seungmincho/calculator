import { Metadata } from 'next'
import { Suspense } from 'react'
import RegexEngineVisualizer from '@/components/RegexEngineVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '정규표현식 엔진 시각화 - regex 매칭 과정 학습 | 툴허브',
  description: '정규표현식(regex) 매칭 과정을 단계별로 시각화합니다. 패턴 토큰 분석, 문자별 매칭 하이라이트, 캡처 그룹 표시, 프리셋 패턴으로 쉽게 학습하세요.',
  keywords: '정규표현식, regex, 정규식 시각화, NFA, 패턴 매칭, regex 학습, 정규표현식 테스트',
  openGraph: {
    title: '정규표현식 엔진 시각화 | 툴허브',
    description: '정규표현식 매칭 과정을 단계별로 시각화하고 학습하세요.',
    url: 'https://toolhub.ai.kr/regex-engine',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '정규표현식 엔진 시각화',
    description: 'regex 패턴 매칭 과정을 시각적으로 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/regex-engine/',
  },
}

export default function RegexEnginePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '정규표현식 엔진 시각화',
    description: '정규표현식(regex) 매칭 과정을 단계별로 시각화하는 학습 도구',
    url: 'https://toolhub.ai.kr/regex-engine',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '정규표현식 토큰 분석 및 한국어 설명',
      '문자별 매칭 과정 단계별 시각화',
      '캡처 그룹 하이라이트',
      '프리셋 패턴 (이메일, 전화번호, IP 등)',
      '자동 재생 및 속도 조절',
      '다크모드 지원',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '정규표현식이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '정규표현식(Regular Expression, regex)은 문자열에서 특정 패턴을 찾거나 치환하기 위한 형식 언어입니다. 예를 들어 \\d+는 하나 이상의 숫자를, [a-z]+는 하나 이상의 소문자를 의미합니다. 프로그래밍, 텍스트 편집기, 데이터 처리 등에서 널리 사용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '탐욕적 매칭과 게으른 매칭의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '탐욕적(greedy) 매칭은 가능한 한 많은 문자를 매칭합니다(기본값). 예: .*은 줄 전체를 매칭합니다. 게으른(lazy) 매칭은 ?를 붙여 가능한 한 적은 문자만 매칭합니다. 예: .*?는 최소한의 문자만 매칭합니다. HTML 태그 추출 시 <.*>는 탐욕적으로 첫 <부터 마지막 >까지 매칭하지만, <.*?>는 개별 태그만 매칭합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '캡처 그룹은 어떻게 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '캡처 그룹은 소괄호 ()로 감싼 부분입니다. 매칭된 텍스트의 특정 부분을 추출할 때 사용합니다. 예: (\\d{3})-(\\d{4})에서 010-1234를 매칭하면 그룹1은 010, 그룹2는 1234입니다. 역참조(\\1, \\2)로 앞서 매칭된 그룹을 다시 참조할 수도 있습니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <RegexEngineVisualizer />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            정규표현식 엔진 시각화란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            정규표현식 엔진 시각화 도구는 regex 패턴이 문자열을 매칭하는 과정을 단계별로 보여주는 교육 도구입니다.
            패턴을 토큰 단위로 분해하여 각각의 의미를 한국어로 설명하고, 테스트 문자열의 각 위치에서
            매칭 시도 결과를 색상으로 표시합니다. 이메일, 전화번호, IP 주소 등 실무에서 자주 쓰는
            프리셋 패턴을 제공하며, 자동 재생 기능으로 매칭 과정을 애니메이션처럼 관찰할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            정규표현식 학습 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>기본 메타문자부터:</strong> . * + ? [] () 등 기본 메타문자의 의미를 먼저 익히세요. 이것만으로도 대부분의 패턴을 읽을 수 있습니다.</li>
            <li><strong>프리셋으로 시작:</strong> 이메일, 전화번호 등 익숙한 패턴의 정규표현식을 분석해보면 문법이 빠르게 이해됩니다.</li>
            <li><strong>단계별 관찰:</strong> 이 도구의 단계별 실행 기능을 활용하여 엔진이 각 문자를 어떻게 처리하는지 관찰하세요.</li>
            <li><strong>캡처 그룹 활용:</strong> 괄호 ()를 사용하면 매칭된 텍스트의 특정 부분만 추출할 수 있어 데이터 파싱에 유용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
