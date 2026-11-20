import { Metadata } from 'next'
import FeverMedicineDose from '@/components/FeverMedicineDose'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/feverMedicineDose.json'

const TITLE = '어린이 해열제 용량 계산기 - 체중별 타이레놀·부루펜 시럽 mL | 툴허브'
const DESC = '아이 체중과 나이로 해열제 시럽 1회 용량(mL)을 계산해요. 식약처 기준 아세트아미노펜 10~15mg/kg(4~6시간 간격), 이부프로펜 5~10mg/kg·덱시부프로펜 5~7mg/kg(6~8시간 간격)과 제품 설명서 표, 교차복용 간격, 복용 기록을 함께 보여 줘요.'
const PAGE_URL = 'https://toolhub.ai.kr/fever-medicine-dose/'
const OG = 'https://toolhub.ai.kr/og/fever-medicine-dose.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '해열제 용량, 해열제 용량 계산기, 어린이 해열제 용량, 타이레놀 시럽 용량, 부루펜 시럽 용량, 맥시부펜 용량, 챔프 시럽 용량, 해열제 교차복용, 아기 해열제 몸무게, 아세트아미노펜 시럽 용량, 이부프로펜 시럽 용량, 덱시부프로펜 용량',
  openGraph: {
    title: TITLE,
    description: '체중으로 계산하는 어린이 해열제 시럽 1회 mL, 복용 간격·하루 최대량, 교차복용 간격과 복용 기록',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '어린이 해열제 용량 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '어린이 해열제 용량 계산기 | 툴허브', description: '체중별 타이레놀·부루펜·맥시부펜 시럽 1회 mL와 복용 간격', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function FeverMedicineDosePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '어린이 해열제 용량 계산기',
    description: '아이 체중·나이와 시럽 제품(농도)으로 아세트아미노펜·이부프로펜·덱시부프로펜 1회 권장량(mg·mL), 복용 간격, 하루 최대 횟수·총량을 식약처 안내와 의약품 허가사항 기준으로 계산하고 복용 기록으로 다음 복용 가능 시각을 알려 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '체중 기준 1회 권장 범위(mg·mL), 반올림해도 1회 최대를 넘지 않음',
      '어린이타이레놀·챔프·세토펜·콜대원키즈펜·부루펜·챔프이부펜·콜대원키즈이부펜·맥시부펜 시럽 농도 자동',
      '제품 허가 표에서 아이에 해당하는 줄과 비교',
      '복용 간격, 하루 최대 횟수·총량, 나이 기준 안내',
      '복용 기록으로 성분별 다음 복용 가능 시각과 교차복용 간격 확인',
      '진료가 먼저 필요한 신호와 근거 출처',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.feverMedicineDose.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <FeverMedicineDose />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
