import { Metadata } from 'next'
import OvulationCalculator from '@/components/OvulationCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '배란일 계산기 - 생리주기 가임기 예측 | 툴허브',
  description: '마지막 생리일과 주기를 입력하면 배란일, 가임기, 다음 생리 예정일을 자동 계산합니다. 6개월 달력, 불규칙 주기 범위, 캘린더(.ics) 저장, 출산예정일 계산기 연계를 제공합니다.',
  keywords: '배란일 계산기, 배란일 계산, 가임기 계산, 생리주기 계산, 배란일 예측, 가임기 예측, 임신 계획',
  openGraph: {
    title: '배란일 계산기 - 가임기 예측 | 툴허브',
    description: '생리주기 기반 배란일·가임기 예측 6개월 달력',
    url: 'https://toolhub.ai.kr/ovulation-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/ovulation-calculator.png', width: 1200, height: 630, alt: '배란일 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '배란일 계산기 | 툴허브',
    description: '생리주기 기반 배란일·가임기 예측',
    images: ['https://toolhub.ai.kr/og/ovulation-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ovulation-calculator/',
  },
}

export default function OvulationCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '배란일 계산기',
    description: '생리주기 기반 배란일·가임기 예측 계산기',
    url: 'https://toolhub.ai.kr/ovulation-calculator',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '배란일 자동 계산',
      '가임기·임신 가능성 높은 날 표시',
      '6개월 달력',
      '생리 기록으로 평균 주기 자동 계산',
      '불규칙 주기 가임 범위',
      '황체기 조정',
      '.ics 캘린더 내보내기',
      '출산예정일 계산기 연계',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '배란일은 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '배란일은 일반적으로 다음 생리 시작일로부터 14일 전입니다. 생리주기가 28일인 경우 생리 시작일로부터 약 14일 후, 35일 주기라면 약 21일째에 배란이 일어납니다.',
        },
      },
      {
        '@type': 'Question',
        name: '가임기는 얼마나 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '가임기는 배란일 전 5일부터 배란일 후 1일까지 약 7일간이며, 임신 가능성이 가장 높은 날은 배란 2일 전~배란일입니다. 정자는 체내에서 최대 5일, 난자는 배란 후 12~24시간 생존합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '배란일 계산기로 피임할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '아니요. 달력으로 계산한 배란일은 추정치이고 실제 배란일은 주기마다 달라집니다. 주기 기반 방법은 일반적인 사용 시 연간 실패율이 최대 23%에 이르므로 피임 목적으로 쓰면 안 됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <OvulationCalculator />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
