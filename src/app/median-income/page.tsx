import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import MedianIncomeTable from '@/components/MedianIncomeTable'

export const metadata: Metadata = {
  title: '기준 중위소득 조회 - 2025년, 2026년 가구별 중위소득',
  description: '2025년, 2026년 기준 중위소득을 가구원수별, 비율별로 조회하세요. 기초생활수급자 선정기준, 복지급여 기준, 정부 지원사업 자격요건을 한눈에 확인할 수 있습니다.',
  keywords: '기준중위소득, 2025년 중위소득, 2026년 중위소득, 기초생활수급자, 복지급여, 생계급여, 의료급여, 주거급여, 교육급여, 차상위계층',
  openGraph: {
    title: '기준 중위소득 조회 - 2025년, 2026년 | 툴허브',
    description: '가구원수별, 비율별 기준 중위소득과 정부 복지사업 자격요건을 한눈에 확인하세요',
    url: 'https://toolhub.ai.kr/median-income',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '기준 중위소득 조회',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '기준 중위소득 조회 - 2025년, 2026년 | 툴허브',
    description: '가구원수별, 비율별 기준 중위소득과 정부 복지사업 자격요건을 한눈에 확인하세요',
    images: ['/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/median-income',
  },
}

export default function MedianIncomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '기준 중위소득 조회',
    description: '한국 기준 중위소득을 연도별, 가구원수별, 비율별로 조회하고 복지사업 자격요건을 확인하는 도구',
    url: 'https://toolhub.ai.kr/median-income',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '연도별 기준 중위소득 조회',
      '가구원수별 중위소득 확인',
      '비율별 중위소득 계산',
      '기초생활수급자 선정기준 확인',
      '정부 지원사업 자격요건 안내'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '기준 중위소득이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기준 중위소득은 전체 가구를 소득 순으로 나열했을 때 정확히 중간에 해당하는 소득입니다. 보건복지부에서 매년 고시하며, 기초생활보장제도를 비롯한 각종 복지사업의 수급자 선정기준으로 사용됩니다. 2026년 4인 가구 기준 중위소득은 약 609만원입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '기초생활수급자 선정 기준은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '기초생활수급자는 급여 종류에 따라 기준이 다릅니다. 생계급여는 중위소득 32% 이하, 의료급여는 40% 이하, 주거급여는 48% 이하, 교육급여는 50% 이하입니다. 소득인정액(소득+재산의 소득환산액)이 해당 기준 이하이면 수급자로 선정됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '차상위계층 기준은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '차상위계층은 소득인정액이 기준 중위소득 50% 이하인 가구로, 기초생활수급자가 아닌 사람을 말합니다. 차상위 확인서를 발급받으면 의료비 지원, 통신비 감면, 교육비 지원, 에너지 바우처 등 다양한 복지 혜택을 받을 수 있습니다.',
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
      <I18nWrapper>
        <MedianIncomeTable />
      </I18nWrapper>
    </>
  )
}
