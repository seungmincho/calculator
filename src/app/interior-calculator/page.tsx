import { Metadata } from 'next'
import { Suspense } from 'react'
import InteriorCalc from '@/components/InteriorCalc'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

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
    canonical: 'https://toolhub.ai.kr/interior-calculator/',
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
            인테리어 면적 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            인테리어 면적 계산기는 방의 가로·세로·높이를 입력하면 페인트·벽지·타일 소요량과 예상 비용을 자동으로 계산해주는 도구입니다. 리모델링이나 셀프 인테리어를 계획할 때 자재 구입량을 정확히 파악하여 낭비를 줄이고 예산을 효율적으로 관리할 수 있습니다. 문·창문 면적 자동 공제, 다중 방 지원, 10% 여유분 포함 기능을 제공합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            인테리어 면적 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>페인트 선택 시 도포율 확인:</strong> 제품별로 1L당 도포 면적이 다릅니다. 일반 수성 페인트는 10~12㎡/L, 프리미엄 제품은 더 넓습니다.</li>
            <li><strong>벽지 패턴 반복 고려:</strong> 패턴 있는 벽지는 패턴 반복 길이(리피트)가 있어 실제보다 더 많은 롤이 필요합니다. 이 계산기에 리피트 값을 입력하세요.</li>
            <li><strong>타일 줄눈 폭:</strong> 욕실 타일은 줄눈 폭에 따라 필요 장수가 달라집니다. 일반적으로 3~5mm 줄눈을 사용합니다.</li>
            <li><strong>여유분 중요성:</strong> 자재는 반드시 10% 이상 여유분을 구매하세요. 추후 보수용으로도 동일 제품이 필요할 수 있습니다.</li>
            <li><strong>다중 방 계산:</strong> 거실, 침실, 주방 등 여러 방을 각각 입력하여 전체 자재 소요량을 한 번에 파악할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
