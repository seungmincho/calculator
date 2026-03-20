import type { Metadata } from 'next'
import { Suspense } from 'react'
import TaxSeason from '@/components/TaxSeason'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '5월 종합소득세 신고 가이드 | 툴허브',
  description:
    '5월 종합소득세 신고 기간 완벽 가이드. 신고 대상, 세율, 공제 항목, 신고 방법부터 절세 팁까지. 종합소득세·연말정산·프리랜서 세금 계산기를 한 곳에서 이용하세요.',
  keywords:
    '종합소득세, 종합소득세 신고, 5월 종합소득세, 종합소득세 신고 기간, 종합소득세 계산기, 종합소득세 세율, 종합소득세 공제, 프리랜서 세금, 사업소득세, 금융소득종합과세, 부동산 임대소득, 절세 방법, 소득공제, 세액공제, 홈택스 신고, 종합소득세 신고 방법',
  openGraph: {
    title: '5월 종합소득세 신고 가이드 | 툴허브',
    description:
      '5월 종합소득세 신고 기간 완벽 가이드. 신고 대상, 세율, 공제 항목, 신고 방법부터 절세 팁까지.',
    url: 'https://toolhub.ai.kr/tax-season',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '5월 종합소득세 신고 가이드',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '5월 종합소득세 신고 가이드 | 툴허브',
    description:
      '5월 종합소득세 신고 기간 완벽 가이드. 신고 대상, 세율, 공제 항목, 신고 방법부터 절세 팁까지.',
    images: ['/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tax-season/',
  },
}

export default function TaxSeasonPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '5월 종합소득세 신고 가이드',
    description:
      '5월 종합소득세 신고 기간 완벽 가이드. 신고 대상, 세율, 공제 항목, 신고 방법부터 절세 팁까지.',
    url: 'https://toolhub.ai.kr/tax-season',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '종합소득세 신고 대상 안내',
      '2025년 세율표',
      '절세 팁 가이드',
      '신고 일정 안내',
      '관련 세금 계산기 링크',
    ],
    inLanguage: 'ko',
    publisher: {
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr',
    },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '종합소득세 신고 기간은 언제인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '종합소득세 신고 기간은 매년 5월 1일부터 5월 31일까지입니다. 성실신고확인 대상자는 6월 30일까지 신고할 수 있습니다. 기한 내 신고하지 않으면 무신고 가산세(20%)와 납부지연 가산세가 부과됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '종합소득세 신고 대상은 누구인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '프리랜서·사업자(사업소득), 근로소득 외 부업·강의료 등 기타소득이 300만원 초과인 직장인, 금융소득(이자+배당) 합계 2,000만원 초과자, 부동산 임대소득자, 연금소득 1,200만원 초과자가 신고 대상입니다. 근로소득만 있고 연말정산을 마친 직장인은 신고 대상이 아닙니다.',
        },
      },
      {
        '@type': 'Question',
        name: '2025년 종합소득세 세율은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025년 종합소득세 세율은 과세표준 기준으로 1,400만원 이하 6%, 5,000만원 이하 15%, 8,800만원 이하 24%, 1억 5천만원 이하 35%, 3억원 이하 38%, 5억원 이하 40%, 10억원 이하 42%, 10억원 초과 45%의 누진세율이 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '종합소득세를 줄이는 방법은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '소득공제 항목(노란우산공제, 개인연금저축, IRP)을 최대한 활용하고, 사업 관련 경비를 빠짐없이 증빙하세요. 기준경비율과 단순경비율 중 유리한 방식을 선택하고, ISA 계좌를 활용한 금융소득 분리도 효과적입니다. 중소기업 취업자 소득세 감면, 창업 중소기업 세액감면 등 해당 세액감면 항목도 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '프리랜서는 종합소득세를 어떻게 신고하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '프리랜서(인적용역 사업자)는 홈택스(hometax.go.kr)에서 전자신고하거나 세무서를 방문해 신고할 수 있습니다. 단순경비율 적용 가능 여부를 확인하고, 수입금액에서 필요경비를 차감한 사업소득금액에 세율을 적용합니다. 수입금액이 2,400만원 미만이면 단순경비율, 이상이면 기준경비율 또는 장부신고 중 유리한 방법을 선택합니다.',
        },
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '종합소득세 신고하는 방법',
    description: '홈택스를 이용한 종합소득세 전자신고 5단계 가이드',
    totalTime: 'PT30M',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'KRW',
      value: '0',
    },
    step: [
      {
        '@type': 'HowToStep',
        name: '홈택스 접속 및 로그인',
        text: '국세청 홈택스(hometax.go.kr)에 접속하여 공동인증서, 간편인증(카카오·네이버·PASS), 또는 아이디로 로그인합니다.',
        url: 'https://toolhub.ai.kr/tax-season#step1',
      },
      {
        '@type': 'HowToStep',
        name: '신고서 작성 메뉴 선택',
        text: '홈택스 메인 화면에서 [신고/납부] → [세금신고] → [종합소득세]를 선택합니다. 소득 유형(사업소득, 금융소득 등)에 맞는 신고서 유형을 선택합니다.',
        url: 'https://toolhub.ai.kr/tax-season#step2',
      },
      {
        '@type': 'HowToStep',
        name: '소득 및 공제 항목 입력',
        text: '사업소득, 근로소득, 금융소득, 기타소득 등 모든 소득을 입력합니다. 인적공제, 소득공제(연금저축, 보험료, 의료비), 세액공제 항목을 빠짐없이 입력합니다.',
        url: 'https://toolhub.ai.kr/tax-season#step3',
      },
      {
        '@type': 'HowToStep',
        name: '세액 계산 및 확인',
        text: '입력한 내용을 바탕으로 산출세액, 공제세액, 납부세액이 자동 계산됩니다. 미리 계산기로 예상 세액을 확인해두면 오류 방지에 도움이 됩니다.',
        url: 'https://toolhub.ai.kr/tax-season#step4',
      },
      {
        '@type': 'HowToStep',
        name: '신고서 제출 및 납부',
        text: '신고서를 최종 제출하고, 납부세액이 있는 경우 5월 31일까지 납부합니다. 분납을 원할 경우 납부세액의 50%를 6월 30일까지 납부할 수 있습니다.',
        url: 'https://toolhub.ai.kr/tax-season#step5',
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <TaxSeason />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
