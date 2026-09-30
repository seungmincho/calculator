import { Metadata } from 'next'
import Link from 'next/link'
import ColorBlindTest from '@/components/ColorBlindTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '색약 테스트 - 적색약·녹색약 자가 검사 | 툴허브',
  description: '나는 색각 이상일까? 이시하라식 가성동색표 14판으로 적색약·녹색약·청황색약 가능성을 3분 만에 확인하세요. 판마다 색약자에게 어떻게 보이는지 비교하고 결과를 공유할 수 있습니다.',
  keywords: '색약 테스트, 색맹 테스트, 색맹 검사, 색각 이상, 적록색약, 적색약, 녹색약, 이시하라 테스트, color blind test',
  openGraph: { title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/color-blind-test.png', width: 1200, height: 630, alt: '색약 테스트' }] },
  twitter: { card: 'summary_large_image', title: '색약 테스트 | 툴허브', description: '색각 이상 검사 (이시하라 테스트)', images: ['https://toolhub.ai.kr/og/color-blind-test.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/color-blind-test/' },
}

export default function ColorBlindTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '색약 테스트', description: '색각 이상 검사 (이시하라 테스트)', url: 'https://toolhub.ai.kr/color-blind-test', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['이시하라식 가성동색표 14판', '적색약·녹색약 유형 분류', '청황색약 검사판', '색약자 시야로 검사판 보기', '결과 이미지 공유'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '색맹과 색약의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '색맹(Color Blindness)은 특정 색상을 전혀 구분하지 못하는 상태이고, 색약(Color Weakness)은 구분은 되지만 정상보다 약하게 인식하는 상태입니다. 가장 흔한 유형: 적록 색약(남성 8%, 여성 0.5%) - 빨강과 초록 구분 어려움. 청황 색약 - 파랑과 노랑 구분 어려움. 전색맹 - 모든 색을 회색으로 인식(매우 드묾). X염색체 연관 유전이므로 남성에게 훨씬 많습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '온라인 색약 테스트 결과를 믿어도 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '참고용 선별 검사입니다. 모니터마다 색 재현과 밝기가 달라 결과가 달라질 수 있고, 야간 모드·블루라이트 필터를 켜면 정상인도 틀릴 수 있습니다. 의료 진단이 아니므로 색각 이상이 의심되면 안과에서 이시하라 검사표나 아노말로스코프 검사를 받으세요.',
        },
      },
      {
        '@type': 'Question',
        name: '적색약과 녹색약은 어떻게 구분하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '적색약(제1색각 이상)은 L 원추세포, 녹색약(제2색각 이상)은 M 원추세포 기능이 약합니다. 이 테스트의 분류판은 두 숫자 중 하나는 적색약에게, 다른 하나는 녹색약에게 사라지도록 색을 골라, 어느 숫자를 읽었는지로 유형을 추정합니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ColorBlindTest />
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
              색약 테스트란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              색약 테스트는 <strong>이시하라(Ishihara) 방식의 가성동색표로 적색약·녹색약·청황색약 가능성을 간편하게 확인</strong>하는 도구입니다. 검사판은 색각 이상자가 구분하지 못하는 색 조합(혼동선)을 계산해 매번 새로 그리며, 누구나 보이는 시범판, 색약자에게 숫자가 사라지는 소실판, 다른 숫자로 보이는 변환판, 적색약과 녹색약을 가르는 분류판 등 14판으로 구성됩니다. 운전면허 취득, 특수 직업 지원, 디자인·그래픽 작업 전 색각 상태를 확인하는 데 활용할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              색약 테스트 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>정확한 환경:</strong> 밝은 자연광 또는 적절한 조명 아래서 테스트해야 가장 정확한 결과를 얻습니다.</li>
              <li><strong>화면 밝기:</strong> 모니터 밝기를 적정 수준(50~70%)으로 설정하고 테스트하세요.</li>
              <li><strong>스크리닝 용도:</strong> 이 테스트는 참고용이며 정확한 진단은 안과 전문의에게 받아야 합니다.</li>
              <li><strong>디자이너 활용:</strong> 색각 이상자를 위한 접근성 디자인을 고려할 때 <Link href="/color-blindness-simulator/" className="text-primary underline">색맹 시뮬레이터</Link>와 함께 활용하세요.</li>
              <li><strong>필터 끄기:</strong> 야간 모드, 블루라이트 필터, 트루톤 같은 화면 색 보정을 끄지 않으면 정상 색각도 틀릴 수 있습니다.</li>
              <li><strong>어린이 검사:</strong> 만 4세 이상 어린이도 테스트할 수 있으며 조기 발견이 교육에 도움이 됩니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
