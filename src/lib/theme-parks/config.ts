export const PARK_IDS = ['everland','lotte-world','gyeongju-world'] as const
export type ParkId = typeof PARK_IDS[number]
export type VisitArea = 'all' | 'indoor'
export const parks = {
  everland: { id:'everland',name:'에버랜드',enName:'Everland',latitude:37.294,longitude:127.204,indoor:false,official:'https://www.everland.com/',guide:'https://wwwrod.everland.com/web/images/front/everland/common/everland.pdf',board:'/everland-board/',providerId:'b4dd937f-a79d-4b82-922f-e8ab0fbf5b5b' },
  'lotte-world': { id:'lotte-world',name:'롯데월드',enName:'Lotte World',latitude:37.511,longitude:127.098,indoor:true,official:'https://adventure.lotteworld.com/',guide:'https://adventure.lotteworld.com/usage-guide/service/guide-map',board:'/lotte-world/board/',providerId:'d8a17554-14d9-44a1-915a-035bfeff884c' },
  'gyeongju-world': { id:'gyeongju-world',name:'경주월드',enName:'Gyeongju World',latitude:35.837,longitude:129.281,indoor:false,official:'https://www.gjw.co.kr/',guide:'https://www.gjw.co.kr/images/contents/guidemap.pdf',board:'/gyeongju-world/board/',providerId:null },
} as const
export function parkId(value: string): ParkId | null { return PARK_IDS.includes(value as ParkId) ? value as ParkId : null }
