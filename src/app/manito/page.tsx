import { Metadata } from 'next'
import Manito from '@/components/Manito'
import DecisionToolsBar from '@/components/DecisionToolsBar'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/manito.json'

const TITLE = '마니또 뽑기 - 단톡방 링크 하나로 몰래 확인 | 툴허브'
const DESC = '이름만 넣으면 맞뽑기 없이 마니또를 정하고 단톡방에 링크 하나만 보내면 끝. 각자 자기 이름을 눌러 선물 상자를 열면 자기 마니또만 보여요. 반 번호 채우기, QR, 폰 돌려 보기, 커플 제외, 미션까지 무료.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '마니또 뽑기, 마니또 정하기, 마니또 랜덤, 마니또 추첨, 마니또 사이트, 온라인 마니또, 단톡방 마니또, 학급 마니또, 반 마니또, 시크릿 산타, 마니또 미션, 송년회 마니또, 크리스마스 마니또',
  openGraph: {
    title: TITLE,
    description: '내 이름을 누르고 선물 상자를 열면 내 마니또가 나와요.',
    url: 'https://toolhub.ai.kr/manito/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/manito.png', width: 1200, height: 630, alt: '마니또 뽑기' }],
  },
  twitter: { card: 'summary_large_image', title: '마니또 뽑기 | 툴허브', description: '내 이름을 누르고 선물 상자를 열면 내 마니또가 나와요.', images: ['https://toolhub.ai.kr/og/manito.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/manito/' },
}

const faqs = messages.manito.guide.faq.items

export default function ManitoPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '마니또 뽑기',
    description: '참가자를 한 바퀴로 이어 마니또를 정하고, 단톡방 링크 하나로 각자 자기 마니또만 확인하는 도구.',
    url: 'https://toolhub.ai.kr/manito/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3~50명 한 바퀴 배정(서로 맞뽑기 없음)', '단톡방 링크 하나로 각자 이름 골라 확인', 'QR 코드·폰 하나로 돌려 보기', '사람별 개인 확인 링크', '서로 뽑지 않기 규칙(커플·가족)', '반 번호로 명단 채우기', '선물 예산·교환일·안내 메모', '교환일 캘린더 저장(.ics)', '오늘의 마니또 미션'],
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
          <div className="mb-6"><DecisionToolsBar current="/manito" /></div>
          <I18nWrapper>
            <Manito />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
