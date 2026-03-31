import { Metadata } from 'next'
import { Suspense } from 'react'
import LadderGameTabs from './LadderGameTabs'

export const metadata: Metadata = {
  title: '사다리타기 · 돌림판 · 가위바위보 · 벌칙룰렛 - 결정 도구 12종 | 툴허브',
  description: '사다리타기, 돌림판, 가위바위보, 벌칙룰렛, 숫자뽑기, 타이머 등 12가지 랜덤 결정 도구를 한 곳에서 무료로.',
  keywords: [
    '사다리 타기',
    '사다리 게임',
    '온라인 사다리',
    '순서 정하기',
    '벌칙 정하기',
    '팀 나누기',
    '랜덤 선택',
    '공정한 선택',
    '사다리타기 온라인',
    '결정 도구',
    '돌림판',
    '룰렛 돌리기',
    '순서 뽑기',
    '동전 던지기',
    '주사위 굴리기',
    '제비뽑기',
    '팀 분배',
    'Yes or No',
    '랜덤 뽑기',
    '파티 게임',
    '가위바위보',
    '벌칙 룰렛',
    '랜덤 숫자 뽑기',
    '타이머',
    '스톱워치',
    '턴 타이머'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '결정 도구 12종 - 사다리·돌림판·가위바위보·벌칙룰렛 | 툴허브',
    description: '사다리타기, 돌림판, 가위바위보, 벌칙룰렛, 숫자뽑기, 타이머 등 12가지 무료 결정 도구',
    type: 'website',
    url: 'https://toolhub.ai.kr/ladder-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '사다리 타기 · 돌림판 · 순서뽑기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '결정 도구 12종 - 사다리·돌림판·가위바위보·벌칙룰렛 | 툴허브',
    description: '사다리타기, 돌림판, 가위바위보, 벌칙룰렛, 숫자뽑기, 타이머 등 12가지 무료 결정 도구',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ladder-game/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LadderGamePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '결정 도구 모음 12종 — 사다리·돌림판·가위바위보·벌칙룰렛·숫자뽑기·타이머',
    description: '사다리타기, 돌림판, 가위바위보, 벌칙룰렛, 숫자뽑기, 타이머 등 온라인 결정 도구 12종 모음',
    url: 'https://toolhub.ai.kr/ladder-game',
    genre: 'Party Game',
    gamePlatform: 'Web Browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 12 },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사다리타기의 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사다리타기는 수직선과 수평 가로선으로 구성됩니다. 위에서 출발하여 아래로 내려가다가 가로선을 만나면 반드시 옆으로 이동해야 합니다. 수학적으로 사다리타기는 순열(permutation)을 표현하며, 가로선의 배치에 따라 1:1 대응이 보장됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '돌림판과 사다리타기의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사다리타기는 참가자와 결과를 1:1로 매칭하는 반면, 돌림판(룰렛)은 여러 항목 중 하나를 무작위로 선택합니다. 점심 메뉴 고르기, 벌칙 정하기 등 단일 결과를 뽑을 때는 돌림판이, 전체 순서를 정할 때는 사다리타기나 순서뽑기가 적합합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '순서뽑기는 어떻게 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '참가자 이름을 입력하고 "순서 뽑기" 버튼을 누르면 무작위로 섞인 순서가 하나씩 공개됩니다. 발표 순서, 청소 당번, 게임 순서 등을 공정하게 정할 수 있습니다.'
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-purple-50/30 dark:from-gray-900 dark:via-indigo-950/30 dark:to-purple-950/20 py-8 sm:py-12 overflow-hidden">
        {/* 배경 장식 — 글래스 효과용 컬러 블롭 */}
        <div className="fixed top-20 left-10 w-72 h-72 bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-20 right-10 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-pink-200/15 dark:bg-pink-600/8 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="container mx-auto px-4 relative z-10">
          <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
            <LadderGameTabs />
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200/50 dark:border-gray-700/50 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            온라인 결정 도구 12종 모음
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            툴허브의 결정 도구 모음은 사다리타기, 돌림판, 순서뽑기, 동전던지기, 주사위, 팀나누기, 제비뽑기, Yes/No, 가위바위보, 숫자뽑기, 벌칙룰렛, 타이머 총 12가지 방식을 제공합니다.
            순서 정하기, 벌칙 정하기, 팀 나누기, 메뉴 고르기 등 다양한 상황에서 공정하고 재미있게 결정할 수 있습니다.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🪜 사다리 타기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">참가자와 결과를 1:1 매칭. 블라인드 모드, 시드 공유, 이미지 저장.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎯 돌림판</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">회전 룰렛으로 하나를 선택. 점심 메뉴, 벌칙 등에 최적.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔢 순서뽑기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">전체 참가자 순서를 한 번에 결정. 카드 공개 애니메이션.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🪙 동전 던지기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">3D 회전 애니메이션. 통계, 연속기록, N판 M선승제.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎲 주사위</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">D4~D20, 최대 10개 동시. 보정값, TRPG 지원.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">👥 팀 나누기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">랜덤/캡틴 드래프트. 운동, 조별과제, 회식 팀 분배.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎫 제비뽑기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">당첨/꽝 비율 설정. 한 명씩 뽑기, 커스텀 상품.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">⚖️ Yes or No</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">매직 8볼 스타일. 7단계 답변, 확률 조정 가능.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">✊ 가위바위보</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">1:1, N판 M선승, 토너먼트. 전적 통계 및 히스토리.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔢 숫자 뽑기</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">범위·개수 설정, 중복제거, 슬롯머신 애니메이션.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🍺 벌칙 룰렛</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">회식/MT/커플 프리셋. 커스텀 벌칙 추가 가능.</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/30 dark:border-white/5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">⏱️ 타이머</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">카운트다운, 스톱워치, 턴 타이머. 프리셋 지원.</p>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>순서 정하기:</strong> 사다리타기 또는 순서뽑기로 발표/청소/주문 순서를 공정하게 결정하세요.</li>
            <li><strong>벌칙 정하기:</strong> 돌림판이나 제비뽑기로 게임 벌칙을 투명하게 결정할 수 있습니다.</li>
            <li><strong>팀 나누기:</strong> 팀 나누기 도구로 스포츠, 조별 과제, 회식 팀을 균형있게 편성하세요.</li>
            <li><strong>간단한 결정:</strong> 동전 던지기(양자택일)나 Yes/No(질문 답변)로 빠르게 결정하세요.</li>
            <li><strong>보드게임:</strong> 주사위 도구로 D&D, TRPG 등 다양한 게임에 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
