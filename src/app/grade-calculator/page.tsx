import { Metadata } from 'next'
import GradeCalculator from '@/components/GradeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '내신 등급 계산기 - 5등급·9등급 석차 계산 | 툴허브',
  description: '과목별 석차·동석차·수강자수로 내신 등급과 단위수 가중 평균을 계산합니다. 2025 고1부터 적용되는 5등급제와 기존 9등급제를 모두 지원하고 등급별 석차 구간을 보여줍니다.',
  keywords: '석차 등급 계산기, 내신 등급 계산기, 5등급제, 고교학점제 내신, 9등급제, 동석차, 중간석차, 백분위 계산, 등급컷, 석차 백분위, 고교 등급',
  openGraph: { title: '석차/등급 계산기 | 툴허브', description: '5등급·9등급 내신 등급·평균 자동 계산', url: 'https://toolhub.ai.kr/grade-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '석차/등급 계산기 | 툴허브' },
  alternates: { canonical: 'https://toolhub.ai.kr/grade-calculator/' },
}

export default function GradeCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '석차/등급 계산기', description: '석차·백분위·내신등급 자동 계산.', url: 'https://toolhub.ai.kr/grade-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['5등급제·9등급제 등급 산출', '동석차 중간석차 반영', '단위수 가중 평균 등급', '수강자수별 석차 구간표', '공유 링크'] }
  const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: '내신 5등급제는 언제부터 적용되나요?', acceptedAnswer: { '@type': 'Answer', text: '2025학년도 고등학교 1학년 입학생부터 5등급 상대평가가 적용됩니다. 1등급 상위 10%, 2등급 34%, 3등급 66%, 4등급 90%, 5등급 100%까지입니다. 2024년 이전 입학생은 기존 9등급제(1등급 4%, 2등급 11%, 3등급 23% …)를 따릅니다.' } },
    { '@type': 'Question', name: '동석차가 있으면 등급은 어떻게 매기나요?', acceptedAnswer: { '@type': 'Answer', text: '중간석차 = 석차 + (동석차수 - 1) / 2 로 계산한 뒤 중간석차 백분율로 등급을 부여합니다. 예를 들어 96명 중 1등 동점자가 7명이면 중간석차 4, 백분율 4.17%로 9등급제에서는 모두 2등급입니다.' } },
  ]}

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper><GradeCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
    </>
  )
}
