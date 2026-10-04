import { Metadata } from 'next'
import InteriorCalc from '@/components/InteriorCalc'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '인테리어 면적 계산기 - 페인트, 벽지, 타일 면적 | 툴허브',
  description: '방 치수나 평수를 입력하면 실크·합지 벽지 롤 수, 페인트 18L·4L 통 조합, 강마루 박스, 장판 m, 타일 장수, 걸레받이까지 자재 수량과 비용을 계산합니다. 24평·32평 아파트 집 전체 합산.',
  keywords: '인테리어 면적 계산기, 인테리어 자재 계산기, 벽지 롤 계산, 실크벽지 몇 롤, 강마루 박스 계산, 장판 계산, 페인트 계산기, 벽지 계산기, 타일 계산기, 방 면적, 도배 면적, 바닥 면적, 벽 면적, 인테리어 견적',
  openGraph: {
    title: '인테리어 면적 계산기 | 툴허브',
    description: '방 치수 입력만으로 페인트·벽지·타일 소요량과 비용을 즉시 계산. 다중 방 지원, 문·창문 자동 공제.',
    url: 'https://toolhub.ai.kr/interior-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/interior-calculator.png', width: 1200, height: 630, alt: '인테리어 면적 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '인테리어 면적 계산기 | 툴허브',
    description: '방 치수 입력만으로 페인트·벽지·타일 소요량과 비용을 즉시 계산',
    images: ['https://toolhub.ai.kr/og/interior-calculator.png'],
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
        '바닥·벽·천장 면적 자동 계산 (㎡·평)',
        '실크·광폭합지·소폭합지 벽지 롤 수 (무늬 반복 반영)',
        '페인트 18L·4L·1L 통 최적 조합',
        '강마루 박스·장판 m 계산',
        '벽·바닥 타일 장수 (줄눈·로스율)',
        '걸레받이·천장 몰딩 본수',
        '문·창문 크기별 공제',
        '원룸·24평·32평 아파트 집 전체 합산',
        '구매 목록 복사·결과 공유',
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
            text: '벽 면적은 2 × (가로 + 세로) × 천장 높이로 계산하고, 입력한 문·창문 개수와 크기(기본 문 0.9×2.1m, 창 1.5×1.2m)만큼 공제해 실제 도배·도장 면적을 구합니다.',
          },
        },
        {
          '@type': 'Question',
          name: '페인트 소요량은 어떻게 계산하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '페인트 필요량은 면적 × 도장 횟수 ÷ 도포율(㎡/L, 1회)에 여유분을 더해 계산합니다. 실내 수성 페인트는 1L로 1회 약 8~12㎡를 칠하며 보통 2회 도장합니다. 계산기는 18L·4L·1L 통 가격을 모두 입력하면 비용이 가장 적게 드는 조합을, 비워 두면 큰 통이 L당 싸다는 가정으로 남는 양이 적은 조합을 골라 줍니다.',
          },
        },
        {
          '@type': 'Question',
          name: '벽지 롤 수는 어떻게 계산되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '국내 일반 규격은 실크 벽지 1.06m × 15.6m, 광폭합지 0.93m × 17.75m로 1롤이 벽 약 5평 분량이고, 소폭합지는 0.53m × 12.5m입니다. 계산기는 층고+재단 여유(무늬 반복이 있으면 반복 단위로 올림)로 한 폭 길이를 정하고, 롤 하나에서 나오는 폭 수로 필요 롤 수를 구합니다.',
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
              <InteriorCalc />
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
            인테리어 면적 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            인테리어 면적 계산기는 방의 가로·세로·높이(또는 평수)를 입력하면 벽지 롤, 페인트 통, 강마루 박스, 장판 길이, 타일 장수, 걸레받이·몰딩 본수와 예상 자재비를 계산해주는 도구입니다. 24평·32평 아파트 방 구성을 불러와 집 전체 자재를 한 번에 합산하고, 구매 목록을 복사해 자재상에 그대로 보낼 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            인테리어 면적 계산 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>페인트 선택 시 도포율 확인:</strong> 제품별로 1L당 도포 면적이 다릅니다. 실내 수성 페인트는 1회 기준 약 8~12㎡/L입니다.</li>
            <li><strong>벽지 패턴 반복 고려:</strong> 패턴 있는 벽지는 패턴 반복 길이(리피트)가 있어 실제보다 더 많은 롤이 필요합니다. 이 계산기에 리피트 값을 입력하세요.</li>
            <li><strong>타일 줄눈 폭:</strong> 욕실 타일은 줄눈 폭에 따라 필요 장수가 달라집니다. 일반적으로 3~5mm 줄눈을 사용합니다.</li>
            <li><strong>여유분 중요성:</strong> 타일은 5~10%, 강마루는 5% 정도 로스를 잡으세요. 같은 로트 제품을 나중에 구하기 어려우니 보수용 여분도 챙기세요.</li>
            <li><strong>다중 방 계산:</strong> 거실, 침실, 주방 등 여러 방을 각각 입력하여 전체 자재 소요량을 한 번에 파악할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
