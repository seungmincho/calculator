import { Metadata } from 'next'
import FormulaAmount from '@/components/FormulaAmount'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/formulaAmount.json'

const TITLE = '아기 분유량 계산기 - 신생아·100일 월령별 분유 하루 총량 | 툴허브'
const DESC = '월령과 체중으로 분유 하루 총량과 1회 수유량, 수유 간격, 분유 스푼 수를 계산해요. 보건복지부 아이사랑 기준(3개월까지 체중 1kg당 150~180mL, 3~6개월 약 120mL, 하루 960mL 이하)에 미국소아과학회 기준, 혼합수유 분유량, 분유 보관 시간까지 보여 줘요.'
const PAGE_URL = 'https://toolhub.ai.kr/formula-amount/'
const OG = 'https://toolhub.ai.kr/og/formula-amount.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '분유량 계산기, 신생아 분유량, 100일 아기 분유량, 분유 하루 총량, 월령별 분유량, 분유 수유량, 아기 분유 양, 혼합수유 분유량, 분유 스푼 계산, 분유 수유 간격, 개월별 분유량',
  openGraph: {
    title: TITLE,
    description: '월령·체중으로 계산하는 분유 하루 총량, 1회 수유량, 수유 간격과 스푼 수',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '아기 분유량 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '아기 분유량 계산기 | 툴허브', description: '월령·체중별 분유 하루 총량과 1회 수유량', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function FormulaAmountPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '아기 분유량 계산기',
    description: '아기 월령(또는 생년월일)과 체중으로 보건복지부 아이사랑 체중당 기준에 따라 하루 분유 총량, 1회 수유량, 평균 수유 간격, 1회 분유 스푼 수를 계산하고 미국소아과학회 기준, 혼합수유 분유량, 월령별 수유 표를 함께 보여 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '월령·체중별 하루 분유 총량(아이사랑 체중당 기준, 하루 960mL 상한)',
      '수유 횟수에 맞춘 1회 수유량과 평균 수유 간격',
      '분유통 1스푼당 물 양으로 1회 스푼 수 계산',
      '혼합수유 시 하루 분유량 추정',
      '미국소아과학회 기준 비교, 아이사랑 월령별 분유수유 표',
      '배고픔·배부름 신호, 분유 타는 법과 보관 시간',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.formulaAmount.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <FormulaAmount />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
