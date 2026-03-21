import { Metadata } from 'next'
import { Suspense } from 'react'
import NameCompatibility from '@/components/NameCompatibility'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이름 궁합 테스트 - ㅇㅎ 획수 궁합 | 툴허브',
  description: '두 사람의 이름으로 궁합을 확인하세요! ㅇ/ㅎ 획수 기반 이름 궁합 테스트. 단계별 애니메이션으로 계산 과정을 보여주고, 결과 카드를 이미지로 저장하거나 카카오톡으로 공유할 수 있습니다.',
  keywords: '이름 궁합, 이름궁합 테스트, 궁합 테스트, 이름 궁합 보기, ㅇㅎ 궁합, 획수 궁합, 커플 궁합',
  openGraph: {
    title: '이름 궁합 테스트 | 툴허브',
    description: '두 사람의 이름으로 궁합 점수를 확인하세요! ㅇ/ㅎ 획수 궁합 테스트',
    url: 'https://toolhub.ai.kr/name-compatibility/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이름 궁합 테스트 | 툴허브',
    description: '두 사람의 이름으로 궁합을 확인해보세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/name-compatibility/',
  },
}

export default function NameCompatibilityPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이름 궁합 테스트',
    description: 'ㅇ/ㅎ 획수 기반 이름 궁합 테스트 - 단계별 애니메이션, 결과 카드 공유',
    url: 'https://toolhub.ai.kr/name-compatibility',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'ㅇ/ㅎ 획수 기반 궁합 계산',
      '단계별 계산 과정 애니메이션',
      '결과 카드 이미지 저장',
      'URL 공유 기능',
      '궁합 점수별 메시지',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이름 궁합 테스트는 어떻게 계산되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '두 이름의 글자를 번갈아 배치한 후, 각 글자의 자음/모음을 ㅇ과 ㅎ로 변환하고 획수(ㅇ=1, ㅎ=3)를 계산합니다. 인접한 숫자를 더해가며 최종 궁합 점수를 구합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '이름 궁합 결과를 공유할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 결과 카드를 이미지(PNG)로 저장하거나, URL 링크를 복사해서 카카오톡 등으로 공유할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <NameCompatibility />
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
