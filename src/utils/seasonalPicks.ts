// 홈 시즌 카드: 오늘(KST) 날짜에 맞는 도구 1~2개. 위에 있는 규칙이 우선 (명절 인사말 > 수능 > 세금).
// 문구는 homePage.season.<key>.title/desc ({n} = target까지 남은 일수). 회귀 체크: node scripts/check-daily-puzzles.ts
import { CSAT_EXAM_DATE, daysUntil } from './csatGrade.ts'
import { kstParts } from './csatDday.ts'
import { getKoreanHolidays } from './koreanHolidays.ts'
import { nextFiling } from './freelancerTax.ts'
import { nextLumpWindow } from './annualCarTax.ts'
import { jongbuDates } from './propertyHoldingTax.ts'

/** due = 카드에 붙는 캘린더 일정 (key = homePage.deadline.<key>) */
export interface SeasonPick { key: string; href: string; n: number; due?: { key: string; date: string } }
interface Rule { key: string; href: string; from: string; to: string; target?: string; event?: string }

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
  const filing = nextFiling(new Date(year, 4, 1)).dateStr // 5/31, 주말·공휴일이면 다음 날
  const lump = nextLumpWindow(`${year}-01-01`) // 1월 연납 16일~말일, 주말이면 다음 날
  return [
    around('chuseok', lunar('chuseok')),
    around('seollal', lunar('seollal')),
    { key: 'csatDday', href: '/csat-dday', from: addDays(exam, -100), to: addDays(exam, -1), target: exam, event: 'csat' },
    { key: 'csatToday', href: '/csat-dday', from: exam, to: exam },
    { key: 'cardDeduction', href: '/card-deduction', from: `${year}-10-01`, to: `${year}-10-31` }, // 1~9월 실적 나온 뒤, 연말정산 미리보기 전
    { key: 'csatGrade', href: '/csat-grade', from: exam, to: addDays(exam, 21) },
    { key: 'incomeTax', href: '/freelancer-tax', from: `${year}-05-01`, to: filing, target: filing, event: 'incomeTax' },
    { key: 'carTaxPrepay', href: '/annual-car-tax', from: lump.start, to: lump.due, target: lump.due, event: 'carTaxLumpDue' },
    { key: 'yearEndPre', href: '/year-end-tax', from: `${year}-11-01`, to: `${year}-12-31`, target: `${year}-12-31`, event: 'yearEnd' },
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
    if (hit && !out.some(p => p.href === hit.href)) {
      const n = daysUntil(today, hit.target ?? hit.to)
      out.push(hit.event ? { key: hit.key, href: hit.href, n, due: { key: hit.event, date: hit.target! } } : { key: hit.key, href: hit.href, n })
    }
  })
  return out.slice(0, max)
}

export interface Deadline { key: string; href: string; date: string; n: number }

/** 홈 "다가오는 일정" 줄: within일 안의 마감, 시즌 카드에 이미 붙은 일정은 빼고 카드와 합쳐 max개까지.
 *  날짜는 각 도구 util이 단일 출처. 문구 = homePage.deadline.<key> */
export function upcomingDeadlines(now: Date, picks: SeasonPick[] = [], within = 90, max = 3): Deadline[] {
  const today = kstParts(now.getTime()).date
  const y = Number(today.slice(0, 4))
  const lump = nextLumpWindow(today)
  const list = [
    { key: 'csat', href: '/csat-dday', date: CSAT_EXAM_DATE },
    { key: lump.open ? 'carTaxLumpDue' : 'carTaxLumpStart', href: '/annual-car-tax', date: lump.open ? lump.due : lump.start },
    { key: 'incomeTax', href: '/freelancer-tax', date: nextFiling(new Date(`${today}T00:00`)).dateStr },
    ...[y, y + 1].flatMap(yy => [
      { key: 'jongbu', href: '/comprehensive-property-tax', date: jongbuDates(yy).due },
      { key: 'yearEnd', href: '/pension-tax-credit', date: `${yy}-12-31` }, // 연금저축·IRP 납입 마감 → 전용 페이지
      { key: 'simplified', href: '/year-end-tax', date: `${yy}-01-15` },
    ]),
  ]
  return list
    .map(d => ({ ...d, n: daysUntil(today, d.date) }))
    .filter(d => d.n >= 0 && d.n <= within && !picks.some(p => p.due?.key === d.key && p.due.date === d.date))
    .sort((a, b) => a.n - b.n)
    .slice(0, Math.max(0, max - picks.length))
}
