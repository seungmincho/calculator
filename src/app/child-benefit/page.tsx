import { Metadata } from 'next'
import ChildBenefitCalculator from '@/components/ChildBenefitCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '부모급여·아동수당 계산기 - 자녀 수당 한번에 확인 | 툴허브',
  description: '2026년 기준 부모급여(만 0세 100만원, 만 1세 50만원), 아동수당(월 10만원), 양육수당, 첫만남이용권(첫째 200만·둘째부터 300만원)까지 자녀 수당을 한번에 계산하세요. 어린이집 이용 여부, 자녀 수에 따른 월 수령액 자동 계산.',
  keywords: '부모급여, 아동수당, 양육수당, 첫만남이용권, 육아수당, 자녀수당, 부모급여 계산기, 아동수당 신청, 보육료, 육아지원금',
  openGraph: {
    title: '부모급여·아동수당 계산기 | 툴허브',
    description: '2026년 부모급여·아동수당·양육수당·첫만남이용권 월 수령액 자동 계산',
    url: 'https://toolhub.ai.kr/child-benefit',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/child-benefit.png', width: 1200, height: 630, alt: '부모급여·아동수당 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '부모급여·아동수당 계산기',
    description: '2026년 부모급여·아동수당·양육수당 월 수령액 자동 계산',
    images: ['https://toolhub.ai.kr/og/child-benefit.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/child-benefit',
  },
}

export default function ChildBenefitPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '부모급여·아동수당 계산기',
    description: '2026년 기준 부모급여, 아동수당, 양육수당, 첫만남이용권을 한번에 계산하는 무료 계산기',
    url: 'https://toolhub.ai.kr/child-benefit',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '부모급여 계산 (만 0세 100만원, 만 1세 50만원)',
      '아동수당 계산 (2026년 만 0~8세 월 10만원, 2030년까지 13세 미만으로 확대)',
      '양육수당 계산 (어린이집 미이용 시)',
      '첫만남이용권(첫째 200만원 기준) 포함',
      '어린이집 이용 여부에 따른 차액 계산',
      '다자녀 합산 월 수령액 계산',
      '출생~만 12세 누적 수령액 시뮬레이션 (아동수당 확대 일정 반영)',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '부모급여·아동수당 계산하는 방법',
    description: '자녀의 생년월일과 어린이집 이용 여부를 입력하면 월 수령액을 자동으로 계산합니다.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: '자녀 정보 입력',
        text: '자녀 추가 버튼을 눌러 자녀의 생년월일을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: '어린이집 이용 여부 선택',
        text: '어린이집 이용 여부를 선택합니다. 이용 시 보육료와의 차액만 현금 지급됩니다.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: '계산하기',
        text: '계산하기 버튼을 클릭하면 부모급여, 아동수당, 양육수당별 월 수령액과 합계가 표시됩니다.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: '결과 확인',
        text: '자녀별 상세 내역과 연령별 수령액 타임라인 차트로 출생부터 만 12세까지(아동수당 연령 확대 일정 반영) 총 수령액을 확인합니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '부모급여와 아동수당은 중복으로 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 부모급여와 아동수당은 중복 수령 가능합니다. 만 0세는 부모급여 100만원 + 아동수당 10만원 = 월 최대 110만원을 받을 수 있습니다. 단, 어린이집 이용 시 부모급여는 보육료와의 차액만 현금으로 지급됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '어린이집을 이용하면 부모급여를 못 받나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '어린이집 이용 시 보육료 바우처로 대체 지원됩니다. 2026년 기준 만 0세는 부모급여 100만원에서 0세반 보육료 58.4만원을 뺀 차액 41.6만원을 현금으로 받습니다. 만 1세는 1세반 보육료(51.5만원)가 부모급여(50만원)보다 많아 현금으로 받는 차액이 없습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '첫만남이용권은 어떻게 신청하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '첫만남이용권은 출생신고 후 행정복지센터 방문 또는 정부24(gov.kr), 복지로(bokjiro.go.kr)를 통해 온라인으로 신청할 수 있고, 출생신고 때 행복출산 원스톱 서비스로 함께 신청해도 됩니다. 첫째 200만원, 둘째부터 300만원(2024년 이후 출생아)이 국민행복카드 바우처로 지급되며 출생일로부터 2년 안에 사용해야 합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ChildBenefitCalculator />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
