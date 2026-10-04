import { Metadata } from 'next'
import DecisionToolsBar from '@/components/DecisionToolsBar'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import OrderPickerClient from './OrderPickerClient'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '순서정하기 게임 - 랜덤 순서 뽑기, 발표·회식 순서 | 툴허브',
  description:
    '참가자 이름만 넣고 뽑기를 누르면 랜덤으로 순서가 정해집니다. 1위부터 카드가 한 장씩 뒤집히며 공개되고, 결과는 복사해 단톡방에 바로 붙여 넣을 수 있어요. 발표 순서·청소 당번·게임 차례 정하기에 무료로.',
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
        url: 'https://toolhub.ai.kr/og/order-picker.png',
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
    images: ['https://toolhub.ai.kr/og/order-picker.png'],
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
    url: 'https://toolhub.ai.kr/order-picker/',
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
        text: '순서를 정할 참가자 이름을 입력 칸에 한 명씩 추가합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: '순서 뽑기 실행',
        text: '"뽑기!" 버튼을 누르면 참가자들의 순서가 랜덤으로 섞입니다.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: '카드 공개',
        text: '1위부터 카드가 한 장씩 자동으로 공개됩니다. 기다리지 않으려면 "전체 공개" 버튼으로 한 번에 확인합니다.',
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

  const faq = [
    { q: '순서정하기 게임은 정말 무작위인가요?', a: '네. 뽑기를 누를 때마다 브라우저의 난수로 참가자 순서를 새로 섞습니다. 계산이 모두 내 브라우저 안에서 이루어지고 서버로 전송되지 않으므로, 누군가 결과를 미리 정해 두거나 바꿀 수 없습니다.' },
    { q: '참가자를 몇 명까지 입력할 수 있나요?', a: '최소 2명부터 인원 제한 없이 추가할 수 있습니다(이름은 20자까지). 결과 카드는 0.5초 간격으로 한 장씩 공개되므로, 인원이 많을 때는 "전체 공개" 버튼으로 한 번에 볼 수 있습니다.' },
    { q: '결과를 저장하거나 공유할 수 있나요?', a: '카드가 모두 공개되면 "결과 복사" 버튼으로 "1위: 이름" 형식의 목록을 복사해 카카오톡·슬랙 등에 붙여 넣을 수 있습니다. 주소창 링크에는 참가자 명단이 담겨 있어, 링크를 보내면 같은 명단으로 바로 뽑을 수 있습니다.' },
    { q: '순서정하기와 사다리타기의 차이는 무엇인가요?', a: '순서뽑기는 전체 참가자의 순서를 한 번에 랜덤으로 배정합니다. 사다리타기는 각 참가자가 특정 "결과"(예: 벌칙, 역할)에 1:1로 매핑됩니다. 단순히 발표나 진행 순서를 정할 때는 순서뽑기가, 역할이나 결과를 배정할 때는 사다리타기가 더 적합합니다.' },
    { q: '로그인 없이 무료로 사용할 수 있나요?', a: '네, 완전 무료이며 회원가입이나 로그인이 필요하지 않습니다. 스마트폰·태블릿·PC 브라우저에서 앱 설치 없이 바로 쓸 수 있습니다.' },
  ]

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

      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            <I18nWrapper>
              <div className="mb-6"><DecisionToolsBar current="/order-picker" /></div>
              <OrderPickerClient />
            </I18nWrapper>

          <ToolFaq items={faq} />
          <div className="mt-8">
            <RelatedTools />
          </div>
        </div>
      </div>

      {/* SEO 콘텐츠 섹션 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-surface rounded-xl shadow-lg p-6 space-y-8">

          {/* 순서정하기란? */}
          <div>
            <h2 className="text-xl font-bold text-fg mb-3">
              순서정하기란?
            </h2>
            <p className="text-body leading-relaxed mb-3">
              순서정하기 게임은 여러 명의 참가자 중에서 무작위로 순서를 정해주는 온라인 도구입니다.
              발표 순서, 당번 배정, 게임 진행 순서 등 공정한 결정이 필요한 모든 상황에서 활용할 수 있습니다.
              브라우저에서 바로 사용할 수 있어 앱 설치가 필요 없고, 스마트폰·태블릿·PC 모두에서 작동합니다.
            </p>
            <p className="text-body leading-relaxed mb-3">
              뽑기를 누를 때마다 브라우저 안에서 순서를 무작위로 섞고, 1위부터 카드를 한 장씩 뒤집어 공개합니다.
              결과가 하나씩 드러나기 때문에 오프라인 모임에서도 긴장감 있게 진행할 수 있습니다.
            </p>
            <p className="text-body leading-relaxed">
              순서정하기, 순서 뽑기, 랜덤 순서 정하기 등 다양한 이름으로 불리지만, 모두 같은 기능입니다.
              사다리타기와 달리 "누가 몇 번째인지"를 한 번에 결정하는 데 특화되어 있습니다.
            </p>
          </div>

          {/* 이런 때 사용하세요 */}
          <div>
            <h2 className="text-xl font-bold text-fg mb-3">
              이런 때 사용하세요
            </h2>
            <ul className="space-y-2 text-body">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">수업·세미나 발표 순서</strong> — 학생·발표자들의 발표 차례를 공정하게 정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">회식 자리 배치</strong> — 좌석 순서나 음식 주문 순서를 랜덤으로 결정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">보드게임·파티 게임 순서</strong> — 누가 먼저 시작할지 빠르게 결정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">청소·당직 당번 배정</strong> — 반복 당번을 돌아가며 공평하게 배정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">팀 프로젝트 역할 분담</strong> — 팀원들의 작업 우선순위나 진행 순서를 정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">스포츠·e스포츠 대진표</strong> — 토너먼트 시드 배정이나 경기 순서를 결정할 때</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-0.5">•</span>
                <span><strong className="text-fg">추첨·이벤트 당첨자 선정</strong> — 여러 후보 중 당첨 순위를 무작위로 선정할 때</span>
              </li>
            </ul>
          </div>

          {/* 사용 방법 */}
          <div>
            <h2 className="text-xl font-bold text-fg mb-3">
              사용 방법
            </h2>
            <ol className="space-y-3 text-body">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub text-sm font-bold flex items-center justify-center">1</span>
                <span>참가자 이름을 입력 칸에 한 명씩 추가합니다. 처음에 들어 있는 &quot;참가자 1~4&quot;는 지우고 실제 이름으로 바꾸세요.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub text-sm font-bold flex items-center justify-center">2</span>
                <span>&quot;뽑기!&quot; 버튼을 누르면 참가자들의 순서가 랜덤으로 섞입니다.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub text-sm font-bold flex items-center justify-center">3</span>
                <span>1위부터 카드가 한 장씩 자동으로 뒤집히며 순서가 공개됩니다. &quot;전체 공개&quot; 버튼으로 한 번에 모두 볼 수도 있습니다.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub text-sm font-bold flex items-center justify-center">4</span>
                <span>결과를 복사하여 카카오톡이나 슬랙 등 메신저로 바로 공유하세요.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-soft text-sub text-sm font-bold flex items-center justify-center">5</span>
                <span>다시 뽑고 싶다면 초기화 버튼을 눌러 처음부터 진행합니다. 참가자 목록은 유지됩니다.</span>
              </li>
            </ol>
          </div>

        </div>
      </section>
    </>
  )
}
