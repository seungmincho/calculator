import type { Ride } from './model.ts'
/** Pixel positions manually matched to numbered facilities on the supplied 2023
 * PDF, page 2, rendered at 1418 × 1323. The extracted image bounds are
 * [0,185,1138,1045]. These are illustration positions, never GPS entrances. */
const entries: [string,string,string,number,number,number][] = [
 ['guide-157','T 익스프레스','T Express',157,386,461],
 ['62e8d990-6537-41c1-b709-928206c0c03e','레이싱 코스터','Racing Coaster',101,885,568],
 ['a7c5b3ba-cb71-4276-ba24-60852911635b','볼 하우스','Ball House',102,948,552],
 ['aae2cc81-5a6b-422f-95f3-59f6458fc6d5','플레이 야드','Play Yard',103,930,538],
 ['f26795a0-24cc-47f8-a755-85ba4d784101','릴리 댄스','Lily Dance',104,853,553],
 ['dbad727e-4c6c-4868-96d1-e2ac74243f43','플라잉 레스큐','Flying Rescue',106,936,505],
 ['3321ce8b-21f0-46d1-bf92-4c0f06788c73','썬더폴스','Thunder Falls',107,909,411],
 ['4296137d-3ebd-45bb-8d85-5ae2ba26f85b','게임피아','Game Pia',109,854,394],
 ['172c4595-560f-4312-b97b-bb33a5a59d46','매직 쿠키 하우스','Magic Cookie House',110,815,382],
 ['3f012445-b120-4df8-883f-d34fa15bc928','매직 스윙','Magic Swing',111,790,369],
 ['81a64588-c337-4555-b5e1-373db306c9d1','스카이 댄싱','Sky Dancing',112,747,391],
 ['e8b5ae82-2342-4cdc-8c73-37d26d112111','피터팬','Peter Pan',113,823,404],
 ['06dcbb7f-29cd-4bb7-8e36-be06a224a860','플래쉬 팡팡','Flash Pang Pang',114,844,425],
 ['4e07ffe8-d2aa-4c4a-9bd7-e1c4b6b911d3','나는 코끼리','Flying Elephant',115,807,418],
 ['4f3ff07a-0100-4d83-90f9-fc0cbb034560','로보트카','Robot Car',116,825,444],
 ['5df1157d-9475-4947-9beb-ec88d9ce6686','붕붕카','Boong Boong Car',117,787,451],
 ['9626dc9a-29d1-4b5a-92e3-ad1d02447aae','범퍼카','Bumper Car',118,761,438],
 ['356b9d14-8800-4978-99d1-ee19114bea04','자동차 왕국','Kingdom of Cars',120,694,486],
 ['f5d8a945-5fb5-45af-8925-07fdfd0c30c3','우주전투기','Top Jet',121,631,486],
 ['0c2a94ef-79db-4585-90a6-efd153667af0','비룡열차','Dragon Coaster',122,579,518],
 ['bd38ddae-ca2b-4ad1-a2a8-cbea23d9582d','스푸키 펀 하우스','Spooky Fun House',123,632,507],
 ['bf6cd297-4c7c-4c43-bf63-6d58edf7d043','로얄 쥬빌리 캐로셀','Royal Jubilee Carousel',151,708,401],
 ['491d1a5d-94b8-40f4-8404-e808693d90e7','페스티벌 트레인','Festival train',152,665,385],
 ['955500fb-b32c-44ee-8095-03225b7fcde0','쥬빌리 카니발','Jubilee Games',153,709,435],
 ['bc7ac657-7e71-471c-86fd-d5d8621fb60b','슈팅 고스트','Shooting Ghost',154,502,542],
 ['36f88f6e-7459-41e9-8c0b-671783145de0','레니의 마법학교','Lenny’s Magic School',155,507,556],
 ['cc7397ff-1931-467e-8944-bd20f01ecee6','스페이스 투어','Space Tour',156,478,582],
 ['7204e92c-e208-4f47-9932-bac5da0b423a','알파인 카니발','Alpine Carnival',158,339,489],
 ['ff1cb9dd-d11d-4357-93cf-e8e199b035e8','허리케인','Hurricane',53,803,651],
 ['c2278773-7100-439a-a3a4-08e22895abe1','더블 락스핀','Double Rock Spin',54,681,647],
 ['fb17962a-45a0-4fe7-962c-a17e381152e4','렛츠 트위스트','Let’s Twist',56,712,532],
 ['3b3b3604-3622-4b38-a3f6-9eca2b8f6a41','롤링 엑스 트레인','Rolling X-Train',57,711,569],
 ['e1741d4f-1119-4541-8bc1-e0176a5ae242','콜럼버스 대탐험','Columbus Adventure',58,1008,583],
 ['2d2a0faa-acd3-43d3-b133-c25dd6ec8715','게임 어드벤처','Game Adventure',59,992,530],
 ['88551402-ed63-415f-a87e-0a4a844226a9','챔피온쉽 로데오','Championship Rodeo',60,890,620],
 ['fb0e9787-bd90-4a30-804a-004ee75e0c85','아마존 익스프레스','Amazon Express',206,366,689],
 ['ab7258dd-2ae9-4d2b-b62f-c5e751299c19','사파리월드','Safari World :The Wild',205,374,635],
 ['711566fe-ddfa-4395-bbe4-8e6c9df42cb5','로스트 밸리','Lost Valley',207,309,818],
 ['bdf1c0d0-3f2d-4cd1-8f93-122522681339','판다월드','Panda World',215,632,678],
]
export const mapLocations = Object.fromEntries(entries.map(([id,ko,en,number,x,y])=>[id,{ko,en,number,x:x/1138*100,y:(y-185)/860*100}]))
export function mapRides(rides: Ride[], locale: 'ko'|'en'): Ride[] {
  const existing = new Set(rides.map(r=>r.id))
  const missing: Ride[] = entries.filter(([id])=>!existing.has(id)).map(([id,ko,en])=>({id,name:locale==='ko'?ko:en,status:'UNKNOWN',wait:null,updatedAt:null,location:null}))
  return [...rides,...missing].map(r=>({...r,name:mapLocations[r.id]?.[locale]??r.name})).sort((a,b)=>a.name.localeCompare(b.name,locale))
}
