import everland from '../../../messages/generated/ko/ns/everlandPlanner.json'
import lotte from '../../../messages/generated/ko/ns/lotteWorldPlanner.json'
import gyeongju from '../../../messages/generated/ko/ns/gyeongjuWorldPlanner.json'
import type { ParkId } from './config.ts'
export function plannerMessages(park: ParkId) {
 return park==='lotte-world'?lotte.lotteWorldPlanner:park==='gyeongju-world'?gyeongju.gyeongjuWorldPlanner:everland.everlandPlanner
}
