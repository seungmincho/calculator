import { Metadata } from 'next'
import { Suspense } from 'react'
import Metronome from '@/components/Metronome'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '메트로놈 - BPM 박자기, 탭 템포, 진동 | 툴허브',
  description: '온라인 메트로놈으로 정확한 박자를 연습하세요. BPM 조절, 박자표(2/4, 3/4, 4/4, 6/8), 탭 템포, 강박 설정, 모바일 진동 지원.',
  keywords: '메트로놈, 온라인 메트로놈, BPM, 박자기, 탭 템포, metronome, 음악 연습, 박자 맞추기',
  openGraph: {
    title: '메트로놈 | 툴허브',
    description: '온라인 메트로놈. BPM 조절, 박자표, 탭 템포, 진동 지원.',
    url: 'https://toolhub.ai.kr/metronome',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '메트로놈 | 툴허브',
    description: 'BPM 박자기, 탭 템포, 모바일 진동 지원 메트로놈',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/metronome/',
  },
}

const faqData = [
  {
    question: '메트로놈이란 무엇인가요?',
    answer: '메트로놈은 일정한 간격으로 소리를 내어 음악의 템포(빠르기)를 알려주는 도구입니다. BPM(Beats Per Minute)으로 1분에 몇 번 박자를 치는지를 설정합니다. 음악 연습, 작곡, 리듬 훈련에 필수적인 도구입니다.',
  },
  {
    question: '탭 템포 기능은 어떻게 사용하나요?',
    answer: '탭 템포 버튼을 원하는 빠르기로 반복해서 누르면 탭 간격을 분석하여 BPM을 자동으로 계산합니다. 듣고 있는 곡의 BPM을 알고 싶을 때 유용합니다. 최소 2번 이상 탭하면 BPM이 계산됩니다.',
  },
  {
    question: '진동 기능은 어떤 기기에서 지원되나요?',
    answer: '진동 기능은 Vibration API를 지원하는 모바일 기기(Android Chrome 등)에서 사용 가능합니다. iOS Safari는 현재 Vibration API를 지원하지 않습니다. 이어폰 착용 시 진동으로 박자를 느낄 수 있어 편리합니다.',
  },
]

export default function MetronomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '메트로놈',
    description: '온라인 메트로놈 - BPM 박자기, 탭 템포, 진동 지원',
    url: 'https://toolhub.ai.kr/metronome',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Web Audio API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'BPM 20~300 조절',
      '박자표 (2/4, 3/4, 4/4, 6/8)',
      '탭 템포 (탭으로 BPM 측정)',
      '강박 악센트 설정',
      '모바일 진동 피드백',
      '클래식 템포 프리셋 8종',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <Metronome />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              온라인 메트로놈이란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              온라인 메트로놈은 악기 연습, 노래 연습, 작곡 시 정확한 박자를 유지할 수 있도록 일정한 간격으로 클릭음을 내주는 도구입니다. BPM(분당 박자수) 20~300 범위를 지원하며, 4/4·3/4·2/4·6/8 박자표, 탭 템포(듣고 있는 곡의 BPM 자동 측정), 모바일 진동 기능까지 제공합니다. 설치 없이 브라우저에서 바로 사용할 수 있어 편리합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              메트로놈 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>느린 BPM으로 시작:</strong> 새 곡을 배울 때는 목표 BPM의 60~70%로 시작해 정확성을 익힌 후 점진적으로 속도를 높이세요.</li>
              <li><strong>탭 템포 활용:</strong> 즐겨 듣는 노래의 BPM을 모를 때 탭 버튼을 박자에 맞춰 두드리면 자동으로 BPM이 측정됩니다.</li>
              <li><strong>박자표 변경:</strong> 왈츠는 3/4, 록은 4/4, 6/8은 빠른 셋잇단음표 느낌으로 장르에 맞는 박자표를 선택하세요.</li>
              <li><strong>진동 활용:</strong> 이어폰 착용 시 소리와 함께 진동으로 박자를 감지하면 주변 소음 환경에서도 박자를 유지할 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
