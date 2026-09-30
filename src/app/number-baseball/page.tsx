import { Metadata } from 'next'
import NumberBaseball from '@/components/NumberBaseball'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '숫자야구 게임 - 숫자 맞추기 두뇌 게임 | 툴허브',
  description:
    '매일 새 문제가 나오는 오늘의 숫자야구! 스트라이크·볼 판정으로 숨은 숫자를 추리하고 🟩🟨 결과를 친구와 공유하세요. 3~5자리 연습 모드, 메모장, 후보 수 힌트 지원.',
  keywords: '숫자야구, 오늘의 숫자야구, 숫자야구 게임, 숫자 맞추기, 불스앤카우스, 두뇌 게임, 추리 게임',
  openGraph: {
    title: '숫자야구 게임 | 툴허브',
    description: '스트라이크, 볼, 아웃으로 숨겨진 숫자를 맞추는 두뇌 게임',
    url: 'https://toolhub.ai.kr/number-baseball',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/number-baseball.png', width: 1200, height: 630, alt: '숫자야구 게임' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '숫자야구',
    description: '숫자 맞추기 두뇌 게임',
    images: ['https://toolhub.ai.kr/og/number-baseball.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/number-baseball/',
  },
}

export default function NumberBaseballPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '숫자야구 게임',
    description: '숫자 맞추기 두뇌 게임',
    url: 'https://toolhub.ai.kr/number-baseball',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['오늘의 숫자야구 (매일 같은 문제)', '3~5자리·0 포함·시도 제한 연습 모드', '숫자 메모장', '남은 후보 수 힌트', '연속 기록·시도 분포 통계', '스포일러 없는 결과 공유'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '숫자야구 게임 규칙은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '숫자야구는 상대가 정한 3~5자리 숫자를 맞추는 추론 게임입니다. 각 자리 숫자가 겹치지 않습니다. 추측 후 힌트: 숫자와 위치가 모두 맞으면 \'스트라이크\', 숫자는 맞지만 위치가 다르면 \'볼\'. 예를 들어 정답이 123이고 132를 추측하면 1S 2B(1은 스트라이크, 3과 2는 볼)입니다. 논리적 추론으로 가능한 숫자를 좁혀가며, 보통 7번 이내에 맞출 수 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '오늘의 숫자야구는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '매일 자정(한국 시간)에 바뀌는 문제로, 모든 사람에게 같은 4자리 숫자(1~9, 중복 없음)가 나옵니다. 하루 한 번 10번 안에 맞히는 도전이며, 결과는 숫자 없이 🟩(스트라이크) 🟨(볼) ⬜(아웃) 그리드로 공유할 수 있어 스포일러가 없습니다.'
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <NumberBaseball />
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
            숫자야구 게임이란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            숫자야구는 컴퓨터가 숨긴 3~5자리 숫자(각 자리 숫자가 겹치지 않음)를 추리하는 두뇌 게임입니다. 숫자와 위치가 모두 맞으면 스트라이크, 숫자는 맞지만 위치가 다르면 볼, 아무것도 맞지 않으면 아웃으로 판정됩니다. 논리적 추론과 경우의 수 분석 능력을 키울 수 있어 학생부터 성인까지 즐길 수 있는 추리 게임입니다. 영미권에서는 '불스 앤 카우스(Bulls and Cows)'로 불립니다. 툴허브의 오늘의 숫자야구는 매일 모두에게 같은 문제가 나오므로 친구와 몇 번 만에 풀었는지 비교해 보세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            숫자야구 게임 공략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>첫 추측 전략:</strong> 첫 시도에는 0~9 중 서로 다른 숫자를 최대한 다양하게 사용(예: 1234)하면 초반 정보를 많이 얻을 수 있습니다.</li>
            <li><strong>스트라이크 우선 고정:</strong> 스트라이크가 나온 자리는 해당 숫자를 그대로 유지하면서 나머지 자리만 바꿔 추론 범위를 좁히세요.</li>
            <li><strong>아웃된 숫자 제거:</strong> 아웃 판정을 받은 숫자는 메모장에 ❌로 표시하고 이후 추측에서 완전히 제외하세요.</li>
            <li><strong>난이도 선택:</strong> 3자리는 입문자, 4자리는 중급, 5자리는 고급 수준입니다. 처음에는 3자리부터 시작해 전략을 익히세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
