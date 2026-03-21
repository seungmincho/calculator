import { Metadata } from 'next'
import { Suspense } from 'react'
import MenuPicker from '@/components/MenuPicker'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '오늘 뭐 먹지? 메뉴 추천 룰렛 - 랜덤 음식 추천 | 툴허브',
  description: '오늘 뭐 먹을지 고민될 때! 메뉴 추천 룰렛을 돌려보세요. 한식, 중식, 일식, 양식, 분식, 치킨 등 100가지 이상 메뉴에서 랜덤 추천. 상황별(혼밥, 회식, 데이트, 야식, 해장) 맞춤 추천도 가능합니다.',
  keywords: '오늘뭐먹지, 메뉴추천, 랜덤메뉴, 음식추천, 메뉴룰렛, 점심메뉴, 저녁메뉴, 혼밥추천, 야식추천, 회식메뉴, 데이트맛집',
  openGraph: {
    title: '오늘 뭐 먹지? 메뉴 추천 룰렛 | 툴허브',
    description: '메뉴 고르기 힘들 때! 룰렛을 돌려 오늘의 메뉴를 정해보세요. 8개 카테고리 100가지 이상 메뉴에서 랜덤 추천.',
    url: 'https://toolhub.ai.kr/menu-picker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '오늘 뭐 먹지? 메뉴 추천 룰렛',
    description: '메뉴 고르기 힘들 때! 룰렛을 돌려 오늘의 메뉴를 정해보세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/menu-picker/',
  },
}

export default function MenuPickerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '오늘 뭐 먹지? 메뉴 추천 룰렛',
    description: '한식, 중식, 일식, 양식 등 100가지 이상 메뉴에서 랜덤으로 오늘의 메뉴를 추천해드립니다. 상황별 맞춤 추천과 맛집 검색 연동.',
    url: 'https://toolhub.ai.kr/menu-picker',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '메뉴 추천 룰렛',
      '8개 음식 카테고리 (한식/중식/일식/양식/분식/치킨/카페/아시안)',
      '100가지 이상 메뉴',
      '상황별 추천 (혼밥/회식/데이트/야식/해장/다이어트)',
      '네이버 맛집 검색 연동',
      '추천 히스토리',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '어떤 기준으로 메뉴가 선택되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '완전 랜덤으로 선택됩니다. 선택된 카테고리에서 무작위로 메뉴가 추출되어 룰렛에 표시되고, 룰렛이 멈추는 위치의 메뉴가 선정됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '카테고리를 바꾸면 뭐가 달라지나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '선택한 카테고리의 음식만 룰렛에 표시됩니다. 여러 카테고리를 동시에 선택할 수도 있고, 특정 카테고리만 골라 좁은 범위에서 선택할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '매번 같은 결과가 나오나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '아니요, 매 회전마다 룰렛의 메뉴 구성과 결과가 달라집니다. 같은 설정이라도 매번 다른 결과를 얻을 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <MenuPicker />
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
              오늘 뭐 먹지? 메뉴 추천 룰렛이란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              메뉴 추천 룰렛은 한식·중식·일식·양식·분식·치킨·카페·아시안 8개 카테고리 100가지 이상의 메뉴 중에서 오늘의 식사를 랜덤으로 골라주는 도구입니다. 매일 점심·저녁 메뉴 고르기가 귀찮은 분, 혼밥·회식·데이트·야식·해장 등 상황별 맞춤 추천이 필요한 분 모두에게 유용합니다. 결정 장애(결정을 못 내리는 상황)를 간단히 해결해 드립니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              메뉴 추천 룰렛 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>상황별 추천:</strong> 혼밥, 회식, 데이트, 야식, 해장, 다이어트 등 상황을 선택하면 해당 상황에 적합한 메뉴만 추천됩니다.</li>
              <li><strong>카테고리 좁히기:</strong> 먹고 싶은 음식 종류가 대략 정해졌다면 해당 카테고리만 선택해 범위를 좁혀 룰렛을 돌리세요.</li>
              <li><strong>맛집 검색 연동:</strong> 추천된 메뉴 아래의 맛집 검색 버튼을 누르면 네이버 지도에서 주변 맛집을 바로 찾을 수 있습니다.</li>
              <li><strong>여럿이서 사용:</strong> 여럿이 모여 룰렛을 함께 돌리면 메뉴 선택 갈등을 공정하게 해결할 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
