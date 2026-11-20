// 2027학년도 수능(2026-11-19) 수험표 할인 목록과 오늘 기준 상태·정렬 (회귀 체크: node scripts/check-csat-discounts.ts).
// 글(브랜드·혜택·조건)은 messages 의 csatDiscounts.items.<id> 에 있다. 여기는 날짜·출처만.
// end = 혜택을 '받을 수 있는' 마지막 날(항공·소노처럼 구매 마감이 따로 있으면 구매 마감). 이용 기한은 조건 글에 적는다.
// start·end 가 없으면 출처에 날짜가 없다는 뜻이다(시작 미기재 = 이미 진행 중으로 본다, 끝 미기재 = 소진·종료 시까지).
// 내년: 목록을 비우고 새로 조사한다. 지난해 행사를 그대로 두지 않는다.
import { daysBetween } from './dday.ts'

export const CHECKED = '2026-11-20'
export const CATS = ['park', 'culture', 'food', 'travel', 'shop', 'etc'] as const
export type Cat = (typeof CATS)[number]
export type Status = 'upcoming' | 'ongoing' | 'ended'

export interface Discount {
  id: string
  cat: Cat
  start?: string
  end?: string
  url: string
  checked: string
  /** 할인받는 동반 인원(본인 제외). 인원 제한 없음·불명이면 생략 */
  companions?: number
  /** 툴허브 안의 관련 페이지 */
  internal?: string
}

const c = CHECKED
export const DISCOUNTS: Discount[] = [
  // park
  { id: 'everland', cat: 'park', start: '2026-11-11', end: '2026-12-31', companions: 3, internal: '/everland', checked: c, url: 'https://www.khan.co.kr/article/202611121144001/' },
  { id: 'lotteWorld', cat: 'park', start: '2026-11-19', end: '2026-12-31', internal: '/lotte-world', checked: c, url: 'https://www.fnnews.com/news/202611111036200244' },
  { id: 'lotteAquaSky', cat: 'park', start: '2026-11-19', end: '2026-11-30', checked: c, url: 'https://www.fnnews.com/news/202611111036200244' },
  { id: 'seoulLand', cat: 'park', start: '2026-11-01', end: '2026-12-31', companions: 2, checked: c, url: 'https://seoulland.co.kr/?p=40_view&idx=438' },
  { id: 'legoland', cat: 'park', start: '2026-11-20', end: '2026-12-18', companions: 3, checked: c, url: 'https://www.legoland.kr/%ED%8B%B0%EC%BC%93%EC%9A%94%EA%B8%88%ED%95%A0%EC%9D%B8/%EC%A0%9C%ED%9C%B4%ED%94%84%EB%A1%9C%EB%AA%A8%EC%85%98/%EA%B3%A0%EC%83%9D%ED%96%88%EC%88%98%EB%8A%A5/' },
  { id: 'seaLife', cat: 'park', start: '2026-11-19', end: '2026-12-18', checked: c, url: 'https://www.segye.com/newsView/20261103511184' },
  { id: 'oWorld', cat: 'park', start: '2026-11-19', end: '2026-11-30', checked: c, url: 'https://www.news1.kr/local/daejeon-chungnam/6349399' },
  { id: 'aquaPlanetYeosu', cat: 'park', end: '2026-12-20', companions: 1, checked: c, url: 'https://biz.heraldcorp.com/article/10942153' },
  { id: 'sono', cat: 'park', start: '2026-11-19', end: '2026-12-09', companions: 2, checked: c, url: 'https://www.koreancenter.or.kr/news/articleView.html?idxno=1440463' },
  { id: 'waterpia', cat: 'park', start: '2026-11-20', end: '2026-12-11', companions: 1, checked: c, url: 'https://biz.heraldcorp.com/article/10942153' },
  { id: 'spaVis', cat: 'park', end: '2026-12-31', checked: c, url: 'https://www.segye.com/newsView/20261114501445' },
  // culture
  { id: 'cgv', cat: 'culture', start: '2026-11-19', end: '2026-11-30', checked: c, url: 'https://www.newspim.com/news/view/20261118000244' },
  { id: 'megabox', cat: 'culture', start: '2026-11-17', end: '2026-12-02', checked: c, url: 'https://www.segye.com/newsView/20261118515168' },
  { id: 'arko', cat: 'culture', start: '2026-11-20', end: '2026-11-29', companions: 1, checked: c, url: 'https://www.etoday.co.kr/news/view/2650481' },
  { id: 'sweeneyTodd', cat: 'culture', start: '2026-12-04', end: '2027-01-17', checked: c, url: 'https://www.ajunews.com/view/20261119095157279' },
  { id: 'christmasCarol', cat: 'culture', start: '2026-12-02', end: '2026-12-27', companions: 1, checked: c, url: 'https://www.hankyung.com/article/202611196806i' },
  { id: 'gansong', cat: 'culture', start: '2026-11-19', end: '2026-12-27', companions: 1, checked: c, url: 'https://www.ajunews.com/view/20261119095157279' },
  // food
  { id: 'shabuAllday', cat: 'food', start: '2026-11-19', end: '2026-11-22', checked: c, url: 'https://www.news1.kr/industry/distribution/6357579' },
  { id: 'kukuku', cat: 'food', end: '2026-11-23', checked: c, url: 'https://www.kmib.co.kr/article/20261119501605' },
  { id: 'restaurant63', cat: 'food', start: '2026-11-19', end: '2026-11-30', checked: c, url: 'https://www.etoday.co.kr/news/view/2650481' },
  { id: 'parkView', cat: 'food', start: '2026-11-19', end: '2026-11-30', checked: c, url: 'https://biz.heraldcorp.com/article/10942153' },
  { id: 'laGrillia', cat: 'food', end: '2026-11-30', checked: c, url: 'https://www.etoday.co.kr/news/view/2649658' },
  { id: 'street', cat: 'food', end: '2026-11-30', checked: c, url: 'https://www.etoday.co.kr/news/view/2649658' },
  { id: 'madForGarlic', cat: 'food', start: '2026-11-19', end: '2026-12-06', checked: c, url: 'https://www.kmib.co.kr/article/20261119501605' },
  // travel
  { id: 'jejuAir', cat: 'travel', end: '2026-12-16', companions: 1, checked: c, url: 'https://view.asiae.co.kr/article/2026111709171270673' },
  { id: 'eastarJet', cat: 'travel', start: '2026-11-19', end: '2026-12-31', companions: 1, checked: c, url: 'https://biz.heraldcorp.com/article/10938348' },
  { id: 'trinity', cat: 'travel', start: '2026-11-12', end: '2027-01-31', companions: 1, checked: c, url: 'https://economist.co.kr/article/view/ecn202611120016' },
  { id: 'korailTour', cat: 'travel', end: '2026-12-31', checked: c, url: 'https://www.news1.kr/realestate/general/6360032' },
  { id: 'forestStay', cat: 'travel', start: '2026-11-20', end: '2027-02-28', checked: c, url: 'https://www.news1.kr/local/daejeon-chungnam/6313891' },
  // etc
  { id: 'himart', cat: 'etc', start: '2026-11-19', checked: c, url: 'https://www.kmib.co.kr/article/20261119501605' },
]

