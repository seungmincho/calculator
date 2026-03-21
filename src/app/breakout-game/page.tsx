import { Metadata } from 'next'
import { Suspense } from 'react'
import BreakoutGame from '@/components/BreakoutGame'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '벽돌깨기 - 클래식 아케이드 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 벽돌깨기(Breakout) 게임. 다양한 레벨, 파워업 아이템, 모바일 터치 지원. 공으로 벽돌을 깨는 클래식 아케이드 게임을 지금 바로 플레이하세요!',
  keywords: '벽돌깨기, breakout, 아케이드 게임, 온라인 게임, 무료 게임, 브라우저 게임, 블록 깨기',
  openGraph: {
    title: '벽돌깨기 - 클래식 아케이드 게임 | 툴허브',
    description: '공으로 벽돌을 깨는 클래식 아케이드 게임. 다양한 레벨과 파워업!',
    url: 'https://toolhub.ai.kr/breakout-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '벽돌깨기',
    description: '클래식 아케이드 벽돌깨기 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/breakout-game/',
  },
}

export default function BreakoutGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '벽돌깨기',
    description: '공으로 벽돌을 깨는 클래식 아케이드 게임',
    url: 'https://toolhub.ai.kr/breakout-game',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['다양한 레벨', '파워업 아이템', '키보드/마우스/터치 조작', '최고 점수 저장'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '벽돌깨기 게임 규칙과 조작법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '벽돌깨기(Breakout)는 화면 하단의 패들을 좌우로 움직여 공을 튕기고, 상단의 벽돌을 모두 깨면 다음 레벨로 진행하는 아케이드 게임입니다. 키보드 좌우 방향키, 마우스, 또는 터치로 패들을 조작합니다. 공을 놓치면 목숨이 줄어들며 3개의 목숨이 모두 소진되면 게임 오버입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '벽돌깨기 파워업 아이템에는 어떤 것이 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '벽돌을 깨면 가끔 파워업 아이템이 떨어집니다. ① 패들 확장: 패들이 넓어져 공을 받기 쉬워집니다 ② 멀티볼: 공이 3개로 늘어나 빠르게 벽돌을 깰 수 있습니다 ③ 추가 목숨: 목숨이 1개 추가됩니다. 파워업은 패들로 받아야 효과가 적용됩니다.',
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
        <Breadcrumb />
              <BreakoutGame />
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
              벽돌깨기 게임이란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              벽돌깨기(Breakout)는 1976년 아타리가 개발한 클래식 아케이드 게임으로, <strong>패들로 공을 튕겨 화면 상단의 벽돌을 모두 깨는</strong> 단순하면서도 중독성 있는 게임입니다. 툴허브의 벽돌깨기는 브라우저에서 무료로 플레이할 수 있으며 키보드·마우스·터치를 모두 지원해 PC와 스마트폰 어디서든 즐길 수 있습니다. 다양한 레벨과 파워업 아이템으로 더욱 재미있게 즐겨보세요.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              벽돌깨기 게임 공략 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>모서리 노리기:</strong> 공이 벽과 천장 모서리에 끼면 자동으로 여러 벽돌이 한 번에 깨집니다.</li>
              <li><strong>패들 가장자리 활용:</strong> 패들 끝으로 공을 받으면 각도가 날카로워져 벽돌 진입이 쉬워집니다.</li>
              <li><strong>파워업 우선 수집:</strong> 멀티볼 아이템은 진행 속도를 크게 높여주므로 놓치지 마세요.</li>
              <li><strong>터치 조작:</strong> 모바일에서는 화면을 좌우로 드래그해 패들을 빠르게 이동할 수 있습니다.</li>
              <li><strong>최고 점수 도전:</strong> 점수는 로컬에 저장되므로 계속 도전하며 기록을 갱신해보세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
