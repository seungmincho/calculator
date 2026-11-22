import { Metadata } from 'next'
import BabyVaccination from '@/components/BabyVaccination'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/babyVaccination.json'

const TITLE = '아기 예방접종 일정표 - 생년월일로 접종 시기 계산 | 툴허브'
const DESC = '생년월일만 넣으면 질병관리청 2026 표준예방접종일정표로 BCG·B형간염·DTaP·폴리오·Hib·폐렴구균·로타·MMR·수두·A형간염·일본뇌염 접종 날짜와 다음 접종 D-day, 이번 달 할 일, 영유아 건강검진·구강검진 시기를 보여 주고 캘린더(.ics)에 넣어 줘요.'
const PAGE_URL = 'https://toolhub.ai.kr/baby-vaccination/'
const OG = 'https://toolhub.ai.kr/og/baby-vaccination.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '예방접종 일정표, 아기 예방접종, 예방접종 시기, 영유아 건강검진 시기, 생후 2개월 예방접종, 국가예방접종, 표준예방접종일정표 2026, 아기 예방접종 일정 계산기, 로타바이러스 접종, 일본뇌염 접종 시기, 영유아 구강검진',
  openGraph: {
    title: TITLE,
    description: '생년월일로 2026 표준예방접종 날짜, 다음 접종 D-day, 영유아 건강검진 시기 확인',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '아기 예방접종 일정 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '아기 예방접종 일정 계산기 | 툴허브', description: '생년월일로 표준예방접종 날짜·다음 접종 D-day·영유아 건강검진 시기', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function BabyVaccinationPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '아기 예방접종 일정 계산기',
    description: '아이 생년월일로 질병관리청 2026 표준예방접종일정표의 백신별 차수를 권장 날짜로 바꾸고, 다음 접종 D-day와 이번 달 할 일, 국민건강보험공단 영유아 건강검진·구강검진 기간, 국가예방접종 지원 조건을 보여 주는 도구.',
    url: PAGE_URL,
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2026 표준예방접종일정표 백신별 차수를 생년월일 기준 날짜로',
      '로타바이러스 제품(RV1 2회·RV5 3회), 일본뇌염 불활성화·생백신 선택',
      '다음 접종 D-day와 이번 달 해야 할 접종·검진',
      '접종 완료 체크(브라우저 저장)로 다음 접종 다시 계산',
      '영유아 건강검진 1~8차·구강검진 1~4차 기간과 상태',
      '남은 접종·검진을 캘린더(.ics)로 내보내기',
      '국가예방접종 지원 대상·인플루엔자 절기 안내와 출처',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.babyVaccination.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <BabyVaccination />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
