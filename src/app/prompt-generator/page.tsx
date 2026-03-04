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
    canonical: 'https://toolhub.ai.kr/prompt-generator/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            AI 프롬프트 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            AI 프롬프트 생성기는 ChatGPT, Claude, Gemini 등 텍스트 AI와 Midjourney, DALL-E, Stable Diffusion 등 이미지 AI에 최적화된 프롬프트를 자동으로 작성해주는 무료 프롬프트 엔지니어링 도구입니다. 역할(페르소나), 작업 유형, 말투·톤, 출력 형식을 선택하면 효과적인 프롬프트가 즉시 생성됩니다. AI 활용 초보자도 전문가 수준의 프롬프트를 쉽게 만들 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            AI 프롬프트 작성 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>역할(Role) 지정:</strong> '당신은 10년 경력의 마케팅 전문가입니다'처럼 AI에게 역할을 부여하면 더 전문적이고 일관된 답변을 얻을 수 있습니다.</li>
            <li><strong>출력 형식 명시:</strong> '번호 목록', '표 형식', '3개 단락' 등 원하는 형식을 구체적으로 지정하면 결과물을 바로 활용하기 좋은 형태로 받을 수 있습니다.</li>
            <li><strong>이미지 프롬프트 구조:</strong> Midjourney는 [주제], [스타일], [조명], [카메라 설정], [분위기] 순서로 상세히 작성할수록 원하는 이미지에 가까워집니다.</li>
            <li><strong>반복 개선:</strong> 첫 결과가 만족스럽지 않으면 프롬프트에 '더 구체적으로', '예시 포함', '한국어로' 등의 조건을 추가해 반복 수정하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
