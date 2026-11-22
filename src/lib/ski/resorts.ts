// 국내 스키장 12곳 (2026/27 시즌). 좌표는 슬로프 베이스 근처(±0.02°, 날씨용).
// opening = 리조트가 밝힌 2026/27 개장(목표)일. 오늘 이전이면 화면에 'O월 O일 개장'(이미 개장)으로 나온다.
// 공식 누리집 공지가 1순위, 없으면 날짜가 적힌 보도. null = 날짜 공지 전 → usual(지난 시즌 개장 시기) 표시.
// '12월 중'처럼 날짜 없는 공지는 지금 구조로 담지 않는다(usual 만 표시) — 각 줄 주석에만 남긴다. 2026-11-22 확인.
// 지난 시즌(2025/26) 개장: 모나용평·휘닉스 11/21, 하이원 11/28, 비발디·알펜시아·웰리힐리·엘리시안·무주 12/5 무렵,
// 오크밸리·지산 12/12, 곤지암 12월 초, 에덴밸리 12/19 (언론·정리 글 기준, 2026-11-06 확인)
export const SKI_REGIONS = ['gangwon', 'capital', 'south'] as const
export type SkiRegion = typeof SKI_REGIONS[number]
export type Usual = 'lateNov' | 'earlyDec' | 'midDec'
export interface Resort {
  id: string; region: SkiRegion; lat: number; lon: number; url: string
  opening: { date: string; source: string } | null
  usual: Usual
}
export const RESORTS = [
  // 공식 공지(11/17) 이미지 "2026.11.22 SUN 10:00 AM". 11/22 개장(누리집 현장소식 '오픈데이' 사진, 2026-11-22 확인)
  { id: 'yongpyong', region: 'gangwon', lat: 37.645, lon: 128.680, url: 'https://www.yongpyong.co.kr', opening: { date: '2026-11-22', source: 'https://www.yongpyong.co.kr/kor/guide/notice/read.do?noticeId=1701' }, usual: 'lateNov' },
  // 공식 공지(11/13): 11/20 조기 오픈 계획 → 11/22(일) 10시로 변경. 11/22 개장(강원일보 11/22, 2026-11-22 확인)
  { id: 'phoenix', region: 'gangwon', lat: 37.582, lon: 128.321, url: 'https://phoenixhnr.co.kr', opening: { date: '2026-11-22', source: 'https://phoenixhnr.co.kr/page/customer/notice/14512' }, usual: 'lateNov' },
  // 공식 공지(11/18) 이미지 "11.24.(화) 12:00~16:00", 당초 11/27에서 앞당김 (2026-11-22 확인)
  { id: 'high1', region: 'gangwon', lat: 37.206, lon: 128.830, url: 'https://www.high1.com', opening: { date: '2026-11-24', source: 'https://www.high1.com/www/selectBbsNttView.do?key=611&bbsNo=85&nttNo=163145' }, usual: 'lateNov' },
  // 보도(아주경제 11/5) 11/28 목표. 공식 공지 없음, 11/20·11/22 보도도 28일 목표 그대로 (2026-11-22 확인)
  { id: 'alpensia', region: 'gangwon', lat: 37.658, lon: 128.671, url: 'https://www.alpensia.com', opening: { date: '2026-11-28', source: 'https://www.ajunews.com/view/20261105173644093' }, usual: 'earlyDec' },
  // 날짜 공지 없음. 보도 '11월 말~12월 초 개장 준비'(위키트리 11/22) (2026-11-22 확인)
  { id: 'vivaldi', region: 'gangwon', lat: 37.646, lon: 127.683, url: 'https://www.sonohotelsresorts.com', opening: null, usual: 'earlyDec' },
  // 날짜 공지 없음. 보도 '12월 초 예정'(Korea JoongAng Daily 11/14)·'미정'(위키트리 11/22) (2026-11-22 확인)
  { id: 'wellihilli', region: 'gangwon', lat: 37.488, lon: 128.247, url: 'https://www.wellihillipark.com', opening: null, usual: 'earlyDec' },
  // 보도(서울파이낸스 11/20, 리조트 제공 사진) 12/4 목표. 누리집 공지사항엔 아직 없음 (2026-11-22 확인)
  { id: 'elysian', region: 'gangwon', lat: 37.816, lon: 127.588, url: 'https://www.elysian.co.kr', opening: { date: '2026-12-04', source: 'https://www.seoulfn.com/news/articleView.html?idxno=643463' }, usual: 'earlyDec' },
  // 보도(국제뉴스 11/20 '12월 11일(금) 예정', 위키트리 11/22 같음). 시즌권 공지 이용 기간에 적혔다는 정리 글 있으나 원문 미확인 (2026-11-22 확인)
  { id: 'oakvalley', region: 'gangwon', lat: 37.405, lon: 127.815, url: 'https://oakvalley.co.kr', opening: { date: '2026-12-11', source: 'https://www.gukjenews.com/news/articleView.html?idxno=3758269' }, usual: 'midDec' },
  // 날짜 없음: '12월 중 개장', 보도는 '12월 둘째 주 목표'(위키트리 11/22). usual(12/1~)보다 늦을 수 있다 (2026-11-22 확인)
  { id: 'konjiam', region: 'capital', lat: 37.337, lon: 127.293, url: 'https://www.konjiamresort.co.kr', opening: null, usual: 'midDec' },
  // 날짜 공지 없음(위키트리 11/22 '미정') (2026-11-22 확인)
  { id: 'jisan', region: 'capital', lat: 37.216, lon: 127.345, url: 'https://www.jisanresort.co.kr', opening: null, usual: 'midDec' },
  // 공식 공지 '동계 첫 제설 안내'(11/19) 이미지 "11월 27일 오픈 예정 ※ 기상상황에 따라 변경" (2026-11-22 확인)
  { id: 'muju', region: 'south', lat: 35.890, lon: 127.737, url: 'https://www.mdysresort.com', opening: { date: '2026-11-27', source: 'https://www.mdysresort.com/guide/notice_con.asp?idx=2587' }, usual: 'earlyDec' },
  // 날짜 없음: 보도 '12월 중순 목표'(위키트리 11/22) = usual 과 같은 시기 (2026-11-22 확인)
  { id: 'edenvalley', region: 'south', lat: 35.428, lon: 128.984, url: 'https://www.edenvalley.co.kr', opening: null, usual: 'midDec' },
] as const satisfies readonly Resort[]
export type ResortId = typeof RESORTS[number]['id']

const USUAL_START: Record<Usual, string> = { lateNov: '11-21', earlyDec: '12-01', midDec: '12-11' }
/** 그 날짜가 속한 시즌의 개장일: 발표된 목표일, 없으면 예년 시기의 첫날(추정). 1~6월은 전년 시즌 */
export function openingFor(r: Resort, date: string): { date: string; estimated: boolean } {
  if (r.opening) return { date: r.opening.date, estimated: false }
  const y = Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) <= 6 ? 1 : 0)
  return { date: `${y}-${USUAL_START[r.usual]}`, estimated: true }
}
export const isResort = (v: unknown): v is ResortId => RESORTS.some(r => r.id === v)
