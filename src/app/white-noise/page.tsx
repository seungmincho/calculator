import { Metadata } from 'next'
import { Suspense } from 'react'
import WhiteNoise from '@/components/WhiteNoise'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '백색소음 생성기 - 수면, 집중, ASMR | 툴허브',
  description: '수면과 집중을 위한 백색소음 생성기. 화이트·핑크·브라운 노이즈, 빗소리, 바람, 파도 등 6가지 사운드. 수면 타이머, 볼륨 조절 지원.',
  keywords: '백색소음, 화이트노이즈, 핑크노이즈, 브라운노이즈, 수면소음, 집중소음, ASMR, 빗소리, white noise',
  openGraph: {
    title: '백색소음 생성기 | 툴허브',
    description: '수면·집중을 위한 6가지 소음 생성기. 타이머 지원.',
    url: 'https://toolhub.ai.kr/white-noise',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '백색소음 생성기 | 툴허브',
    description: '수면·집중을 위한 백색소음 생성기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/white-noise',
  },
}

const faqData = [
  {
    question: '백색소음이 수면에 도움이 되나요?',
    answer: '네, 백색소음은 주변 환경 소음을 마스킹하여 수면의 질을 높일 수 있습니다. 연구에 따르면 지속적이고 균일한 소리는 뇌가 갑작스러운 소음 변화에 반응하는 것을 줄여 깊은 수면을 돕습니다.',
  },
  {
    question: '핑크노이즈와 브라운노이즈의 차이는?',
    answer: '화이트노이즈는 모든 주파수가 동일한 세기입니다. 핑크노이즈는 저주파가 강해 자연스러운 느낌이며, 브라운노이즈는 더 깊고 묵직한 저음 중심입니다. 수면에는 핑크/브라운노이즈가, 집중에는 화이트노이즈가 좋다는 연구가 있습니다.',
  },
  {
    question: '수면 타이머는 어떻게 사용하나요?',
    answer: '5분, 10분, 15분, 30분, 60분 중 원하는 시간을 선택하면 해당 시간 후 자동으로 소음이 정지됩니다. 잠들기 전 타이머를 설정하면 배터리와 데이터를 절약할 수 있습니다.',
  },
]

export default function WhiteNoisePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '백색소음 생성기',
    description: '수면과 집중을 위한 백색소음 생성기',
    url: 'https://toolhub.ai.kr/white-noise',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Web Audio API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '6가지 소음 유형 (화이트, 핑크, 브라운, 빗소리, 바람, 파도)',
      '볼륨 조절',
      '수면 타이머 (5~60분)',
      '실시간 소음 전환',
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
              <WhiteNoise />
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
