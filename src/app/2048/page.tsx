import { Metadata } from 'next'
import { Suspense } from 'react'
import Game2048 from '@/components/Game2048'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '2048 게임 - 숫자 퍼즐 게임 | 툴허브',
  description: '클래식 2048 숫자 퍼즐 게임을 온라인에서 무료로 즐기세요. 같은 숫자 타일을 합쳐 2048을 만들어보세요! 키보드와 터치 모두 지원합니다.',
  keywords: '2048, 2048 게임, 숫자 퍼즐, 퍼즐 게임, 무료 게임, 온라인 게임, 브라우저 게임',
  openGraph: {
    title: '2048 게임 - 숫자 퍼즐 | 툴허브',
    description: '같은 숫자를 합쳐 2048을 만들어보세요! 무료 온라인 퍼즐 게임.',
    url: 'https://toolhub.ai.kr/2048',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2048 게임 | 툴허브',
    description: '같은 숫자를 합쳐 2048을 만들어보세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/2048' },
}

export default function Game2048Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '2048 게임',
    description: '같은 숫자 타일을 합쳐 2048을 만드는 퍼즐 게임',
    url: 'https://toolhub.ai.kr/2048',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4x4 그리드 퍼즐', '키보드/터치 지원', '점수 기록', '되돌리기 기능'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2048 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2048은 4×4 격자에서 같은 숫자 타일을 합쳐 2048 타일을 만드는 퍼즐 게임입니다. 상하좌우로 밀면 모든 타일이 해당 방향으로 이동하고, 같은 숫자가 만나면 합쳐집니다(2+2=4, 4+4=8...). 매 이동 후 빈 칸에 2 또는 4 타일이 새로 생깁니다. 더 이상 움직일 수 없으면 게임 오버입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '2048에서 높은 점수를 내는 전략은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 코너 전략: 가장 큰 타일을 한쪽 코너에 고정시키기 ② 벽 전략: 한 방향(예: 왼쪽, 아래)으로만 주로 밀기 ③ 큰 숫자를 한 줄에 내림차순으로 정렬하기 ④ 불필요한 방향 이동 최소화 (코너에서 벗어나는 방향 피하기) ⑤ 작은 숫자들을 빨리 합치기. 코너 전략을 일관되게 유지하는 것이 핵심이며, 32768이나 65536까지도 도달 가능합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><Game2048 /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
