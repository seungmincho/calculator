import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import SavingsCalculator from '@/components/SavingsCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '적금 계산기 - 적금·복리 비교 | 툴허브',
  description: '정기적금, 자유적금, 목표적금, 복리적금 등 다양한 적금 상품을 비교하고 목표 금액 달성을 위한 최적의 저축 계획을 세워보세요.',
  keywords: '적금계산기, 정기적금, 자유적금, 복리적금, 목표적금, 저축계획, 적금이자계산, 만기수령액계산',
  openGraph: {
    title: '적금 계산기 | 툴허브',
    description: '다양한 적금 상품을 비교하고 목표 금액 달성 계획을 세워보세요',
    url: 'https://toolhub.ai.kr/savings-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/savings-calculator/',
  },
}

export default function SavingsCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '적금 계산기',
    description: '정기적금, 자유적금, 목표적금, 복리적금 등 다양한 적금 상품 비교 계산기',
    url: 'https://toolhub.ai.kr/savings-calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    author: {
      '@type': 'Organization',
      name: '툴허브'
    },
    featureList: [
      '정기적금 계산',
      '자유적금 계산',
      '목표적금 계산',
      '복리적금 계산',
      '적금상품 비교분석'
    ]
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '적금 계산기 사용 방법',
    description: '정기적금, 자유적금, 복리적금 등 다양한 적금 상품의 만기 수령액과 이자를 계산하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '예금/적금 유형 선택',
        text: '정기적금, 자유적금, 목표적금, 복리적금 중 원하는 상품 유형을 선택합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '원금과 기간 입력',
        text: '월 납입액(또는 거치 원금)과 적금 기간(개월 수)을 입력합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '금리 입력',
        text: '연 이율과 이자 방식(단리/복리)을 입력합니다. 은행 공시 금리를 참고하세요.',
      },
      {
        '@type': 'HowToStep',
        name: '이자와 만기 수령액 확인',
        text: '계산 결과에서 총 이자, 세전 만기 수령액, 이자소득세(15.4%)를 확인합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '세후 수익 비교',
        text: '비과세·세금우대 적금과 일반 적금의 세후 실수령액을 비교하여 최적의 상품을 선택합니다.',
      },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '단리와 복리의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '단리는 원금에만 이자가 붙는 방식이고, 복리는 원금+이자에 다시 이자가 붙는 방식입니다. 같은 금리라면 복리가 더 많은 이자를 받을 수 있으며, 기간이 길수록 차이가 커집니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 이자에 세금이 얼마나 붙나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '적금 이자소득에는 15.4%의 이자소득세(소득세 14% + 지방소득세 1.4%)가 원천징수됩니다. 비과세 적금이나 세금우대 적금(9.5%)을 활용하면 세금을 줄일 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '적금 중도해지 시 이자는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '중도해지 시 약정금리가 아닌 중도해지 금리(보통 약정금리의 50~70%)가 적용됩니다. 가입기간이 짧을수록 해지 금리가 낮아지므로 만기까지 유지하는 것이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '월 50만원 적금 1년이면 얼마를 받나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '연 3.5% 금리 기준, 월 50만원 1년 정기적금 만기 시 약 611만원의 세전 이자가 발생하여 총 약 610만 5천원(세후)을 수령합니다. 실제 금액은 금리와 세금우대 여부에 따라 달라집니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <I18nWrapper>
        <Breadcrumb />
        <SavingsCalculator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            적금 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            적금 계산기는 정기적금, 자유적금, 복리적금, 목표적금 등 다양한 저축 상품의 만기 수령액과 이자 금액을 미리 계산해 주는 무료 재테크 도구입니다. 월 납입액, 금리, 납입 기간, 이자 방식(단리/복리)을 입력하면 세전·세후 수령액을 즉시 확인하고, 여러 적금 상품을 비교하여 최적의 저축 계획을 세울 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            적금 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>이자소득세 반영:</strong> 적금 이자에는 15.4%의 이자소득세가 원천징수됩니다. 세후 실수령액을 기준으로 적금 상품을 비교해야 실제 이익을 정확히 파악할 수 있습니다.</li>
            <li><strong>복리 적금의 장기 효과:</strong> 단리와 복리의 차이는 단기에는 미미하지만 3년 이상 장기 적금에서 크게 벌어집니다. 복리 상품이 있다면 우선적으로 검토해보세요.</li>
            <li><strong>목표 금액 역산:</strong> 목표 금액이 정해진 경우 역산 기능을 이용하면 월 납입액을 자동으로 계산해 현실적인 저축 계획을 세울 수 있습니다.</li>
            <li><strong>비과세·세금우대 상품 비교:</strong> 청년희망적금, 청년도약계좌, 농협·신협 등의 비과세 적금은 이자소득세가 면제되거나 9.5%로 낮아 같은 금리라도 더 유리합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}