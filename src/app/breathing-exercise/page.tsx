import { Metadata } from 'next'
import { Suspense } from 'react'
import BreathingExercise from '@/components/BreathingExercise'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '호흡 운동 가이드 - 4-7-8 호흡법, 박스 호흡 | 툴허브',
  description: '4-7-8 호흡법, 박스 호흡, 릴렉싱 호흡 등 과학적으로 검증된 스트레스 해소 호흡 운동 가이드. SVG 애니메이션으로 호흡 리듬을 시각적으로 안내합니다.',
  keywords: '호흡 운동, 4-7-8 호흡법, 박스 호흡, 복식호흡, 스트레스 해소, 명상 호흡, 호흡 가이드, 불안 완화',
  openGraph: {
    title: '호흡 운동 가이드 | 툴허브',
    description: '4-7-8 호흡법, 박스 호흡 등 스트레스 해소 호흡 운동 가이드.',
    url: 'https://toolhub.ai.kr/breathing-exercise',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '호흡 운동 가이드 | 툴허브',
    description: '4-7-8, 박스 호흡 등 과학적 호흡법으로 스트레스 해소.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/breathing-exercise/',
  },
}

const faqData = [
  {
    question: '4-7-8 호흡법이란 무엇인가요?',
    answer: '4-7-8 호흡법은 앤드류 웨일 박사가 소개한 호흡 기법입니다. 4초간 코로 들이쉬고, 7초간 숨을 참은 뒤, 8초간 입으로 내쉽니다. 부교감신경계를 활성화하여 불안을 빠르게 완화하고 수면을 유도하는 데 효과적입니다.',
  },
  {
    question: '박스 호흡(Box Breathing)은 어떤 효과가 있나요?',
    answer: '박스 호흡은 미 해군 특수부대(Navy SEALs)가 사용하는 기법으로, 4초 들이쉬기·4초 참기·4초 내쉬기·4초 참기의 사각형 패턴으로 구성됩니다. 집중력 향상, 스트레스 감소, 심박수 안정화에 효과적이며 일상적인 긴장 완화에도 좋습니다.',
  },
  {
    question: '호흡 운동을 언제, 얼마나 자주 해야 하나요?',
    answer: '호흡 운동은 하루에 1~2회, 각 5~10분 실시하는 것을 권장합니다. 특히 아침 기상 직후, 잠자리에 들기 전, 또는 스트레스 상황이 생겼을 때 즉각 활용할 수 있습니다. 꾸준히 실천하면 2~4주 이내에 불안 수준 감소와 집중력 향상 효과를 느낄 수 있습니다.',
  },
]

export default function BreathingExercisePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '호흡 운동 가이드',
    description: '4-7-8 호흡법, 박스 호흡, 릴렉싱 호흡 등 스트레스 해소 호흡 운동 가이드',
    url: 'https://toolhub.ai.kr/breathing-exercise',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '4-7-8 호흡법 가이드',
      '박스 호흡 가이드',
      '릴렉싱 호흡 가이드',
      'SVG 원형 애니메이션',
      '단계별 카운트다운',
      '세션 통계',
      '진동 피드백 지원',
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
              <BreathingExercise />
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
              호흡 운동 가이드란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              호흡 운동 가이드는 <strong>4-7-8 호흡법, 박스 호흡(Box Breathing), 릴렉싱 호흡</strong> 등 과학적으로 검증된 호흡 기법을 SVG 애니메이션으로 시각적으로 안내하는 도구입니다. 스트레스 해소, 불안 완화, 수면 개선에 효과적이며 별도 앱 설치 없이 브라우저에서 바로 사용할 수 있습니다. 명상과 마음챙김에 관심 있는 분, 공황장애·불안장애 관리가 필요한 분에게 특히 유용합니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              호흡 운동 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>4-7-8 호흡:</strong> 잠들기 전 3~4세트 반복하면 수면 유도에 효과적입니다.</li>
              <li><strong>박스 호흡:</strong> 발표·시험 전 긴장을 빠르게 낮추고 집중력을 높이는 데 적합합니다.</li>
              <li><strong>코호흡 유지:</strong> 들이쉴 때는 반드시 코로 호흡하여 공기를 충분히 가온·가습합니다.</li>
              <li><strong>매일 꾸준히:</strong> 하루 5~10분씩 2~4주 연습하면 평소 스트레스 반응이 현저히 줄어듭니다.</li>
              <li><strong>진동 피드백:</strong> 모바일에서 진동 피드백을 켜면 눈을 감고도 호흡 타이밍을 맞출 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
