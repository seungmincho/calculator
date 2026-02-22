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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'TTS(Text-to-Speech)란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TTS(텍스트 음성 변환)는 텍스트를 사람의 음성으로 변환하는 기술입니다. 웹 브라우저의 Web Speech API를 사용하여 별도 설치 없이 브라우저에서 바로 사용할 수 있습니다. 활용 분야: ① 시각 장애인 접근성 ② 외국어 발음 확인 ③ 문서 청취(오디오북) ④ 프레젠테이션 음성 ⑤ 콘텐츠 제작. 한국어, 영어, 일본어 등 다국어를 지원하며 속도와 음높이를 조절할 수 있습니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><TextToSpeech /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
