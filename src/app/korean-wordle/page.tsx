import { Metadata } from 'next'
import KoreanWordle from '@/components/KoreanWordle'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import wordleMessages from '../../../messages/generated/ko/ns/koreanWordle.json'

const TITLE = '한글 워들 - 오늘의 단어·최근 일일 기록 | 툴허브'
const DESCRIPTION = '한국 시간 자정에 바뀌는 2글자 단어를 6번 안에 맞혀 보세요. 자모 힌트·연습·하드·색약 모드와 누적 통계, 최근 일일 기록 30개 조회·정답 없는 격자 복사·저장 상태 안내를 제공합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '한글 워들, 워들 한국어, 꼬들, 오늘의 단어, Korean Wordle, 단어 맞추기 게임, 한글 게임, 워드 게임',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/korean-wordle/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/korean-wordle.png', width: 1200, height: 630, alt: '한글 워들' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/korean-wordle.png'],
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
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/korean-wordle/',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['오늘의 단어 (KST 자정)', '자모 단위 힌트', '연속 기록·추측 분포 통계', '스포일러 없는 결과 공유', '무제한 연습 모드', '하드 모드', '색약 모드', '최근 일일 기록 30개 읽기 전용 조회', '완료 기록 격자 복사·복구', '저장 상태 확인·원본 보호'],
  }

  const faq = wordleMessages.koreanWordle.guide.faq.items

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <KoreanWordle />
              <ToolFaq items={faq} />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-line pt-8">
            <h2 className="text-xl font-bold text-fg mb-4">
              한글 워들이란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              한글 워들은 매일 한국 시간 자정에 모두에게 같은 2글자 단어가 출제되고, 6번 안에 맞히는 게임입니다. 자모(자음·모음) 단위 힌트로 후보를 좁히고, 완료한 결과를 정답 없는 격자로 공유할 수 있습니다. 통계에서 최근 일일 기록 30개를 확인해도 현재 퍼즐은 과거 날짜로 바뀌지 않습니다. 30개는 표시 한도이며 기존 기록을 그 수에 맞춰 삭제하지 않습니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              한글 워들 플레이 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>자모 힌트 활용:</strong> 초록색은 정확한 자리, 노란색은 단어에 있지만 위치가 다름, 회색은 단어에 없음을 뜻합니다. 색 구분이 어렵다면 색약 모드(주황·파랑)를 켜세요.</li>
              <li><strong>첫 시도 전략:</strong> 모음과 받침이 다양한 단어(예: 강물, 햇살)로 시작하면 힌트를 빠르게 좁힐 수 있습니다.</li>
              <li><strong>오늘의 단어 #N:</strong> 하루에 한 번 새 단어가 출제되므로 매일 도전해 연속 성공 기록을 쌓아보세요. 더 풀고 싶으면 무제한 연습 모드를 이용하세요.</li>
              <li><strong>결과 공유:</strong> 클리어 후 결과를 카카오톡·SNS에 공유해 친구들과 비교해보세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
