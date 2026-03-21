import { Metadata } from 'next'
import { Suspense } from 'react'
import NumberBaseball from '@/components/NumberBaseball'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '숫자야구 게임 - 숫자 맞추기 두뇌 게임 | 툴허브',
  description:
    '숫자야구 게임을 온라인에서 무료로 즐기세요. 스트라이크, 볼, 아웃 판정으로 숨겨진 숫자를 추리하는 두뇌 게임입니다.',
  keywords: '숫자야구, 숫자 맞추기, 두뇌 게임, 추리 게임, 온라인 게임',
  openGraph: {
    title: '숫자야구 게임 | 툴허브',
    description: '스트라이크, 볼, 아웃으로 숨겨진 숫자를 맞추는 두뇌 게임',
    url: 'https://toolhub.ai.kr/number-baseball',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '숫자야구',
    description: '숫자 맞추기 두뇌 게임',
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
    featureList: ['3~5자리 난이도', '스트라이크/볼/아웃 판정', '힌트 시스템', '통계 추적'],
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
          text: '숫자야구는 상대가 정한 3-4자리 숫자를 맞추는 추론 게임입니다. 각 자리 숫자가 겹치지 않습니다. 추측 후 힌트: 숫자와 위치가 모두 맞으면 \'스트라이크\', 숫자는 맞지만 위치가 다르면 \'볼\'. 예를 들어 정답이 123이고 132를 추측하면 1S 2B(1은 스트라이크, 3과 2는 볼)입니다. 논리적 추론으로 가능한 숫자를 좁혀가며, 보통 7번 이내에 맞출 수 있습니다.'
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <NumberBaseball />
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
            숫자야구 게임이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            숫자야구는 컴퓨터가 숨긴 3~4자리 숫자(각 자리 숫자가 겹치지 않음)를 추리하는 두뇌 게임입니다. 숫자와 위치가 모두 맞으면 스트라이크, 숫자는 맞지만 위치가 다르면 볼, 아무것도 맞지 않으면 아웃으로 판정됩니다. 논리적 추론과 경우의 수 분석 능력을 키울 수 있어 학생부터 성인까지 즐길 수 있는 추리 게임입니다. 영미권에서는 '불스 앤 카우스(Bulls and Cows)'로 불립니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            숫자야구 게임 공략 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>첫 추측 전략:</strong> 첫 시도에는 0~9 중 서로 다른 숫자를 최대한 다양하게 사용(예: 1234)하면 초반 정보를 많이 얻을 수 있습니다.</li>
            <li><strong>스트라이크 우선 고정:</strong> 스트라이크가 나온 자리는 해당 숫자를 그대로 유지하면서 나머지 자리만 바꿔 추론 범위를 좁히세요.</li>
            <li><strong>아웃된 숫자 제거:</strong> 아웃 판정을 받은 숫자는 이후 추측에서 완전히 제외하여 경우의 수를 줄일 수 있습니다.</li>
            <li><strong>난이도 선택:</strong> 3자리는 입문자, 4자리는 중급, 5자리는 고급 수준입니다. 처음에는 3자리부터 시작해 전략을 익히세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
