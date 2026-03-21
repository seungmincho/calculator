import { Metadata } from 'next'
import { Suspense } from 'react'
import PacMan from '@/components/PacMan'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '팩맨 - 클래식 아케이드 미로 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 팩맨 게임. 미로를 돌아다니며 점을 먹고 유령을 피하세요. 파워 펠릿으로 유령을 역습! 키보드 방향키와 모바일 터치 지원, 최고 점수 자동 저장.',
  keywords: '팩맨, pac-man, 팩맨 게임, 아케이드 게임, 미로 게임, 유령 게임, 온라인 게임, 무료 게임, 브라우저 게임, 클래식 게임',
  openGraph: {
    title: '팩맨 - 클래식 아케이드 미로 게임 | 툴허브',
    description: '미로를 돌아다니며 점을 먹고 유령을 피하는 클래식 팩맨 게임. 파워 펠릿으로 유령을 역습하세요!',
    url: 'https://toolhub.ai.kr/pac-man',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '팩맨 - 클래식 아케이드 미로 게임',
    description: '미로를 돌아다니며 점을 먹고 유령을 피하는 클래식 팩맨 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/pac-man/',
  },
}

export default function PacManPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '팩맨',
    description: '미로를 돌아다니며 점을 먹고 유령을 피하는 클래식 아케이드 게임',
    url: 'https://toolhub.ai.kr/pac-man',
    genre: 'Arcade',
    gamePlatform: 'Web Browser',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '4마리 유령 AI (빨강/분홍/청록/주황)',
      '파워 펠릿으로 유령 역습',
      '키보드 방향키 조작',
      '모바일 가상 D패드 지원',
      '최고 점수 자동 저장',
      '3목숨 시스템',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '팩맨 조작법은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '키보드 방향키(↑↓←→)로 팩맨을 조작합니다. 모바일에서는 게임 화면 아래의 가상 D패드 버튼을 터치하세요. 모든 점(·)을 먹으면 레벨이 클리어됩니다. 큰 점(파워 펠릿)을 먹으면 잠시 동안 유령을 먹을 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '팩맨에서 유령을 어떻게 피하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '각 유령은 고유한 AI를 가지고 있습니다. 빨간 유령(Blinky)은 직접 추격, 분홍 유령(Pinky)은 팩맨 앞을 노립니다. 파워 펠릿(큰 점)을 먹으면 유령이 파란색으로 변하며 약 7초간 취약 상태가 됩니다. 이때 유령을 먹으면 보너스 점수를 얻습니다.',
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <PacMan />
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
            브라우저 팩맨 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            팩맨(Pac-Man)은 1980년 남코에서 출시된 클래식 아케이드 게임으로, 미로를 돌아다니며 모든 점을 먹고 4마리 유령을 피하는 게임입니다. 본 버전은 설치 없이 브라우저에서 바로 즐길 수 있으며, 키보드 방향키와 모바일 터치 D패드를 모두 지원합니다. 각기 다른 AI 전략을 가진 4마리 유령(빨강·분홍·청록·주황)과 파워 펠릿 시스템을 충실히 구현하였습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            팩맨 게임 공략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>유령 행동 패턴 파악:</strong> 빨간 유령(Blinky)은 직접 추격, 분홍 유령(Pinky)은 팩맨 앞을 선점, 청록 유령(Inky)은 협공, 주황 유령(Clyde)은 거리에 따라 전략을 바꿉니다.</li>
            <li><strong>파워 펠릿 타이밍:</strong> 파워 펠릿(큰 점)을 먹으면 유령이 파란색으로 7초간 약해집니다. 유령이 몰려있을 때 먹으면 연속으로 잡아 보너스 점수를 극대화할 수 있습니다.</li>
            <li><strong>T자 교차로 활용:</strong> T자형 교차로에서는 유령이 방향 전환을 못하는 특성을 활용하여 추격을 따돌릴 수 있습니다.</li>
            <li><strong>최고 점수 갱신:</strong> 최고 점수가 자동 저장되므로 도전을 반복하며 점수를 높여보세요. 과일 보너스 아이템도 놓치지 마세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
