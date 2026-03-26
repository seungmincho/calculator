import { Metadata } from 'next'
import { Suspense } from 'react'
import ChartStudio from '@/components/ChartStudio'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '차트 스튜디오 - 데이터 시각화 & 차트 코드 생성기 | 툴허브',
  description: 'JSON, CSV 데이터를 붙여넣으면 바·라인·파이·산점도·레이더 차트를 즉시 생성합니다. ECharts 코드와 React 컴포넌트 코드를 복사하여 프로젝트에 바로 사용하세요.',
  keywords: '차트 생성기, 데이터 시각화, ECharts, 그래프 만들기, JSON 차트, CSV 차트, 차트 코드 생성, 데이터 분석',
  openGraph: {
    title: '차트 스튜디오 - 데이터 시각화 | 툴허브',
    description: 'JSON/CSV 데이터로 차트를 즉시 생성하고 ECharts 코드를 복사하세요.',
    url: 'https://toolhub.ai.kr/chart-studio',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '차트 스튜디오',
    description: '데이터 시각화 & 차트 코드 생성기',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/chart-studio/',
  },
}

export default function ChartStudioPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '어떤 차트를 만들 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '막대 차트, 꺾은선 차트, 파이 차트, 도넛 차트, 영역 차트 등 다양한 유형을 지원합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '만든 차트를 다운로드할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, PNG 이미지로 다운로드하거나 데이터를 CSV로 내보낼 수 있습니다.',
        },
      },
    ],
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '차트 스튜디오',
    description: 'JSON, CSV 데이터를 차트로 시각화하고 ECharts 코드를 자동 생성합니다.',
    url: 'https://toolhub.ai.kr/chart-studio',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JSON/CSV 데이터 파싱', '6가지 차트 타입', 'ECharts 코드 생성', 'React 컴포넌트 코드', 'PNG 다운로드']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <ChartStudio />
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
              차트 스튜디오란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              차트 스튜디오는 <strong>JSON·CSV 데이터를 붙여넣으면 바·라인·파이·산점도·레이더 등 6가지 차트를 즉시 생성</strong>하고 ECharts 코드와 React 컴포넌트 코드를 자동으로 만들어주는 데이터 시각화 도구입니다. 별도의 라이브러리 설치 없이 브라우저에서 바로 사용할 수 있으며, 생성된 차트를 PNG 이미지로 다운로드하거나 코드를 복사해 프로젝트에 바로 적용할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              차트 스튜디오 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>CSV 데이터 활용:</strong> 엑셀에서 CSV로 내보낸 후 붙여넣으면 바로 차트가 생성됩니다.</li>
              <li><strong>차트 타입 선택:</strong> 비교에는 바 차트, 추세에는 라인 차트, 비율에는 파이 차트가 가장 효과적입니다.</li>
              <li><strong>ECharts 코드 복사:</strong> 생성된 ECharts 옵션 코드를 바로 프로젝트에 붙여넣어 사용하세요.</li>
              <li><strong>React 컴포넌트:</strong> React 앱에 바로 사용할 수 있는 컴포넌트 코드도 함께 제공됩니다.</li>
              <li><strong>PNG 내보내기:</strong> 완성된 차트를 이미지로 저장해 보고서·발표자료에 바로 삽입하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
