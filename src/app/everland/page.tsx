import type { Metadata } from 'next'
import EverlandPlanner from '@/components/EverlandPlanner'
export const metadata: Metadata = {
  title:'에버랜드 언제 갈까? 날씨·혼잡도 방문 추천 | 툴허브',
  description:'날씨와 예상 혼잡도를 함께 비교해 에버랜드 가기 좋은 날짜를 찾아보세요. 아이 동반·놀이기구 중심 추천 이유, 시간대별 예보와 안내도 위 놀이기구 위치를 제공합니다.',
  alternates:{canonical:'https://toolhub.ai.kr/everland/'},
  openGraph:{title:'에버랜드, 언제 가면 좋을까?',description:'날씨와 예상 혼잡도로 고르는 방문 날짜',url:'https://toolhub.ai.kr/everland/',images:['https://toolhub.ai.kr/og/everland.png']},
  twitter:{card:'summary_large_image',images:['https://toolhub.ai.kr/og/everland.png']},
}
export default function Page() {
  return <EverlandPlanner forecast={null} now={0} />
}
