import { Metadata } from 'next'
import DsrCalculator from '@/components/DsrCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import dsrCalcMessages from '../../../messages/generated/ko/ns/dsrCalc.json'

export const metadata: Metadata = {
  title: 'DSR 계산기 2026 - 대출한도 역산, 스트레스 DSR | 툴허브',
  description: '2026년 기준 DSR(총부채원리금상환비율)을 자동 계산합니다. 주담대·신용대출·마이너스통장·전세대출 원리금 산정, 스트레스 DSR 3단계·10.15 대책 반영, 대출한도 역산까지 한눈에 확인하세요.',
  keywords: 'DSR 계산기, 총부채원리금상환비율, 대출한도 계산, 스트레스 DSR, DSR 40%, 대출 가능액, 주택담보대출 한도, 신용대출 DSR',
  openGraph: {
    title: 'DSR 계산기 2026 | 툴허브',
    description: 'DSR 계산 + 대출한도 역산 + 스트레스 DSR 반영',
    url: 'https://toolhub.ai.kr/dsr-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dsr-calculator.png', width: 1200, height: 630, alt: 'DSR 계산기 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DSR 계산기 2026 | 툴허브',
    description: 'DSR 계산 + 대출한도 역산',
    images: ['https://toolhub.ai.kr/og/dsr-calculator.png'],
  },
  alternates: { canonical: 'https://toolhub.ai.kr/dsr-calculator/' },
}

export default function DsrCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'DSR 계산기',
    description: '2026년 기준 DSR 계산, 대출한도 역산, 스트레스 DSR 3단계 반영.',
    url: 'https://toolhub.ai.kr/dsr-calculator/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['추가 대출 한도 역산', '스트레스 DSR 전·후 비교(수도권 3.0%·지방 0.75%)', '은행 vs 2금융권 비교', '금리 유형별(변동·혼합·주기·고정) 한도', '연소득별 한도 그래프', '보유 대출 여러 건 합산(마이너스통장·전세대출 포함)', 'DSR 게이지 시각화', '결과 공유 링크'],
  }
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'DSR 계산하는 방법',
    description: '연소득과 대출 정보를 입력하면 DSR 비율과 대출 가능 한도를 계산합니다.',
    step: [
      { '@type': 'HowToStep', name: '연소득 입력', text: '연간 총소득(세전)을 입력합니다.' },
      { '@type': 'HowToStep', name: '대출 정보 입력', text: '보유 대출의 종류·잔액(마이너스통장은 한도)·금리·남은 기간과 새로 받을 대출의 금리·기간·상환방식·지역을 입력합니다.' },
      { '@type': 'HowToStep', name: 'DSR 결과 확인', text: 'DSR 비율(%), 규제 한도(은행 40%/2금융권 50%) 대비 여유분, 대출 가능 한도 역산 결과를 확인합니다.' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={dsrCalcMessages.dsrCalc.faq.items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper><DsrCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
    </>
  )
}
