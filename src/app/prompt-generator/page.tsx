import { Metadata } from 'next'
import { Suspense } from 'react'
import PromptGenerator from '@/components/PromptGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'AI 프롬프트 생성기 - ChatGPT·Claude·Midjourney 프롬프트 빌더 | 툴허브',
  description: 'AI 프롬프트를 쉽게 만들어보세요. 역할, 작업, 톤, 형식을 선택하면 ChatGPT/Claude용 텍스트 프롬프트와 Midjourney/DALL-E용 이미지 프롬프트를 자동 생성합니다.',
  keywords: 'AI 프롬프트, 프롬프트 생성기, ChatGPT 프롬프트, Claude 프롬프트, Midjourney 프롬프트, DALL-E 프롬프트, 프롬프트 엔지니어링, AI 활용',
  openGraph: {
    title: 'AI 프롬프트 생성기 | 툴허브',
    description: 'ChatGPT·Claude·Midjourney용 프롬프트를 쉽게 만드세요.',
    url: 'https://toolhub.ai.kr/prompt-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 프롬프트 생성기',
    description: 'AI 프롬프트를 역할·작업·톤·형식 선택으로 자동 생성',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/prompt-generator',
  },
}

export default function PromptGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'AI 프롬프트 생성기',
    description: 'ChatGPT, Claude, Midjourney, DALL-E용 프롬프트를 자동으로 생성합니다.',
    url: 'https://toolhub.ai.kr/prompt-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['텍스트 AI 프롬프트 생성', '이미지 AI 프롬프트 생성', '8종 프롬프트 템플릿', '프롬프트 품질 향상']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <PromptGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
