import { Metadata } from 'next'
import { Suspense } from 'react'
import ScreenCompare from '@/components/ScreenCompare'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '화면 크기 비교 - 디바이스 비교 | 툴허브',
  description: '스마트폰, 태블릿, 노트북, 모니터 등 다양한 디바이스의 화면 크기를 비율에 맞게 시각적으로 비교하세요. PPI, 해상도, 화면 넓이 등 상세 스펙 비교 제공.',
  keywords: '화면 크기 비교, 디바이스 비교, 스마트폰 화면 비교, 모니터 크기 비교, PPI 계산, 해상도 비교, 아이폰 갤럭시 비교, 화면 인치 비교',
  openGraph: {
    title: '화면 크기 비교 | 툴허브',
    description: '스마트폰·태블릿·모니터 화면 크기 시각적 비교',
    url: 'https://toolhub.ai.kr/screen-compare',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '화면 크기 비교 | 툴허브',
    description: '스마트폰·태블릿·모니터 화면 크기 시각적 비교',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/screen-compare/',
  },
}

export default function ScreenComparePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '화면 크기 비교',
    description: '스마트폰, 태블릿, 노트북, 모니터 화면 크기 시각적 비교 도구',
    url: 'https://toolhub.ai.kr/screen-compare',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['화면 크기 시각적 비교', 'PPI 계산', '해상도 비교', '최대 4개 디바이스 동시 비교', '커스텀 크기 입력'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'PPI란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PPI(Pixels Per Inch)는 1인치당 픽셀 수를 의미합니다. PPI가 높을수록 화면이 더 선명하게 보입니다. 계산식은 √(가로픽셀² + 세로픽셀²) ÷ 화면크기(인치)입니다. 스마트폰은 보통 300~500 PPI, 일반 모니터는 70~150 PPI입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '화면 인치는 어떻게 측정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '화면 인치는 화면의 대각선 길이를 인치 단위로 측정한 값입니다. 예를 들어 6.1인치 스마트폰은 화면 모서리에서 반대편 모서리까지의 대각선 거리가 약 15.5cm입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '같은 인치수인데 해상도가 다른 이유는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '같은 물리적 크기라도 제조사마다 다른 패널 기술을 사용하기 때문입니다. 고해상도 디스플레이는 같은 면적에 더 많은 픽셀을 집어넣어 PPI가 높아집니다. 예를 들어 27인치 모니터도 FHD(1920×1080)와 4K(3840×2160)는 PPI가 2배 차이납니다.',
        },
      },
      {
        '@type': 'Question',
        name: '화면 비율(Aspect Ratio)이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '화면 비율은 가로 픽셀 수와 세로 픽셀 수의 비율입니다. 16:9는 가장 일반적인 와이드스크린 비율이며, 19.5:9나 20:9는 최신 스마트폰의 긴 화면 비율입니다. 4:3은 구형 태블릿이나 iPad에서 주로 사용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '화면 크기 비교 도구를 어떻게 활용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '스마트폰 구매 시 여러 모델의 실제 크기를 비교하거나, 노트북·모니터 구매 시 작업 공간과 맞는 크기를 고르는 데 활용할 수 있습니다. 최대 4개 디바이스를 동시에 비교하고, 커스텀 크기 입력으로 직접 치수를 넣어 비교할 수도 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <ScreenCompare />
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
            화면 크기 비교 도구란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            화면 크기 비교 도구는 스마트폰, 태블릿, 노트북, 모니터 등 다양한 전자기기의 화면 크기를 실제 비율에 맞게 시각적으로 비교할 수 있는 무료 온라인 도구입니다. PPI(인치당 픽셀), 해상도, 화면 넓이, 화면 비율 등 상세 스펙을 한눈에 비교하고, 최대 4개 디바이스를 동시에 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            화면 크기 비교 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>스마트폰 구매:</strong> iPhone과 Galaxy 모델을 직접 비교해 실제 크기 차이를 확인하세요.</li>
            <li><strong>모니터 선택:</strong> 24인치 FHD와 27인치 QHD의 실제 크기 및 PPI 차이를 비교해보세요.</li>
            <li><strong>태블릿 비교:</strong> iPad와 Galaxy Tab의 화면 크기와 비율 차이를 시각적으로 확인하세요.</li>
            <li><strong>커스텀 크기:</strong> 목록에 없는 기기도 인치와 해상도를 직접 입력해 비교할 수 있습니다.</li>
            <li><strong>PPI 분석:</strong> 같은 크기 화면이라도 PPI에 따라 화질이 크게 달라집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
