import { Metadata } from 'next'
import { Suspense } from 'react'
import MorseCode from '@/components/MorseCode'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '모스부호 변환기 - 텍스트↔모스부호 변환 | 툴허브',
  description: '모스부호 변환기 - 텍스트를 모스부호로, 모스부호를 텍스트로 변환합니다. 소리 재생, 모스부호 표 제공.',
  keywords: '모스부호 변환기, morse code converter, 모스부호 변환, 모스코드, SOS 모스부호',
  openGraph: { title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/morse-code' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><MorseCode /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
