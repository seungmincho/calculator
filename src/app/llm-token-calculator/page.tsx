import { Metadata } from 'next'
import { Suspense } from 'react'
import LlmTokenCalculator from '@/components/LlmTokenCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'LLM 토큰 계산기 - AI 비용 계산 | 툴허브',
  description: 'GPT-4o, Claude, Gemini, Llama 등 주요 LLM 모델의 토큰 수를 추정하고 API 호출 비용을 계산하세요. 한국어 토큰 특성 반영, 모델별 비교 테이블 제공.',
  keywords: 'LLM 토큰 계산기, 토큰 카운터, GPT 토큰, Claude 토큰, Gemini 토큰, API 비용 계산, 토큰 수 추정, 한국어 토큰, token counter, token calculator',
  openGraph: {
    title: 'LLM 토큰 계산기 | 툴허브',
    description: 'GPT, Claude, Gemini 등 LLM 모델별 토큰 수 추정 및 API 비용 계산',
    url: 'https://toolhub.ai.kr/llm-token-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM 토큰 계산기',
    description: 'GPT, Claude, Gemini 등 LLM 모델별 토큰 수 추정 및 API 비용 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/llm-token-calculator/',
  },
}

export default function LlmTokenCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LLM 토큰 계산기',
    description: 'GPT-4o, Claude, Gemini, Llama 등 주요 LLM 모델의 토큰 수를 추정하고 API 호출 비용을 계산합니다.',
    url: 'https://toolhub.ai.kr/llm-token-calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'LLM 토큰 수 추정',
      '모델별 API 비용 계산',
      '한국어 토큰 특성 반영',
      '모델 비교 테이블',
      '파일 업로드 지원',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <LlmTokenCalculator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
