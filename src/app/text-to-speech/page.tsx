import { Metadata } from 'next'
import { Suspense } from 'react'
import TextToSpeech from '@/components/TextToSpeech'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '텍스트 읽어주기 (TTS) - 음성 변환, 다국어 지원 | 툴허브',
  description: '텍스트 읽어주기 - 텍스트를 입력하면 음성으로 읽어줍니다. 한국어, 영어 등 다국어 지원, 속도와 높낮이 조절 가능.',
  keywords: '텍스트 읽어주기, TTS, text to speech, 음성 변환, 텍스트 음성',
  openGraph: { title: '텍스트 읽어주기 (TTS) | 툴허브', description: '텍스트를 음성으로 변환', url: 'https://toolhub.ai.kr/text-to-speech', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '텍스트 읽어주기 | 툴허브', description: '텍스트를 음성으로 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/text-to-speech' },
}

export default function TextToSpeechPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '텍스트 읽어주기 (TTS)', description: '텍스트를 음성으로 변환', url: 'https://toolhub.ai.kr/text-to-speech', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['텍스트 음성 변환', '다국어 지원', '속도/높낮이 조절', 'Web Speech API'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><TextToSpeech /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
