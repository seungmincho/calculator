import { Metadata } from 'next'
import { Suspense } from 'react'
import MemoryGame from '@/components/MemoryGame'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '타일 매칭 게임 - 기억력 짝 맞추기 | 툴허브',
  description: '타일 매칭 게임 - 카드를 뒤집어 같은 짝을 찾으세요! 다양한 테마와 난이도, 최고 기록 추적. 이모지, 음식, 스포츠, 한글, 숫자 테마 지원.',
  keywords: '타일 매칭 게임, 기억력 게임, 짝 맞추기, 카드 게임, 메모리 게임, 무료 게임, 온라인 게임, 브라우저 게임',
  openGraph: {
    title: '타일 매칭 게임 - 기억력 짝 맞추기 | 툴허브',
    description: '카드를 뒤집어 같은 짝을 찾으세요! 다양한 테마와 난이도로 기억력을 테스트해보세요.',
    url: 'https://toolhub.ai.kr/memory-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '타일 매칭 게임 | 툴허브',
    description: '카드를 뒤집어 같은 짝을 찾으세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/memory-game' },
}

export default function MemoryGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '타일 매칭 게임',
    description: '카드를 뒤집어 같은 짝을 찾는 기억력 게임. 다양한 테마와 난이도 지원.',
    url: 'https://toolhub.ai.kr/memory-game',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4가지 난이도', '5가지 테마', '카드 뒤집기 애니메이션', '최고 기록 저장', '콤보 시스템', '사운드 효과'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><MemoryGame /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
