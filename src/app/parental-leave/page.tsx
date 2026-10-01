import { Metadata } from 'next'
import ParentalLeaveCalculator from '@/components/ParentalLeaveCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '육아휴직급여 계산기 2026 - 6+6 부모육아휴직제 반영 | 툴허브',
  description: '2026년 육아휴직급여(1~3개월 250만·4~6개월 200만·7개월~ 160만원)를 월별로 계산합니다. 6+6 부모육아휴직제, 한부모 특례, 엄마 먼저·아빠 먼저·동시 순서 비교, 육아기 근로시간 단축 급여(2026 상한 250만원) 비교까지.',
  keywords: '육아휴직급여 계산기, 육아휴직 급여, 6+6 부모육아휴직제, 육아휴직 계산, 육아휴직 상한액, 육아휴직 기간, 부부 육아휴직, 육아기 근로시간 단축, 사후지급금 폐지, 2026 육아휴직, 육아휴직 순서, 한부모 육아휴직급여',
  openGraph: {
    title: '육아휴직급여 계산기 2026 - 6+6 부모육아휴직제 | 툴허브',
    description: '2026년 육아휴직급여 자동 계산. 6+6 부모육아휴직제, 월별 급여, 부부 시뮬레이션 지원.',
    url: 'https://toolhub.ai.kr/parental-leave/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/parental-leave.png', width: 1200, height: 630, alt: '육아휴직급여 계산기 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '육아휴직급여 계산기 2026 | 툴허브',
    description: '2026년 6+6 부모육아휴직제 반영 육아휴직급여 계산',
    images: ['https://toolhub.ai.kr/og/parental-leave.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/parental-leave/',
  },
}

export default function ParentalLeavePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '육아휴직급여 계산기',
    description: '2026년 육아휴직급여를 자동 계산합니다. 6+6 부모육아휴직제, 한부모 특례, 월별 지급표, 순서 비교, 근로시간 단축 비교 지원.',
    url: 'https://toolhub.ai.kr/parental-leave/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2026년 기준 상한액 반영(한부모 300만원 포함)',
      '6+6 부모육아휴직제 자동 계산',
      '월별 급여 상세 테이블',
      '달력 기준 월별 지급표(부부 합산)',
      '엄마 먼저·아빠 먼저·동시 순서 비교',
      '육아휴직 vs 근로시간 단축 비교',
      '결과 이미지 공유',
      '육아기 근로시간 단축 급여 계산',
      '사후지급금 폐지 안내',
      '소득대체율 분석',
      'URL 공유 기능',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2026년 육아휴직급여는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 기준 육아휴직급여는 1~3개월 통상임금 100%(상한 250만원), 4~6개월 100%(상한 200만원), 7개월 이후 80%(상한 160만원)입니다. 하한액은 월 70만원입니다. 2025년 개편 기준이 2026년에도 유지됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '6+6 부모육아휴직제란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '자녀 생후 18개월 안에 부모가 모두 육아휴직을 쓰면, 두 사람이 공통으로 쓴 개월수(최대 6개월)만큼 각자 통상임금 100%를 받고 상한이 250·250·300·350·400·450만원으로 오릅니다. 휴직 기간이 겹치지 않아도 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '육아휴직 사후지급금이 폐지되었나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 2025년부터 사후지급금(25%) 제도가 폐지되어 육아휴직 기간 중 급여 전액을 수령할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '육아기 근로시간 단축 급여는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 1월부터 매주 첫 10시간 단축분은 통상임금 100%(기준 상한 월 250만원)×10÷단축 전 근로시간, 나머지는 통상임금 80%(기준 상한 160만원)×나머지 시간÷단축 전 근로시간입니다. 주 40→30시간이면 최대 월 62만5천원에 회사 임금이 더해집니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '육아휴직급여 계산하는 방법',
    description: '통상임금과 휴직기간을 입력하면 월별 육아휴직급여를 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '통상임금 입력', text: '월 통상임금(세전)을 입력합니다. 급여명세서에서 확인할 수 있습니다.' },
      { '@type': 'HowToStep', name: '휴직 조건 설정', text: '누가 쓰는지(부부/한 명/한부모), 시작일, 기간, 사용 순서, 자녀 생년월일을 입력합니다.' },
      { '@type': 'HowToStep', name: '급여 확인', text: '월별 급여 상세(상한액 적용), 총 수령액, 소득대체율을 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ParentalLeaveCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
