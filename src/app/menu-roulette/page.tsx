import { Metadata } from 'next'
import Link from 'next/link'
import DecisionToolsBar from '@/components/DecisionToolsBar'
import DecisionTools from '@/components/DecisionTools'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import decisionMessages from '../../../messages/generated/ko/ns/decisionTools.json'

const TITLE = "저녁메뉴 추천 룰렛 - 점심·저녁 메뉴 돌림판 | 툴허브"
const DESC = "점심·저녁 후보를 룰렛으로 고르고 뽑힌 메뉴를 이번에만 제외하거나 복구하세요. 원본 후보와 식사 기록·주간 계획을 보존하며, 후보 링크 공유·결과 복사 복구·이미지 저장을 지원합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
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
    title: TITLE,
    description: DESC,
    type: 'website',
    url: 'https://toolhub.ai.kr/menu-roulette/',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/menu-roulette.png',
        width: 1200,
        height: 630,
        alt: '메뉴 추천 룰렛 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['https://toolhub.ai.kr/og/menu-roulette.png'],
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
    name: '저녁메뉴 추천 룰렛',
    description: DESC,
    url: 'https://toolhub.ai.kr/menu-roulette/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '메뉴 항목 자유 추가/삭제',
      '저녁·점심·한식·중식 등 9가지 메뉴 프리셋',
      '회전 애니메이션 룰렛',
      '결과 이미지 저장·복사·실패 시 원문 선택과 재시도',
      '메뉴 목록 링크 공유',
      '모바일·PC 모두 지원',
      '날짜별 식사 기록과 최근 7일 메뉴 제외',
      '주간 메뉴 계획·빈 날짜 채우기·7일 TXT 복사',
      '계획 저장과 실제 식사 기록 추가 분리',
      '원본 후보를 유지하는 이번 회차 제외·개별 및 모두 복구',
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
        text: '처음 채워진 저녁메뉴 프리셋(삼겹살, 치킨, 피자 등)을 확인하거나, 점심메뉴·한식·중식 등 다른 프리셋을 고르거나, 원하는 메뉴를 직접 입력해 추가하세요.',
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
        text: '화면의 "돌리기" 버튼을 누르면 룰렛이 회전하기 시작합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: '결과 확인',
        text: '결과를 확인하고 이번에 원하지 않는 메뉴는 임시 제외한 뒤 다시 돌리세요. 같은 이름의 후보도 함께 제외하며 원본 목록은 보존합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: '결과 공유',
        text: '링크에는 원래 후보 목록만 담기며 뽑힌 결과나 임시 제외는 넣지 않습니다. 결과는 따로 복사하거나 이미지로 저장할 수 있습니다.',
      },
    ],
  }

  const faq = decisionMessages.decisionTools.menu.faq

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

      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <div className="mb-6"><DecisionToolsBar current="/menu-roulette" /></div>
              {/* 검색 제목과 H1을 맞추고, 직접 후보를 편집하는 흐름을 설명한다. */}
              <DecisionTools
                initialTab="roulette"
                single
                defaultPreset="저녁메뉴"
                menuMode
              />
              <ToolFaq items={faq} />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>

      {/* SEO 콘텐츠 — 크롤러용 가시적 HTML */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-8">

          {/* 메뉴 추천 룰렛이란? */}
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-fg">
              메뉴 추천 룰렛이란?
            </h2>
            <p className="text-body leading-relaxed">
              메뉴 추천 룰렛은 점심·저녁 메뉴를 고를 때 빠르고 공정하게 결정을 도와주는 온라인 룰렛 도구입니다.
              원하는 음식 목록을 입력하고 룰렛을 돌리면 무작위로 오늘의 메뉴가 선택됩니다.
            </p>
            <p className="text-body leading-relaxed">
              &quot;오늘 뭐 먹지?&quot;라는 질문으로 시작되는 오랜 고민을 단 몇 초 만에 해결해 드립니다.
              저녁메뉴·점심메뉴·한식·중식·일식 등 9가지 프리셋을 제공하며, 자주 가는 식당이나 좋아하는 메뉴를 직접 추가해
              나만의 맞춤 룰렛을 만들 수 있습니다.
            </p>
            <p className="text-body leading-relaxed">
              후보가 이미 머릿속에 있다면 이 룰렛이 가장 빠릅니다. 아직 무엇을 먹을지 떠오르지 않는다면 혼밥·회식·해장 같은 상황에 맞춰
              300가지가 넘는 메뉴에서 골라 주는{' '}
              <Link prefetch={false} href="/menu-picker/" className="text-primary hover:underline">
                오늘 뭐 먹지? 메뉴 추천
              </Link>
              을 먼저 써 보세요.
            </p>
          </div>

          {/* 이런 때 사용하세요 */}
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-fg">
              이런 때 사용하세요
            </h2>
            <ul className="space-y-3 text-body">
              <li className="flex gap-3">
                <span className="text-body font-bold shrink-0">직장인 점심</span>
                <span>팀원들과 점심 메뉴를 정할 때 의견 충돌 없이 룰렛으로 공정하게 결정하세요.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-body font-bold shrink-0">가족 저녁</span>
                <span>온 가족이 원하는 메뉴를 적어 넣고 돌리면 저녁 메뉴 고민 끝!</span>
              </li>
              <li className="flex gap-3">
                <span className="text-body font-bold shrink-0">친구 모임</span>
                <span>약속 장소 근처 맛집 목록을 입력하고 룰렛으로 식당을 결정해 보세요.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-body font-bold shrink-0">혼밥</span>
                <span>혼자 먹을 때도 결정 장애를 룰렛으로 해결! 새로운 메뉴 도전의 계기가 됩니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-body font-bold shrink-0">배달 주문</span>
                <span>배달앱에서 즐겨찾는 메뉴를 등록해 두고 그날그날 룰렛으로 선택하세요.</span>
              </li>
            </ul>
          </div>

          {/* 인기 카테고리별 메뉴 */}
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-fg">
              인기 카테고리별 메뉴
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-fg mb-2">🍚 한식</h3>
                <ul className="text-sm text-sub space-y-1">
                  <li>비빔밥, 김치찌개, 된장찌개</li>
                  <li>불고기, 삼겹살, 냉면</li>
                  <li>순두부찌개, 갈비탕, 설렁탕</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2">🥡 중식</h3>
                <ul className="text-sm text-sub space-y-1">
                  <li>짜장면, 짬뽕, 탕수육</li>
                  <li>볶음밥, 마파두부, 깐풍기</li>
                  <li>짬뽕밥, 유린기, 해물요리</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2">🍱 일식</h3>
                <ul className="text-sm text-sub space-y-1">
                  <li>초밥, 라멘, 우동</li>
                  <li>돈카츠, 규동, 오야코동</li>
                  <li>텐동, 나베, 야키토리</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2">🍕 양식</h3>
                <ul className="text-sm text-sub space-y-1">
                  <li>피자, 파스타, 스테이크</li>
                  <li>버거, 리조또, 샐러드</li>
                  <li>샌드위치, 수프, 브런치</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2">🍜 분식</h3>
                <ul className="text-sm text-sub space-y-1">
                  <li>떡볶이, 순대, 튀김</li>
                  <li>라면, 김밥, 어묵</li>
                  <li>만두, 핫도그, 닭강정</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg mb-2">🌮 기타</h3>
                <ul className="text-sm text-sub space-y-1">
                  <li>태국음식, 베트남쌀국수</li>
                  <li>인도카레, 멕시칸, 케밥</li>
                  <li>치킨, 곱창, 족발·보쌈</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 사용 방법 */}
          <div className="ui-card p-4 sm:p-6 space-y-4">
            <h2 className="text-xl font-bold text-fg">
              사용 방법
            </h2>
            <ol className="space-y-3 text-body">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-soft text-body rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span><strong className="text-fg">메뉴 목록 확인:</strong> 처음 채워진 저녁메뉴 프리셋(삼겹살, 치킨, 피자 등)을 확인하거나, 다른 프리셋을 고르거나, 원하는 메뉴를 직접 입력해 추가하세요.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-soft text-body rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span><strong className="text-fg">메뉴 커스터마이즈:</strong> 먹고 싶지 않은 메뉴는 삭제하고, 새 메뉴를 추가해 나만의 룰렛을 완성하세요. 최대 12개까지 등록 가능합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-soft text-body rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span><strong className="text-fg">룰렛 돌리기:</strong> 화면의 &quot;돌리기&quot; 버튼을 누르면 룰렛이 회전하기 시작합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-soft text-body rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span><strong className="text-fg">결과 확인:</strong> 결과를 보고 이번에 원하지 않는 메뉴는 임시 제외하세요. 같은 이름의 후보가 함께 빠지며 원본 후보는 복구할 수 있습니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 bg-soft text-body rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <span><strong className="text-fg">결과 공유:</strong> 링크에는 원래 후보 목록만 담기고 결과나 임시 제외는 들어가지 않습니다. 결과는 따로 복사하거나 이미지로 저장할 수 있습니다.</span>
              </li>
            </ol>
          </div>

        </div>
      </section>
    </>
  )
}
