import { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import OrderPickerClient from './OrderPickerClient'

export const metadata: Metadata = {
  title: '순서정하기 게임 - 무료 랜덤 순서 뽑기 | 툴허브',
  description:
    '순서정하기 게임 무료 온라인! 참가자 이름을 입력하면 랜덤으로 순서를 뽑아드립니다. 발표 순서, 회식 자리, 게임 순서 등 모든 순서 정하기를 공정하게.',
  keywords: [
    '순서정하기 게임',
    '순서 정하기 게임',
    '순서정하기',
    '순서 정하기 사다리',
    '랜덤 순서 정하기',
    '순서 뽑기',
    '순서 정하기 온라인',
    '무작위 순서',
    '발표 순서 정하기',
    '팀 순서 정하기',
    '공정한 순서 뽑기',
    '랜덤 순서 뽑기',
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '순서정하기 게임 - 무료 랜덤 순서 뽑기 | 툴허브',
    description:
      '참가자 이름을 입력하면 랜덤으로 순서를 뽑아드립니다. 발표 순서, 회식 자리, 게임 순서를 공정하게 결정하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/order-picker',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '순서정하기 게임 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '순서정하기 게임 - 무료 랜덤 순서 뽑기 | 툴허브',
    description: '참가자 이름 입력 → 랜덤 순서 뽑기. 발표·회식·게임 순서를 공정하게 결정.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/order-picker/',
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

export default function OrderPickerPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '순서정하기 게임',
    description:
      '참가자 이름을 입력하면 랜덤으로 순서를 뽑아주는 무료 온라인 순서정하기 게임. 발표 순서, 회식 자리, 게임 순서 등에 활용.',
    url: 'https://toolhub.ai.kr/order-picker',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    inLanguage: 'ko',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '랜덤 순서 뽑기',
      '참가자 이름 직접 입력',
      '카드 한 장씩 순차 공개',
      '결과 복사 및 공유',
      '다크모드 지원',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '순서정하기 게임 사용 방법',
    description: '랜덤 순서 뽑기 도구로 공정하게 순서를 정하는 방법',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: '참가자 입력',
        text: '순서를 정할 참가자 이름을 한 명씩 입력하거나, 쉼표로 구분하여 한번에 붙여넣기 합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: '순서 뽑기 실행',
        text: '"순서 뽑기" 버튼을 클릭하면 참가자들의 순서가 랜덤으로 섞입니다.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: '카드 공개',
        text: '카드를 한 장씩 클릭하여 순서를 하나씩 공개하거나, "전체 공개" 버튼으로 한 번에 확인합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: '결과 복사',
        text: '공개된 순서를 복사 버튼으로 클립보드에 저장하여 메신저나 메모에 공유합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: '재시도',
        text: '다른 순서로 다시 뽑고 싶다면 초기화 버튼을 눌러 처음부터 다시 진행합니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '순서정하기 게임은 정말 무작위인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 브라우저의 Math.random()을 기반으로 피셔-예이츠(Fisher-Yates) 알고리즘을 사용하여 완전히 무작위로 순서를 섞습니다. 매번 다른 결과가 나오며 특정 참가자를 유리하게 하는 조작은 없습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '참가자를 몇 명까지 입력할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '제한 없이 입력할 수 있습니다. 다만 실용적으로는 2명부터 30명 내외까지 사용하기 적합합니다. 참가자가 많을수록 카드 공개 방식으로 천천히 순서를 밝히는 재미가 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '결과를 저장하거나 공유할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '순서가 공개되면 복사 버튼으로 결과를 클립보드에 복사할 수 있습니다. 카카오톡, 슬랙 등 메신저에 바로 붙여넣기하여 공유할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '순서정하기와 사다리타기의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '순서뽑기는 전체 참가자의 순서를 한 번에 랜덤으로 배정합니다. 사다리타기는 각 참가자가 특정 "결과"(예: 벌칙, 역할)에 1:1로 매핑됩니다. 단순히 발표나 진행 순서를 정할 때는 순서뽑기가, 역할이나 결과를 배정할 때는 사다리타기가 더 적합합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '모바일에서도 사용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 스마트폰과 태블릿 등 모든 기기에서 사용 가능합니다. 터치 조작에 최적화되어 있으며 별도 앱 설치 없이 브라우저에서 바로 이용할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb />

          <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
            <I18nWrapper>
              <OrderPickerClient />
            </I18nWrapper>
          </Suspense>

          <div className="mt-8">
            <RelatedTools />
          </div>
        </div>
      </div>

      {/* SEO 콘텐츠 섹션 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-8">

          {/* 순서정하기란? */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              순서정하기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              순서정하기 게임은 여러 명의 참가자 중에서 무작위로 순서를 정해주는 온라인 도구입니다.
              발표 순서, 당번 배정, 게임 진행 순서 등 공정한 결정이 필요한 모든 상황에서 활용할 수 있습니다.
              브라우저에서 바로 사용할 수 있어 앱 설치가 필요 없고, 스마트폰·태블릿·PC 모두에서 작동합니다.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
              피셔-예이츠(Fisher-Yates) 셔플 알고리즘을 사용하여 매번 완전히 공정한 무작위 순서를 보장합니다.
              카드를 한 장씩 뒤집는 방식으로 순서를 공개하기 때문에, 오프라인 모임에서도 긴장감 있게 진행할 수 있습니다.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              순서정하기, 순서 뽑기, 랜덤 순서 정하기 등 다양한 이름으로 불리지만, 모두 같은 기능입니다.
              사다리타기와 달리 "누가 몇 번째인지"를 한 번에 결정하는 데 특화되어 있습니다.
            </p>
          </div>

          {/* 이런 때 사용하세요 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              이런 때 사용하세요
            </h2>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">수업·세미나 발표 순서</strong> — 학생·발표자들의 발표 차례를 공정하게 정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">회식 자리 배치</strong> — 좌석 순서나 음식 주문 순서를 랜덤으로 결정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">보드게임·파티 게임 순서</strong> — 누가 먼저 시작할지 빠르게 결정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">청소·당직 당번 배정</strong> — 반복 당번을 돌아가며 공평하게 배정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">팀 프로젝트 역할 분담</strong> — 팀원들의 작업 우선순위나 진행 순서를 정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">스포츠·e스포츠 대진표</strong> — 토너먼트 시드 배정이나 경기 순서를 결정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-gray-900 dark:text-white">추첨·이벤트 당첨자 선정</strong> — 여러 후보 중 당첨 순위를 무작위로 선정할 때</span>
              </li>
            </ul>
          </div>

          {/* 사용 방법 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              사용 방법
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center">1</span>
                <span>참가자 이름을 입력 칸에 한 명씩 추가합니다. 이름이 없으면 "참가자 1, 2, 3..." 형태로 기본값이 제공됩니다.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center">2</span>
                <span>"순서 뽑기" 버튼을 클릭하면 참가자들의 순서가 랜덤으로 섞입니다.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center">3</span>
                <span>뒤집힌 카드를 한 장씩 클릭하면 순서가 하나씩 공개됩니다. "전체 공개" 버튼으로 한 번에 모두 볼 수도 있습니다.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center">4</span>
                <span>결과를 복사하여 카카오톡이나 슬랙 등 메신저로 바로 공유하세요.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center">5</span>
                <span>다시 뽑고 싶다면 초기화 버튼을 눌러 처음부터 진행합니다. 참가자 목록은 유지됩니다.</span>
              </li>
            </ol>
          </div>

          {/* 자주 묻는 질문 */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Q. 순서정하기와 사다리타기는 어떻게 다른가요?
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  순서뽑기는 "누가 몇 번째인지" 진행 순서를 정할 때 사용합니다. 사다리타기는 참가자와 특정 결과(벌칙, 역할, 자리 등)를 1:1로 매칭할 때 더 적합합니다. 단순한 순서 결정은 순서뽑기가, 역할 배정은 사다리타기가 알맞습니다.
                </p>
              </div>
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Q. 결과가 진짜 랜덤인가요, 조작되는 건 아닌가요?
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  완전히 무작위입니다. 브라우저 내장 난수 생성기(Math.random)와 피셔-예이츠 셔플 알고리즘을 사용하며, 서버와 통신하지 않으므로 외부 조작이 불가능합니다. 매 시행마다 독립적인 결과가 나옵니다.
                </p>
              </div>
              <div className="border-l-4 border-blue-400 pl-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Q. 로그인 없이 무료로 사용할 수 있나요?
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  네, 완전 무료이며 회원가입이나 로그인이 필요하지 않습니다. 브라우저에서 바로 사용하고 결과를 공유할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}
