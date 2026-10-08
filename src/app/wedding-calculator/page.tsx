import { Metadata } from 'next'
import WeddingCalculator from '@/components/WeddingCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import weddingCalculatorMessages from '../../../messages/generated/ko/ns/weddingCalculator.json'

export const metadata: Metadata = {
  title: '결혼비용 계산기 2026 - 예식비용, 축의금, 양가분담 계산 | 툴허브',
  description: '결혼 총 비용을 항목별로 계획하고 축의금 예상, 양가 분담까지 한번에 계산하세요. 예식장, 스드메, 예물, 예단, 신혼여행, 신혼집 비용을 서울/지방 기준으로 자동 추정합니다.',
  keywords: '결혼비용 계산기, 결혼 예산, 웨딩 비용, 축의금 계산, 양가 분담, 예식장 비용, 스드메 비용, 예물 예단, 신혼여행 비용, 신혼집 비용, 결혼 준비 체크리스트',
  openGraph: {
    title: '결혼비용 계산기 - 예산 계획부터 양가 분담까지 | 툴허브',
    description: '결혼 총 비용 항목별 계획, 축의금 예상, 양가 분담 비율 계산. 서울/지방 참고 추정치.',
    url: 'https://toolhub.ai.kr/wedding-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/wedding-calculator.png', width: 1200, height: 630, alt: '결혼비용 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '결혼비용 계산기 | 툴허브',
    description: '결혼 총 비용 계획, 축의금 예상, 양가 분담 계산',
    images: ['https://toolhub.ai.kr/og/wedding-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/wedding-calculator/',
  },
}

export default function WeddingCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '결혼비용 계산기',
    description: '결혼 총 비용 항목별 계획, 축의금 예상, 양가 분담 계산. 서울/수도권·지방 참고 추정치.',
    url: 'https://toolhub.ai.kr/wedding-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '8개 카테고리 항목별 예산·실제 비용 관리',
      '축의금 vs 식대 본전 계산',
      'D-day 결혼 준비 일정 체크리스트',
      '서울/수도권 vs 지방 참고 추정치',
      '예산 vs 실제 비용 비교',
      '축의금 예상 및 커버율 계산',
      '양가 분담 (항목별/비율/금액)',
      '종합 대시보드 및 차트',
      'PDF 저장 및 결과 복사',
      'localStorage 자동 저장',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={weddingCalculatorMessages.weddingCalculator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <WeddingCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
