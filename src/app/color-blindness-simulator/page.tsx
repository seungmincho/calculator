import { Metadata } from 'next'
import ColorBlindnessSimulator from '@/components/ColorBlindnessSimulator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import colorBlindnessSimulatorMessages from '../../../messages/generated/ko/ns/colorBlindnessSimulator.json'

export const metadata: Metadata = {
  title: '색맹 시뮬레이터 - 색각이상 체험 | 툴허브',
  description: '색맹·색약 시뮬레이터 — 이미지에 적색맹, 녹색맹, 청황색맹, 전색맹 등 4가지 색각이상을 정도(색약~색맹)까지 조절해 적용하고, 차트 색 팔레트가 구분되는지도 검사해 색각이상자의 시야를 직접 체험해보세요. 디자인 접근성 검토에도 활용하세요.',
  keywords: '색맹 시뮬레이터, 색약 시뮬레이터, 색각이상 체험, 적색맹, 녹색맹, 청황색맹, 전색맹, color blindness simulator, CVD filter, 접근성 디자인',
  openGraph: {
    title: '색맹 시뮬레이터 - 색각이상 체험 | 툴허브',
    description: '이미지와 색 팔레트에 색각이상 시뮬레이션을 적용해 색맹·색약의 시야를 체험하세요',
    url: 'https://toolhub.ai.kr/color-blindness-simulator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/color-blindness-simulator.png', width: 1200, height: 630, alt: '색맹 시뮬레이터' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '색맹 시뮬레이터 | 툴허브',
    description: '이미지와 색 팔레트에 색각이상 시뮬레이션을 적용해 색맹·색약의 시야를 체험하세요',
    images: ['https://toolhub.ai.kr/og/color-blindness-simulator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/color-blindness-simulator/',
  },
}

export default function ColorBlindnessSimulatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '색맹 시뮬레이터',
    description: '이미지에 색각이상(CVD) 필터를 적용하여 색맹·색약의 시야를 체험하는 도구',
    url: 'https://toolhub.ai.kr/color-blindness-simulator/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Canvas API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '4가지 색각이상 + 정도(0~100%) 시뮬레이션',
      '차트 색 팔레트 구분 검사(CIEDE2000)',
      '이미지 업로드 및 카메라 촬영',
      '슬라이더 비교 뷰',
      '4가지 유형 한눈에 보기·분할 비교 슬라이더',
      '3가지 샘플 이미지',
      '필터 이미지 다운로드',
      '브라우저 내 로컬 처리 (서버 전송 없음)',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={colorBlindnessSimulatorMessages.colorBlindnessSimulator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ColorBlindnessSimulator />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            색맹 시뮬레이터란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            색맹 시뮬레이터는 <strong>이미지에 색각이상(CVD) 필터를 적용하여 색맹·색약을 가진 사람들이 세상을 어떻게 보는지 체험</strong>할 수 있는 도구입니다. 적색맹(Protanopia), 녹색맹(Deuteranopia), 청황색맹(Tritanopia), 전색맹(Achromatopsia) 등 4가지 색각이상을 정도별로 재현하고 색 팔레트 구분 여부까지 검사할 수 있어, 디자이너·개발자의 접근성 검토에 폭넓게 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            색맹 시뮬레이터 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>접근성 디자인 검토:</strong> UI 스크린샷을 업로드해 색각이상자 시점에서 정보 전달이 되는지 확인하세요.</li>
            <li><strong>슬라이더 비교:</strong> 드래그 슬라이더로 원본과 필터 이미지를 실시간으로 비교할 수 있습니다.</li>
            <li><strong>샘플 이미지 활용:</strong> 차트·신호등·색상환 샘플로 각 색각이상의 차이를 즉시 확인해보세요.</li>
            <li><strong>이미지 다운로드:</strong> 필터 적용된 이미지를 저장하여 보고서나 발표 자료에 활용하세요.</li>
            <li><strong>주의:</strong> 이 도구는 참고용이며 정확한 색각 검사는 안과 전문의에게 받으세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
