import { Metadata } from 'next'
import Link from 'next/link'
import SalaryRank from '@/components/SalaryRank'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import rankMessages from '../../../messages/generated/ko/ns/salaryRank.json'

const NEXT_STEPS = [
  { href: '/salary-calculator/', label: '연봉 실수령액 계산기', desc: '4대보험과 소득세를 뺀 월 실수령액을 정확히 계산합니다.' },
  { href: '/salary-table/', label: '연봉 실수령액 표', desc: '연봉 구간별 월 실수령액을 한 표로 비교합니다.' },
  { href: '/bonus-calculator/', label: '성과급 계산기', desc: '성과급·상여금에 붙는 세금과 실제로 받는 금액을 확인합니다.' },
]

export const metadata: Metadata = {
  title: '내 연봉 상위 몇 %? - 연봉 순위 계산기 | 툴허브',
  description: '내 연봉이 한국 전체에서 상위 몇 퍼센트인지 확인하세요. 국세청 근로소득 백분위 기준, 분포 곡선에서 내 위치와 연령대·성별 비교. 결과 카드 이미지 공유 가능.',
  keywords: '연봉 순위, 연봉 상위 퍼센트, 소득 분위, 연봉 비교, 평균 연봉, 중위 소득, 연봉 백분위',
  openGraph: {
    title: '내 연봉 상위 몇 %? | 툴허브',
    description: '내 연봉은 한국에서 상위 몇 %일까? 공식 데이터 기반 연봉 순위 계산',
    url: 'https://toolhub.ai.kr/salary-rank',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/salary-rank.png', width: 1200, height: 630, alt: '내 연봉 상위 몇 %?' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '내 연봉 상위 몇 %?',
    description: '국세청 데이터 기반 연봉 순위 확인',
    images: ['https://toolhub.ai.kr/og/salary-rank.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/salary-rank',
  },
}

export default function SalaryRankPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연봉 순위 계산기',
    description: '내 연봉이 한국에서 상위 몇 %인지 확인하는 계산기',
    url: 'https://toolhub.ai.kr/salary-rank/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국세청 근로소득 백분위(2023년 귀속) 기반 상위 % 계산',
      '근로소득 분포 곡선에서 내 위치와 다음 구간까지 필요한 연봉',
      '연령대·성별·직업군별 추정 비교, 월 실수령액 연결',
      '결과 카드 이미지 저장·공유 (카카오톡/SNS), 링크로 결과 재현',
      '익명 참여 커뮤니티 통계',
    ],
  }

  // 컴포넌트가 화면에 보여 주는 FAQ(salaryRank.faq.q1~q3)와 같은 문구로 JSON-LD 생성
  const faq = Object.values(rankMessages.salaryRank.faq).map(({ question, answer }) => ({ q: question, a: answer }))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={faq} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <SalaryRank />
              <nav aria-labelledby="salary-rank-next" className="ui-card p-6 mt-8">
                <h2 id="salary-rank-next" className="text-xl font-semibold text-fg mb-4">
                  다음으로 해볼 것
                </h2>
                <ul className="space-y-3">
                  {NEXT_STEPS.map((step) => (
                    <li key={step.href}>
                      <Link prefetch={false} href={step.href} className="font-medium text-primary hover:underline">
                        {step.label}
                      </Link>
                      <p className="text-sm text-sub mt-0.5">{step.desc}</p>
                    </li>
                  ))}
                </ul>
              </nav>
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
            연봉 순위 계산기 사용법
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-body mb-6">
            <li>기본급·상여금·수당을 합친 세전 연간 총급여를 입력합니다. 식대 같은 비과세 소득은 빼고 넣으세요.</li>
            <li>연령대·성별·직업군을 고르면 같은 그룹 안에서의 추정 순위도 함께 볼 수 있습니다(선택 사항).</li>
            <li>한국 근로소득자 중 상위 몇 %인지, 분포 곡선에서 내 위치, 다음 구간까지 더 벌어야 할 금액, 대략적인 월 실수령액을 확인합니다.</li>
            <li>결과 카드를 이미지로 저장하거나 링크로 공유하면 받은 사람도 같은 결과를 볼 수 있습니다.</li>
          </ol>
          <h3 className="text-lg font-semibold text-fg mb-3">
            결과를 볼 때 알아 둘 점
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>기준 데이터:</strong> 전체 순위는 국세청 국세통계연보의 근로소득 백분위(2023년 귀속)를 사용하고, 백분위 사이 값은 선형 보간한 추정치입니다.</li>
            <li><strong>그룹 순위는 참고용:</strong> 연령대·성별·직업군 순위는 공개 통계의 중위·평균값으로 만든 추정 분포입니다. 연령대와 성별을 함께 묶은 공개 통계는 없어 각각 따로 보여 줍니다.</li>
            <li><strong>근로소득만 비교:</strong> 자영업·프리랜서의 사업소득은 별도 통계라서 이 순위와 바로 비교하기 어렵습니다.</li>
            <li><strong>커뮤니티 통계:</strong> 참여자가 익명으로 직접 입력한 값이라 공식 통계와 다를 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
