// 주민등록번호 / 외국인등록번호 파싱·검증 (순수 함수, 브라우저 내 처리 전용)
//
// 2020년 10월 주민등록번호 부여체계 개편: 신규 부여·변경분은 성별 자리(7번째) 이후
// 6자리가 임의번호가 되어 지역번호·검증번호(체크섬) 규칙이 적용되지 않는다.
// 따라서 체크섬 불일치는 "무효"가 아니라 "개편 후 번호일 수 있음"으로 안내해야 한다.
// 출처: https://m.go.seoul.co.kr/news/2019/12/18/20191218014003 (주민번호 지역표시 45년 만에 퇴장)
//       https://m.ekn.kr/view.php?key=508065 (2020 하반기 달라지는 것들 — 주민등록번호 지역표시 폐지)

export type RrnStatus = 'valid' | 'checksumMismatch' | 'invalidDate' | 'futureDate'

export interface RrnResult {
  status: RrnStatus
  year: number
  month: number
  day: number
  age: number | null // 만 나이 (날짜가 유효할 때만)
  male: boolean
  foreigner: boolean // 7번째 자리 5~8 = 외국인등록번호
  afterReform: boolean // 2020-10-01 이후 출생 → 개편 체계로만 발급됨
}

const WEIGHTS = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]
const REFORM = new Date(2020, 9, 1)

export const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 13)

export const formatRrn = (v: string) => {
  const d = onlyDigits(v)
  return d.length <= 6 ? d : `${d.slice(0, 6)}-${d.slice(6)}`
}

// 7번째 자리 → 출생 세기. 9·0 = 1800년대, 1·2·5·6 = 1900년대, 3·4·7·8 = 2000년대
const centuryOf = (g: number) => (g === 9 || g === 0 ? 1800 : g === 1 || g === 2 || g === 5 || g === 6 ? 1900 : 2000)

// 개편 전 검증번호 공식. 내국인: (11 - S%11) % 10, 외국인등록번호: (13 - S%11) % 10
export function expectedCheckDigit(d: string, foreigner: boolean) {
  const s = WEIGHTS.reduce((acc, w, i) => acc + Number(d[i]) * w, 0)
  return ((foreigner ? 13 : 11) - (s % 11)) % 10
}

export function parseRrn(input: string, today = new Date()): RrnResult | null {
  const d = onlyDigits(input)
  if (d.length !== 13) return null
  const g = Number(d[6])
  const year = centuryOf(g) + Number(d.slice(0, 2))
  const month = Number(d.slice(2, 4))
  const day = Number(d.slice(4, 6))
  const birth = new Date(year, month - 1, day)
  const foreigner = g >= 5 && g <= 8
  const base = { year, month, day, male: g % 2 === 1, foreigner, afterReform: birth >= REFORM }
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return { ...base, status: 'invalidDate', age: null, afterReform: false }
  }
  if (birth > today) return { ...base, status: 'futureDate', age: null }
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--
  const ok = expectedCheckDigit(d, foreigner) === Number(d[12])
  return { ...base, age, status: ok ? 'valid' : 'checksumMismatch' }
}
