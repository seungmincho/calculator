import { Metadata } from 'next'
import { Suspense } from 'react'
import AgeCalculator from '@/components/AgeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '나이 계산기 - 만 나이·한국 나이·학년 | 툴허브',
  description: '나이 계산기 - 생년월일을 입력하면 만 나이, 한국 나이(세는 나이), 연 나이, 학년 정보, 같은 학년 또래, 다음 생일 D-Day, 인생 타임라인, 띠, 별자리를 한눈에 확인하세요.',
  keywords: '나이 계산기, 만 나이 계산, 한국 나이, 세는 나이, 학년 계산, 빠른생일, 생일 D-Day, 인생 타임라인, 띠 계산, 별자리 계산, 연 나이, age calculator',
  openGraph: {
    title: '나이 계산기 | 툴허브',
    description: '만 나이, 한국 나이, 학년 정보, 생일 D-Day, 인생 타임라인 등 다양한 나이 정보를 한눈에 확인하세요',
    url: 'https://toolhub.ai.kr/age-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '나이 계산기 | 툴허브',
    description: '만 나이, 한국 나이, 학년 정보, 생일 D-Day, 인생 타임라인 등 다양한 나이 정보를 한눈에 확인하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/age-calculator/',
  },
}

export default function AgeCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '나이 계산기',
    description: '생년월일을 입력하면 만 나이, 한국 나이, 연 나이, 학년 정보, 같은 학년 또래, 다음 생일 D-Day, 인생 타임라인, 띠, 별자리 등을 한눈에 확인할 수 있는 나이 계산기입니다.',
    url: 'https://toolhub.ai.kr/age-calculator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '만 나이 계산 (국제 표준)',
      '한국 나이 (세는 나이) 계산',
      '연 나이 계산',
      '학년 정보 (초등학교 입학 연도, 현재 학년)',
      '같은 학년 또래 찾기',
      '빠른생일 (1~2월생) 판별',
      '다음 생일 D-Day',
      '인생 타임라인 (주요 생애 이벤트)',
      '띠 (12간지) 계산',
      '별자리 계산',
      '살아온 일수/주수/개월수',
      '세대 구분',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '만 나이와 한국 나이(세는 나이)의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '만 나이는 태어난 날을 0살로 시작하고 생일이 지날 때마다 1살씩 더하는 국제 표준 방식입니다. 한국 나이(세는 나이)는 태어나자마자 1살이고 매년 1월 1일에 1살씩 더합니다. 2023년 6월부터 한국도 법적으로 만 나이를 기준으로 통일했으며, 만 나이 = 한국 나이 - 1 또는 - 2 (생일 전)입니다.' } },
      { '@type': 'Question', name: '연 나이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '연 나이는 올해 연도에서 출생 연도를 뺀 나이입니다. 생일과 무관하게 같은 해 출생자는 모두 같은 나이가 됩니다. 예를 들어 2000년생은 2026년에 연 나이 26세입니다. 병역법, 청소년보호법 등 일부 법률에서는 여전히 연 나이를 사용합니다. 만 나이와는 0~1살 차이가 납니다.' } },
      { '@type': 'Question', name: '빠른생일(빠른년생)이란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '한국 학제에서 3월에 새 학년이 시작되므로, 1~2월에 태어난 아이는 전년도 3~12월에 태어난 아이들과 같은 학년에 입학합니다. 이를 "빠른생일" 또는 "빠른년생"이라 합니다. 예를 들어 2001년 1월생은 2000년 3~12월생과 같은 학년입니다.' } },
      { '@type': 'Question', name: '초등학교 입학 연도는 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '한국 학제에서 만 6세가 되는 해의 3월에 초등학교에 입학합니다. 3~12월생은 출생 연도 + 7년, 1~2월생(빠른생일)은 출생 연도 + 6년에 입학합니다. 예를 들어 2000년 5월생은 2007년, 2001년 2월생도 2007년에 입학합니다.' } },
      { '@type': 'Question', name: '12간지 띠는 어떻게 결정되나요?', acceptedAnswer: { '@type': 'Answer', text: '12간지 띠는 출생 연도에 따라 쥐(자), 소(축), 호랑이(인), 토끼(묘), 용(진), 뱀(사), 말(오), 양(미), 원숭이(신), 닭(유), 개(술), 돼지(해) 순서로 12년 주기로 반복됩니다. 양력 기준으로 계산하며, 음력 설 이전 출생은 전년도 띠에 해당할 수 있습니다. 2024년은 용띠, 2025년은 뱀띠, 2026년은 말띠입니다.' } },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <AgeCalculator />
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
            나이 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            나이 계산기는 생년월일을 입력하면 만 나이, 한국 나이(세는 나이), 연 나이를 한 번에 확인할 수 있는 무료 온라인 도구입니다. 2023년 6월부터 한국도 법적으로 만 나이를 기준으로 통일했으며, 이 계산기는 세 가지 나이 방식을 모두 제공합니다. 학년 정보, 같은 학년 또래 찾기, 다음 생일 D-Day, 인생 타임라인까지 확인할 수 있어 더욱 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            나이 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>만 나이 기준 확인:</strong> 법적/의료적 서류에는 만 나이를 사용해야 하며, 생일이 지났는지 여부에 따라 1살 차이가 납니다.</li>
            <li><strong>연 나이 활용:</strong> 병역법, 청소년보호법 등 일부 법령에서는 연 나이(현재 연도 - 출생 연도)를 기준으로 적용합니다.</li>
            <li><strong>학년 정보:</strong> 빠른생일(1~2월생) 여부에 따라 같은 학년 또래가 달라지며, 초등학교 입학 연도와 현재 학년을 확인할 수 있습니다.</li>
            <li><strong>인생 타임라인:</strong> 초등학교 입학부터 국민연금 수급까지 주요 생애 이벤트를 연도별로 한눈에 확인하세요.</li>
            <li><strong>D-Day 계산:</strong> 다음 생일까지 남은 일수와 몇 살이 되는지 확인하여 생일 준비를 미리 하세요.</li>
            <li><strong>띠 확인:</strong> 음력 설 이전에 태어난 경우 전년도 띠에 해당할 수 있으므로 정확한 음력 확인이 필요합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
