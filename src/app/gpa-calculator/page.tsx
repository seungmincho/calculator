import { Metadata } from 'next'
import { Suspense } from 'react'
import GpaCalculator from '@/components/GpaCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '학점 계산기 - 대학교 GPA 평점 계산 | 툴허브',
  description: '대학교 학점 계산기 - 과목별 학점과 성적을 입력하여 학기별, 누적 평점(GPA)을 계산하세요. 4.5 만점, 4.3 만점 모두 지원합니다.',
  keywords: '학점 계산기, GPA 계산기, 대학교 학점, 평점 계산, 4.5 만점, 4.3 만점, 성적 계산기',
  openGraph: {
    title: '학점 계산기 | 툴허브',
    description: '대학교 학점(GPA) 계산기 - 4.5/4.3 만점 지원',
    url: 'https://toolhub.ai.kr/gpa-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '학점 계산기 | 툴허브', description: '대학교 학점(GPA) 계산기' },
  alternates: { canonical: 'https://toolhub.ai.kr/gpa-calculator' },
}

export default function GpaCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '학점 계산기', description: '대학교 학점(GPA) 계산기 - 4.5/4.3 만점 지원',
    url: 'https://toolhub.ai.kr/gpa-calculator', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4.5/4.3 만점제 지원', '학기별 평점 계산', '누적 평점 계산', '과목 추가/삭제'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '4.5 만점과 4.3 만점의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '4.5 만점제는 A+(4.5), A0(4.0), B+(3.5) 등으로 +가 0.5점 차이이며, 한국 대부분의 대학이 사용합니다. 4.3 만점제는 A+(4.3), A0(4.0), A-(3.7) 등으로 +/-가 0.3점 차이이며, 미국식 GPA와 유사합니다. 취업/대학원 지원 시 만점 기준이 다르므로 환산이 필요하며, 보통 4.5 만점 ÷ 4.5 × 4.3 또는 × 4.0으로 변환합니다.' } },
      { '@type': 'Question', name: '취업에 필요한 최소 학점은?', acceptedAnswer: { '@type': 'Answer', text: '대기업 기준 최소 학점 커트라인은 보통 4.5 만점 기준 3.0~3.5 이상이며, 삼성은 서류 단계에서 학점을 반영합니다. 공기업은 3.0 이상을 요구하는 곳이 많습니다. 다만 학점은 서류 평가의 일부일 뿐이며, 면접, 자격증, 인턴 경험 등이 더 중요할 수 있습니다. 대학원 진학 시에는 3.5 이상을 권장합니다.' } },
      { '@type': 'Question', name: 'GPA를 미국 4.0 만점으로 환산하는 방법은?', acceptedAnswer: { '@type': 'Answer', text: '한국 4.5 만점을 미국 4.0 만점으로 환산하는 방법: ① 단순 환산: GPA × (4.0 ÷ 4.5) ≈ GPA × 0.889. 예: 3.8/4.5 → 3.38/4.0 ② WES 방식: 각 성적 등급을 미국 기준으로 재매핑. A+ → 4.0, A0 → 4.0, B+ → 3.3 등. 유학 시에는 WES(World Education Services) 공식 환산을 받는 것이 좋습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper><GpaCalculator /></I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
