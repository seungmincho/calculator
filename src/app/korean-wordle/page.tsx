import { Metadata } from 'next'
import KoreanWordle from '@/components/KoreanWordle'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '한글 워들 - 매일 새로운 한국어 단어 맞추기 게임 | 툴허브',
  description: '한글 워들(꼬들 스타일) - 매일 자정 모두에게 같은 2글자 단어를 6번 안에 맞혀보세요. 자모 힌트, 연속 기록 통계, 🟩🟨 결과 공유, 무제한 연습, 색약 모드를 지원합니다.',
  keywords: '한글 워들, 워들 한국어, 꼬들, 오늘의 단어, Korean Wordle, 단어 맞추기 게임, 한글 게임, 워드 게임',
  openGraph: {
    title: '한글 워들 - 매일 새로운 단어 맞추기 | 툴허브',
    description: '오늘의 단어 #N — 6번 안에 맞히고 단톡방에 결과를 공유해 보세요!',
    url: 'https://toolhub.ai.kr/korean-wordle',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/korean-wordle.png', width: 1200, height: 630, alt: '한글 워들' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '한글 워들 | 툴허브',
    description: '매일 새로운 한국어 단어 맞추기 게임',
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
    description: '매일 자정(한국 시간) 모두에게 같은 2글자 한국어 단어를 6번 안에 맞히는 단어 게임',
    url: 'https://toolhub.ai.kr/korean-wordle',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['오늘의 단어 (KST 자정)', '자모 단위 힌트', '연속 기록·추측 분포 통계', '스포일러 없는 결과 공유', '무제한 연습 모드', '하드 모드', '색약 모드'],
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
          text: '숨겨진 2글자 단어를 6번 안에 맞히는 퍼즐입니다. 추측한 단어의 각 글자를 자모(키 입력 순서)로 나눠, 같은 자리에 있으면 초록, 단어 안 다른 자리에 있으면 노랑, 없으면 회색으로 알려줍니다. 같은 자모가 여러 번 나오면 정답에 있는 개수만큼만 색이 칠해집니다.'
        }
      },
      {
        '@type': 'Question',
        name: '오늘의 단어는 언제 바뀌나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '매일 한국 시간 자정에 바뀌며 모든 사람에게 같은 단어가 나옵니다. 하루 한 번 풀 수 있고, 더 하고 싶다면 연습 모드에서 2·3글자 단어를 무제한으로 풀 수 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '결과를 친구와 공유하려면?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '오늘의 단어를 끝내면 "툴허브 한글 워들 #회차 4/6" 형태의 문구와 🟩🟨⬜ 격자를 복사할 수 있습니다. 정답은 드러나지 않으니 카카오톡 단톡방에 그대로 붙여넣으면 됩니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <KoreanWordle />
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
              한글 워들은 뉴욕타임즈의 인기 단어 게임 'Wordle'을 한국어로 즐기는 게임입니다. 매일 한국 시간 자정에 모두에게 같은 2글자 단어가 출제되고, 6번 안에 맞히는 방식입니다. 자모(자음·모음) 단위 힌트 덕분에 영어 워들보다 전략적인 플레이가 가능하고, 결과를 스포일러 없는 격자로 공유해 친구들과 비교할 수 있습니다. 한글 어휘력을 키우고 싶은 분, 단어 게임을 좋아하는 분 모두에게 추천합니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              한글 워들 플레이 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>자모 힌트 활용:</strong> 초록색은 정확한 자리, 노란색은 단어에 있지만 위치가 다름, 회색은 단어에 없음을 뜻합니다. 색 구분이 어렵다면 색약 모드(주황·파랑)를 켜세요.</li>
              <li><strong>첫 시도 전략:</strong> 모음과 받침이 다양한 단어(예: '강물', '햇살')로 시작하면 힌트를 빠르게 좁힐 수 있습니다.</li>
              <li><strong>오늘의 단어 #N:</strong> 하루에 한 번 새 단어가 출제되므로 매일 도전해 연속 성공 기록을 쌓아보세요. 더 풀고 싶으면 무제한 연습 모드를 이용하세요.</li>
              <li><strong>결과 공유:</strong> 클리어 후 결과를 카카오톡·SNS에 공유해 친구들과 비교해보세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
