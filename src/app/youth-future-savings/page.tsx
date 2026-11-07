import { Metadata } from 'next'
import YouthFutureSavings from '@/components/YouthFutureSavings'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/youthFutureSavings.json'

const TITLE = '청년미래적금 계산기 - 만기 수령액·정부기여금 | 툴허브'
const DESC = '월 납입액·금리·유형(일반형 6%·우대형 12%)을 넣으면 청년미래적금 3년 만기 수령액과 정부기여금, 비과세로 아낀 세금을 계산해요. 일반 적금 금리 환산, 가입 조건, 중도해지, 가입 신청 일정까지 금융위원회 자료 기준으로 정리했어요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '청년미래적금 계산기, 청년미래적금, 청년미래적금 만기, 청년미래적금 정부기여금, 청년미래적금 우대형, 청년미래적금 가입조건, 청년미래적금 중도해지, 청년미래적금 3차, 청년미래적금 vs 청년도약계좌, 청년 적금',
  openGraph: {
    title: TITLE,
    description: '청년미래적금 만기 수령액·정부기여금·비과세 효과와 일반 적금 비교',
    url: 'https://toolhub.ai.kr/youth-future-savings/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/youth-future-savings.png', width: 1200, height: 630, alt: '청년미래적금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '청년미래적금 계산기 | 툴허브', description: '만기 수령액·정부기여금·비과세 효과 계산', images: ['https://toolhub.ai.kr/og/youth-future-savings.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/youth-future-savings/' },
}

const faqs = messages.youthFutureSavings.guide.faq.items

export default function YouthFutureSavingsPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '청년미래적금 계산기',
    description: '청년미래적금(3년, 월 최대 50만원)의 만기 수령액·정부기여금(일반형 6%·우대형 12%)·비과세 효과를 계산하고 같은 금리 일반 적금과 비교하는 도구.',
    url: 'https://toolhub.ai.kr/youth-future-savings/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3년 만기 수령액(적금 단리)', '정부기여금과 기여금 이자(기본금리)', '비과세로 아낀 이자소득세', '일반 적금 금리 환산', '같은 금리 일반 적금 비교표', '나이·소득으로 예상 유형 확인', '중도해지·특별중도해지 정리', '가입 신청 일정'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <YouthFutureSavings />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
