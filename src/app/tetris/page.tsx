import { Metadata } from 'next'
import TetrisPageClient from '@/components/TetrisPageClient'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import tetrisMessages from '@/../messages/generated/ko/ns/tetris.json'

const TITLE = '테트리스 - 솔로 키보드·터치와 2인 대전 | 툴허브'
const DESCRIPTION = '홀드·고스트·넥스트가 있는 테트리스를 즐기세요. 솔로 모드는 버튼 초점과 게임 단축키를 구분하고 키보드·터치 패드, 일시정지 뒤 새 입력을 지원합니다. 기존 2인 대전도 이용할 수 있습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '테트리스, 블록 게임, 퍼즐 게임, 온라인 테트리스, 무료 게임, 멀티플레이, 대전',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/tetris/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/tetris.png', width: 1200, height: 630, alt: '테트리스' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/tetris.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tetris/',
  },
}

export default function TetrisPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '테트리스',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/tetris/',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2 },
    playMode: ['SinglePlayer', 'MultiPlayer'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['7-bag 랜덤', '홀드', '넥스트 미리보기', '고스트 피스', '레벨 시스템', '2인 실시간 대전', '공격 라인 시스템', '콤보'],
  }

  const faq = tetrisMessages.tetris.guide.faq.items

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <TetrisPageClient />
              <ToolFaq items={faq} />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            테트리스란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            떨어지는7가지 블록을 이동·회전해 가로줄을 완성하는 퍼즐입니다. 솔로 모드는 기존 SRS 회전·7-bag·홀드·넥스트·고스트·레벨 규칙을 유지합니다. 화면 버튼에 초점을 둔 조작과 게임 배경 단축키를 구분하며 키보드와 터치를 함께 사용할 수 있습니다. 기존 멀티플레이 탭도 그대로 제공합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            솔로 입력과 블록 배치
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>명시적 시작:</strong> 시작 버튼을 누른 뒤 게임 배경에서 방향키·회전·하드 드롭 단축키를 사용하세요.</li>
            <li><strong>패드의 키보드 조작:</strong> Tab으로 화면 패드 버튼에 초점을 옮기고 Space 또는 Enter로 표시된 동작을 실행할 수 있습니다.</li>
            <li><strong>일시정지와 복귀:</strong> 잠시 쉬거나 탭을 떠났다가 돌아온 뒤에는 키나 버튼을 새로 눌러 조작합니다. 이전에 누른 입력을 다음 게임으로 이어가지 않습니다.</li>
            <li><strong>다음 블록 준비:</strong> 홀드와 넥스트를 보고 블록을 선택하고 고스트로 착지 위치를 확인하세요. 가로줄을 완성하기 쉽게 표면을 고르게 쌓아 보세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
