import { Metadata } from 'next'
import { Suspense } from 'react'
import EmailTemplate from '@/components/EmailTemplate'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/email-template/',
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
        <Breadcrumb />
              <EmailTemplate />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            비즈니스 이메일 템플릿 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            비즈니스 이메일 템플릿 생성기는 업무에서 자주 쓰이는 이메일을 클릭 몇 번으로 자동 작성해주는 도구입니다. 거래 제안, 감사 인사, 사과, 회의 요청, 견적 요청, 협업 제안, 불만 접수, 공지 등 8가지 카테고리에서 격식체·비즈니스·친근한 3가지 톤을 선택하면 한국어와 영어 이메일이 즉시 생성됩니다. 이름과 회사명을 입력하면 맞춤형 이메일이 완성됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            비즈니스 이메일 작성 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>제목 작성:</strong> 제목은 5~10단어로 핵심 내용을 담아야 합니다. &apos;안녕하세요&apos;나 &apos;문의드립니다&apos;만으로는 부족하며, 목적을 명확하게 적어야 열람률이 높아집니다.</li>
            <li><strong>톤 선택 기준:</strong> 처음 연락하는 외부 업체에는 격식체, 거래 중인 파트너에는 비즈니스, 내부 팀원에게는 친근한 톤이 적합합니다.</li>
            <li><strong>영어 이메일 활용:</strong> 해외 업체와 협업 시 생성된 영어 이메일을 기반으로 수정하면 번역 시간을 크게 줄일 수 있습니다.</li>
            <li><strong>답장 기대 시점 명시:</strong> &apos;이번 주 금요일까지 답변 부탁드립니다&apos; 처럼 구체적인 회신 기한을 적으면 빠른 응답을 받을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
