import { Metadata } from 'next'
import { Suspense } from 'react'
import YouthRentSubsidyCalculator from '@/components/YouthRentSubsidyCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '청년월세지원 자격 계산기 - 월 20만원 지원 확인 | 툴허브',
  description: '2026년 청년월세 한시 특별지원 자격을 확인하세요. 만 19~34세 무주택 청년 대상, 월 최대 20만원(연 240만원) 지원. 중위소득 60% 기준, 재산 1.22억 이하 조건을 자동 판정합니다.',
  keywords: '청년월세, 월세지원, 청년월세 한시 특별지원, 월세보조금, 청년주거, 복지로, 청년월세지원 자격, 월세 20만원, 중위소득 60%',
  openGraph: {
    title: '청년월세지원 자격 계산기 - 월 20만원 지원 확인 | 툴허브',
    description: '2026년 청년월세 한시 특별지원 자격과 예상 지원금을 확인하세요. 7가지 조건 자동 판정.',
    url: 'https://toolhub.ai.kr/youth-rent-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '청년월세지원 자격 계산기',
    description: '월 최대 20만원, 12개월 지원. 자격 여부를 바로 확인하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/youth-rent-subsidy',
  },
}

export default function YouthRentSubsidyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '청년월세지원 자격 계산기',
    description: '2026년 청년월세 한시 특별지원 자격 판정 및 예상 지원금 계산기',
    url: 'https://toolhub.ai.kr/youth-rent-subsidy',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '청년월세 한시 특별지원 자격 7가지 조건 자동 판정',
      '2026년 중위소득 기준 적용',
      '예상 월 지원금 및 연간 총액 계산',
      '원가구(부모) 소득 기준 판정',
      'URL 공유로 입력값 재현',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '청년월세지원 자격 계산기 사용 방법',
    description: '청년월세 한시 특별지원 자격 여부와 예상 지원금을 확인하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '기본 정보 입력',
        text: '만 나이, 독립 거주 여부, 주택 소유 여부를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '소득 및 재산 입력',
        text: '본인 월 소득, 원가구(부모) 월 소득, 가구원 수, 총 재산을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '주거 정보 입력',
        text: '현재 월세, 보증금, 주거 유형을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '자격 판정 결과 확인',
        text: '자격 확인 버튼을 누르면 7가지 조건별 충족 여부와 예상 지원금이 표시됩니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '청년월세 한시 특별지원 자격 요건은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '만 19~34세 독립거주 무주택 청년으로, 본인 소득이 중위소득 60% 이하(1인 가구 약 143.5만원), 원가구(부모) 소득이 중위소득 100% 이하, 본인 재산 1.22억원 이하, 보증금 5,000만원 이하 및 월세 70만원 이하여야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '청년월세지원금은 얼마나 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '실제 월세와 20만원 중 적은 금액을 월 최대 20만원까지, 최대 12개월(총 240만원) 동안 지원받을 수 있습니다. 예를 들어 월세가 15만원이면 15만원, 월세가 50만원이면 20만원이 지급됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '청년월세지원 신청은 어디서 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주민센터 방문, 복지로(bokjiro.go.kr) 온라인, 또는 마이홈 포털(myhome.go.kr)에서 신청할 수 있습니다. 필요 서류는 신분증, 임대차계약서, 소득증빙서류, 주민등록등본, 가족관계증명서, 통장사본입니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <YouthRentSubsidyCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
