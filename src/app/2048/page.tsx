import { Metadata } from 'next'
import { Suspense } from 'react'
import Game2048 from '@/components/Game2048'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
  alternates: { canonical: 'https://toolhub.ai.kr/2048/' },
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
            <I18nWrapper><Game2048 />  <div className="mt-8">
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
            2048 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            2048은 2014년 Gabriele Cirulli가 제작한 인기 숫자 퍼즐 게임으로, 4×4 격자에서 같은 숫자 타일을 합쳐 2048을 만드는 것이 목표입니다. 상하좌우로 보드를 밀면 모든 타일이 이동하고 같은 숫자끼리 합산되며, 이동할 때마다 빈 칸에 새 타일(2 또는 4)이 생성됩니다. 간단한 규칙이지만 높은 숫자를 달성하려면 전략적 사고가 필요한 두뇌 게임입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            2048 고득점 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>코너 고정 전략:</strong> 가장 큰 타일을 한쪽 코너(예: 왼쪽 아래)에 고정하고, 그 코너를 절대 벗어나지 않도록 이동 방향을 제한하세요.</li>
            <li><strong>단방향 우선 이동:</strong> 주로 두 방향(예: 왼쪽·아래)만 사용하고, 코너에서 멀어지는 방향은 최대한 피하는 것이 핵심입니다.</li>
            <li><strong>내림차순 정렬 유지:</strong> 큰 숫자를 코너에, 작은 숫자를 반대쪽에 배치하여 체인 합산이 일어나도록 줄을 정렬하세요.</li>
            <li><strong>작은 타일 빠르게 합치기:</strong> 2, 4 같은 작은 타일이 쌓이면 이동이 막히므로 즉시 합쳐 보드를 여유롭게 유지하세요.</li>
            <li><strong>되돌리기 기능 활용:</strong> 실수한 경우 되돌리기로 이전 상태로 복구하여 전략을 다시 시도할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
