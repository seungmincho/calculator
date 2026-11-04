import type { Metadata } from 'next'
import EverlandPlanner from '@/components/EverlandPlanner'
export const metadata: Metadata = {
  title:'경주월드 언제 갈까? 날씨·혼잡도 방문 추천 | 툴허브',
  description:'경주월드 날씨와 예상 혼잡도로 방문하기 좋은 날짜를 비교하세요. 추천 이유, 시간대별 예보, 드라켄·스콜&하티 등 놀이기구 위치를 안내합니다.',
  alternates:{canonical:'https://toolhub.ai.kr/gyeongju-world/'},
  openGraph:{title:'경주월드, 언제 가면 좋을까?',description:'날씨와 예상 혼잡도로 고르는 방문 날짜',url:'https://toolhub.ai.kr/gyeongju-world/',images:['https://toolhub.ai.kr/og/gyeongju-world.png']},
  twitter:{card:'summary_large_image',images:['https://toolhub.ai.kr/og/gyeongju-world.png']},
}
export default function Page(){return <EverlandPlanner park="gyeongju-world" forecast={null} now={0}/>}
