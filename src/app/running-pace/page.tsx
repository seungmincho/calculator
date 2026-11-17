import type { Metadata } from 'next'
import RunningPaceCalculator from '@/components/RunningPaceCalculator'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import runningMessages from '../../../messages/generated/ko/runningPace.json'

const TITLE = '러닝 페이스 계산기 - 목표 시간 3개·구간표 비교 | 툴허브'
const DESCRIPTION = '5km·10km·하프·마라톤의 시간과 페이스를 계산하고 같은 거리의 목표 완주시간을 최대 3개 비교하세요. 1km·5km 누적 구간표 전체 TSV·CSV·인쇄와 숫자 조건 링크 공유를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '러닝 페이스 계산기, 마라톤 페이스, 하프마라톤 페이스, 5km 기록, 10km 기록, km당 페이스, 스플릿 시간',
  alternates: { canonical: 'https://toolhub.ai.kr/running-pace/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/running-pace/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/running-pace.png', width: 1200, height: 630, alt: '러닝·마라톤 페이스 계산기' }],
  },
  twitter: {
    card: 'summary_large_image', title: TITLE, description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/running-pace.png'],
  },
}

export default function RunningPacePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '러닝·마라톤 페이스 계산기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/running-pace/', applicationCategory: 'SportsApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['완주시간·페이스 양방향 계산', '최대 3개 목표 완주시간 비교', '1km·5km 누적 구간표', '전체 비교 TSV·CSV·인쇄', '숫자 조건 링크 공유', '복사 실패 원문 선택·재시도'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RunningPaceCalculator />
          <div className="print:hidden"><ToolFaq items={runningMessages.runningPace.guide.faq} /></div>
          <div className="mt-8 print:hidden"><RelatedTools /></div>
        </div>
      </div>
    </>
  )
}
