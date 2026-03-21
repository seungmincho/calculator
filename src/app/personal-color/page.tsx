import { Metadata } from 'next'
import { Suspense } from 'react'
import PersonalColor from '@/components/PersonalColor'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '퍼스널컬러 자가진단 - 봄웜/여름쿨/가을웜/겨울쿨 | 툴허브',
  description: '12문항 셀프 테스트로 나의 퍼스널컬러를 진단하세요! 봄 웜톤, 여름 쿨톤, 가을 웜톤, 겨울 쿨톤 중 나에게 어울리는 컬러를 찾고 맞춤 팔레트와 스타일링 팁을 받으세요.',
  keywords: '퍼스널컬러, 퍼스널컬러 진단, 퍼스널컬러 테스트, 봄웜톤, 여름쿨톤, 가을웜톤, 겨울쿨톤, 웜톤 쿨톤',
  openGraph: {
    title: '퍼스널컬러 자가진단 | 툴허브',
    description: '12문항으로 봄웜/여름쿨/가을웜/겨울쿨 퍼스널컬러를 진단하세요',
    url: 'https://toolhub.ai.kr/personal-color/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '퍼스널컬러 자가진단 | 툴허브',
    description: '나에게 어울리는 컬러 톤을 찾아보세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/personal-color/',
  },
}

export default function PersonalColorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '퍼스널컬러 자가진단',
    description: '12문항 셀프 퍼스널컬러 진단 - 봄웜/여름쿨/가을웜/겨울쿨 유형 분석',
    url: 'https://toolhub.ai.kr/personal-color',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '12문항 퍼스널컬러 자가진단',
      '봄웜/여름쿨/가을웜/겨울쿨 4유형 분석',
      '맞춤 컬러 팔레트 추천',
      '패션 & 메이크업 스타일링 팁',
      '같은 유형 연예인 소개',
      '결과 카드 이미지 저장 및 공유',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '퍼스널컬러 자가진단은 정확한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '셀프 테스트는 대략적인 유형 파악에 도움이 됩니다. 정확한 진단을 위해서는 전문 컨설턴트의 드레이핑 진단을 받는 것이 좋습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '퍼스널컬러는 몇 가지 유형이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크게 봄 웜톤, 여름 쿨톤, 가을 웜톤, 겨울 쿨톤의 4가지 유형으로 나뉩니다. 웜톤은 노란 기가 도는 따뜻한 톤, 쿨톤은 핑크/블루 기가 도는 차가운 톤입니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <PersonalColor />
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
