import { Metadata } from 'next'
import WorkHoursCalculator from '@/components/WorkHoursCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산 | 툴허브',
  description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당, 연장근로수당을 자동으로 계산하여 실제 받을 급여를 확인하세요.',
  keywords: [
    '근무시간 계산기',
    '알바비 계산기',
    '야근수당 계산',
    '주휴수당 계산',
    '연장근로수당',
    '시급 계산기',
    '근로기준법',
    '아르바이트 급여',
    '파트타임 급여',
    '최저임금',
    '급여 계산',
    '근로시간',
    '휴게시간',
    '야간근로수당',
    '휴일근로수당'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산',
    description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당, 연장근로수당을 자동으로 계산하여 실제 받을 급여를 확인하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/work-hours-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '근무시간 계산기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '근무시간 계산기 | 알바비, 야근수당, 주휴수당 자동 계산',
    description: '근로기준법에 따른 정확한 알바비 계산! 기본급, 야근수당, 주휴수당 자동 계산.',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/work-hours-calculator',
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

export default function WorkHoursCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '근무시간 계산기',
    description: '알바비, 야근수당, 주휴수당을 근로기준법에 따라 정확하게 계산하는 도구',
    url: 'https://toolhub.ai.kr/work-hours-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2026년 최저시급은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 최저임금은 시간당 10,030원입니다. 주 40시간 근무 기준 월 최저임금은 약 2,096,270원(주휴수당 포함)이며, 연봉으로 환산하면 약 25,155,240원입니다. 최저임금은 모든 사업장에 동일하게 적용되며, 이보다 낮은 급여를 지급하면 근로기준법 위반입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주휴수당은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주휴수당은 1주 15시간 이상 근무한 근로자에게 유급 휴일 1일분의 급여를 추가 지급하는 것입니다. 계산법은 (1주 소정근로시간 ÷ 40시간) × 8시간 × 시급입니다. 예를 들어 주 20시간 근무, 시급 10,000원이면 주휴수당은 (20÷40)×8×10,000 = 40,000원입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '야간근로수당과 연장근로수당은 어떻게 다른가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연장근로수당은 법정근로시간(주 40시간)을 초과한 근무에 대해 통상임금의 50%를 가산하여 지급합니다. 야간근로수당은 밤 10시~새벽 6시 사이 근무에 대해 통상임금의 50%를 가산합니다. 야간에 연장근로를 하면 두 가산이 중복 적용되어 통상임금의 100%가 추가됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
          <div className="container mx-auto px-4">
            <WorkHoursCalculator />
          </div>
        </div>
      </I18nWrapper>
    </>
  )
}