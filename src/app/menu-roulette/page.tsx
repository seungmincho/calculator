import { Metadata } from 'next'
import { Suspense } from 'react'
import MenuRouletteClient from './MenuRouletteClient'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '메뉴 추천 룰렛 - 오늘 뭐 먹지? 점심 저녁 메뉴 결정 | 툴허브',
  description:
    '오늘 점심 저녁 메뉴 고민 끝! 메뉴 추천 룰렛으로 랜덤하게 오늘의 메뉴를 결정하세요. 한식·중식·일식·양식·분식 등 원하는 메뉴를 직접 추가해 돌릴 수 있어요.',
  keywords: [
    '메뉴 추천 룰렛',
    '오늘의 메뉴 추천 룰렛',
    '오늘 메뉴 추천 룰렛',
    '점심 메뉴 룰렛',
    '저녁 메뉴 추천',
    '오늘 뭐 먹지',
    '랜덤 메뉴 추천',
    '점심 메뉴 추천',
    '메뉴 결정 룰렛',
    '오늘 점심 뭐 먹지',
    '메뉴 돌림판',
    '음식 추천 룰렛',
    '식당 추천 룰렛',
    '메뉴 랜덤 선택',
    '점심 뭐 먹을까',
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '메뉴 추천 룰렛 - 오늘 뭐 먹지? | 툴허브',
    description:
      '오늘 점심 저녁 메뉴 고민 끝! 메뉴 추천 룰렛으로 랜덤하게 오늘의 메뉴를 결정하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/menu-roulette',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '메뉴 추천 룰렛 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '메뉴 추천 룰렛 - 오늘 뭐 먹지?',
    description: '점심·저녁 메뉴 고민을 룰렛으로 단번에 해결하세요.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/menu-roulette/',
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

export default function MenuRoulettePage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '메뉴 추천 룰렛',
    description:
      '오늘의 점심·저녁 메뉴를 룰렛으로 랜덤하게 결정하는 무료 온라인 도구. 한식, 중식, 일식, 양식, 분식 등 원하는 메뉴를 등록하고 돌려보세요.',
    url: 'https://toolhub.ai.kr/menu-roulette',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '메뉴 항목 자유 추가/삭제',
      '점심메뉴 프리셋 제공',
      '회전 애니메이션 룰렛',
      '결과 공유 기능',
      '모바일·PC 모두 지원',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '메뉴 추천 룰렛 사용 방법',
    description: '오늘의 메뉴를 룰렛으로 결정하는 5단계 가이드',
    totalTime: 'PT1M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: '메뉴 목록 확인',
        text: '기본 제공되는 점심메뉴 프리셋(짜장면, 짬뽕, 냉면 등)을 확인하거나, 원하는 메뉴를 직접 입력해 추가하세요.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: '메뉴 커스터마이즈',
        text: '먹고 싶지 않은 메뉴는 삭제하고, 새로운 메뉴를 추가해 나만의 룰렛을 완성하세요. 최대 12개까지 등록 가능합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: '룰렛 돌리기',
        text: '화면 중앙의 룰렛 또는 "돌리기" 버튼을 클릭하면 룰렛이 회전하기 시작합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: '결과 확인',
        text: '룰렛이 멈추면 오늘의 메뉴가 결정됩니다! 결과 화면에 선택된 메뉴가 크게 표시됩니다.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: '결과 공유',
        text: '결과를 팀원이나 친구에게 공유하려면 링크 복사 버튼을 눌러 현재 메뉴 목록이 담긴 URL을 공유하세요.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '메뉴 추천 룰렛은 무료인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 완전 무료입니다. 회원가입이나 앱 설치 없이 브라우저에서 바로 사용할 수 있어요. PC, 스마트폰, 태블릿 모두 지원합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '룰렛에 메뉴를 몇 개까지 추가할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '최대 12개까지 추가할 수 있습니다. 메뉴 이름을 입력하고 추가 버튼을 누르면 되며, 원하지 않는 항목은 삭제할 수 있어요.',
        },
      },
      {
        '@type': 'Question',
        name: '점심 메뉴 프리셋은 어떤 메뉴들이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기본 프리셋에는 짜장면, 짬뽕, 냉면, 비빔밥, 삼겹살, 라멘, 초밥, 피자가 포함되어 있습니다. "점심메뉴" 프리셋 버튼을 누르면 한 번에 불러올 수 있어요.',
        },
      },
      {
        '@type': 'Question',
        name: '룰렛 결과를 친구에게 공유할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네! 현재 입력한 메뉴 목록이 URL에 자동으로 담기므로, 주소창의 링크를 복사해서 카카오톡이나 메신저로 공유하면 같은 룰렛을 친구도 돌릴 수 있어요.',
        },
      },
      {
        '@type': 'Question',
        name: '오늘 점심 메뉴 정할 때 말고 다른 용도로도 쓸 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '물론입니다. 저녁 메뉴 결정, 디저트 선택, 카페 메뉴 고르기, 모임 장소 결정, 벌칙 정하기 등 다양한 상황에서 활용할 수 있어요.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <MenuRouletteClient />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>

      {/* SEO 콘텐츠 — 크롤러용 가시적 HTML */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-8">

          {/* 메뉴 추천 룰렛이란? */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              메뉴 추천 룰렛이란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              메뉴 추천 룰렛은 점심·저녁 메뉴를 고를 때 빠르고 공정하게 결정을 도와주는 온라인 룰렛 도구입니다.
              원하는 음식 목록을 입력하고 룰렛을 돌리면 무작위로 오늘의 메뉴가 선택됩니다.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              "오늘 뭐 먹지?"라는 질문으로 시작되는 오랜 고민을 단 몇 초 만에 해결해 드립니다.
              짜장면·짬뽕·냉면·비빔밥·삼겹살 등 기본 프리셋을 제공하며, 자주 가는 식당이나 좋아하는 메뉴를 직접 추가해
              나만의 맞춤 룰렛을 만들 수 있습니다.
            </p>
          </div>

          {/* 이런 때 사용하세요 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              이런 때 사용하세요
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex gap-3">
                <span className="text-orange-500 font-bold shrink-0">직장인 점심</span>
                <span>팀원들과 점심 메뉴를 정할 때 의견 충돌 없이 룰렛으로 공정하게 결정하세요.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500 font-bold shrink-0">가족 저녁</span>
                <span>온 가족이 원하는 메뉴를 적어 넣고 돌리면 저녁 메뉴 고민 끝!</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500 font-bold shrink-0">친구 모임</span>
                <span>약속 장소 근처 맛집 목록을 입력하고 룰렛으로 식당을 결정해 보세요.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500 font-bold shrink-0">혼밥</span>
                <span>혼자 먹을 때도 결정 장애를 룰렛으로 해결! 새로운 메뉴 도전의 계기가 됩니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500 font-bold shrink-0">배달 주문</span>
                <span>배달앱에서 즐겨찾는 메뉴를 등록해 두고 그날그날 룰렛으로 선택하세요.</span>
              </li>
            </ul>
          </div>

          {/* 인기 카테고리별 메뉴 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              인기 카테고리별 메뉴
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🍚 한식</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>비빔밥, 김치찌개, 된장찌개</li>
                  <li>불고기, 삼겹살, 냉면</li>
                  <li>순두부찌개, 갈비탕, 설렁탕</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🥡 중식</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>짜장면, 짬뽕, 탕수육</li>
                  <li>볶음밥, 마파두부, 깐풍기</li>
                  <li>짬뽕밥, 유린기, 해물요리</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🍱 일식</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>초밥, 라멘, 우동</li>
                  <li>돈카츠, 규동, 오야코동</li>
                  <li>텐동, 나베, 야키토리</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🍕 양식</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>피자, 파스타, 스테이크</li>
                  <li>버거, 리조또, 샐러드</li>
                  <li>샌드위치, 수프, 브런치</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🍜 분식</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>떡볶이, 순대, 튀김</li>
                  <li>라면, 김밥, 어묵</li>
                  <li>만두, 핫도그, 닭강정</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🌮 기타</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>태국음식, 베트남쌀국수</li>
                  <li>인도카레, 멕시칸, 케밥</li>
                  <li>치킨, 곱창, 족발·보쌈</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 사용 방법 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              사용 방법
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span><strong className="text-gray-900 dark:text-white">메뉴 목록 확인:</strong> 기본 제공되는 점심메뉴 프리셋(짜장면, 짬뽕, 냉면 등)을 확인하거나, 원하는 메뉴를 직접 입력해 추가하세요.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span><strong className="text-gray-900 dark:text-white">메뉴 커스터마이즈:</strong> 먹고 싶지 않은 메뉴는 삭제하고, 새 메뉴를 추가해 나만의 룰렛을 완성하세요. 최대 12개까지 등록 가능합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span><strong className="text-gray-900 dark:text-white">룰렛 돌리기:</strong> 화면 중앙의 룰렛 또는 "돌리기" 버튼을 클릭하면 룰렛이 회전하기 시작합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span><strong className="text-gray-900 dark:text-white">결과 확인:</strong> 룰렛이 멈추면 오늘의 메뉴가 결정됩니다! 결과 화면에 선택된 메뉴가 크게 표시됩니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <span><strong className="text-gray-900 dark:text-white">결과 공유:</strong> 팀원에게 공유하려면 링크 복사 버튼을 눌러 현재 메뉴 목록이 담긴 URL을 공유하세요.</span>
              </li>
            </ol>
          </div>

          {/* 자주 묻는 질문 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              자주 묻는 질문
            </h2>
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  메뉴 추천 룰렛은 무료인가요?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  네, 완전 무료입니다. 회원가입이나 앱 설치 없이 브라우저에서 바로 사용할 수 있어요. PC, 스마트폰, 태블릿 모두 지원합니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  룰렛에 메뉴를 몇 개까지 추가할 수 있나요?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  최대 12개까지 추가할 수 있습니다. 메뉴 이름을 입력하고 추가 버튼을 누르면 되며, 원하지 않는 항목은 언제든 삭제할 수 있어요.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  룰렛 결과를 친구에게 공유할 수 있나요?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  네! 현재 입력한 메뉴 목록이 URL에 자동으로 담기므로, 주소창의 링크를 복사해서 카카오톡이나 메신저로 공유하면 같은 룰렛을 친구도 돌릴 수 있어요.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}
