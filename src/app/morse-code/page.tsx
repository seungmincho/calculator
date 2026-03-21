import { Metadata } from 'next'
import { Suspense } from 'react'
import MorseCode from '@/components/MorseCode'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '모스부호 변환기 - 텍스트↔모스부호 변환 | 툴허브',
  description: '모스부호 변환기 - 텍스트를 모스부호로, 모스부호를 텍스트로 변환합니다. 소리 재생, 모스부호 표 제공.',
  keywords: '모스부호 변환기, morse code converter, 모스부호 변환, 모스코드, SOS 모스부호',
  openGraph: { title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/morse-code/' },
}

export default function MorseCodePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '모스부호 변환기', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['모스부호 변환', '소리 재생', '모스부호 표', 'SOS'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '모스 부호란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '모스 부호는 1837년 새뮤얼 모스가 발명한 통신 부호로, 짧은 신호(·, dit)와 긴 신호(-, dah)의 조합으로 문자를 표현합니다. 예: A는 ·-, B는 -···, SOS는 ···---···. 원래 전신 통신용이었으나, 현재도 아마추어 라디오, 해상 통신, 긴급 신호에 사용됩니다. 국제 모스 부호는 알파벳, 숫자, 일부 구두점을 포함하며, 한글 모스 부호도 별도로 존재합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'SOS 신호의 유래는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'SOS(···---···)는 1906년 국제 무선 전신 협약에서 채택된 국제 조난 신호입니다. \'Save Our Souls\'의 약자라고 알려져 있지만 실제로는 약자가 아니며, 모스 부호로 가장 쉽게 송수신할 수 있는 패턴이라 선택되었습니다. 타이타닉호 침몰(1912) 때 사용되어 유명해졌으며, 현재도 산악, 해상 조난 시 손전등이나 소리로 SOS 패턴을 보낼 수 있습니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><MorseCode />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            모스부호 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            모스부호 변환기는 영문 텍스트를 모스부호(·과 -)로 변환하거나, 모스부호를 다시 텍스트로 해독하는 무료 온라인 도구입니다. 소리 재생 기능을 통해 실제 전신 신호음을 들을 수 있으며, SOS를 비롯한 국제 표준 모스 알파벳 표를 함께 제공합니다. 아마추어 무선 통신(햄 라디오), 교육, 퀴즈 풀이, 비밀 메시지 작성에 유용하게 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            모스부호 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>SOS 신호 학습:</strong> ···---···(SOS)는 국제 조난 신호로, 손전등이나 소리로 반복하면 구조 요청에 사용할 수 있습니다.</li>
            <li><strong>소리 재생 기능:</strong> 변환된 모스부호를 재생하여 실제 전신 신호음으로 듣고, 청각적으로 모스부호를 익힐 수 있습니다.</li>
            <li><strong>모스 알파벳 표 참고:</strong> A(·-)부터 Z(--..)까지 26개 알파벳과 0~9 숫자의 모스부호를 표에서 쉽게 확인할 수 있습니다.</li>
            <li><strong>비밀 메시지 작성:</strong> 텍스트를 모스부호로 변환해 암호 메시지처럼 활용하거나, 모스부호 입력란에 직접 타이핑해 해독할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
