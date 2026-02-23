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
    canonical: 'https://toolhub.ai.kr/metronome',
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
    </>
  )
}
