import { Metadata } from 'next'
import { Suspense } from 'react'
import FlappyBird from '@/components/FlappyBird'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '플래피버드 - 파이프 사이를 날아가는 캐주얼 게임 | 툴허브',
  description: '브라우저에서 즐기는 무료 플래피버드 게임. 클릭이나 탭 한 번으로 새를 날려 파이프를 통과하세요. 모바일 터치 지원, 최고 점수 저장, 부드러운 애니메이션!',
  keywords: '플래피버드, flappy bird, 파이프 게임, 캐주얼 게임, 온라인 게임, 무료 게임, 브라우저 게임, 원탭 게임',
  openGraph: {
    title: '플래피버드 - 파이프 사이를 날아가는 캐주얼 게임 | 툴허브',
    description: '클릭이나 탭으로 새를 날려 파이프를 통과하는 캐주얼 게임. 최고 점수에 도전하세요!',
    url: 'https://toolhub.ai.kr/flappy-bird',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '플래피버드',
    description: '파이프 사이를 날아가는 캐주얼 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/flappy-bird/',
  },
}

export default function FlappyBirdPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '플래피버드',
    description: '클릭이나 탭으로 새를 날려 파이프를 통과하는 캐주얼 브라우저 게임',
    url: 'https://toolhub.ai.kr/flappy-bird',
    genre: 'Casual',
    gamePlatform: 'Web Browser',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '원탭/원클릭 조작',
      '모바일 터치 지원',
      '최고 점수 저장',
      '부드러운 60fps 애니메이션',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '플래피버드 조작법은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '화면을 클릭하거나 탭하면 새가 위로 올라갑니다. 스페이스바를 눌러도 됩니다. 손을 떼면 중력에 의해 새가 아래로 내려갑니다. 파이프 사이의 틈을 통과하면 1점을 획득합니다. 파이프나 바닥/천장에 닿으면 게임이 종료됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '플래피버드 최고 점수는 저장되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 최고 점수는 브라우저의 로컬 스토리지에 자동으로 저장됩니다. 같은 브라우저를 사용하는 한 기록이 유지됩니다. 브라우저 데이터를 삭제하면 기록도 초기화됩니다.',
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
              <FlappyBird />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            플래피버드 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            플래피버드(Flappy Bird)는 화면을 클릭하거나 탭할 때마다 새가 위로 날아오르고, 손을 떼면 중력으로 아래로 떨어지는 원탭 캐주얼 브라우저 게임입니다. 파이프 사이의 틈을 통과할 때마다 점수가 오르며, 파이프나 바닥에 닿으면 게임이 종료됩니다. 모바일 터치와 PC 키보드(스페이스바/클릭) 모두 지원하며, 최고 점수는 자동 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            플래피버드 고득점 전략
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>리듬 유지:</strong> 일정한 간격으로 탭하여 새의 높이를 중간 부근에서 유지하는 것이 핵심입니다.</li>
            <li><strong>파이프 중앙 통과:</strong> 파이프 틈의 중앙을 목표로 날아가면 위아래 여유 공간이 생겨 실수를 줄일 수 있습니다.</li>
            <li><strong>예측 비행:</strong> 다음 파이프의 위치를 미리 보고 현재 높이를 조절하는 습관을 들이세요.</li>
            <li><strong>집중 모드:</strong> 화면 전환이나 다른 소리를 차단하고 게임에만 집중하면 고득점 달성에 유리합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
