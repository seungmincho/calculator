// 홈 시즌 카드: 오늘(KST) 날짜에 맞는 도구 1~2개. 위에 있는 규칙이 우선 (명절 인사말 > 수능 > 세금).
// 문구는 homePage.season.<key>.title/desc ({n} = target까지 남은 일수). 회귀 체크: node scripts/check-daily-puzzles.ts
import { CSAT_EXAM_DATE, daysUntil } from './csatGrade.ts'
import { kstParts } from './csatDday.ts'
import { getKoreanHolidays } from './koreanHolidays.ts'

export interface SeasonPick { key: string; href: string; n: number }
interface Rule { key: string; href: string; from: string; to: string; target?: string }

const addDays = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** year 기준 규칙. 해를 넘는 기간(12월~1월)은 전년도 규칙으로 잡힘. 날짜 'YYYY-MM-DD', 양끝 포함 */
function rules(year: number): Rule[] {
  const lunar = (k: string) => getKoreanHolidays(year).find(h => h.nameKey === k)?.date
  const around = (key: string, day?: string): Rule =>
    day ? { key, href: '/greeting-generator', from: addDays(day, -14), to: addDays(day, 1) } : { key, href: '', from: '', to: '' }
  const exam = CSAT_EXAM_DATE // 평가원 발표일 단일 출처 (csatDday.ts도 이 값 사용)
  return [
    around('chuseok', lunar('chuseok')),
    around('seollal', lunar('seollal')),
    { key: 'csatDday', href: '/csat-dday', from: addDays(exam, -100), to: addDays(exam, -1), target: exam },
    { key: 'csatToday', href: '/csat-dday', from: exam, to: exam },
    { key: 'csatGrade', href: '/csat-grade', from: exam, to: addDays(exam, 21) },
    { key: 'incomeTax', href: '/freelancer-tax', from: `${year}-05-01`, to: `${year}-05-31` },
    { key: 'carTaxPrepay', href: '/annual-car-tax', from: `${year}-01-16`, to: `${year}-01-31` },
    { key: 'yearEndPre', href: '/year-end-tax', from: `${year}-11-01`, to: `${year}-12-31` },
    { key: 'yearEnd', href: '/year-end-tax', from: `${year}-01-01`, to: `${year}-02-28` },
    { key: 'newYear', href: '/greeting-generator', from: `${year}-12-01`, to: `${year + 1}-01-10` },
  ]
}

export function seasonalPicks(now: Date, max = 2): SeasonPick[] {
  const today = kstParts(now.getTime()).date
  const y = Number(today.slice(0, 4))
  const prev = rules(y - 1)
  const out: SeasonPick[] = []
  rules(y).forEach((r, i) => {
    const hit = [r, prev[i]].find(x => x.href && x.from <= today && today <= x.to)
    if (hit && !out.some(p => p.href === hit.href)) out.push({ key: hit.key, href: hit.href, n: daysUntil(today, hit.target ?? hit.to) })
  })
  return out.slice(0, max)
}
