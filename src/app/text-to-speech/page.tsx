import { Metadata } from 'next'
import { Suspense } from 'react'
import TextToSpeech from '@/components/TextToSpeech'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '텍스트 읽어주기 (TTS) - 음성 변환, 다국어 지원 | 툴허브',
  description: '텍스트 읽어주기 - 텍스트를 입력하면 음성으로 읽어줍니다. 한국어, 영어 등 다국어 지원, 속도와 높낮이 조절 가능.',
  keywords: '텍스트 읽어주기, TTS, text to speech, 음성 변환, 텍스트 음성',
  openGraph: { title: '텍스트 읽어주기 (TTS) | 툴허브', description: '텍스트를 음성으로 변환', url: 'https://toolhub.ai.kr/text-to-speech', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '텍스트 읽어주기 | 툴허브', description: '텍스트를 음성으로 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/text-to-speech/' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><TextToSpeech />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            텍스트 읽어주기(TTS)란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            텍스트 읽어주기(TTS, Text-to-Speech)는 입력한 텍스트를 브라우저의 Web Speech API를 이용해 음성으로 변환해 주는 무료 온라인 도구입니다. 한국어, 영어, 일본어 등 다국어를 지원하며 읽기 속도와 음높이(피치)를 조절할 수 있어 외국어 발음 확인, 문서 청취, 접근성 개선, 콘텐츠 제작 등 다양한 용도로 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            텍스트 읽어주기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>외국어 발음 확인:</strong> 영어나 일본어 텍스트를 붙여넣고 원어민 음성으로 발음을 들어보면 언어 학습 효과를 높일 수 있습니다.</li>
            <li><strong>문서 청취(오디오북):</strong> 긴 글이나 보고서를 음성으로 들으면 눈의 피로를 줄이면서도 내용을 파악할 수 있어 멀티태스킹이 가능합니다.</li>
            <li><strong>속도 조절 활용:</strong> 발음 학습 시에는 0.5~0.75배속으로 천천히, 문서를 빠르게 청취할 때는 1.5~2배속으로 설정하면 효율적입니다.</li>
            <li><strong>접근성 활용:</strong> 시각적 불편이 있거나 읽기가 어려운 분들을 위해 웹 콘텐츠를 음성으로 전달할 때 TTS 기능을 활용하면 접근성이 크게 향상됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
