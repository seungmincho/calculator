import { Metadata } from 'next'
import CsatGrade from '@/components/CsatGrade'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import csatGradeMessages from '../../../messages/generated/ko/ns/csatGrade.json'

export const metadata: Metadata = {
  title: '수능 등급컷 계산기 - 과목별 등급 판정 | 툴허브',
  description: '2026학년도 수능 과목별 원점수를 입력하면 등급을 즉시 확인합니다. 국어, 수학, 영어, 한국사, 탐구 과목별 등급컷 표와 등급 산출 방식을 안내합니다.',
  keywords: '수능 등급컷, 수능 등급 계산기, 수능 등급컷 계산, 2026 수능, 수능 과목별 등급, 영어 등급컷, 수학 등급컷',
  openGraph: {
    title: '수능 등급컷 계산기 | 툴허브',
    description: '2026 수능 과목별 원점수→등급 즉시 확인',
    url: 'https://toolhub.ai.kr/csat-grade/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/csat-grade.png', width: 1200, height: 630, alt: '수능 등급컷 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '수능 등급컷 계산기 | 툴허브',
    description: '수능 과목별 등급 판정 및 등급컷 확인',
    images: ['https://toolhub.ai.kr/og/csat-grade.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/csat-grade/',
  },
}

export default function CsatGradePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '수능 등급컷 계산기',
    description: '2026학년도 수능 과목별 등급 판정 계산기',
    url: 'https://toolhub.ai.kr/csat-grade/',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '과목별 원점수→등급 변환',
      '영어·한국사 절대평가 등급',
      '등급컷 비교표',
      'URL 공유 기능',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={csatGradeMessages.csatGrade.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <CsatGrade />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
