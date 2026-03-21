import { Metadata } from 'next'
import { Suspense } from 'react'
import ColorBlindnessSimulator from '@/components/ColorBlindnessSimulator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '색맹 시뮬레이터 - 색각이상 체험 | 툴허브',
  description: '색맹·색약 시뮬레이터 — 이미지에 적색맹, 녹색맹, 청황색맹, 전색맹 등 7가지 색각이상 필터를 적용하여 색각이상자의 시야를 직접 체험해보세요. 디자인 접근성 검토에도 활용하세요.',
  keywords: '색맹 시뮬레이터, 색약 시뮬레이터, 색각이상 체험, 적색맹, 녹색맹, 청황색맹, 전색맹, color blindness simulator, CVD filter, 접근성 디자인',
  openGraph: {
    title: '색맹 시뮬레이터 - 색각이상 체험 | 툴허브',
    description: '이미지에 7가지 색각이상 필터를 적용해 색맹·색약의 시야를 체험하세요',
    url: 'https://toolhub.ai.kr/color-blindness-simulator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '색맹 시뮬레이터 | 툴허브',
    description: '이미지에 7가지 색각이상 필터를 적용해 색맹·색약의 시야를 체험하세요',
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
    url: 'https://toolhub.ai.kr/color-blindness-simulator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Canvas API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '7가지 색각이상 유형 시뮬레이션',
      '이미지 업로드 및 카메라 촬영',
      '슬라이더 비교 뷰',
      '원본·시뮬레이션 나란히 보기',
      '3가지 샘플 이미지',
      '필터 이미지 다운로드',
      '브라우저 내 로컬 처리 (서버 전송 없음)',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '색맹과 색약의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '색맹(Dichromacy)은 특정 원뿔세포가 완전히 없어 해당 색을 전혀 구분하지 못하는 상태이고, 색약(Anomalous Trichromacy)은 원뿔세포가 있지만 기능이 저하되어 색 구분이 어려운 상태입니다. 색약이 색맹보다 훨씬 흔하며, 남성의 약 8%가 어떤 형태든 색각이상을 가지고 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '이 시뮬레이터는 어떻게 색각이상을 재현하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Brettel/Viénot 알고리즘을 기반으로 한 색상 변환 행렬(CVD matrix)을 Canvas API로 픽셀 단위 적용합니다. 각 픽셀의 RGB 값을 해당 색각이상 유형에 맞게 변환해 실제 색각이상자의 시야를 근사적으로 재현합니다. 색약(약형)의 경우 원본과 시뮬레이션을 50% 블렌딩합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '업로드한 이미지는 서버에 저장되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '아니요. 모든 이미지 처리는 브라우저 내 Canvas API로 이루어지며, 서버로 전송되지 않습니다. 개인 정보 걱정 없이 사용하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '색맹 시뮬레이터를 디자인에 어떻게 활용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'UI 스크린샷이나 인포그래픽 이미지를 업로드하고 적색맹·녹색약 등의 필터를 적용해 보세요. 색각이상자가 해당 디자인을 어떻게 보는지 확인하고, 색상만으로 정보를 구분하는 요소가 있다면 아이콘이나 패턴을 추가하는 등 접근성을 개선할 수 있습니다.',
        },
      },
    ],
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: 'https://toolhub.ai.kr' },
      { '@type': 'ListItem', position: 2, name: '색맹 시뮬레이터', item: 'https://toolhub.ai.kr/color-blindness-simulator' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <ColorBlindnessSimulator />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            색맹 시뮬레이터란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            색맹 시뮬레이터는 <strong>이미지에 색각이상(CVD) 필터를 적용하여 색맹·색약을 가진 사람들이 세상을 어떻게 보는지 체험</strong>할 수 있는 도구입니다. 적색맹(Protanopia), 녹색맹(Deuteranopia), 청황색맹(Tritanopia), 전색맹(Achromatopsia) 등 7가지 색각이상 유형을 지원하며, 디자이너·개발자의 접근성 검토에 폭넓게 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            색맹 시뮬레이터 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>접근성 디자인 검토:</strong> UI 스크린샷을 업로드해 색각이상자 시점에서 정보 전달이 되는지 확인하세요.</li>
            <li><strong>슬라이더 비교:</strong> 드래그 슬라이더로 원본과 필터 이미지를 실시간으로 비교할 수 있습니다.</li>
            <li><strong>샘플 이미지 활용:</strong> 색상환·이시하라 패턴·신호등 이미지로 각 색각이상의 차이를 즉시 확인해보세요.</li>
            <li><strong>이미지 다운로드:</strong> 필터 적용된 이미지를 저장하여 보고서나 발표 자료에 활용하세요.</li>
            <li><strong>주의:</strong> 이 도구는 참고용이며 정확한 색각 검사는 안과 전문의에게 받으세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
