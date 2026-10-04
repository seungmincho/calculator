import { Metadata } from 'next'
import Link from 'next/link'
import ToolIcon from '@/components/ToolIcon'
import LadderGameTabs from './LadderGameTabs'

export const metadata: Metadata = {
  title: '사다리타기 게임 - 온라인 사다리 타기 · 돌림판 · 벌칙 룰렛 | 툴허브',
  description: '참가자와 결과를 입력하면 바로 사다리타기. 블라인드 모드, 한 명씩 공개, 이미지 저장, 링크로 결과 공유까지 무료로.',
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
    title: '사다리타기 게임 - 온라인 사다리 타기 | 툴허브',
    description: '참가자와 결과를 입력하면 바로 사다리타기. 블라인드 모드, 이미지 저장, 링크 공유.',
    type: 'website',
    url: 'https://toolhub.ai.kr/ladder-game',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/ladder-game.png',
        width: 1200,
        height: 630,
        alt: '사다리 타기 · 돌림판 · 순서뽑기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사다리타기 게임 - 온라인 사다리 타기 | 툴허브',
    description: '참가자와 결과를 입력하면 바로 사다리타기. 블라인드 모드, 이미지 저장, 링크 공유.',
    images: ['https://toolhub.ai.kr/og/ladder-game.png'],
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
    name: '사다리타기 게임',
    description: '참가자와 결과를 1:1로 이어 주는 무료 온라인 사다리타기',
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
      <div className="min-h-screen py-8 sm:py-12 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
            <LadderGameTabs />
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            사다리 타기와 함께 쓰는 결정 도구
          </h2>
          <p className="text-body leading-relaxed mb-6">
            사다리 타기는 참가자와 결과를 1:1로 이어 줍니다. 블라인드 모드, 시드 공유, 이미지 저장을 지원합니다.
            하나만 고르거나, 팀을 나누거나, 순서를 정해야 할 때는 아래 전용 도구를 쓰면 더 빠릅니다.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            <Link prefetch={false} href="/roulette" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/roulette" size="sm" />
              <span><span className="block font-semibold text-fg">돌림판</span><span className="block text-sm text-sub mt-0.5">회전 룰렛으로 하나를 선택. 점심 메뉴, 벌칙 등에 적합.</span></span>
            </Link>
            <Link prefetch={false} href="/order-picker" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/order-picker" size="sm" />
              <span><span className="block font-semibold text-fg">순서 정하기</span><span className="block text-sm text-sub mt-0.5">전체 참가자 순서를 한 번에 결정. 카드 공개 애니메이션.</span></span>
            </Link>
            <Link prefetch={false} href="/coin-flip" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/coin-flip" size="sm" />
              <span><span className="block font-semibold text-fg">동전 던지기</span><span className="block text-sm text-sub mt-0.5">3D 회전 애니메이션. 통계, 연속기록, N판 M선승제.</span></span>
            </Link>
            <Link prefetch={false} href="/dice-roller" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/dice-roller" size="sm" />
              <span><span className="block font-semibold text-fg">주사위</span><span className="block text-sm text-sub mt-0.5">D4~D20, 최대 10개 동시. 보정값, TRPG 지원.</span></span>
            </Link>
            <Link prefetch={false} href="/team-divider" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/team-divider" size="sm" />
              <span><span className="block font-semibold text-fg">팀 나누기</span><span className="block text-sm text-sub mt-0.5">랜덤/캡틴 드래프트. 운동, 조별과제, 회식 팀 분배.</span></span>
            </Link>
            <Link prefetch={false} href="/lottery-draw" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/lottery-draw" size="sm" />
              <span><span className="block font-semibold text-fg">제비뽑기</span><span className="block text-sm text-sub mt-0.5">당첨/꽝 비율 설정. 한 장씩 뽑기, 커스텀 상품.</span></span>
            </Link>
            <Link prefetch={false} href="/yes-no" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/yes-no" size="sm" />
              <span><span className="block font-semibold text-fg">Yes or No</span><span className="block text-sm text-sub mt-0.5">7단계 답변, 확률 조정 가능.</span></span>
            </Link>
            <Link prefetch={false} href="/rock-paper-scissors" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/rock-paper-scissors" size="sm" />
              <span><span className="block font-semibold text-fg">가위바위보</span><span className="block text-sm text-sub mt-0.5">1:1, N판 M선승, 토너먼트. 전적 통계.</span></span>
            </Link>
            <Link prefetch={false} href="/random-number" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/random-number" size="sm" />
              <span><span className="block font-semibold text-fg">숫자 뽑기</span><span className="block text-sm text-sub mt-0.5">범위·개수 설정, 중복 제거, 슬롯머신 애니메이션.</span></span>
            </Link>
            <Link prefetch={false} href="/penalty-roulette" className="flex items-start gap-3 rounded-xl p-4 border border-line hover:bg-subtle transition-colors">
              <ToolIcon href="/penalty-roulette" size="sm" />
              <span><span className="block font-semibold text-fg">벌칙 룰렛</span><span className="block text-sm text-sub mt-0.5">회식/MT/커플 프리셋. 커스텀 벌칙 추가 가능.</span></span>
            </Link>
          </div>
          <h3 className="text-lg font-semibold text-fg mb-3">
            활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>순서 정하기:</strong> 사다리타기 또는 순서 정하기 도구로 발표/청소/주문 순서를 공정하게 결정하세요.</li>
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
