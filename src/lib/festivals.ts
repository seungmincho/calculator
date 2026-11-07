// 2026-27 겨울 축제 12곳. 이름·장소·프로그램 문구는 messages/*.json 의 winterFestivals.festivals.<id>.
// dates = 이번 시즌(2026-27) 주최 측·한국관광공사가 밝힌 기간. null = 공지 전 → last(지난 시즌 실제 기간)로 예년 시기를 보여 준다.
// last  = 2025-26 시즌 실제 개최 기간(연기됐으면 실제 기간). 2026-11-07 공식 누리집·지자체·언론 보도로 확인.
//
// 공지가 나오면(날짜만 바꾸면 된다):
//   1) SOURCES 에 출처 한 줄 추가(키 = <id>2027) — 주최 측 누리집·지자체 보도자료·visitkorea.or.kr 만. 여행사·블로그 날짜는 쓰지 않는다
//      (visitkorea 에 "2026년 축제 기준, 2027년은 업데이트 예정" 문구가 붙은 날짜는 잠정치라 쓰지 않는다)
//   2) 그 축제 dates 에 { start, end, source }  3) messages ko·en guide.sources.items.<키> 라벨
//   4) node scripts/check-winter-festivals.ts
// 연기·조기 종료되면 dates 를 실제 기간으로 고친다. 시즌이 끝나면 last ← 실제 기간, dates ← null, SEASON 을 한 해 올린다.
import { addYears, daysBetween } from '../utils/dday.ts'

export const SEASON = { label: '2026-27', from: '2026-11-01', to: '2027-03-31' } as const
export const LAST_SEASON = { label: '2025-26', from: '2025-11-01', to: '2026-03-31' } as const

export const FESTIVAL_TYPES = ['ice', 'snow', 'light'] as const
export const FESTIVAL_REGIONS = ['gangwon', 'capital', 'other'] as const
export const SORTS = ['date', 'region'] as const
export type FestivalType = typeof FESTIVAL_TYPES[number]
export type FestivalRegion = typeof FESTIVAL_REGIONS[number]
export type Sort = typeof SORTS[number]

export const SOURCES = {
  hwacheon2027: 'https://www.narafestival.com/01_icenara/',
  hwacheon2026: 'https://www.asiae.co.kr/en/article/2026010619092329306',
  pyeongchang2026: 'https://www.heraldk.com/article/2026010619094302550',
  hongcheon2026: 'https://www.twig24.com/news/2026/01/08/20260108500141',
  cheorwon2026: 'https://www.asiae.co.kr/en/article/2026011718203443855',
  pocheon2026: 'https://www.heraldk.com/article/2025122217401859592',
  taebaek2026: 'https://www.twig24.com/news/2026/01/29/20260129500130',
  daegwallyeong2026: 'https://kbmaeil.com/article/20260209500698',
  morningcalm2027: 'https://english.visitkorea.or.kr/enu/ATR/SI_EN_3_2_1.jsp?cid=1866962',
  morningcalm2026: 'https://www.gg.go.kr/myggd/vol198/1_1.php',
  seoulLantern2027: 'https://www.stolantern.com/',
  seoulLantern2026: 'https://mediahub.seoul.go.kr/archives/2016499',
  haeundae2027: 'https://english.visitkorea.or.kr/enu/ATR/SI_EN_3_2_1.jsp?cid=3565954',
  haeundae2026: 'https://www.busan.go.kr/eng/bsevents/1705138',
  hampyeong2026: 'https://m.go.seoul.co.kr/news/2025/11/30/20251130500111',
  gwangbok2026: 'https://busan.breaknews.com/41979',
  cancel2026: 'https://www.twig24.com/news/2026/01/07/20260107500018',
} as const
export type SourceKey = keyof typeof SOURCES

export interface Period { start: string; end: string; source: SourceKey }
export interface Festival {
  id: string; type: FestivalType; region: FestivalRegion
  /** 주최 측 누리집. null = 확인된 공식 누리집 없음 */
  url: string | null
  dates: Period | null
  last: Period
}

