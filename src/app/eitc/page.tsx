import { Metadata } from 'next'
import Eitc from '@/components/Eitc'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/eitc.json'

const TITLE = '근로장려금 계산기 - 2026 자녀장려금 예상액 | 툴허브'
const DESC = '총급여액·재산·자녀 수를 넣으면 근로장려금과 자녀장려금 예상액을 계산해요. 단독 최대 165만원·홑벌이 285만원·맞벌이 330만원, 자녀 1명당 최대 100만원. 시행령 산정표대로 재산 1억 7천만원 이상 50% 감액, 기한 후 신청 95%, 자녀세액공제 차감까지 반영합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '근로장려금 계산기, 자녀장려금 계산기, 근로장려금 모의계산, 근로장려금 지급액, 근로장려금 재산 기준, 근로장려금 맞벌이, 근로장려금 홑벌이, 근로장려금 반기 신청, 근로장려금 기한 후 신청, 2026 근로장려금, 2027 근로장려금',
  openGraph: {
    title: TITLE,
    description: '근로·자녀장려금 예상액 — 가구 유형·총급여액·재산·자녀 수로 법령 산정표 기준 계산',
    url: 'https://toolhub.ai.kr/eitc/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/eitc.png', width: 1200, height: 630, alt: '근로·자녀장려금 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '근로장려금 계산기 | 툴허브', description: '근로장려금·자녀장려금 예상액 계산', images: ['https://toolhub.ai.kr/og/eitc.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/eitc/' },
}

const faqs = messages.eitc.guide.faq.items

export default function EitcPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '근로·자녀장려금 계산기',
    description: '조세특례제한법과 시행령 별표 11·11의2 산정표로 2025·2026년 소득분 근로장려금·자녀장려금 예상액을 계산하는 도구. 가구 유형, 총급여액 등(사업소득 업종별 조정률), 재산, 부양자녀 수, 신청 방식(정기·기한 후·반기)을 반영한다.',
    url: 'https://toolhub.ai.kr/eitc/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['단독·홑벌이·맞벌이 총소득 기준(2,200만·3,200만·4,400만원 미만)', '근로장려금 산정표(점증·평탄·점감 구간)', '재산 1억 7천만원 이상 50% 감액·2억 4천만원 이상 제외', '자녀장려금 자녀 1명당 50만~100만원, 자녀세액공제 차감', '기한 후 신청 95%·반기 신청 35% 선지급', '가구 유형별 비교와 소득 변화 시뮬레이션'],
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
            <Eitc />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
