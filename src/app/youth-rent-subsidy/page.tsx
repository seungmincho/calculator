import { Metadata } from 'next'
import YouthRentSubsidyCalculator from '@/components/YouthRentSubsidyCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '청년월세지원 자격 계산기 - 월 20만원 지원 확인 | 툴허브',
  description: '2026년 국가사업 청년월세지원의 간이 요건과 예상 지원금을 확인하세요. 월 최대 20만원, 생애 누적 최대 24회에서 기수혜 회차를 차감합니다. 신규 접수 종료와 서울시 자체사업(12개월)의 차이도 안내합니다.',
  keywords: '청년월세, 월세지원, 월세지원금, 월세지원금 계산기, 청년월세 한시 특별지원, 월세보조금, 청년주거, 복지로, 청년월세지원 자격, 월세 20만원, 중위소득 60%',
  openGraph: {
    title: '청년월세지원 자격 계산기 - 월 20만원 지원 확인 | 툴허브',
    description: '국가사업 생애 누적 최대 24회·480만원. 기수혜 차감과 2026년 신규 신청 종료를 확인하세요.',
    url: 'https://toolhub.ai.kr/youth-rent-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/youth-rent-subsidy.png', width: 1200, height: 630, alt: '청년월세지원 자격 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청년월세지원 자격 계산기',
    description: '국가사업 월 최대 20만원, 생애 누적 최대 24회. 기수혜 차감·2026년 접수 종료 안내.',
    images: ['https://toolhub.ai.kr/og/youth-rent-subsidy.png'],
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
    description: '2026년 국가사업 청년월세지원 간이 요건 및 기수혜 회차 차감 예상액 계산기',
    url: 'https://toolhub.ai.kr/youth-rent-subsidy',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국가사업 청년월세지원 간이 요건 확인',
      '2026년 중위소득 기준 적용',
      '생애 누적 최대 24회에서 기수혜 회차를 차감한 예상 총액 계산',
      '2026년 신규 신청 종료와 서울시 자체사업 구분 안내',
      '원가구(부모) 소득 기준 판정',
      'URL 공유로 입력값 재현',
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '청년월세지원 자격 계산기 사용 방법',
    description: '국가사업 청년월세지원의 간이 요건과 잔여 지급 횟수 기준 예상액을 확인하는 방법입니다.',
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
        text: '현재 월세, 보증금, 주거 유형과 국가사업 기수혜 회차를 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '자격 판정 결과 확인',
        text: '자격 확인 버튼을 누르면 간이 요건과 생애 누적 24회 중 잔여 횟수 기준 예상 지원금이 표시됩니다. 2026년 신규 접수 종료 안내를 함께 확인합니다.',
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
          text: '국가사업은 독립거주 무주택 청년의 소득·재산 등을 심사합니다. 2026년 신청 가능 출생연도는 1991~2007년이며 청년가구 소득은 중위소득 60% 이하, 원가구 소득은 100% 이하입니다. 30세 이상 등 원가구 소득 예외와 재산·가구 구성 등 세부 요건은 공식 안내에서 확인하세요. 이 도구는 간이 확인이며 실제 심사를 대신하지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '청년월세지원금은 얼마나 받을 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '국가사업은 실제 납부 월세에서 월 최대 20만원을 생애 누적 최대 24회 지원합니다. 미수혜자는 최대 480만원, 12회 기수혜자는 잔여 최대 12회입니다. 1·2차에서 지급받은 회차를 차감합니다. 서울시 자체사업의 최대 12개월 기준과 다릅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '청년월세지원 신청은 어디서 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 국가사업 신규 신청은 3월 30일 09시부터 5월 29일 16시까지였으며 종료됐습니다. 공식 접수기간에 복지로 온라인 또는 주소지 관할 주민센터에서 신청합니다. 2차 수혜자는 2차 사업 종료 이후 신청 가능하며, 다음 접수기간은 공식 공고를 확인하세요.',
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
              <YouthRentSubsidyCalculator />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
