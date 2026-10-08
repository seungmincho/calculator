import { Metadata } from 'next'
import CapitalGainsTax from '@/components/CapitalGainsTax'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import capitalGainsTaxMessages from '../../../messages/generated/ko/ns/capitalGainsTax.json'

export const metadata: Metadata = {
  title: '양도소득세 계산기 - 부동산 양도세 자동 계산 | 툴허브',
  description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세(12억), 다주택 중과세율, 지방소득세까지 2026년 기준(5.10~ 다주택 중과 부활)으로 단계별 계산.',
  keywords: '양도소득세 계산기, 양도세 계산, 부동산 양도세, 장기보유특별공제, 1세대1주택 비과세, 다주택 중과세율, 양도차익 계산, 2026 양도소득세, 양도세 계산기, 일시적 2주택',
  openGraph: {
    title: '양도소득세 계산기 | 툴허브',
    description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세, 다주택 중과세율 반영.',
    url: 'https://toolhub.ai.kr/capital-gains-tax/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/capital-gains-tax.png', width: 1200, height: 630, alt: '양도소득세 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '양도소득세 계산기 | 툴허브',
    description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세, 다주택 중과세율 반영.',
    images: ['https://toolhub.ai.kr/og/capital-gains-tax.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/capital-gains-tax/',
  },
}

export default function CapitalGainsTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '양도소득세 계산기',
    description: '부동산 양도소득세를 자동 계산합니다. 장기보유특별공제, 1세대1주택 비과세(12억), 다주택 중과세율, 지방소득세까지 2026년 기준 단계별 계산.',
    url: 'https://toolhub.ai.kr/capital-gains-tax/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '양도차익 자동 계산',
      '장기보유특별공제 (최대 80%)',
      '1세대1주택 비과세 (12억 기준)',
      '다주택자 중과세율 (+20%p / +30%p)',
      '지방소득세 포함 총 납부세액',
      '단계별 계산 내역 표시',
      '실효세율 계산',
      '단기 보유 세율(70%·60%) 및 분양권·비사업용 토지',
      '일시적 2주택 비과세 판정(2026.10.1 개정 반영)',
      '예정신고 기한 자동 계산',
      '더 보유·거주 시 절세 시뮬레이션',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '양도소득세 계산하는 방법',
    description: '취득가액과 양도가액을 입력하면 양도소득세와 지방소득세를 자동 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '매매 정보 입력', text: '취득가액(매입가), 양도가액(매도가), 필요경비를 입력합니다.' },
      { '@type': 'HowToStep', name: '보유 조건 설정', text: '보유기간, 거주기간, 주택 수, 조정대상지역 여부를 설정합니다.' },
      { '@type': 'HowToStep', name: '공제 적용', text: '장기보유특별공제율과 기본공제(250만원)가 자동 적용됩니다.' },
      { '@type': 'HowToStep', name: '세액 확인', text: '양도소득세, 지방소득세, 실효세율을 단계별 계산 내역과 함께 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={capitalGainsTaxMessages.capitalGainsTax.faq.items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <CapitalGainsTax />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
