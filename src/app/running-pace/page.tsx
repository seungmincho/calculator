import type { Metadata } from 'next'
import RunningPaceCalculator from '@/components/RunningPaceCalculator'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '러닝·마라톤 페이스 계산기 | 툴허브',
  description: '5km·10km·하프·풀마라톤 목표 시간과 페이스를 서로 계산하고 1km·5km 누적 스플릿을 확인하세요.',
  keywords: '러닝 페이스 계산기, 마라톤 페이스, 하프마라톤 페이스, 5km 기록, 10km 기록, km당 페이스, 스플릿 시간',
  alternates: { canonical: 'https://toolhub.ai.kr/running-pace/' },
  openGraph: {
    title: '러닝·마라톤 페이스 계산기 | 툴허브',
    description: '거리와 목표 시간 또는 페이스로 완주 시간·속도·누적 스플릿을 계산하세요.',
    url: 'https://toolhub.ai.kr/running-pace/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
}

export default function RunningPacePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '러닝·마라톤 페이스 계산기',
    description: '러닝 거리와 목표 시간 또는 페이스로 완주 시간과 누적 스플릿을 계산합니다.',
    url: 'https://toolhub.ai.kr/running-pace/', applicationCategory: 'SportsApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RunningPaceCalculator />
          <div className="mt-8 print:hidden"><RelatedTools /></div>
        </div>
      </div>
    </>
  )
}
