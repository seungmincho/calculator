import { Metadata } from 'next'
import Minesweeper from '@/components/Minesweeper'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import minesweeperMessages from '../../../messages/generated/ko/ns/minesweeper.json'

const TITLE = '지뢰찾기 - 클래식·같은 판 연습 | 툴허브'
const DESCRIPTION = '클래식·오늘의 지뢰찾기와 난이도별 기록을 즐기세요. 종료한 클래식 판은 같은 지뢰 배치와 첫 칸으로 다시 연습할 수 있으며, 연습 결과는 개인 기록·업적·리더보드에 반영하지 않습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '지뢰찾기, 마인스위퍼, minesweeper, 무료 게임, 온라인 게임, 퍼즐 게임, 브라우저 게임',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/minesweeper/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/minesweeper.png', width: 1200, height: 630, alt: '지뢰찾기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/minesweeper.png'],
  },
  alternates: { canonical: 'https://toolhub.ai.kr/minesweeper/' },
}

export default function MinesweeperPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '지뢰찾기 (마인스위퍼)',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/minesweeper/',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['초급·중급·고급·사용자 지정', '첫 클릭 3×3 안전(영역 열림)', '추측 없는 판(No-guess)', '오늘의 지뢰찾기 #N (모두 같은 판)', '숫자 클릭·양쪽 클릭 chord', '길게 눌러 깃발·깃발 모드', '0.01초 타이머·난이도별 최고 기록', '3BV·효율 통계', '키보드 조작', '종료한 클래식 판의 동일 배치 재연습', '같은 첫 칸 자동 열기·첫 유효한 후속 조작부터 시간 측정', '연습의 개인 기록·업적·리더보드 제외'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={minesweeperMessages.minesweeper.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper><Minesweeper />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-line pt-8">
            <h2 className="text-xl font-bold text-fg mb-4">
              지뢰찾기(마인스위퍼)란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              지뢰찾기(마인스위퍼, Minesweeper)는 격자 위의 숫자 힌트를 이용해 지뢰 위치를 추론하고 지뢰가 없는 칸을 모두 열면 승리하는 클래식 퍼즐 게임입니다. 1990년대 윈도우 기본 게임으로 큰 인기를 끌었으며, 논리적 추론 능력과 집중력을 키우는 데 효과적입니다. 초급(9×9, 지뢰 10개)·중급(16×16, 40개)·고급(30×16, 99개)과 사용자 지정 판을 제공하고, 찍기 없이 논리만으로 풀리는 &apos;추측 없는 판&apos;과 매일 모두 같은 판으로 기록을 겨루는 &apos;오늘의 지뢰찾기&apos;도 즐길 수 있습니다.
            </p>
            <p className="text-body leading-relaxed mb-6">
              종료한 클래식 판은 같은 판 연습으로 지뢰 배치와 최초 안전 칸을 유지한 채 다시 풀 수 있습니다. 깃발·물음표·클릭·시간은 초기화하고 첫 칸을 자동으로 연 뒤 유효한 후속 조작부터 시간을 셉니다. 연습은 개인 최고·업적·공개 기록과 구분하며 새 판이나 난도·모드를 바꾸면 일반 흐름으로 돌아갑니다. 배치를 담은 공유 링크나 자동 풀이 기능은 아닙니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              지뢰찾기 공략 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>숫자 해석:</strong> 숫자는 인접한 8칸 중 지뢰 개수를 의미합니다. &apos;1&apos;이 적힌 칸 주변에 아직 안 열린 칸이 하나뿐이라면 그곳이 지뢰입니다.</li>
              <li><strong>깃발 활용:</strong> 확실한 지뢰 위치에 오른쪽 클릭으로 깃발을 꽂으면 주변 숫자를 해석하기 쉬워집니다.</li>
              <li><strong>코너부터 시작:</strong> 첫 클릭은 코너나 가장자리부터 시작하면 안전한 칸이 한 번에 많이 열릴 가능성이 높습니다.</li>
              <li><strong>1-2 패턴:</strong> 가장자리에서 1-2가 나란히 놓인 경우 2 옆의 미개방 칸이 지뢰인 패턴을 익혀두면 빠른 진행이 가능합니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
