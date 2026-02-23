import { Metadata } from 'next'
import { Suspense } from 'react'
import EmailTemplate from '@/components/EmailTemplate'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '비즈니스 이메일 템플릿 생성기 - 거래 제안, 감사, 사과, 회의 요청 | 툴허브',
  description:
    '비즈니스 이메일을 쉽게 작성하세요. 거래 제안, 감사 인사, 사과, 회의 요청, 견적 요청, 협업 제안, 불만 접수, 공지 등 8가지 카테고리와 3가지 톤(격식체/비즈니스/친근)으로 한국어·영어 이메일을 자동 생성합니다.',
  keywords:
    '비즈니스 이메일 템플릿, 이메일 작성, 거래 제안 이메일, 감사 이메일, 사과 이메일, 회의 요청, 견적 요청, 협업 제안, 이메일 생성기, 업무 이메일',
  openGraph: {
    title: '비즈니스 이메일 템플릿 생성기 | 툴허브',
    description:
      '8가지 카테고리, 3가지 톤으로 한국어·영어 비즈니스 이메일을 자동 생성. 제목과 본문을 원클릭 복사.',
    url: 'https://toolhub.ai.kr/email-template',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '비즈니스 이메일 템플릿 생성기 | 툴허브',
    description: '8가지 카테고리, 3가지 톤으로 한국어·영어 비즈니스 이메일 자동 생성.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/email-template',
  },
}

export default function EmailTemplatePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '비즈니스 이메일 템플릿 생성기',
    description:
      '거래 제안, 감사, 사과, 회의 요청 등 8가지 카테고리와 3가지 톤으로 한국어·영어 비즈니스 이메일을 자동 생성하는 무료 도구',
    url: 'https://toolhub.ai.kr/email-template',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '8가지 이메일 카테고리 (거래 제안, 감사, 사과, 회의 요청 등)',
      '3가지 톤 선택 (격식체, 비즈니스, 친근)',
      '한국어/영어 이메일 생성',
      '실시간 미리보기',
      '제목/본문 원클릭 복사',
      '변수 입력으로 맞춤 이메일 생성',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '비즈니스 이메일 템플릿 생성기란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이메일 카테고리(거래 제안, 감사, 사과 등)를 선택하고 이름, 회사명 등 변수를 입력하면 전문적인 비즈니스 이메일을 자동으로 생성해주는 도구입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '어떤 종류의 이메일을 작성할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '거래 제안, 감사 인사, 사과 메일, 회의 요청, 견적 요청, 협업 제안, 불만 접수, 공지/안내 총 8가지 카테고리를 지원합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '톤(어조)은 어떤 것을 선택할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '격식체(Formal), 비즈니스(Business standard), 친근한(Friendly) 3가지 톤을 지원합니다. 상황과 수신자에 맞게 적절한 톤을 선택하세요.',
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-500 py-20">Loading...</div>}>
            <I18nWrapper>
              <EmailTemplate />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
