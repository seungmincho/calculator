import type { Metadata } from 'next'
import EverlandWaitTimes from '@/components/EverlandWaitTimes'
import RelatedTools from '@/components/RelatedTools'
export const metadata: Metadata = {
  title: '에버랜드 대기시간·운영 현황 | 툴허브',
  description: '에버랜드 놀이기구의 표시 대기시간, 운영 상태, 오늘의 대기시간 추이와 위치 참고도를 확인하세요. 수집 시각과 데이터 출처를 함께 제공합니다.',
  alternates: { canonical: 'https://toolhub.ai.kr/everland-wait-times/' },
  openGraph: { title: '에버랜드 대기 현황 | 툴허브', description: '놀이기구 대기시간과 오늘의 변화, 위치 참고도', url: 'https://toolhub.ai.kr/everland-wait-times/', images: ['https://toolhub.ai.kr/og/everland-wait-times.png'] },
  twitter: { card: 'summary_large_image', images: ['https://toolhub.ai.kr/og/everland-wait-times.png'] },
}
export default function Page() {
  const schema = { '@context':'https://schema.org', '@type':'WebApplication', name:'에버랜드 대기 현황', url:'https://toolhub.ai.kr/everland-wait-times/', applicationCategory:'TravelApplication', operatingSystem:'Any', offers:{'@type':'Offer',price:'0',priceCurrency:'KRW'}, description:metadata.description }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}} /><div className="max-w-6xl mx-auto px-4 py-8 sm:px-6"><EverlandWaitTimes /><div className="mt-8"><RelatedTools /></div></div></>
}
