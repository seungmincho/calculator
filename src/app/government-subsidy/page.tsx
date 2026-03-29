import { Metadata } from 'next'
import { Suspense } from 'react'
import GovernmentSubsidyCalculator from '@/components/GovernmentSubsidyCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '정부지원금 자격 계산기 - 12개 지원금 한번에 확인 | 툴허브',
  description: '2026년 기준 12개 정부지원금 수급 자격을 한번에 확인하세요. 기초생활보장(생계·의료·주거·교육급여), 근로장려금, 자녀장려금, 기초연금, 청년월세지원, 한부모양육비, 청년내일저축계좌, 긴급복지, 장애인연금. 중위소득 대비 자동 판정.',
  keywords: '정부지원금, 복지혜택, 기초생활보장, 근로장려금, 자녀장려금, 기초연금, 청년월세, 중위소득, 한부모양육비, 장애인연금, 긴급복지지원, 청년내일저축계좌',
  openGraph: {
    title: '정부지원금 자격 계산기 - 12개 지원금 한번에 확인 | 툴허브',
    description: '2026년 중위소득 기준 12개 정부지원금 수급 자격 판정, 예상 금액 계산',
    url: 'https://toolhub.ai.kr/government-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '정부지원금 자격 계산기',
    description: '12개 정부지원금 수급 자격을 한번에 확인하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/government-subsidy',
  },
}

export default function GovernmentSubsidyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '정부지원금 자격 계산기',
    description: '2026년 기준 12개 정부지원금 수급 자격을 한번에 확인하고 예상 수령액을 계산하는 도구',
    url: 'https://toolhub.ai.kr/government-subsidy',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '12개 정부지원금 수급 자격 일괄 판정',
      '2026년 중위소득 기준 자동 적용',
      '프로그램별 예상 수령액 계산',
      '중위소득 대비 시각화',
      'URL 공유로 입력값 재현',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '정부지원금 자격 계산기 사용 방법',
    description: '가구 정보를 입력하여 12개 정부지원금 수급 자격과 예상 금액을 확인하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '가구 기본 정보 입력',
        text: '가구원 수, 월 가구소득(만원), 총 재산(만원), 신청자 나이를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '주거 및 특수 조건 선택',
        text: '주거 형태(전세/월세/자가)를 선택하고, 해당되는 경우 미성년 자녀, 한부모, 장애인, 65세 이상 여부를 체크합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '자격 판정 결과 확인',
        text: '계산하기 버튼을 누르면 12개 정부지원금별 수급 가능 여부와 예상 금액이 표시됩니다.',
      },
      {
        '@type': 'HowToStep',
        name: '상세 조건 및 신청 방법 확인',
        text: '각 프로그램 카드를 펼치면 세부 자격 조건, 지원 금액 산출 근거, 신청 방법을 확인할 수 있습니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2026년 중위소득은 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 4인 가구 기준 중위소득은 월 6,097,773원입니다. 1인 2,392,013원, 2인 3,932,658원, 3인 5,025,353원, 5인 7,108,192원, 6인 8,064,805원입니다. 기초생활보장 생계급여는 중위소득 32%, 의료급여 40%, 주거급여 48%, 교육급여 50% 이하 가구가 대상입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '근로장려금(EITC) 자격 요건은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '근로장려금은 단독가구 연소득 2,200만원, 홑벌이 3,200만원, 맞벌이 3,800만원 이하인 근로자·사업자가 대상입니다. 최대 지급액은 단독 165만원, 홑벌이 285만원, 맞벌이 330만원이며, 재산 합계 2.4억원 미만이어야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '여러 정부지원금을 동시에 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 자격 요건이 충족되면 여러 지원금을 동시에 받을 수 있습니다. 예를 들어 기초생활보장 수급자가 근로장려금과 자녀장려금을 동시에 수령하거나, 청년월세지원과 청년내일저축계좌에 동시 가입할 수 있습니다. 다만 일부 프로그램은 중복 수급이 제한될 수 있으므로 복지로(bokjiro.go.kr)에서 개별 확인이 필요합니다.',
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
              <GovernmentSubsidyCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
