import { Metadata } from 'next'
import BonusCalculator from '@/components/BonusCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import bonusMessages from '../../../messages/generated/ko/ns/bonusCalculator.json'
// RelatedTools auto-detects current path from URL

export const metadata: Metadata = {
  title: '성과급 계산기 - 인센티브 세금·세후 실수령액 | 툴허브',
  description: '성과급·인센티브 세후 실수령액을 정확하게 계산합니다. PS, PI, 경영성과급 비율별 시뮬레이션, 4대보험·소득세 공제 분석, 과세구간 변동 확인, 절세 팁까지.',
  keywords: '성과급 계산기, 인센티브 계산, PS 실수령액, PI 계산, 성과급 세금, 성과급 세후, 경영성과급, 보너스 계산기, 성과급 실수령액',
  openGraph: {
    title: '성과급 계산기 - 세후 실수령액 계산 | 툴허브',
    description: '성과급·인센티브 세후 실수령액 계산, 비율별 시뮬레이션, 세금 분석까지 한번에',
    url: 'https://toolhub.ai.kr/bonus-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/bonus-calculator.png', width: 1200, height: 630, alt: '성과급 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '성과급 계산기 - 세후 실수령액',
    description: '성과급 세후 실수령액, 비율별 비교, 과세구간 분석',
    images: ['https://toolhub.ai.kr/og/bonus-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/bonus-calculator',
  },
}

export default function BonusCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '성과급 계산기',
      description: '성과급·인센티브 세후 실수령액 계산, PS/PI/경영성과급 비율별 시뮬레이션, 세금 분석',
      url: 'https://toolhub.ai.kr/bonus-calculator/',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '성과급 세후 실수령액 계산',
        '비율별 시뮬레이션 비교',
        '4대보험·소득세 공제 분석',
        '과세구간 변동 분석',
        '절세 팁 가이드',
        '결과 이미지·링크 공유',
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '성과급 실수령액 계산하는 방법',
      step: [
        { '@type': 'HowToStep', name: '연봉 입력', text: '세전 연봉을 입력합니다' },
        { '@type': 'HowToStep', name: '성과급 설정', text: '성과급 유형과 비율(또는 금액)을 입력합니다' },
        { '@type': 'HowToStep', name: '부양가족 입력', text: '부양가족 수와 자녀 수를 입력합니다' },
        { '@type': 'HowToStep', name: '결과 확인', text: '세후 실수령액, 시뮬레이션, 세금 분석을 확인합니다' }
      ]
    }
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <BonusCalculator />
              {/* 가이드(접힘) 안 FAQ와 같은 문구 — 접힌 가이드는 정적 HTML에 없어서 여기서 보이게 출력 */}
              <ToolFaq items={bonusMessages.bonusCalculator.guide.faq.items} />
              <RelatedTools />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
