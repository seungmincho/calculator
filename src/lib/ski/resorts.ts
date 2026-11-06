// 국내 스키장 12곳 (2026/27 시즌). 좌표는 슬로프 베이스 근처(±0.02°, 날씨용).
// opening = 리조트가 밝힌 2026/27 개장 목표일(기상 따라 바뀔 수 있음). null = 공지 전 → usual(지난 시즌 개장 시기) 표시.
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
  { id: 'yongpyong', region: 'gangwon', lat: 37.645, lon: 128.680, url: 'https://www.yongpyong.co.kr', opening: null, usual: 'lateNov' },
  { id: 'phoenix', region: 'gangwon', lat: 37.582, lon: 128.321, url: 'https://phoenixhnr.co.kr', opening: { date: '2026-11-27', source: 'https://www.ajunews.com/view/20260723100641522' }, usual: 'lateNov' },
  { id: 'high1', region: 'gangwon', lat: 37.206, lon: 128.830, url: 'https://www.high1.com', opening: null, usual: 'lateNov' },
  { id: 'alpensia', region: 'gangwon', lat: 37.658, lon: 128.671, url: 'https://www.alpensia.com', opening: { date: '2026-11-28', source: 'https://www.ajunews.com/view/20261105173644093' }, usual: 'earlyDec' },
  { id: 'vivaldi', region: 'gangwon', lat: 37.646, lon: 127.683, url: 'https://www.sonohotelsresorts.com', opening: null, usual: 'earlyDec' },
  { id: 'wellihilli', region: 'gangwon', lat: 37.488, lon: 128.247, url: 'https://www.wellihillipark.com', opening: null, usual: 'earlyDec' },
  { id: 'elysian', region: 'gangwon', lat: 37.816, lon: 127.588, url: 'https://www.elysian.co.kr', opening: null, usual: 'earlyDec' },
  { id: 'oakvalley', region: 'gangwon', lat: 37.405, lon: 127.815, url: 'https://oakvalley.co.kr', opening: null, usual: 'midDec' },
  { id: 'konjiam', region: 'capital', lat: 37.337, lon: 127.293, url: 'https://www.konjiamresort.co.kr', opening: null, usual: 'earlyDec' },
  { id: 'jisan', region: 'capital', lat: 37.216, lon: 127.345, url: 'https://www.jisanresort.co.kr', opening: null, usual: 'midDec' },
  { id: 'muju', region: 'south', lat: 35.890, lon: 127.737, url: 'https://www.mdysresort.com', opening: null, usual: 'earlyDec' },
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
