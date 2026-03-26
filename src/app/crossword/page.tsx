import { Metadata } from 'next'
import { Suspense } from 'react'
import Crossword from '@/components/Crossword'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '십자말풀이 - 한국어 퍼즐 | 툴허브',
  description: '한국어 십자말풀이를 온라인에서 무료로 즐기세요. 가로세로 힌트를 보고 한글 단어를 채우는 퍼즐 게임입니다. 매일 새로운 퍼즐 제공.',
  keywords: '십자말풀이, 크로스워드, crossword, 한국어 퍼즐, 낱말풀이, 가로세로 퍼즐, 무료 게임, 온라인 게임, 단어 퍼즐',
  openGraph: {
    title: '십자말풀이 - 한국어 퍼즐 | 툴허브',
    description: '가로세로 힌트로 한글 단어를 채우는 십자말풀이! 매일 새로운 퍼즐.',
    url: 'https://toolhub.ai.kr/crossword',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '십자말풀이 | 툴허브',
    description: '한국어 십자말풀이를 온라인에서 즐기세요!',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/crossword/' },
}

const faqData = [
  {
    question: '십자말풀이란 무엇인가요?',
    answer: '십자말풀이(크로스워드 퍼즐)는 격자 모양의 칸에 가로와 세로 힌트를 보고 알맞은 단어를 채워 넣는 퍼즐 게임입니다. 각 칸에 한 글자씩 들어가며, 가로 단어와 세로 단어가 교차하는 칸의 글자가 서로 일치해야 합니다. 논리적 추론과 어휘력을 동시에 키울 수 있는 인기 있는 퍼즐입니다.',
  },
  {
    question: '십자말풀이 풀이 팁은?',
    answer: '① 확실한 단어부터 채우세요. 힌트를 보고 바로 떠오르는 단어를 먼저 입력합니다. ② 교차하는 글자를 활용하세요. 가로 단어에서 채운 글자가 세로 단어의 힌트가 됩니다. ③ 글자 수를 확인하세요. 칸 수에 맞는 단어를 생각합니다. ④ 검사 기능을 활용해 틀린 글자를 확인할 수 있습니다.',
  },
  {
    question: '매일 새로운 퍼즐이 제공되나요?',
    answer: '네, 오늘의 퍼즐은 날짜를 기반으로 선택되어 매일 자정에 새로운 퍼즐이 제공됩니다. 같은 날에는 누구나 동일한 퍼즐을 풀 수 있어 친구와 클리어 시간을 비교할 수 있습니다. 별도로 퍼즐 번호를 선택해 원하는 퍼즐을 즐길 수도 있습니다.',
  },
]

export default function CrosswordPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '십자말풀이 (한국어 크로스워드)',
    description: '가로세로 힌트로 한글 단어를 채우는 십자말풀이 퍼즐 게임. 매일 새 퍼즐 제공.',
    url: 'https://toolhub.ai.kr/crossword',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    genre: 'Puzzle',
    gamePlatform: 'Web Browser',
    numberOfPlayers: '1',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['한국어 십자말풀이', '10종 퍼즐', '오늘의 퍼즐', '타이머', '검사 기능', '단어 공개'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <Crossword />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            십자말풀이(크로스워드)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            십자말풀이(크로스워드 퍼즐, Crossword Puzzle)는 격자 모양의 칸에 가로와 세로 힌트를 보고 알맞은 단어를 채워 넣는 대표적인 단어 퍼즐 게임입니다.
            영어권에서 1913년 처음 등장한 이래 전 세계적으로 사랑받고 있으며, 한국어 십자말풀이는 한글의 특성을 살려 음절 단위로 칸을 채우는 것이 특징입니다.
            어휘력, 상식, 논리적 추론 능력을 동시에 키울 수 있어 남녀노소 누구나 즐길 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            십자말풀이 풀이 전략
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>쉬운 힌트부터:</strong> 확실히 알고 있는 단어를 먼저 채우면 교차하는 다른 단어의 글자를 알 수 있습니다.</li>
            <li><strong>교차점 활용:</strong> 가로와 세로 단어가 만나는 교차점의 글자가 일치해야 하므로, 한쪽을 채우면 다른 쪽의 힌트가 됩니다.</li>
            <li><strong>글자 수 확인:</strong> 빈칸 수와 힌트를 조합하면 후보 단어를 좁힐 수 있습니다.</li>
            <li><strong>검사 기능:</strong> 막힐 때는 검사 버튼으로 틀린 글자를 확인하고 수정할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
