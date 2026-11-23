import { Metadata } from 'next'
import SalaryRaise from '@/components/SalaryRaise'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/salaryRaise.json'

const TITLE = '연봉 인상률 계산기 - 5% 인상 실수령 차이·물가 대비 실질 인상률 | 툴허브'
const DESC = '연봉 인상률·인상 후 연봉·인상액을 서로 환산하고 월 실수령이 실제로 얼마나 느는지 계산해요. 2026·2027년 4대보험 요율과 간이세액표, 물가 대비 실질 인상률, 인상률 0~15% 표, 10년 뒤 연봉, 이직 제시 연봉 비교까지.'
const PAGE_URL = 'https://toolhub.ai.kr/salary-raise/'
const OG = 'https://toolhub.ai.kr/og/salary-raise.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '연봉 인상률 계산기, 연봉 인상률 계산, 연봉 협상 인상률, 연봉 5% 인상 실수령, 연봉 인상 실수령 차이, 실질 임금 인상률, 물가 대비 연봉 인상, 이직 연봉 비교, 연봉 인상액 계산, 2027 연봉 협상',
  openGraph: {
    title: TITLE,
    description: '인상률을 넣으면 인상 후 연봉과 월 실수령 차이, 물가를 뺀 실질 인상률, 이직 제시 연봉 비교까지 한 번에',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '연봉 인상률 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '연봉 인상률 계산기 | 툴허브', description: '연봉 인상 후 월 실수령 차이와 물가 대비 실질 인상률', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function SalaryRaisePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '연봉 인상률 계산기',
    description: '현재 연봉과 인상률(또는 인상 후 연봉·인상액)로 인상 후 연봉, 월 실수령 차이, 실수령 인상률, 물가 대비 실질 인상률을 4대보험 요율과 근로소득 간이세액표 기준으로 계산하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '인상률·인상 후 연봉·인상액 서로 환산',
      '인상 전·후 월 실수령과 차이, 실수령 인상률',
      '인상분 가운데 세금·4대보험으로 빠지는 비율',
      '물가 대비 실질 인상률(한국은행 전망·국가데이터처 실적)',
      '인상률 0~15% 월 실수령 표와 1~10년 뒤 연봉',
      '이직 제시 연봉과 월 실수령 비교',
      '2026·2027년 4대보험 요율 선택',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.salaryRaise.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <SalaryRaise />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
