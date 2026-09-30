import { Metadata } from 'next'
import ExerciseCalorie from '@/components/ExerciseCalorie'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '운동 칼로리 계산기 - 운동별 소모 칼로리, MET 기반 계산 | 툴허브',
  description: '2024 Compendium MET 기준 70여 가지 운동의 소모 칼로리를 계산합니다. 걷기·달리기 속도별, 수영 영법별, 헬스·구기까지. 음식 칼로리 태우는 시간, 걸음 수 칼로리, 주간 운동 계획도 확인하세요.',
  keywords: '운동 칼로리 계산기, 소모 칼로리, MET 계산, 달리기 칼로리, 걷기 칼로리, 수영 칼로리, 자전거 칼로리, 운동별 칼로리, 만보 칼로리, 걸음수 칼로리, 라면 칼로리 태우기',
  openGraph: {
    title: '운동 칼로리 계산기 | 툴허브',
    description: '70여 가지 운동별 소모 칼로리를 2024 Compendium MET 기준으로 계산.',
    url: 'https://toolhub.ai.kr/exercise-calorie',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/exercise-calorie.png', width: 1200, height: 630, alt: '운동 칼로리 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '운동 칼로리 계산기 | 툴허브',
    description: '운동별 소모 칼로리 MET 기반 계산.',
    images: ['https://toolhub.ai.kr/og/exercise-calorie.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/exercise-calorie/',
  },
}

const faqData = [
  {
    question: 'MET(대사당량)이란 무엇인가요?',
    answer: 'MET(Metabolic Equivalent of Task)는 운동 강도를 나타내는 단위입니다. 안정시 산소 소비량을 1 MET로 정의하며, MET 값이 클수록 강도가 높은 운동입니다. 예를 들어 2024 Compendium 기준 보통 걷기는 3.8 MET, 달리기는 속도에 따라 6.5~14.8 MET, 줄넘기는 11.0 MET입니다.',
  },
  {
    question: '소모 칼로리 계산 공식은?',
    answer: '소모 칼로리(kcal) = MET × 체중(kg) × 운동시간(시간)으로 계산됩니다. 예를 들어 70kg인 사람이 30분간 조깅(MET 7.5)을 하면: 7.5 × 70 × 0.5 ≈ 263kcal을 소모합니다. 안정 시 소모분(1 MET)을 뺀 순소모는 (MET − 1) × 체중 × 시간입니다.',
  },
  {
    question: '체지방 1kg을 빼려면 얼마나 운동해야 하나요?',
    answer: '체지방 1kg은 약 7,700kcal에 해당합니다. 70kg인 사람이 매일 30분 조깅(약 263kcal)을 하면 약 29일, 60분 빠르게 걷기(MET 4.8, 약 336kcal)를 하면 약 23일이 걸리는 셈입니다. 다만 실제 체중 감량은 식단, 기초대사량 등 여러 요인에 영향을 받습니다.',
  },
]

export default function ExerciseCaloriePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '운동 칼로리 계산기',
    description: '운동별 소모 칼로리를 MET 기반으로 계산하는 온라인 도구',
    url: 'https://toolhub.ai.kr/exercise-calorie',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '70여 가지 운동 MET 기반 칼로리 계산 (2024 Compendium)',
      '운동 검색·카테고리 칩',
      '음식 칼로리 태우는 데 필요한 운동 시간',
      '걸음 수 → 거리·칼로리',
      '주간 운동 계획·체지방 환산',
      '성별·나이 보정 MET (Harris-Benedict)',
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ExerciseCalorie />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            운동 칼로리 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            운동 칼로리 계산기는 MET(대사당량, Metabolic Equivalent of Task) 기반으로 걷기·달리기·수영·자전거·헬스 등 70여 가지 운동에서 소모되는 칼로리를 2024 Compendium of Physical Activities의 MET 값으로 체중과 운동시간에 맞춰 계산합니다. 다이어트 계획 수립, 운동 효과 비교, 체지방 감량 목표 설정 등 건강 관리에 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            운동 칼로리 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>운동 조합 비교:</strong> 같은 시간 대비 소모 칼로리가 높은 운동을 찾아 효율적인 운동 루틴을 구성하세요.</li>
            <li><strong>체지방 환산:</strong> 체지방 1kg은 약 7,700kcal이므로, 목표 감량량에 필요한 운동량을 역산할 수 있습니다.</li>
            <li><strong>주간 계획:</strong> 달리기·걷기·웨이트처럼 여러 운동을 주당 횟수와 함께 넣으면 주간·월간 소모 칼로리를 한눈에 확인할 수 있습니다.</li>
            <li><strong>음식 역산:</strong> 라면·치킨·소주 등 음식을 고르면 운동별로 몇 분을 해야 태울 수 있는지 비교할 수 있습니다.</li>
            <li><strong>실제 칼로리 보정:</strong> MET 기반 계산은 평균값이므로 개인 체력 수준, 운동 강도, 체형에 따라 실제 값은 ±20% 차이가 날 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
