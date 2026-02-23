import { Metadata } from 'next'
import { Suspense } from 'react'
import Hangman from '@/components/Hangman'
import I18nWrapper from '@/components/I18nWrapper'

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
    canonical: 'https://toolhub.ai.kr/hangman',
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
              <Hangman />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
