import { Metadata } from 'next'
import { Suspense } from 'react'
import Hangman from '@/components/Hangman'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '단어 맞추기 (행맨) - 한글 단어 추측 게임 | 툴허브',
  description: '한글 단어를 추측하는 행맨 게임입니다. 자음과 모음 버튼을 눌러 단어를 맞춰보세요. 동물, 음식, 나라, 과일 등 4가지 카테고리로 즐기는 한국어 단어 게임.',
  keywords: '행맨, 단어 맞추기, 한글 게임, 한국어 게임, 단어 게임, hangman, 자음 모음',
  openGraph: {
    title: '단어 맞추기 (행맨) - 한글 단어 추측 게임 | 툴허브',
    description: '자음과 모음을 선택해서 숨겨진 한글 단어를 맞춰보세요!',
    url: 'https://toolhub.ai.kr/hangman',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '단어 맞추기 (행맨) | 툴허브',
    description: '한글 자음과 모음으로 숨겨진 단어를 맞추는 행맨 게임',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/hangman/',
  },
}

export default function HangmanPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '단어 맞추기 (행맨)',
    description: '한글 단어를 추측하는 행맨 스타일 단어 게임. 자음과 모음을 선택해 숨겨진 한국어 단어를 맞추세요.',
    url: 'https://toolhub.ai.kr/hangman',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    inLanguage: 'ko',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    genre: 'Word Game',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 1 },
    featureList: ['한글 자음/모음 가상 키보드', '4가지 카테고리 (동물, 음식, 나라, 과일)', 'SVG 행맨 그림', '7번의 도전 기회', '한글 자모 분해 매칭'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '행맨 단어 맞추기 게임 규칙은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '화면에 숨겨진 한글 단어를 추측하는 게임입니다. 하단의 자음(ㄱ~ㅎ)과 모음(ㅏ~ㅣ) 버튼을 클릭해서 글자를 선택하세요. 선택한 자음이나 모음이 단어에 포함되어 있으면 해당 글자가 드러납니다. 7번 틀리면 행맨 그림이 완성되어 게임이 종료됩니다. 단어가 완성되기 전에 모든 글자를 맞추면 승리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '한글 행맨 게임에서 자음과 모음은 어떻게 작동하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한글은 자음(초성/종성)과 모음(중성)이 결합하여 하나의 글자를 이룹니다. 예를 들어 "가"를 선택하는 것이 아니라, "ㄱ"(자음)이나 "ㅏ"(모음)를 각각 선택합니다. 선택한 자음 또는 모음이 단어의 어떤 글자에든 포함되어 있으면 그 글자 전체가 드러납니다. 따라서 하나의 선택으로 여러 글자가 한꺼번에 공개될 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <Hangman />
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
            단어 맞추기 (행맨) 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            행맨(Hangman)은 숨겨진 한글 단어를 자음과 모음을 하나씩 선택하며 추측하는 고전 단어 게임입니다. 동물·음식·나라·과일 4가지 카테고리에서 무작위로 단어가 출제되며, 7번 안에 단어를 완성해야 합니다. 한글 자음·모음 분해 방식으로 한국어 단어를 공부하는 어린이와 외국인 한국어 학습자에게도 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            행맨 게임 전략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>자주 쓰이는 자음 먼저:</strong> ㅇ·ㄴ·ㄱ·ㄹ·ㅅ은 한국어에서 출현 빈도가 높은 자음입니다. 먼저 선택하면 단어 윤곽을 빠르게 파악할 수 있습니다.</li>
            <li><strong>모음 전략:</strong> ㅏ·ㅣ·ㅡ·ㅓ·ㅗ 순서로 선택하면 대부분의 한국어 단어에서 1~2개 이상 적중합니다.</li>
            <li><strong>카테고리 활용:</strong> 카테고리가 표시되므로 해당 분야 단어 목록을 떠올리며 자음 선택에 활용하세요.</li>
            <li><strong>글자 수 참고:</strong> 빈칸 수로 단어 길이를 파악하고, 짧은 단어(2~3글자)와 긴 단어(4~5글자)에 따라 접근 방식을 달리하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
