import { Metadata } from 'next'
import NationalPensionCalculator from '@/components/NationalPensionCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '국민연금 수령액 계산기 - 예상 연금 확인 | 툴허브',
  description: '국민연금 예상 수령액을 계산하세요. 가입 기간과 평균 소득을 입력하면 노령연금, 조기수령, 연기수령 금액을 비교할 수 있습니다. 2026년 기준(연금개혁 소득대체율 43%·A값 반영).',
  keywords: '국민연금 계산, 국민연금 수령액, 노령연금, 조기수령, 연기수령, 국민연금 예상액, 연금 계산기',
  openGraph: {
    title: '국민연금 수령액 계산기 | 툴허브',
    description: '국민연금 예상 수령액 계산, 조기/정상/연기 수령 비교',
    url: 'https://toolhub.ai.kr/national-pension',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/national-pension.png', width: 1200, height: 630, alt: '국민연금 수령액 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '국민연금 수령액 계산기',
    description: '국민연금 예상 수령액 계산, 조기/정상/연기 수령 비교',
    images: ['https://toolhub.ai.kr/og/national-pension.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/national-pension',
  },
}

export default function NationalPensionPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '국민연금 수령액 계산기',
    description: '가입 기간과 소득을 기반으로 국민연금 예상 수령액을 계산합니다',
    url: 'https://toolhub.ai.kr/national-pension',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국민연금 예상 수령액 계산',
      '조기수령/정상수령/연기수령 3가지 비교',
      '출생연도별 수급개시연령 자동 적용',
      '가입연도별 소득대체율(70%→43%) 반영',
      '출산·군복무 크레딧·부양가족연금 반영',
      '조기/연기 손익분기 나이',
      '추납·임의가입 시 증가액 시뮬레이션',
      '낸 보험료 대비 받는 연금',
    ],
  }

  const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "가입기간 10년을 못 채우면 어떻게 되나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "노령연금을 받을 수 없고, 60세가 되면 낸 보험료(직장가입자는 회사 부담분 포함)에 이자를 더한 반환일시금을 받습니다. 임의계속가입이나 추납으로 10년을 채우면 평생 연금을 받을 수 있어 대부분 그쪽이 유리합니다."
      }
    },
    {
      "@type": "Question",
      "name": "이 계산기 금액과 공단 안내 금액이 다른 이유는요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "실제 B값은 연도별 소득을 재평가율로 환산해 평균을 내고, 납부예외·미납 기간과 크레딧 인정 여부도 사람마다 다릅니다. 이 계산기는 평균 소득이 일정했다고 가정한 추정치이니 정확한 금액은 국민연금공단 '내 연금 알아보기'에서 확인하세요."
      }
    },
    {
      "@type": "Question",
      "name": "연금액은 물가만큼 오르나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네. 매년 1월 전년도 소비자물가 상승률만큼 연금액이 오릅니다(2026년 2.1%). 이 계산기의 기본 금액은 오늘 돈 가치이고, 수령 시점 명목 금액은 선택한 상승률로 따로 보여줍니다."
      }
    },
    {
      "@type": "Question",
      "name": "국민연금에도 세금이 붙나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "2002년 이후 낸 보험료에 해당하는 연금만 과세 대상입니다. 연금소득공제와 인적공제를 거치므로 다른 소득이 없으면 세금은 크지 않고, 공단이 매달 원천징수한 뒤 다음 해 1월에 연말정산합니다."
      }
    },
    {
      "@type": "Question",
      "name": "부부가 둘 다 받을 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "네, 각자 가입했다면 각자 노령연금을 모두 받습니다. 배우자가 사망해 유족연금이 생기면 본인 노령연금과 유족연금 중 하나를 고르는데, 노령연금을 고르면 유족연금의 30%를 더 받습니다."
      }
    },
    {
      "@type": "Question",
      "name": "기금이 바닥나면 못 받나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "2025년 개혁으로 국가가 연금 지급을 보장한다는 책무가 법(국민연금법 제3조의2)에 명시됐습니다. 기금이 줄어들어도 연금은 그 해 보험료와 국가 책임으로 계속 지급되는 구조입니다."
      }
    }
  ]
}

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <NationalPensionCalculator />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
