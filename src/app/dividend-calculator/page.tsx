import { Metadata } from 'next'
import DividendCalculator from '@/components/DividendCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/dividendCalculator.json'

export const metadata: Metadata = {
  title: '배당금 계산기 - 세후 월배당·배당소득세 | 툴허브',
  description: '투자금과 배당수익률로 세후 배당금(15.4%)과 월배당을 계산하세요. 월 배당 목표 투자금 역산, ISA·연금계좌 비교, 금융소득종합과세 2천만원·건보료 1천만원 기준, 2026년 고배당기업 분리과세, 미국 주식 배당 세금, 배당 재투자 시뮬레이션까지 한 번에.',
  keywords: '배당금 계산기, 월배당 계산기, 배당소득세 계산, 배당 재투자 계산기, 배당금 세금, 배당소득세 15.4%, 금융소득종합과세, 고배당 분리과세, 고배당기업 배당소득 분리과세, ISA 배당, 미국 주식 배당 세금, 배당수익률 계산',
  openGraph: {
    title: '배당금 계산기 - 세후 월배당·배당소득세 | 툴허브',
    description: '세후 배당금·월배당, 목표 투자금, ISA·연금계좌 비교, 금융소득종합과세와 2026년 고배당 분리과세까지.',
    url: 'https://toolhub.ai.kr/dividend-calculator/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dividend-calculator.png', width: 1200, height: 630, alt: '배당금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '배당금 계산기 | 툴허브', description: '세후 월배당·배당소득세·고배당 분리과세 계산', images: ['https://toolhub.ai.kr/og/dividend-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/dividend-calculator/' },
}

const faqs = messages.dividendCalculator.guide.faq.items

export default function DividendCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '배당금 계산기',
    description: '투자금과 배당수익률로 세후 배당금, 월배당 목표 투자금, 계좌별 세금, 금융소득종합과세 기준, 고배당기업 분리과세, 배당 재투자 결과를 계산하는 도구.',
    url: 'https://toolhub.ai.kr/dividend-calculator/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '세후 배당금(배당소득세 14% + 지방소득세 1.4%)', '월·분기·반기·연 지급 주기별 1회 배당금', '월 배당 목표 투자금 역산',
      '일반 계좌·ISA·연금계좌 세후 비교', '금융소득종합과세 2천만원·건강보험료 1천만원 기준 확인',
      '2026년 고배당기업 배당 분리과세 세율', '해외주식 외국 원천징수 반영', '배당 재투자 5·10·20년 시뮬레이션', '결과 공유 링크·이미지',
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DividendCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
