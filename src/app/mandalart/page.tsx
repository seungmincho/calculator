import { Metadata } from 'next'
import Mandalart from '@/components/Mandalart'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/mandalart.json'

const TITLE = '만다라트 계획표 만들기 - 양식 무료 작성·이미지 저장 | 툴허브'
const DESC = '핵심 목표 1개, 세부 목표 8개, 실천 항목 64칸의 만다라트 양식을 바로 채워요. 공부·건강·이직·재테크·새해 습관 예시 템플릿, 자동 저장, 이미지 저장, A4 인쇄, 공유 링크, 실천 체크와 진행률까지 무료로.'
const PAGE_URL = 'https://toolhub.ai.kr/mandalart/'
const OG = 'https://toolhub.ai.kr/og/mandalart.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '만다라트, 만다라트 양식, 만다라트 계획표, 만다라트 예시, 신년 목표 계획표, 만다라트 작성법, 만다라 차트, 오타니 만다라트, 새해 목표, 목표 달성 계획표',
  openGraph: {
    title: TITLE,
    description: '9×9 만다라트를 블록별로 채우고 이미지·인쇄·링크로 남기는 신년 목표 계획표',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '만다라트 계획표 만들기' }],
  },
  twitter: { card: 'summary_large_image', title: '만다라트 계획표 만들기 | 툴허브', description: '만다라트 양식 무료 작성, 예시 템플릿, 이미지 저장·인쇄·공유', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function MandalartPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '만다라트 계획표 만들기',
    description: '핵심 목표 1개, 세부 목표 8개, 실천 항목 64개로 이루어진 9×9 만다라트를 블록별로 채우고, 브라우저 자동 저장·PNG 이미지·A4 가로 인쇄·압축 공유 링크로 남기며 실천 체크로 진행률을 확인하는 목표 계획 도구.',
    url: PAGE_URL,
    applicationCategory: 'ProductivityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '9×9 만다라트 — 세부 목표는 한 번만 쓰면 바깥 블록 가운데에 자동 반영',
      '모바일용 블록 편집(미니맵·이전/다음)과 전체 보기',
      '공부·시험, 건강·다이어트, 커리어·이직, 재테크, 새해 생활 습관 예시 템플릿',
      '실천 칸마다 했어요 체크, 블록별·전체 진행률',
      '브라우저 자동 저장, PNG 이미지 저장, A4 가로 인쇄',
      '압축 공유 링크(받는 사람의 표는 저장을 고르기 전까지 그대로)',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.mandalart.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <Mandalart />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
