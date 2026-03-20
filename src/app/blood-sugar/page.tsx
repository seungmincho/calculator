import { Metadata } from 'next'
import { Suspense } from 'react'
import BloodSugar from '@/components/BloodSugar'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '혈당 기록 - 혈당 추적, 당뇨 관리 | 툴허브',
  description:
    '혈당 수치를 기록하고 분류하세요. 공복·식전·식후·취침 전 혈당 측정 시점별 기록, 7일/30일 통계, CSV 내보내기. 당뇨 및 혈당 관리를 위한 무료 온라인 도구.',
  keywords:
    '혈당 기록, 혈당 추적, 당뇨 관리, 혈당 측정, 공복 혈당, 식후 혈당, 당뇨전단계, 저혈당, 혈당 통계',
  openGraph: {
    title: '혈당 기록기 | 툴허브',
    description:
      '혈당 수치를 기록하고 통계로 관리하세요. 측정 시점별 분류와 7일/30일 평균을 한눈에.',
    url: 'https://toolhub.ai.kr/blood-sugar',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '혈당 기록기 | 툴허브',
    description:
      '혈당 수치를 기록하고 통계로 관리하세요. 측정 시점별 분류와 7일/30일 평균을 한눈에.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/blood-sugar/',
  },
}

export default function BloodSugarPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '혈당 기록기',
      description:
        '혈당 수치를 기록하고 분류하세요. 공복·식전·식후·취침 전 혈당 측정 시점별 기록, 7일/30일 통계, CSV 내보내기.',
      url: 'https://toolhub.ai.kr/blood-sugar',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '혈당 수치 기록 (mg/dL)',
        '측정 시점 분류 (공복·식전·식후·취침 전)',
        '혈당 상태 자동 분류 (정상/당뇨전단계/당뇨/저혈당)',
        '7일 및 30일 통계 (평균·최솟값·최댓값)',
        'CSV 내보내기',
        '브라우저 로컬 저장',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '정상 공복 혈당 수치는 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '미국당뇨병협회(ADA) 기준으로 정상 공복 혈당은 70~99 mg/dL입니다. 100~125 mg/dL는 당뇨전단계(공복혈당장애), 126 mg/dL 이상은 당뇨로 분류됩니다. 70 mg/dL 미만은 저혈당으로 즉각적인 조치가 필요합니다.',
          },
        },
        {
          '@type': 'Question',
          name: '식후 혈당은 언제 측정하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '식후 혈당은 일반적으로 식사 시작 후 2시간 후에 측정합니다. 정상 수치는 140 mg/dL 미만이며, 140~199 mg/dL는 당뇨전단계, 200 mg/dL 이상은 당뇨로 분류됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '혈당 기록 데이터는 어디에 저장되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '모든 혈당 기록은 사용자의 브라우저 로컬 스토리지에만 저장됩니다. 서버로 전송되거나 외부에 공유되지 않으며, 같은 기기와 브라우저에서만 확인할 수 있습니다.',
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <BloodSugar />
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
            혈당 기록기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            혈당 기록기는 공복·식전·식후·취침 전 혈당 수치를 측정 시점별로 기록하고, 7일·30일 평균 통계와 추이를 분석하는 무료 온라인 당뇨 관리 도구입니다. ADA(미국당뇨병협회) 기준에 따라 정상·당뇨전단계·당뇨·저혈당을 자동으로 분류하며, 기록한 데이터는 CSV로 내보내어 의사에게 제출하거나 보관할 수 있습니다. 모든 데이터는 브라우저 로컬에만 저장되어 개인정보가 안전하게 보호됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            혈당 관리 및 기록 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>측정 시점 구분:</strong> 공복(아침 식전), 식전(점심·저녁 전), 식후 2시간, 취침 전으로 나누어 기록해야 혈당 변동 패턴을 정확히 파악할 수 있습니다.</li>
            <li><strong>정상 범위 기억:</strong> 공복 혈당 70~99 mg/dL, 식후 2시간 혈당 140 mg/dL 미만이 정상이며, 이 범위를 초과하면 당뇨 전단계를 의심해야 합니다.</li>
            <li><strong>연속 측정의 중요성:</strong> 하루 한 번보다 하루 4회 이상 측정하면 혈당 스파이크와 저혈당 위험을 조기에 발견할 수 있습니다.</li>
            <li><strong>식사와 혈당 상관관계:</strong> 식후 혈당이 높은 식품(흰쌀, 빵, 설탕)을 파악하고 식단을 조정하는 데 기록 데이터가 중요한 근거가 됩니다.</li>
            <li><strong>CSV 내보내기 활용:</strong> 주기적으로 CSV로 내보내어 엑셀에서 분석하거나 진료 시 의사에게 제출하면 맞춤형 치료 계획 수립에 도움이 됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
