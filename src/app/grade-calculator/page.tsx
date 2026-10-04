import { Metadata } from 'next'
import GradeCalculator from '@/components/GradeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import gradeCalcMessages from '../../../messages/generated/ko/ns/gradeCalc.json'

export const metadata: Metadata = {
  title: '내신 등급 계산기 - 5등급·9등급 석차 계산 | 툴허브',
  description: '과목별 석차·동석차·수강자수로 내신 등급과 단위수 가중 평균을 계산합니다. 2025 고1부터 적용되는 5등급제와 기존 9등급제를 모두 지원하고 등급별 석차 구간을 보여줍니다.',
  keywords: '석차 등급 계산기, 내신 등급 계산기, 5등급제, 고교학점제 내신, 9등급제, 동석차, 중간석차, 백분위 계산, 등급컷, 석차 백분위, 고교 등급',
  openGraph: { title: '석차/등급 계산기 | 툴허브', description: '5등급·9등급 내신 등급·평균 자동 계산', url: 'https://toolhub.ai.kr/grade-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/grade-calculator.png', width: 1200, height: 630, alt: '석차/등급 계산기' }] },
  twitter: { card: 'summary_large_image', title: '석차/등급 계산기 | 툴허브', images: ['https://toolhub.ai.kr/og/grade-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/grade-calculator/' },
}

export default function GradeCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '석차/등급 계산기', description: '석차·백분위·내신등급 자동 계산.', url: 'https://toolhub.ai.kr/grade-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['5등급제·9등급제 등급 산출', '동석차 중간석차 반영', '단위수 가중 평균 등급', '수강자수별 석차 구간표', '공유 링크'] }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={gradeCalcMessages.gradeCalc.guide.faq.items} />
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