export const isCat = (v: unknown): v is Cat => CATS.includes(v as Cat)

export function statusOf(d: Discount, today: string): Status {
  if (d.end && today > d.end) return 'ended'
  if (d.start && today < d.start) return 'upcoming'
  return 'ongoing'
}

/** 시작 전이면 시작까지, 진행 중이면 마감까지 남은 날(0 = 오늘 마감). 끝난 행사·끝 날짜 없는 행사는 null */
export function daysLeft(d: Discount, today: string): number | null {
  const s = statusOf(d, today)
  if (s === 'upcoming') return daysBetween(today, d.start!)
  if (s === 'ongoing' && d.end) return daysBetween(today, d.end)
  return null
}

const RANK: Record<Status, number> = { ongoing: 0, upcoming: 1, ended: 2 }
/** 진행 중(마감 임박 순, 끝 날짜 없음은 뒤) → 시작 전(먼저 시작하는 순) → 끝남(최근에 끝난 순). 같으면 목록 순서 */
export function sortDiscounts(list: Discount[], today: string): Discount[] {
  return [...list].sort((a, b) => {
    const sa = statusOf(a, today), sb = statusOf(b, today)
    if (sa !== sb) return RANK[sa] - RANK[sb]
    if (sa === 'ongoing') return (a.end ?? '9999').localeCompare(b.end ?? '9999')
    if (sa === 'upcoming') return a.start!.localeCompare(b.start!)
    return b.end!.localeCompare(a.end!)
  })
}
