import { Metadata } from 'next'
import { Suspense } from 'react'
import KoreanWordle from '@/components/KoreanWordle'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '한글 워들 - 매일 새로운 한국어 단어 맞추기 게임 | 툴허브',
  description: '한글 워들 - 매일 새로운 2글자 한국어 단어를 6번 안에 맞춰보세요! 자모 분석 힌트, 통계 추적, 결과 공유 기능을 제공합니다.',
  keywords: '한글 워들, 워들 한국어, Korean Wordle, 단어 맞추기 게임, 한글 게임, 워드 게임',
  openGraph: {
    title: '한글 워들 - 매일 새로운 단어 맞추기 | 툴허브',
    description: '매일 새로운 2글자 한국어 단어를 6번 안에 맞춰보세요!',
    url: 'https://toolhub.ai.kr/korean-wordle',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '한글 워들 | 툴허브',
    description: '매일 새로운 한국어 단어 맞추기 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/korean-wordle/',
  },
}

export default function KoreanWordlePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '한글 워들',
    description: '매일 새로운 2글자 한국어 단어를 6번 안에 맞춰보세요',
    url: 'https://toolhub.ai.kr/korean-wordle',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['매일 새로운 단어', '자모 힌트', '통계 추적', '결과 공유'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '한국어 워들 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국어 워들은 숨겨진 한글 단어를 6번의 시도 안에 맞추는 워드 퍼즐입니다. 각 시도 후 색상 힌트를 받습니다: 초록색은 해당 자리에 정확한 글자, 노란색은 단어에 포함되지만 위치가 다른 글자, 회색은 단어에 없는 글자입니다. 한글의 특성상 자음과 모음을 분리하여 힌트를 제공하므로 영어 워들보다 복잡하고 전략적입니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <KoreanWordle />
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
              한글 워들이란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              한글 워들은 뉴욕타임즈의 인기 단어 게임 'Wordle'을 한국어로 즐기는 게임입니다. 매일 새롭게 출제되는 2글자 한국어 단어를 6번의 시도 안에 맞추는 방식으로, 자모(자음·모음) 단위 힌트 덕분에 영어 워들보다 더욱 전략적인 플레이가 가능합니다. 한글 어휘력을 키우고 싶은 분, 단어 게임을 좋아하는 분 모두에게 추천합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              한글 워들 플레이 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>자모 힌트 활용:</strong> 초록색은 정확한 자리, 노란색은 단어에 있지만 위치가 다름, 회색은 단어에 없음을 뜻합니다.</li>
              <li><strong>첫 시도 전략:</strong> 모음이 다양하게 포함된 단어(예: '아이', '요리')로 시작하면 힌트를 빠르게 좁힐 수 있습니다.</li>
              <li><strong>매일 새 단어:</strong> 하루에 한 번 새 단어가 출제되므로 매일 도전해 연속 클리어 기록을 쌓아보세요.</li>
              <li><strong>결과 공유:</strong> 클리어 후 결과를 카카오톡·SNS에 공유해 친구들과 비교해보세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
