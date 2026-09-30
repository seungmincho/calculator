import { Metadata } from 'next'
import LlmTokenCalculator from '@/components/LlmTokenCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'LLM 토큰 계산기 - AI 비용 계산 | 툴허브',
  description: 'Claude·GPT·Gemini·DeepSeek 최신 API 단가(2026-10 공식 요금표 기준)로 토큰 수와 월 비용을 계산하세요. 프롬프트 캐싱·배치 할인, 컨텍스트 초과 여부, 원화 환산까지.',
  keywords: 'LLM 토큰 계산기, 토큰 카운터, GPT 토큰, Claude 토큰, Gemini 토큰, API 비용 계산, 토큰 수 추정, 프롬프트 캐싱 비용, 배치 API 할인, LLM 가격 비교, 한국어 토큰, token counter, token calculator',
  openGraph: {
    title: 'LLM 토큰 계산기 | 툴허브',
    description: 'GPT, Claude, Gemini 등 LLM 모델별 토큰 수 추정 및 API 비용 계산',
    url: 'https://toolhub.ai.kr/llm-token-calculator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/llm-token-calculator.png', width: 1200, height: 630, alt: 'LLM 토큰 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM 토큰 계산기',
    description: 'GPT, Claude, Gemini 등 LLM 모델별 토큰 수 추정 및 API 비용 계산',
    images: ['https://toolhub.ai.kr/og/llm-token-calculator.png'],
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
    description: 'Claude·GPT·Gemini·DeepSeek API 단가로 토큰 수를 추정하고 일·월 비용, 프롬프트 캐싱 절감액을 계산합니다.',
    url: 'https://toolhub.ai.kr/llm-token-calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      "모델별 API 단가표 (입력·출력·캐시·배치, 공식 요금표 기준일 표시)",
      "토크나이저별 토큰 수 추정 (한국어 범위 표시)",
      "하루 요청 수 기반 일·월 비용 비교",
      "프롬프트 캐싱 절감액 계산",
      "컨텍스트 윈도우 초과 확인",
      "원화 환산 및 마크다운 표 복사",
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <LlmTokenCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
