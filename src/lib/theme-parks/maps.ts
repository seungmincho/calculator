import type { ParkId } from './config.ts'
export interface GuideZone { id:string; image:string; width:number; height:number; label:string }
export interface GuideRide { number:number; name:string; en:string; zone:string; x:number; y:number; providerId?:string; indoor:boolean }
const zones: Record<Exclude<ParkId,'everland'>,GuideZone[]> = {
 'lotte-world':[
  {id:'indoor1',image:'lotte-1f',width:930,height:645,label:'zones.indoor1'},
  {id:'floor2',image:'lotte-2f',width:740,height:285,label:'zones.floor2'},
  {id:'floor3',image:'lotte-3f',width:675,height:245,label:'zones.floor3'},
  {id:'floor4',image:'lotte-4f',width:710,height:280,label:'zones.floor4'},
  {id:'underground',image:'lotte-b1',width:815,height:605,label:'zones.underground'},
  {id:'outdoor',image:'lotte-magic',width:705,height:660,label:'zones.outdoor'},
 ],
 'gyeongju-world':[{id:'park',image:'gyeongju-world',width:828,height:670,label:'zones.park'}],
}
// Original page render pixels, manually checked against the September 2026 PDF
// legends. Origins must match scripts/extract-theme-park-maps.py. Never project GPS onto art.
const origins:Record<string,[number,number]>={indoor1:[340,60],floor2:[130,115],floor3:[535,290],floor4:[925,430],underground:[580,115],outdoor:[280,55],park:[180,30]}
type Entry=[number,string,string,string,number,number,string?]
const lotte:Entry[]=[
 [1,'드림보트','Dream Boat','underground',1132,294,'35dbcf53-4c0f-4b8a-a59f-c980c7d05963'],
 [2,'4D 슈팅시어터','4D Shooting Theater','underground',896,409,'0d48aaf5-6ac4-4766-909f-a825c3384a51'],
 [3,'와일드 밸리','Wild Valley','underground',802,312,'72176687-73b5-46a7-9722-a681d60014f2'],
 [4,'와일드 정글','Wild Jungle','underground',817,213,'7c0fdf75-54ff-44f9-af4b-907af6e326e3'],
 [5,'와일드 윙','Wild Wing','underground',700,203,'eac57441-00a1-4954-b859-8f8e571e2d80'],
 [6,'신밧드의 모험','The Adventure of Sindbad','indoor1',432,426,'6bf6fb7d-54d2-4fe5-bb69-0a990b25b773'],
 [7,'스페인 해적선','The Conquistador','indoor1',422,488,'9eec0457-f482-4624-8044-339074ecd581'],
 [8,'후룸라이드','Flume Ride','indoor1',509,609,'71a829bb-8b23-4749-b054-6b993704c317'],
 [9,'회전바구니','Spinning Basket','indoor1',654,599,'78ee4ac7-9004-49f4-8f44-28728ba14451'],
 [10,'로티트레인','LOTTY train','indoor1',922,487,'13aece65-3d0d-4eb8-a5ca-d7e63d853456'],
 [11,'배틀그라운드 월드 에이전트','PUBG World Agent','indoor1',1038,432,'52fed80a-0eb2-4ed2-a689-fdf2576a51fa'],
 [12,'플라이벤처','Flyventure','indoor1',1104,411,'923e80c8-00a6-4445-a765-d2d53ecf2b00'],
 [13,'회전목마','Camelot Carrousel','indoor1',1062,348,'db5ca31d-0f1c-4fcc-9636-dad0e85ce2da'],
 [14,'황야의 무법자','3D Desperados 2','indoor1',924,288,'c3e86baf-bea8-45f5-8ebe-b509276111ab'],
 [15,'키즈토리아','Kidstoria','indoor1',1004,293,'c0049e7e-406d-49e1-a9a6-f19598b2a05b'],
 [16,'드래곤 와일드 슈팅','Dragons Wild Shooting','indoor1',1139,344,'b2e3597a-9891-414b-91b8-bac0d95cd98e'],
 [17,'어린이 범퍼카','Kids Bumper Car','indoor1',1149,269,'dab6bc2b-59ea-437a-8e8f-1457eb488d4d'],
 [18,'햇님달님','Brother Moon and Sister sun','indoor1',1199,229,'8685077a-6a01-4cd6-8790-597bd2ee09fa'],
 [19,'점핑피쉬','Jumping Fish','indoor1',1162,182,'e898e1cf-7fe0-4331-8c91-993d05131383'],
 [20,'언더씨킹덤','Undersea Kingdom','indoor1',1058,126,'3d3b518d-6a52-4e72-91d9-b6138e3b9654'],
 [21,'유레카','Eureka','indoor1',1013,141,'1a33d8ac-0332-456d-a2d7-2353728f5555'],
 [22,'스윙팡팡','Swing Pang Pang','indoor1',980,161,'ce319f0d-b259-4391-a67f-c1629146895b'],
 [23,'매직붕붕카','Magic Boong Boong Car','indoor1',918,128,'938b834e-2537-486c-9313-8013411a6cf4'],
 [24,'어린이 동화극장','Children’s Story Theater','indoor1',867,148,'182ca0d0-d738-40b7-9002-9d6f628da918'],
 [25,'카트라이더 레이싱월드','Kartrider Racing World','indoor1',814,271,'80335efc-f47d-4eda-bf32-ed9deb685fef'],
 [26,'후렌치 레볼루션','French Revolution','floor2',809,335,'4c77fcf6-10ec-46fd-9177-3e5f8e042711'],
 [27,'범퍼카','Bumper Car (Adventure)','floor2',717,174,'9c721a1d-a006-42ed-8ff8-f879a7a70460'],
 [28,'콩 X 고질라 더 라이드','Kong X Godzilla The Ride','floor3',998,411,'8b086287-3077-4654-998d-a3e08e0c1205'],
 [29,'월드모노레일','World Monorail (Indoor Operation)','floor3',663,467,'8b03ac15-66c8-4e24-8bf2-b63f06d249d8'],
 [30,'풍선비행','Balloon Ride','floor4',1544,644,'c1291e97-c957-4f60-a21e-d205a21178dd'],
 [31,'파라오의 분노','Pharaoh’s Fury','floor4',1387,585,'ea165640-6a07-4f5a-a90a-e3744f7e0d6e'],
 [32,'어크로스 다크','Across Dark','floor4',1141,602,'14ece047-ceea-4ce9-934d-e61f5038d410'],
 [33,'아트란티스','Atlantis','outdoor',711,300,'9594dc97-c3cd-4093-80f4-9d74ac088d74'],
 [34,'자이로스윙','Gyro Swing','outdoor',673,219,'dd2023ac-faf9-4ce2-912b-b6311d3b66c6'],
 [35,'쁘띠빵빵','Petit Beep Beep','outdoor',529,369,'89e4d51a-8e90-4855-b632-5a7cce1a596f'],
 [36,'자이로드롭','Gyro Drop','outdoor',455,366,'25b83089-381b-47a1-a8de-695d134ed59f'],
 [37,'환타지드림','Fantasy Dream','outdoor',432,399,'eec92b84-49a0-4dd6-80d5-aa59b542796c'],
 [38,'혜성특급','Comet Express','outdoor',439,487,'b4e2d332-ecf8-42f0-8252-3caa5d3bb45d'],
 [39,'자이로스핀','Gyro Spin','outdoor',421,525,'cce63b9d-5545-4eaf-802e-6fce0d98dc5c'],
 [40,'스톤 익스프레스','Stone Express','outdoor',494,601,'796984d3-26ee-415f-a9cc-f45a150a1b56'],
 [41,'아르카나 라이드','Arcana Ride','outdoor',592,640,'fa9d149c-9fea-4c89-becc-cec9683efa09'],
 [42,'에오스타워','Eos Tower','outdoor',581,566,'2a4924ba-46ba-4333-a8ec-4008be5ef074'],
]
const gyeongju:Entry[]=[
 [1,'드라켄','Draken','park',880,476], [2,'발키리','Valkyrie','park',766,423], [3,'크라크','Krake','park',892,363], [4,'드래곤레이스','Dragon Race','park',944,344], [5,'스콜&하티','Skoll & Hati','park',948,433],
 [6,'파에톤','Phaethon','park',380,179], [7,'토네이도','Tornado','park',578,185], [8,'그랜드캐년 대탐험','Grand Canyon','park',473,124], [9,'섬머린스플래쉬','Submarine Splash','park',455,402],
 [10,'패밀리바이킹','Family Viking','park',657,334], [11,'타임라이더','Time Rider','park',675,276], [12,'킹바이킹','King Viking','park',602,260], [13,'에어벌룬','Air Balloon','park',562,273], [14,'바운스스핀','Bounce Spin','park',566,295], [15,'댄싱컵','Dancing Cup','park',521,293], [16,'매직바이크','Magic Bike','park',456,284], [17,'급류타기','River Rapids','park',391,338], [18,'가족열차','Family Train','park',383,351], [19,'범퍼카','Bumper Cars','park',351,443],
 [20,'볼하우스','Ball House','park',584,403], [21,'위자드레이스','Wizard Race','park',647,403], [22,'문라이트세일','Moonlight Sail','park',575,357], [23,'클라우드라이드','Cloud Ride','park',581,323], [24,'캐로셀','Carousel','park',507,350], [25,'매직카','Magic Car','park',536,358], [26,'매직트리','Magic Tree','park',555,370],
]
export function guide(park: Exclude<ParkId,'everland'>) {
 const mapZones=zones[park]
 const rides:GuideRide[]=(park==='lotte-world'?lotte:gyeongju).map(([number,name,en,zone,x,y,providerId])=>{const area=mapZones.find(z=>z.id===zone)!,[left,top]=origins[zone];return{number,name,en,zone,x:(x-left)/area.width*100,y:(y-top)/area.height*100,providerId,indoor:park==='lotte-world'&&zone!=='outdoor'}})
 return {zones:mapZones,rides}
}
