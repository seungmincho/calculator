import { Metadata } from 'next'
import ToastSpeech from '@/components/ToastSpeech'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { TOAST_CHANTS } from '@/utils/toastChants'
import messages from '../../../messages/generated/ko/ns/toastSpeech.json'

const N = TOAST_CHANTS.length
const TITLE = '건배사 모음 - 송년회·회식 건배 구호와 뜻 | 툴허브'
const DESC = `송년회·회식·신년회·환송회에 바로 쓰는 건배사 모음. 자리와 말투를 고르면 30초 건배사를 만들어 주고, 소화제·청바지·변사또·마무리·당나귀 같은 짧은 건배 구호 ${N}가지를 뜻과 선창·후창까지 정리했어요. 복사해서 바로 쓰세요.`
const PAGE_URL = 'https://toolhub.ai.kr/toast-speech/'
const OG = 'https://toolhub.ai.kr/og/toast-speech.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '건배사 모음, 건배사, 송년회 건배사, 회식 건배사, 신년회 건배사, 환송회 건배사, 건배 구호, 건배사 구호, 짧은 건배사, 재미있는 건배사, 웃긴 건배사, 거래처 건배사, 모임 건배사, 가족 건배사, 건배사 선창 후창, 소화제 건배사, 청바지 건배사, 변사또 건배사, 2026 송년회 건배사',
  openGraph: {
    title: TITLE,
    description: `자리별 건배사 만들기와 짧은 건배 구호 ${N}가지(뜻·선창·후창)`,
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '건배사 모음' }],
  },
  twitter: { card: 'summary_large_image', title: '건배사 모음 | 툴허브', description: `송년회·회식 건배사 만들기와 건배 구호 ${N}가지`, images: [OG] },
  alternates: { canonical: PAGE_URL },
}

const faqs = messages.toastSpeech.guide.faq.items

export default function ToastSpeechPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '건배사 모음',
    description: '송년회·회식·거래처·가족 모임 자리와 말투에 맞는 건배사를 만들고, 짧은 건배 구호의 뜻과 선창·후창을 모아 보여 주는 무료 도구.',
    url: PAGE_URL,
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['자리(회사·거래처·친구·가족)·말투·길이별 건배사 만들기', `짧은 건배 구호 ${N}가지와 뜻`, '구호마다 선창·후창 문구', '자리별 구호 골라 보기', '복사·카드 이미지 저장·링크 공유'],
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
            <ToastSpeech />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
