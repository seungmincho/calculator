import type { Metadata } from 'next'
import TaxSeason from '@/components/TaxSeason'
import I18nWrapper from '@/components/I18nWrapper'
import { FaqJsonLd } from '@/components/ToolFaq'
import taxSeasonMessages from '../../../messages/generated/ko/ns/taxSeason.json'

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
    url: 'https://toolhub.ai.kr/tax-season/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/tax-season.png',
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
    images: ['https://toolhub.ai.kr/og/tax-season.png'],
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
    url: 'https://toolhub.ai.kr/tax-season/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '종합소득세 신고 대상 안내',
      '종합소득세 세율표 (2023년 귀속부터 현행)',
      '절세 팁 가이드',
      '신고 일정 안내',
      '관련 세금 계산기 링크',
    ],
    inLanguage: 'ko',
    publisher: {
      '@type': 'Organization',
      name: '툴허브',
      url: 'https://toolhub.ai.kr/',
    },
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
      },
      {
        '@type': 'HowToStep',
        name: '신고서 작성 메뉴 선택',
        text: '홈택스 메인 화면에서 [신고/납부] → [세금신고] → [종합소득세]를 선택합니다. 소득 유형(사업소득, 금융소득 등)에 맞는 신고서 유형을 선택합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '소득 및 공제 항목 입력',
        text: '사업소득, 근로소득, 금융소득, 기타소득 등 모든 소득을 입력합니다. 인적공제, 소득공제(연금저축, 보험료, 의료비), 세액공제 항목을 빠짐없이 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '세액 계산 및 확인',
        text: '입력한 내용을 바탕으로 산출세액, 공제세액, 납부세액이 자동 계산됩니다. 미리 계산기로 예상 세액을 확인해두면 오류 방지에 도움이 됩니다.',
      },
      {
        '@type': 'HowToStep',
        name: '신고서 제출 및 납부',
        text: '신고서를 최종 제출하고, 납부세액이 있는 경우 5월 31일까지 납부합니다. 분납한 세액은 납부기한 후 2개월 안(일반 7월 31일)에 냅니다.',
      },
    ],
  }

  // 화면 FAQ(TaxSeason 컴포넌트 faq.q1~q5)와 같은 문항
  const faq = taxSeasonMessages.taxSeason.faq

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <FaqJsonLd items={[faq.q1, faq.q2, faq.q3, faq.q4, faq.q5]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <TaxSeason />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
