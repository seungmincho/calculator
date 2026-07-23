import { Metadata } from 'next'
import { Suspense } from 'react'
import GpaConverter from '@/components/GpaConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '학점 변환기 - 4.5 4.3 4.0 백분율 변환 | 툴허브',
  description: '4.5·4.3·4.0 만점 학점과 백분율(100점)을 한 번에 상호 변환하고 등급(A+~F)까지 확인하는 학점 변환기. 취업·대학원·해외 유학 지원 시 학점 환산에 사용하세요.',
  keywords: '학점 변환기, 4.3 4.5 변환, 4.5 4.3 학점, 학점 백분위 변환, GPA 변환, 4.0 학점 변환, 학점 등급표, 대학원 학점 환산, 백분율 학점',
  openGraph: {
    title: '학점 변환기 - 4.5·4.3·4.0·백분율 | 툴허브',
    description: '학점을 4.5·4.3·4.0·백분율로 한 번에 변환 + 등급 확인',
    url: 'https://toolhub.ai.kr/gpa-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '학점 변환기 - 4.5·4.3·4.0·백분율 | 툴허브',
    description: '학점을 전 스케일로 한 번에 변환',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/gpa-converter/',
  },
}

export default function GpaConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '학점 변환기',
    description: '4.5·4.3·4.0 만점 학점과 백분율을 상호 변환하고 등급을 확인하는 도구',
    url: 'https://toolhub.ai.kr/gpa-converter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4.5·4.3·4.0 만점 상호 변환', '백분율(100점) 환산', '등급(A+~F) 표시', '등급 참고표', '결과 이미지 저장', '링크 공유'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '4.5 만점 학점을 4.3으로 어떻게 변환하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '가장 일반적인 방법은 4.5만점 학점에 4.3/4.5(≈0.9556)를 곱하는 것입니다. 예를 들어 4.5만점 3.8은 3.8×(4.3/4.5)≈3.63/4.3이 됩니다. 이 변환기는 값을 한 번 입력하면 4.5·4.3·4.0·백분율 환산값과 등급을 동시에 보여줍니다.',
        },
      },
      {
        '@type': 'Question',
        name: '같은 3.5라도 4.3 만점과 4.5 만점은 수준이 다른가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 다릅니다. 4.3 만점 3.5는 약 81%(B+~A0), 4.5 만점 3.5는 약 78%(B+) 수준입니다. 같은 숫자라도 만점 기준에 따라 실제 성취 수준이 다르므로 지원 시 만점 기준을 함께 표기해야 합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '해외 대학원(미국 4.0) 지원 시 학점 변환은 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '미국식 4.0 만점으로는 대략 (내 학점 ÷ 내 만점) × 4.0으로 선형 환산할 수 있습니다. 다만 공인된 단일 기준은 없으며, 중요한 지원에는 WES 등 학력 인증 기관의 공식 환산(iGPA)을 이용하는 것이 안전합니다.',
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
          <Suspense fallback={null}>
            <I18nWrapper>
              <GpaConverter />
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">학점 변환기란?</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            학점 변환기는 4.5 만점, 4.3 만점, 4.0 만점 학점과 백분율(100점) 성적을 서로 변환해 주는 도구입니다. 값을 한 번만 입력하면 나머지 모든 체계의 환산값과 등급(A+~F)을 동시에 보여주므로, 취업·대학원·편입·해외 유학 지원처럼 학교마다 다른 학점 체계를 요구할 때 유용합니다. 결과는 링크로 공유하거나 이미지로 저장할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4.5 만점 vs 4.3 만점 차이</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-6">
            <li><strong>4.5 만점:</strong> A+(4.5), A0(4.0), B+(3.5), B0(3.0)… 국내 다수 대학이 사용.</li>
            <li><strong>4.3 만점:</strong> A+(4.3), A0(4.0), B+(3.3), B0(3.0)… 일부 대학·미국식 +/- 체계에 가까움.</li>
            <li><strong>변환 공식:</strong> 4.5→4.3은 ×(4.3/4.5)≈0.9556, 4.3→4.5는 ×(4.5/4.3)≈1.0465로 선형 환산.</li>
            <li><strong>주의:</strong> 백분율·등급 기준은 학교/교수마다 달라, 공식 성적증명서의 환산 기준을 함께 확인하세요.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">함께 쓰면 좋은 도구</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>학점 계산기:</strong> 과목별 성적을 입력해 학기·전체 평점(GPA)을 직접 계산.</li>
            <li><strong>내신 등급 계산기:</strong> 석차와 총원으로 고등학교 내신 1~9등급과 백분위를 계산.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
