import { Metadata } from 'next'
import GovernmentSubsidyCalculator from '@/components/GovernmentSubsidyCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '정부지원금 계산기 - 2026년 12개 사업 간이 확인 | 툴허브',
  description: '2026년 중위소득으로 12개 정부지원사업의 간이 기준을 확인하세요. 기초생활보장 소득인정액과 지역별 주거급여를 조건부 계산하고, 근로·자녀장려금·연금·청년 지원의 추가 확인 사항과 공식 신청 안내를 제공합니다.',
  keywords: '정부지원금, 복지혜택, 기초생활보장, 근로장려금, 자녀장려금, 기초연금, 청년월세, 중위소득, 한부모양육비, 장애인연금, 긴급복지지원, 청년내일저축계좌',
  openGraph: {
    title: '정부지원금 계산기 - 2026년 간이 기준 확인 | 툴허브',
    description: '2026년 12개 사업 기준·조건부 계산·공식 안내',
    url: 'https://toolhub.ai.kr/government-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/government-subsidy.png', width: 1200, height: 630, alt: '정부지원금 자격 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '정부지원금 자격 계산기',
    description: '2026년 12개 지원사업의 간이 기준과 추가 확인 사항을 확인하세요',
    images: ['https://toolhub.ai.kr/og/government-subsidy.png'],
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
    description: '2026년 12개 지원사업의 일부 기준과 추가 심사 조건을 확인하는 간이 도구',
    url: 'https://toolhub.ai.kr/government-subsidy',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '12개 지원사업 간이 기준 확인 및 공식 안내',
      '2026년 중위소득 기준 자동 적용',
      '소득인정액 입력 시 생계·지역별 주거급여 조건부 계산',
      '중위소득 대비 시각화',
      'URL 공유로 입력값 재현',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '정부지원금 자격 계산기 사용 방법',
    description: '가구 정보를 입력하여 12개 지원사업의 간이 기준과 추가 확인 사항을 살펴보는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '가구 기본 정보 입력',
        text: '가구원 수, 월 가구소득, 재산, 나이를 입력합니다. 기초생활보장 소득인정액을 알고 있다면 소득 입력 기준을 변경합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '주거 및 특수 조건 선택',
        text: '거주 지역, 주거 형태와 계약 보증금·월차임을 입력하고 해당되는 가구 조건을 선택합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '간이 기준 확인',
        text: '지원 기준 확인하기를 누르면 입력 기준 충족·추가 확인 필요·입력 기준과 다름으로 표시됩니다. 공식 선정 결과는 아닙니다.',
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
          text: '2026년 기준 중위소득은 월 1인 2,564,238원, 2인 4,199,292원, 3인 5,359,036원, 4인 6,494,738원, 5인 7,556,719원, 6인 8,555,952원입니다. 생계·의료·주거·교육급여는 각각 소득인정액 중위소득 32%·40%·48%·50%와 추가 자격 요건을 확인합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '근로장려금(EITC) 자격 요건은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 정기신청은 2025년 총소득이 단독가구 2,200만원, 홑벌이 3,200만원, 맞벌이 4,400만원 미만이고 기준일 재산이 2.4억원 미만인 경우 등 요건을 확인합니다. 연 최대 단독 165만원·홑벌이 285만원·맞벌이 330만원이며 재산 1.7억원 이상은 산정액의 50%만 지급합니다. 가구 유형·근로소득·총급여액·기준일 등을 별도로 확인해야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '여러 정부지원금을 동시에 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사업마다 중복 지원·소득 반영·차감 규칙이 다릅니다. 현금, 장려금, 교육 바우처, 의료지원, 저축 적립금을 단순 합산하면 실제 수령액으로 오해할 수 있어 이 도구는 총 지원금을 표시하지 않습니다. 각 사업의 공식 안내에서 개별 확인해야 합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <GovernmentSubsidyCalculator />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
