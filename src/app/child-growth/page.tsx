import { Metadata } from 'next'
import ChildGrowth from '@/components/ChildGrowth'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/childGrowth.json'

const TITLE = '아이 키 백분위 계산기 - 성장도표·예상키 | 툴허브'
const DESC = '성별·나이·키·몸무게를 넣으면 2017 소아청소년 성장도표(질병관리청·대한소아청소년과학회)로 키·몸무게·BMI 백분위와 또래 100명 중 몇 번째인지 알려 드려요. 부모 키로 본 예상 성인 키와 3·50·97백분위수 성장 곡선까지.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '아이 키 백분위, 성장도표 계산기, 소아 키 백분위, 예상키 계산기, 몇 퍼센트 키, 소아청소년 성장도표, 2017 성장도표, 키 백분위수, 아이 예상키, 부모 키 예상키, 저신장 기준, 소아 BMI 백분위',
  openGraph: {
    title: TITLE,
    description: '2017 소아청소년 성장도표로 아이 키·몸무게·BMI 백분위와 부모 키 예상 성인 키 계산',
    url: 'https://toolhub.ai.kr/child-growth/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/child-growth.png', width: 1200, height: 630, alt: '아이 키 백분위 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '아이 키 백분위 계산기 | 툴허브', description: '성장도표 키·몸무게 백분위와 예상 성인 키', images: ['https://toolhub.ai.kr/og/child-growth.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/child-growth/' },
}

const faqs = messages.childGrowth.guide.faq.items

export default function ChildGrowthPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '아이 키 백분위·예상키 계산기',
    description: '2017 소아청소년 성장도표(만 3세 미만은 WHO 기준)로 아이의 키·몸무게·체질량지수 백분위를 계산하고, 부모 키로 예상 성인 키를 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/child-growth/',
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2017 소아청소년 성장도표 키·몸무게·BMI 백분위', '또래 100명 중 순위 문구', '저신장·저체중·과체중·비만 선별 기준 안내', '부모 키로 본 예상 성인 키(중간 부모 키)', '3·50·97백분위수 키 성장 곡선', '생년월일 또는 개월 수 입력'],
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
            <ChildGrowth />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
