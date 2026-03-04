import { Metadata } from 'next'
import { Suspense } from 'react'
import LunarConverter from '@/components/LunarConverter'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '음력 양력 변환기 - 음력 날짜 변환, 띠, 간지 | 툴허브',
  description: '음력 양력 변환기 - 음력을 양력으로, 양력을 음력으로 변환합니다. 음력 생일, 제사일, 명절 날짜 확인. 띠, 간지(60갑자) 정보 제공.',
  keywords: '음력 양력 변환, 음력 변환기, 양력 음력 변환, 음력 생일, 음력 날짜, lunar calendar converter',
  openGraph: { title: '음력 양력 변환기 | 툴허브', description: '음력 ↔ 양력 날짜 변환, 띠, 간지 정보', url: 'https://toolhub.ai.kr/lunar-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '음력 양력 변환기 | 툴허브', description: '음력 ↔ 양력 날짜 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/lunar-converter/' },
}

export default function LunarConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '음력 양력 변환기', description: '음력 ↔ 양력 날짜 변환, 띠, 간지(60갑자) 정보', url: 'https://toolhub.ai.kr/lunar-converter', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['양력→음력 변환', '음력→양력 변환', '띠/간지 정보', '윤달 지원'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '음력과 양력의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '양력(태양력): 지구가 태양을 도는 주기(365.25일) 기준. 전 세계 표준 달력(그레고리력). 음력(태음태양력): 달의 위상 변화 주기(29.5일) 기준으로 한 달을 정합니다. 12달은 약 354일이므로 윤달을 두어 양력과 맞춥니다. 한국에서는 설날, 추석, 생일 등에 음력을 사용합니다. 음력 날짜는 매년 양력 날짜가 달라지므로 변환이 필요합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><LunarConverter /></I18nWrapper></Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              음력 양력 변환기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              음력 양력 변환기는 음력 날짜를 양력으로, 양력 날짜를 음력으로 즉시 변환해주는 도구입니다. 음력 생일, 제삿날, 설날·추석·동지 등 명절 날짜의 양력 확인에 필수적이며, 60갑자(간지)와 띠 정보, 윤달 여부까지 함께 제공합니다. 매년 달라지는 음력 기념일의 양력 날짜를 빠르게 조회하세요.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              음력 양력 변환기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>음력 생일 확인:</strong> 음력으로 생일을 기억하는 어르신의 올해 양력 생일을 쉽게 찾을 수 있습니다.</li>
              <li><strong>제사·기일 조회:</strong> 음력으로 기록된 제삿날을 매년 양력으로 변환해 일정 앱에 등록하세요.</li>
              <li><strong>윤달 주의:</strong> 윤달이 있는 해는 같은 음력 날짜가 두 번 등장할 수 있으므로 윤달 여부를 반드시 확인하세요.</li>
              <li><strong>띠·간지 확인:</strong> 출생 연도의 띠와 60갑자 간지를 함께 조회해 명리학적 참고 자료로 활용할 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
