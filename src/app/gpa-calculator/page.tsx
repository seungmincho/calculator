import { Metadata } from 'next'
import GpaCalculator from '@/components/GpaCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '학점 계산기 - 대학교 GPA 평점 계산 | 툴허브',
  description: '과목별 학점과 성적을 넣으면 학기별·누적 평점(GPA)과 전공 평점을 바로 계산합니다. 4.5·4.3 만점 모두 지원하고, P/F 과목과 재수강 성적 대체, 성적표 붙여넣기, 목표 평점을 위해 남은 학점에서 받아야 할 평균 역산도 됩니다.',
  keywords: '학점 계산기, GPA 계산기, 대학교 학점, 평점 계산, 4.5 만점, 4.3 만점, 성적 계산기',
  openGraph: {
    title: '학점 계산기 | 툴허브',
    description: '대학교 학점(GPA) 계산기 - 4.5/4.3 만점 지원',
    url: 'https://toolhub.ai.kr/gpa-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/gpa-calculator.png', width: 1200, height: 630, alt: '학점 계산기' }] },
  twitter: { card: 'summary_large_image', title: '학점 계산기 | 툴허브', description: '대학교 학점(GPA) 계산기', images: ['https://toolhub.ai.kr/og/gpa-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/gpa-calculator/' },
}

export default function GpaCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '학점 계산기', description: '대학교 학점(GPA) 계산기 - 4.5/4.3 만점 지원',
    url: 'https://toolhub.ai.kr/gpa-calculator/', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4.5/4.3 만점제 지원', '학기별·누적 평점 계산', '전공 평점 계산', 'P/F 과목 처리', '재수강 성적 대체', '성적표 붙여넣기 입력', '목표 평점 역산'],
  }
  const faq = [
    { q: '4.5 만점과 4.3 만점의 차이는?', a: '4.5 만점제는 A+(4.5), A0(4.0), B+(3.5) 등으로 +가 0.5점 차이이며, 한국 대부분의 대학이 사용합니다. 4.3 만점제는 A+(4.3), A0(4.0), A-(3.7) 등으로 +/-가 0.3점 차이이며, 미국식 GPA와 유사합니다. 취업/대학원 지원 시 만점 기준이 다르므로 환산이 필요하며, 공인된 공식 환산법은 없어 보통 4.5 만점 ÷ 4.5 × 4.3 또는 × 4.0으로 비례 변환합니다. 지원처가 정한 환산표가 있으면 그 기준을 따르세요.' },
    { q: '취업에 필요한 최소 학점은?', a: '기업마다 다르고 학점 커트라인을 공개하지 않는 곳이 많아 정해진 기준은 없습니다. 삼성은 2015년 하반기 공채부터 기존 지원 자격이던 \'4.5 만점 3.0 이상\' 학점 제한을 없앴고, 공공기관은 2017년 블라인드 채용 도입 이후 입사지원서에 학력 사항을 적지 않게 하는 것이 원칙이라 학점 커트라인을 두는 곳이 드뭅니다. 지원 전에 채용 공고의 자격 요건을 확인하세요. 다만 학점은 서류 평가의 일부일 뿐이며, 면접, 자격증, 인턴 경험 등이 더 중요할 수 있습니다. 대학원 진학 시에는 3.5 이상을 권장합니다.' },
    { q: 'GPA를 미국 4.0 만점으로 환산하는 방법은?', a: '한국 4.5 만점을 미국 4.0 만점으로 환산하는 방법: ① 단순 환산: GPA × (4.0 ÷ 4.5) ≈ GPA × 0.889. 예: 3.8/4.5 → 3.38/4.0 ② WES 방식: 각 성적 등급을 미국 기준으로 재매핑. A+ → 4.0, A0 → 4.0, B+ → 3.3 등. 유학 시에는 WES(World Education Services) 공식 환산을 받는 것이 좋습니다.' },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <GpaCalculator />
              <ToolFaq items={faq} />
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
            대학교 학점 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            대학교 학점 계산기는 과목별 학점(이수학점)과 성적(A+·A0·B+ 등)을 입력하면 학기별 평점과 누적 GPA를 자동으로 계산합니다. 국내 대학에서 가장 많이 사용하는 4.5 만점제와 미국식 4.3 만점제를 모두 지원하며, 취업·대학원 지원 시 필요한 GPA 목표 달성 여부를 쉽게 파악할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            학점 관리 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>누적 평점 목표 설정:</strong> 과목을 입력해 계산된 누적 평점에 목표 GPA와 남은 이수학점을 넣으면, 남은 과목에서 받아야 할 평균 평점을 역산할 수 있습니다.</li>
            <li><strong>고학점 과목 전략:</strong> 이수학점이 많은 과목에서 높은 성적을 받아야 평점에 더 큰 영향을 미칩니다. 전공 필수 과목 학점 관리가 특히 중요합니다.</li>
            <li><strong>지원 기준 확인:</strong> 장학금·대학원·채용 공고에 학점 기준이 있다면, 공고에 적힌 만점 기준으로 내 평점이 그 기준을 넘는지 계산기로 확인하세요.</li>
            <li><strong>GPA 환산:</strong> 유학·해외 대학원 지원 시 4.5 만점을 미국식 4.0 만점으로 환산(× 0.889)하거나 WES 공식 환산을 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
