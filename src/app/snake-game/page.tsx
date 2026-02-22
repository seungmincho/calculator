import { Metadata } from 'next'
import { Suspense } from 'react'
import SnakeGame from '@/components/SnakeGame'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '스네이크 게임 - 클래식 뱀 게임 | 툴허브',
  description: '스네이크 게임 - 클래식 뱀 게임을 플레이하세요! 3가지 모드(클래식, 무한, 장애물), 4단계 난이도, 커스텀 스킨, 모바일 터치 지원.',
  keywords: '스네이크 게임, 뱀 게임, snake game, 온라인 게임, 무료 게임, 브라우저 게임',
  openGraph: {
    title: '스네이크 게임 - 클래식 뱀 게임 | 툴허브',
    description: '클래식 뱀 게임을 브라우저에서 즐기세요! 3가지 모드, 4단계 난이도, 모바일 지원.',
    url: 'https://toolhub.ai.kr/snake-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '스네이크 게임',
    description: '클래식 뱀 게임 - 3가지 모드, 4단계 난이도',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/snake-game',
  },
}

export default function SnakeGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '스네이크 게임',
    description: '클래식 뱀 게임 - 3가지 모드, 4단계 난이도, 커스텀 스킨',
    url: 'https://toolhub.ai.kr/snake-game',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['클래식/무한/장애물 모드', '4단계 난이도', '커스텀 스킨', '모바일 터치 지원', '최고 점수 저장'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '스네이크 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '스네이크 게임은 뱀을 조종하여 먹이를 먹고 길이를 늘리는 클래식 아케이드 게임입니다. 방향키로 상하좌우로 이동하며, 먹이를 먹으면 점수가 올라가고 뱀이 길어집니다. 벽이나 자신의 몸에 부딪히면 게임 오버입니다. 1976년 \'Blockade\'에서 시작되어, 1998년 노키아 휴대폰에 탑재되면서 전 세계적으로 유명해졌습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '스네이크 게임 고득점 팁은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 벽을 따라 이동하여 중앙 공간을 최대한 확보 ② 급격한 방향 전환 피하기 (자기 몸에 부딪히는 주원인) ③ 긴 뱀일수록 외곽을 따라 이동하는 것이 안전 ④ 먹이까지의 경로를 미리 계획 ⑤ 뱀이 길어지면 S자 패턴으로 공간을 효율적으로 활용. 해밀턴 경로(모든 칸을 한 번씩 방문하는 경로)를 따르면 이론적으로 최대 길이까지 성장 가능합니다.'
        }
      }
    ]
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
              <SnakeGame />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
