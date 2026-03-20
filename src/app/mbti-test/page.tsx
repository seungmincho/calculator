import { Metadata } from 'next'
import { Suspense } from 'react'
import MbtiTest from '@/components/MbtiTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'MBTI 성격유형 검사 - 48문항 상세 테스트 | 툴허브',
  description: '48문항 상세 MBTI 성격유형 검사. 나의 MBTI 유형을 정확하게 알아보고 성격 특성, 연애 스타일, 추천 직업까지 확인하세요. 결과 공유 카드 생성 가능.',
  keywords: 'MBTI 검사, MBTI 테스트, 성격유형 검사, MBTI 무료 검사, MBTI 결과, 16가지 성격유형',
  openGraph: {
    title: 'MBTI 성격유형 검사 48문항 | 툴허브',
    description: '48문항으로 알아보는 나의 MBTI 유형. 성격 특성, 연애 스타일, 추천 직업, 결과 카드 공유까지',
    url: 'https://toolhub.ai.kr/mbti-test/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MBTI 성격유형 검사 | 툴허브',
    description: '48문항 상세 MBTI 검사로 나의 성격유형을 알아보세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/mbti-test/',
  },
}

export default function MbtiTestPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'MBTI 성격유형 검사',
    description: '48문항 상세 MBTI 성격유형 검사 - 성격 특성, 연애 스타일, 추천 직업, 결과 카드 공유',
    url: 'https://toolhub.ai.kr/mbti-test',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '48문항 상세 MBTI 검사',
      '4가지 지표별 점수 분포 시각화',
      '16가지 유형 상세 프로필',
      '성격 특성, 강점, 약점 분석',
      '연애 스타일 및 소통 방식',
      '추천 직업 및 유명인',
      '결과 카드 이미지 저장',
      'URL 결과 공유',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'MBTI 검사는 몇 문항인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '총 48문항으로 구성되며, E/I, S/N, T/F, J/P 각 축별로 12문항씩 배정됩니다. 검사 시간은 약 5~10분 소요됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'MBTI 결과는 어떻게 공유하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '검사 결과 페이지에서 링크 복사, X(트위터) 공유, 또는 결과 카드 이미지 저장 기능을 이용하실 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'MBTI 궁합도 볼 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 검사 결과 페이지에서 "궁합 보러가기" 버튼을 클릭하면 MBTI 궁합 분석 페이지로 이동해 상세 궁합을 확인하실 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <MbtiTest />
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
