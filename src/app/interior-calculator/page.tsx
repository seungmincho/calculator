import { Metadata } from 'next'
import { Suspense } from 'react'
import InteriorCalc from '@/components/InteriorCalc'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '인테리어 면적 계산기 - 페인트, 벽지, 타일 면적 | 툴허브',
  description: '방 가로·세로·높이를 입력하면 바닥·벽·천장 면적과 페인트·벽지·타일 소요량 및 비용을 자동으로 계산합니다. 문·창문 공제, 다중 방 지원, 10% 여유분 포함.',
  keywords: '인테리어 면적 계산기, 페인트 계산기, 벽지 계산기, 타일 계산기, 방 면적, 도배 면적, 바닥 면적, 벽 면적, 인테리어 견적',
  openGraph: {
    title: '인테리어 면적 계산기 | 툴허브',
    description: '방 치수 입력만으로 페인트·벽지·타일 소요량과 비용을 즉시 계산. 다중 방 지원, 문·창문 자동 공제.',
    url: 'https://toolhub.ai.kr/interior-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '인테리어 면적 계산기 | 툴허브',
    description: '방 치수 입력만으로 페인트·벽지·타일 소요량과 비용을 즉시 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/interior-calculator',
  },
}

export default function InteriorCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '인테리어 면적 계산기',
      description: '방 치수를 입력하면 바닥·벽·천장 면적과 페인트·벽지·타일 소요량 및 비용을 자동으로 계산합니다.',
      url: 'https://toolhub.ai.kr/interior-calculator',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '바닥·벽·천장 면적 자동 계산',
        '페인트 소요량 및 비용 계산',
        '벽지 롤 수 및 비용 계산',
        '타일 장수 및 비용 계산',
        '문·창문 면적 자동 공제',
        '다중 방 지원',
        '10% 여유분 자동 적용',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '인테리어 면적 계산기에서 벽 면적은 어떻게 계산되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '벽 면적은 2 × (가로 + 세로) × 높이 공식으로 계산됩니다. 여기서 문(0.9m × 2.1m)과 창문(1.5m × 1.2m) 면적이 자동으로 공제되어 실제 도배·도장 면적을 구합니다.',
          },
        },
        {
          '@type': 'Question',
          name: '페인트 소요량은 어떻게 계산하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '페인트 소요량은 (순 벽 면적 × 도장 횟수) ÷ 도포율(m²/L)로 계산되며, 10% 여유분이 추가됩니다. 한국 아파트 기준 평균 도포율은 10~12m²/L이고, 일반적으로 2회 도장이 권장됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '벽지 롤 수는 어떻게 계산되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '벽지 롤 수는 순 벽 면적을 롤 1개의 실제 면적(너비 × (길이 - 패턴 반복))으로 나누어 계산합니다. 한국 표준 벽지 롤은 너비 0.53m, 길이 10m이며 10% 여유분이 포함됩니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <InteriorCalc />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
