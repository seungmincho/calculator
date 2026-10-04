import { Metadata } from 'next'
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
    images: [{ url: 'https://toolhub.ai.kr/og/blood-sugar.png', width: 1200, height: 630, alt: '혈당 기록기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '혈당 기록기 | 툴허브',
    description:
      '혈당 수치를 기록하고 통계로 관리하세요. 측정 시점별 분류와 7일/30일 평균을 한눈에.',
    images: ['https://toolhub.ai.kr/og/blood-sugar.png'],
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
        '측정 시점 분류 (공복·식전·식후 2시간·취침 전·무작위)',
        '측정 시점별 혈당 판정 (대한당뇨병학회·ADA 기준 참고)',
        'mg/dL ⇄ mmol/L 변환',
        '당화혈색소(HbA1c) 판정과 추정 평균혈당',
        '7·30·90일 통계와 70~180 범위 비율, 추이 그래프',
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
            text: '대한당뇨병학회·미국당뇨병협회(ADA) 기준으로 공복 혈당 100 mg/dL 미만이 정상, 100~125 mg/dL는 공복혈당장애(당뇨병 전단계), 126 mg/dL 이상은 당뇨병 진단 기준에 해당합니다. 진단은 다른 날 재검 등 의료진 확인이 필요합니다. 70 mg/dL 미만은 저혈당으로 즉각적인 조치가 필요합니다.',
          },
        },
        {
          '@type': 'Question',
          name: '식후 혈당은 언제 측정하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '식후 혈당은 보통 식사 시작 2시간 뒤에 잽니다. 진단 기준은 75g 경구당부하검사(OGTT) 2시간 혈당으로, 140 mg/dL 미만 정상, 140~199 mg/dL 내당능장애, 200 mg/dL 이상 당뇨병 기준입니다. 일상 식사 후 측정값은 참고용이며 한 번의 수치로 진단하지 않습니다.',
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <BloodSugar />
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
            혈당 기록기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            혈당 기록기는 공복·식전·식후·취침 전 혈당 수치를 측정 시점별로 기록하고, 7일·30일 평균 통계와 추이를 분석하는 무료 온라인 당뇨 관리 도구입니다. 대한당뇨병학회·ADA 기준을 참고해 측정 시점별로 정상·당뇨병 전단계·당뇨병 기준·저혈당을 판정해 주며, 기록한 데이터는 CSV로 내보내어 의사에게 제출하거나 보관할 수 있습니다. 모든 데이터는 브라우저 로컬에만 저장되어 개인정보가 안전하게 보호됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            혈당 관리 및 기록 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>측정 시점 구분:</strong> 공복(아침 식전), 식전(점심·저녁 전), 식후 2시간, 취침 전으로 나누어 기록해야 혈당 변동 패턴을 정확히 파악할 수 있습니다.</li>
            <li><strong>정상 범위 기억:</strong> 공복 혈당 100 mg/dL 미만, 식후 2시간 혈당 140 mg/dL 미만이 정상 기준입니다. 이보다 높은 수치가 반복되면 의료진과 상담해 검사를 받아 보세요.</li>
            <li><strong>측정 횟수:</strong> 적절한 측정 횟수는 치료 방법에 따라 다릅니다. 인슐린 치료 중이면 식전·취침 전 등 하루 여러 번 재는 경우가 많고, 그 밖에는 의료진이 정한 시점과 횟수에 맞춰 꾸준히 기록하세요.</li>
            <li><strong>식사와 혈당 상관관계:</strong> 식후 혈당이 높은 식품(흰쌀, 빵, 설탕)을 파악하고 식단을 조정하는 데 기록 데이터가 중요한 근거가 됩니다.</li>
            <li><strong>CSV 내보내기 활용:</strong> 주기적으로 CSV로 내보내어 엑셀에서 분석하거나 진료 시 의사에게 제출하면 맞춤형 치료 계획 수립에 도움이 됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