export const FESTIVALS = [
  { id: 'hwacheon', type: 'ice', region: 'gangwon', url: 'https://www.narafestival.com/01_icenara/',
    dates: { start: '2027-01-09', end: '2027-01-31', source: 'hwacheon2027' },
    last: { start: '2026-01-10', end: '2026-02-01', source: 'hwacheon2026' } },
  // 2026년은 포근한 날씨로 1/1 → 1/9 개막 연기(cancel2026)
  { id: 'pyeongchang', type: 'ice', region: 'gangwon', url: 'https://festival700.or.kr/', dates: null,
    last: { start: '2026-01-09', end: '2026-02-09', source: 'pyeongchang2026' } },
  { id: 'hongcheon', type: 'ice', region: 'gangwon', url: 'https://www.hccf.or.kr/', dates: null,
    last: { start: '2026-01-09', end: '2026-01-25', source: 'hongcheon2026' } },
  { id: 'cheorwon', type: 'ice', region: 'gangwon', url: 'https://gcwcf.or.kr/w1_c_6_1/5', dates: null,
    last: { start: '2026-01-17', end: '2026-01-25', source: 'cheorwon2026' } },
  { id: 'pocheon', type: 'ice', region: 'capital', url: null, dates: null,
    last: { start: '2025-12-20', end: '2026-02-22', source: 'pocheon2026' } },
  { id: 'taebaek', type: 'snow', region: 'gangwon', url: 'https://www.taebaeksnow.com/', dates: null,
    last: { start: '2026-01-31', end: '2026-02-08', source: 'taebaek2026' } },
  { id: 'daegwallyeong', type: 'snow', region: 'gangwon', url: 'https://www.snowfestival.net/', dates: null,
    last: { start: '2026-02-13', end: '2026-02-22', source: 'daegwallyeong2026' } },
  { id: 'morningcalm', type: 'light', region: 'capital', url: 'https://www.morningcalm.co.kr/',
    dates: { start: '2026-12-04', end: '2027-03-14', source: 'morningcalm2027' },
    last: { start: '2025-12-05', end: '2026-03-15', source: 'morningcalm2026' } },
  // 2025-26 은 우이천 구간 1/4, 청계천 1/18 종료 — 청계천 기준
  { id: 'seoulLantern', type: 'light', region: 'capital', url: 'https://www.stolantern.com/',
    dates: { start: '2026-12-11', end: '2027-01-31', source: 'seoulLantern2027' },
    last: { start: '2025-12-12', end: '2026-01-18', source: 'seoulLantern2026' } },
  { id: 'haeundae', type: 'light', region: 'other', url: 'https://www.haeundae.go.kr/tour/index.do?menuCd=DOM_000000309006000000',
    dates: { start: '2026-11-29', end: '2027-01-18', source: 'haeundae2027' },
    last: { start: '2025-11-29', end: '2026-01-18', source: 'haeundae2026' } },
  { id: 'hampyeong', type: 'light', region: 'other', url: 'https://www.hpftf.or.kr/', dates: null,
    last: { start: '2025-11-28', end: '2026-01-11', source: 'hampyeong2026' } },
  { id: 'gwangbok', type: 'light', region: 'other', url: 'https://www.bsjunggu.go.kr/', dates: null,
    last: { start: '2025-12-05', end: '2026-02-22', source: 'gwangbok2026' } },
] as const satisfies readonly Festival[]
export type FestivalId = typeof FESTIVALS[number]['id']

/** 이번 시즌 기간: 발표된 날짜, 없으면 지난 시즌 기간을 한 해 옮긴 예상 시기 */
export function periodOf(f: Festival): { start: string; end: string; confirmed: boolean } {
  if (f.dates) return { start: f.dates.start, end: f.dates.end, confirmed: true }
  return { start: addYears(f.last.start, 1), end: addYears(f.last.end, 1), confirmed: false }
}

export type StatusKind = 'confirmed' | 'tba' | 'upcoming' | 'ongoing' | 'ended'
/** today = KST 'YYYY-MM-DD' (마운트 후) 또는 null(정적 HTML·첫 렌더 → 날짜와 무관한 확정/공지 전) */
export function statusOf(f: Festival, today: string | null): { kind: StatusKind; days?: number } {
  if (!f.dates) return { kind: 'tba' }
  if (!today) return { kind: 'confirmed' }
  if (today < f.dates.start) return { kind: 'upcoming', days: daysBetween(today, f.dates.start) }
  return { kind: today <= f.dates.end ? 'ongoing' : 'ended' }
}

/** 초순(1~10일)·중순(11~20일)·하순(21일~) */
export const partOfMonth = (date: string) => {
  const d = Number(date.slice(8))
  return d <= 10 ? 'early' : d <= 20 ? 'mid' : 'late'
}

export function listFestivals(type: FestivalType | 'all', region: FestivalRegion | 'all', sort: Sort) {
  const order = (f: Festival) => FESTIVAL_REGIONS.indexOf(f.region)
  return FESTIVALS
    .filter((f) => (type === 'all' || f.type === type) && (region === 'all' || f.region === region))
    .sort((a, b) => (sort === 'region' ? order(a) - order(b) : 0) || periodOf(a).start.localeCompare(periodOf(b).start))
}

export const isType = (v: unknown): v is FestivalType => FESTIVAL_TYPES.includes(v as FestivalType)
export const isRegion = (v: unknown): v is FestivalRegion => FESTIVAL_REGIONS.includes(v as FestivalRegion)
export const isSort = (v: unknown): v is Sort => SORTS.includes(v as Sort)
