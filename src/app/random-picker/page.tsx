import { Metadata } from 'next'
import { Suspense } from 'react'
import RandomPicker from '@/components/RandomPicker'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '랜덤 뽑기 - 추첨기, 숫자 뽑기, 팀 나누기 | 툴허브',
  description: '랜덤 뽑기 도구 - 랜덤 숫자 생성, 이름/항목 추첨, 팀 나누기를 간편하게. 교실, 이벤트, 회식 장소 정하기 등에 활용하세요.',
  keywords: '랜덤 뽑기, 추첨기, 랜덤 숫자, 팀 나누기, 제비뽑기, random picker, 돌림판',
  openGraph: {
    title: '랜덤 뽑기 | 툴허브',
    description: '랜덤 숫자 생성, 이름 뽑기, 팀 나누기',
    url: 'https://toolhub.ai.kr/random-picker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '랜덤 뽑기 | 툴허브', description: '랜덤 숫자, 이름 뽑기, 팀 나누기' },
  alternates: { canonical: 'https://toolhub.ai.kr/random-picker/' },
}

export default function RandomPickerPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '랜덤 뽑기', description: '랜덤 숫자, 이름 뽑기, 팀 나누기',
    url: 'https://toolhub.ai.kr/random-picker', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['랜덤 숫자 생성', '목록에서 랜덤 뽑기', '팀 나누기'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '컴퓨터의 랜덤 생성은 진짜 무작위인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '대부분의 프로그래밍 언어에서 Math.random()은 의사 난수(Pseudo-Random)를 생성합니다. 시드(seed) 값에서 시작하여 수학적 알고리즘으로 다음 숫자를 계산하므로 완전한 무작위는 아닙니다. 암호학적으로 안전한 난수가 필요하면 crypto.getRandomValues()를 사용합니다. 일상적인 추첨, 순서 정하기, 메뉴 선택 등에는 의사 난수로도 충분히 공정합니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><RandomPicker />  <div className="mt-8">
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
            랜덤 뽑기 도구란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            랜덤 뽑기 도구는 공정한 무작위 추첨, 숫자 생성, 팀 나누기를 제공하는 온라인 추첨기입니다. 교실에서의 발표자 선정, 회식 장소 결정, 경품 이벤트 당첨자 추첨, 팀 프로젝트 역할 배정 등 결정이 필요한 모든 상황에서 공정하고 빠르게 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            랜덤 뽑기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>이름 추첨:</strong> 참가자 이름을 줄 바꿈으로 구분해 입력하면 공정한 제비뽑기가 가능합니다. 발표자 선정, 당번 정하기, 경품 추첨 등에 활용하세요.</li>
            <li><strong>팀 나누기:</strong> 인원수와 팀 수를 입력하면 자동으로 균등하게 팀을 나눠 줍니다. 스포츠 대회, 조별 과제, 워크샵 그룹 편성에 편리합니다.</li>
            <li><strong>랜덤 숫자 생성:</strong> 범위와 개수를 지정해 중복 없는 난수를 생성할 수 있습니다. 로또 번호 참고, 행운의 번호 뽑기, 순서 정하기에 사용하세요.</li>
            <li><strong>돌림판 모드:</strong> 시각적인 돌림판으로 뽑기를 진행하면 이벤트나 게임에서 현장감과 참여 흥미를 높일 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
