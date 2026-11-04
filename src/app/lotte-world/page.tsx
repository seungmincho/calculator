import type { Metadata } from 'next'
import EverlandPlanner from '@/components/EverlandPlanner'
export const metadata: Metadata = {
  title:'롯데월드 언제 갈까? 날씨·혼잡도 방문 추천 | 툴허브',
  description:'잠실 롯데월드의 실내·매직아일랜드 조건에 맞춰 날씨와 예상 혼잡도를 비교하세요. 추천 날짜와 이유, 시간대별 예보와 층별 놀이기구 지도를 제공합니다.',
  alternates:{canonical:'https://toolhub.ai.kr/lotte-world/'},
  openGraph:{title:'롯데월드, 언제 가면 좋을까?',description:'날씨와 예상 혼잡도로 고르는 방문 날짜',url:'https://toolhub.ai.kr/lotte-world/',images:['https://toolhub.ai.kr/og/lotte-world.png']},
  twitter:{card:'summary_large_image',images:['https://toolhub.ai.kr/og/lotte-world.png']},
}
export default function Page(){return <EverlandPlanner park="lotte-world" forecast={null} now={0}/>}
