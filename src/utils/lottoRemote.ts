// 동행복권 회차별 당첨번호 조회(회차별 결과 화면이 쓰는 JSON) — 파싱·검증·캐시 시간.
// 쓰는 곳: functions/api/lotto-latest.ts(새 회차 엣지 프록시), scripts/update-lotto-data.mjs(정적 데이터 갱신).
// 공개 API 가 아니라 바뀔 수 있다(2025 개편 때 common.do?method=getLottoNumber 가 홈으로 302). 바뀌면 여기만 고친다.
// 회귀 체크: node scripts/check-lotto-remote.ts (실제 호출까지: --live)

/** srchCursorLtEpsd=N → N 다음 회차부터 최대 10건. 더 없으면 빈 list */
export const DH_API = 'https://www.dhlottery.co.kr/lt645/selectPstLt645InfoNew.do?srchDir=latest&srchCursorLtEpsd='
export const DH_HEADERS = { 'User-Agent': 'toolhub-data-update', Accept: 'application/json', AJAX: 'true' }
export const DH_PAGE = 10

export interface LottoDraw {
  drwNo: number
  drwNoDate: string
  drwtNo1: number
  drwtNo2: number
  drwtNo3: number
  drwtNo4: number
  drwtNo5: number
  drwtNo6: number
  bnusNo: number
}

interface DhItem { ltEpsd: number; ltRflYmd: string | number; tm1WnNo: number; tm2WnNo: number; tm3WnNo: number; tm4WnNo: number; tm5WnNo: number; tm6WnNo: number; bnsWnNo: number }

const ball = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 45

/** after 다음 회차부터 끊김 없이 이어지는 것만, 오름차순. 번호가 이상한 회차에서 멈춘다(그 뒤는 버림). */
export function parseDhList(json: unknown, after: number): LottoDraw[] {
  const list = ((json as { data?: { list?: DhItem[] } })?.data?.list ?? [])
    .filter((x) => Number.isInteger(x?.ltEpsd) && x.ltEpsd > after)
    .sort((a, b) => a.ltEpsd - b.ltEpsd)
  const out: LottoDraw[] = []
  for (const x of list) {
    if (x.ltEpsd !== after + out.length + 1) break
    const nums = [x.tm1WnNo, x.tm2WnNo, x.tm3WnNo, x.tm4WnNo, x.tm5WnNo, x.tm6WnNo]
    const d = String(x.ltRflYmd)
    if (!nums.every(ball) || new Set(nums).size !== 6 || !ball(x.bnsWnNo) || nums.includes(x.bnsWnNo) || !/^\d{8}$/.test(d)) break
    out.push({
      drwNo: x.ltEpsd, drwNoDate: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      drwtNo1: nums[0], drwtNo2: nums[1], drwtNo3: nums[2], drwtNo4: nums[3], drwtNo5: nums[4], drwtNo6: nums[5], bnusNo: x.bnsWnNo,
    })
  }
  return out
}

/** 엣지 캐시 초: 토요일 20시~일요일 6시(KST, 추첨·발표 직후)는 10분, 그 밖은 1시간 */
export function cacheSeconds(now: number): number {
  const k = new Date(now + 9 * 3600_000)
  const day = k.getUTCDay()
  const h = k.getUTCHours()
  return (day === 6 && h >= 20) || (day === 0 && h < 6) ? 600 : 3600
}
