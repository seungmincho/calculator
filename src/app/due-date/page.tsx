import { Metadata } from 'next'
import { Suspense } from 'react'
import DueDateCalculator from '@/components/DueDateCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '출산 예정일 계산기 - 임신 주수, 예정일 계산 | 툴허브',
  description: '출산 예정일 계산기 - 마지막 생리일(LMP) 또는 배란일 기준으로 출산 예정일과 현재 임신 주수를 계산합니다. 삼분기별 주요 일정도 확인하세요.',
  keywords: '출산 예정일 계산, 임신 주수 계산, 출산일 계산기, due date calculator, 임신 계산기',
  openGraph: { title: '출산 예정일 계산기 | 툴허브', description: '출산 예정일 및 임신 주수 계산', url: 'https://toolhub.ai.kr/due-date', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '출산 예정일 계산기 | 툴허브', description: '출산 예정일 및 임신 주수 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/due-date' },
}

export default function DueDatePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '출산 예정일 계산기', description: '출산 예정일 및 임신 주수 계산', url: 'https://toolhub.ai.kr/due-date', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['출산 예정일', '임신 주수', '삼분기 정보', '주요 일정'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '출산 예정일은 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '출산 예정일은 마지막 생리 시작일(LMP)에 280일(40주)을 더하여 계산합니다. 네겔레 법칙으로는 LMP 월에서 3을 빼고(또는 9를 더하고) 일에 7을 더합니다. 예를 들어 LMP가 3월 1일이면 예정일은 12월 8일입니다. 배란일 기준 계산 시에는 배란일에 266일(38주)을 더합니다. 실제 출산은 예정일 ±2주 범위에서 이루어집니다.' } },
      { '@type': 'Question', name: '임신 삼분기별 특징은 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '1분기(1~12주): 태아 주요 장기 형성, 입덧, 피로감. 2분기(13~27주): 태동 시작, 안정기, 성별 확인 가능. 3분기(28~40주): 태아 급성장, 출산 준비, 배가 많이 불러옴. 임신 초기 엽산 섭취가 중요하며, 정기 산전검사(초음파, 기형아검사, 임신성 당뇨검사 등)를 빠짐없이 받으세요.' } },
      { '@type': 'Question', name: '예정일보다 빨리 또는 늦게 출산할 수 있나요?', acceptedAnswer: { '@type': 'Answer', text: '네, 예정일은 추정치이며 정확히 예정일에 출산하는 비율은 약 5%에 불과합니다. 초산은 예정일보다 늦어지는 경향이 있고, 경산은 빨라지는 경향이 있습니다. 37~41주 사이 출산은 정상(만삭)이며, 37주 미만은 조산, 42주 이상은 과숙 임신으로 분류됩니다. 유도분만은 보통 예정일 1~2주 경과 후 고려합니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><DueDateCalculator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
