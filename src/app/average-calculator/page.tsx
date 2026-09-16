import { Metadata } from 'next'
import AverageCalculator from '@/components/AverageCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '가중평균 계산기 - 산술·기하·조화 평균 | 툴허브',
  description: '가중평균(값×가중치)과 산술평균, 기하평균, 조화평균을 한 번에 계산합니다. 성적·학점·투자 비중 등 중요도가 다른 값의 평균과 분산·표준편차·중앙값까지 확인하세요.',
  keywords: '가중평균 계산기, 가중평균 구하는법, 산술가중, 산술평균 계산기, 가중치 평균, 평균 계산기, 학점 가중평균, 성적 가중평균, 기하평균, 조화평균, 표준편차, 분산, 중앙값',
  openGraph: { title: '가중평균 계산기 - 산술·기하·조화 | 툴허브', description: '가중평균(값×가중치) + 4종 평균 + 기초 통계를 한 번에', url: 'https://toolhub.ai.kr/average-calculator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '가중평균 계산기 | 툴허브', description: '가중평균 + 산술·기하·조화 평균 계산' },
  alternates: { canonical: 'https://toolhub.ai.kr/average-calculator/' },
}

export default function AverageCalculatorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '가중평균 계산기', description: '가중평균과 산술·기하·조화 평균, 기초 통계를 계산하는 도구.', url: 'https://toolhub.ai.kr/average-calculator/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['가중평균(값×가중치)', '산술평균', '기하평균', '조화평균', '분산·표준편차', '중앙값'] }
  const faqJsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: '가중평균은 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '가중평균 = (각 값 × 가중치)의 합 ÷ 가중치의 합 입니다. 예를 들어 점수 90(가중치 3), 80(가중치 1)이면 (90×3 + 80×1) ÷ (3+1) = 350÷4 = 87.5가 됩니다. 이 계산기에 값과 가중치를 입력하면 자동으로 구해집니다.' } },
    { '@type': 'Question', name: '산술평균과 가중평균의 차이는?', acceptedAnswer: { '@type': 'Answer', text: '산술평균은 모든 값을 동일하게 더해 개수로 나눕니다. 가중평균은 각 값에 가중치를 곱한 합을 가중치 합으로 나눠, 학점(과목별 이수학점)이나 투자 비중처럼 중요도가 다른 데이터에 적합합니다.' } },
    { '@type': 'Question', name: '기하평균은 언제 사용하나요?', acceptedAnswer: { '@type': 'Answer', text: '기하평균은 성장률, 수익률 등 비율 데이터의 평균을 구할 때 사용합니다. 예를 들어 3년간 수익률이 10%, 20%, -5%일 때 기하평균으로 연평균 수익률을 구합니다.' } },
  ]}

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper><AverageCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">가중평균 계산기란?</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            가중평균 계산기는 각 값에 서로 다른 중요도(가중치)를 반영해 평균을 구하는 도구입니다. 값과 가중치를 입력하면 가중평균은 물론 산술평균·기하평균·조화평균, 그리고 분산·표준편차·중앙값 같은 기초 통계까지 한 번에 계산합니다. 성적 산출, 학점(GPA) 계산, 투자 포트폴리오 비중 평균, 설문 점수 집계 등 중요도가 다른 데이터를 다룰 때 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">가중평균 공식과 예시</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-6">
            <li><strong>공식:</strong> 가중평균 = Σ(값 × 가중치) ÷ Σ(가중치)</li>
            <li><strong>예시(성적):</strong> 중간 80점(가중치 40%), 기말 90점(가중치 60%) → (80×40 + 90×60) ÷ 100 = 86점</li>
            <li><strong>예시(학점):</strong> A(4.5, 3학점), B+(3.5, 2학점) → (4.5×3 + 3.5×2) ÷ 5 = 4.1</li>
            <li><strong>산술평균과 비교:</strong> 위 성적을 단순 산술평균하면 85점이지만, 기말 비중이 크므로 가중평균은 86점이 됩니다.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4가지 평균, 언제 쓰나요?</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>산술평균:</strong> 모든 값의 중요도가 같을 때 (가장 기본).</li>
            <li><strong>가중평균:</strong> 값마다 중요도·비중이 다를 때 (성적, 학점, 포트폴리오).</li>
            <li><strong>기하평균:</strong> 성장률·수익률 등 비율의 평균 (연평균 수익률).</li>
            <li><strong>조화평균:</strong> 속도·비율의 평균 (평균 속력, F1 점수).</li>
          </ul>
        </div>
      </section>
    </>
  )
}
