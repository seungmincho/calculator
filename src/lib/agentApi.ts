// AI 에이전트·외부 프로그램용 읽기 전용 계산 API (/api/calc/<name>). 페이지와 같은 utils 로 계산한다.
// 정적 HTML은 기본값 결과라서, 에이전트가 쿼리 값으로 정확한 숫자를 받으려면 이 API를 쓴다. 문서: public/openapi.json
// 검증: scripts/check-agent-api.ts
import { calculateNetSalary } from '../utils/netSalary.ts'
import { ACCIDENT_AVG, COMPANY_SIZES, ITEMS, fourInsurance, type CompanySize } from '../utils/fourInsurance.ts'
import { INSURANCE, insuranceFor, isInsuranceYear, type InsuranceYear } from '../utils/insuranceRates.ts'
import { countingAge, manAge, schoolEntryYear, yeonAge, zodiacOf } from '../utils/age.ts'
import { yearInfo } from '../utils/ageTable.ts'
import { kstDate, kstTime, sunTimes } from './sun/solar.ts'
import { CITIES } from './sun/places.ts'

const SITE = 'https://toolhub.ai.kr'
export const CALC_NAMES = ['salary', 'four-insurance', 'age', 'sun'] as const
export interface CalcResult { status: number; body: Record<string, unknown> }

class BadInput extends Error {}
const bad = (msg: string): never => { throw new BadInput(msg) }
function num(q: URLSearchParams, key: string, min: number, max: number, def?: number): number {
  const v = q.get(key)
  if (v == null || v === '') return def ?? bad(`${key} is required`)
  const n = Number(v.replace(/,/g, ''))
  if (!Number.isFinite(n) || n < min || n > max) bad(`${key} must be a number between ${min} and ${max}`)
  return n
}
function day(q: URLSearchParams, key: string, def: string): string {
  const v = q.get(key) ?? def
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(`${v}T12:00:00+09:00`) : NaN
  if (!Number.isFinite(ms) || kstDate(ms) !== v) bad(`${key} must be a valid date YYYY-MM-DD`)
  return v
}
const rateYear = (q: URLSearchParams): InsuranceYear => {
  const v = q.get('year')
  if (v == null || v === '') return INSURANCE.year
  return isInsuranceYear(v) ? (Number(v) as InsuranceYear) : bad('year must be 2026 or 2027')
}
const rates = (y: InsuranceYear) => {
  const R = insuranceFor(y)
  return { year: y, pensionEmployee: R.pensionRate, healthEmployee: R.healthRate, longTermCareOfHealth: R.longTermCareRate, employmentEmployee: R.employmentRate, pensionMonthlyCap: R.pensionMonthlyCap, pensionMonthlyFloor: R.pensionMonthlyFloor, ...(R.employmentProposed ? { employmentProposedNotInForce: R.employmentProposed } : {}) }
}

function salary(q: URLSearchParams) {
  const annual = q.get('monthly') ? num(q, 'monthly', 1, 1e9) * 12 : num(q, 'annual', 1, 1e10)
  const nonTaxableMonthly = num(q, 'nonTaxable', 0, 1e8, 200_000)
  const dependents = Math.floor(num(q, 'dependents', 1, 11, 1))
  const children = Math.floor(num(q, 'children', 0, Math.max(0, dependents - 1), 0))
  const year = rateYear(q)
  const r = calculateNetSalary(annual, { nonTaxableMonthly, dependents, children, year })!
  const m = (n: number) => Math.round(n / 12)
  const d = r.deductions
  return {
    tool: 'salary', unit: 'KRW', year, input: { annual, nonTaxableMonthly, dependents, children },
    monthly: { net: r.netMonthly, nationalPension: m(d.nationalPension), healthInsurance: m(d.healthInsurance), longTermCare: m(d.longTermCare), employmentInsurance: m(d.employmentInsurance), incomeTax: m(d.incomeTax), localIncomeTax: m(d.localIncomeTax), totalDeductions: m(d.total) },
    annual: { gross: r.gross, taxable: r.taxable, net: r.netAnnual, totalDeductions: d.total, estimatedYearEndTax: r.taxInfo.annualTaxEstimate },
    rates: rates(year),
    page: `${SITE}/salary-calculator/?salary=${annual}&type=annual&nonTaxable=${nonTaxableMonthly}&dependents=${dependents}&children=${children}${year === INSURANCE.year ? '' : `&year=${year}`}`,
    notes: ['Monthly income tax follows the NTS simplified withholding table (dependents include the employee).', 'Monthly deduction items are annual amounts divided by 12.'],
  }
}

function insurance(q: URLSearchParams) {
  const monthly = q.get('annual') ? Math.floor(num(q, 'annual', 1, 1e10) / 12) : num(q, 'pay', 1, 1e9)
  const nonTaxableMonthly = num(q, 'nonTaxable', 0, 1e8, 200_000)
  const sizeParam = q.get('size') ?? 'under150'
  const size = (COMPANY_SIZES as readonly string[]).includes(sizeParam) ? sizeParam as CompanySize : bad(`size must be one of ${COMPANY_SIZES.join(', ')}`)
  const accidentPct = num(q, 'accident', 0, 20, ACCIDENT_AVG * 100)
  const year = rateYear(q)
  const r = fourInsurance(Math.max(0, monthly - nonTaxableMonthly), year, size, accidentPct / 100)
  if (!r) bad('pay minus nonTaxable must be positive')
  return {
    tool: 'four-insurance', unit: 'KRW per month', year, input: { pay: monthly, nonTaxableMonthly, insuredPay: r!.base, size, accidentPct },
    items: Object.fromEntries(ITEMS.map(k => [k, r!.rows[k]])), employee: r!.employee, employer: r!.employer, total: r!.total, laborCost: monthly + r!.employer,
    ...(r!.proposedExtra ? { proposedEmploymentIncreaseEachSide: r!.proposedExtra } : {}),
    rates: rates(year), page: `${SITE}/four-insurance/?type=monthly&pay=${monthly}&nt=${nonTaxableMonthly}&size=${size}&acc=${accidentPct}&year=${year}`,
  }
}

function age(q: URLSearchParams, now: number) {
  const on = day(q, 'on', kstDate(now))
  if (q.get('birth')) {
    const birth = day(q, 'birth', '')
    if (birth > on) bad('birth must not be after on')
    const z = zodiacOf(birth), s = schoolEntryYear(birth)
    return { tool: 'age', on, input: { birth }, internationalAge: manAge(birth, on), yearAge: yeonAge(birth, on), countingAge: countingAge(birth, on),
      zodiac: { ganzi: z.ganzi, animal: z.key, basis: z.byLunar ? 'lunar new year' : 'solar year (outside lunar table)' }, elementarySchoolEntry: s.year, earlyEntry: s.early,
      page: `${SITE}/age-calculator/` }
  }
  const y = Math.floor(num(q, 'year', 1900, Number(on.slice(0, 4))))
  const info = yearInfo(y), base = Number(on.slice(0, 4))
  return { tool: 'age', on, input: { year: y }, internationalAge: { beforeBirthday: Math.max(0, base - y - 1), afterBirthday: base - y }, yearAge: base - y,
    zodiac: { ganzi: info.ganzi, animal: info.zodiac, color: info.color, note: 'Born in Jan–Feb before Lunar New Year: previous year sign.' },
    elementarySchoolEntry: y + 7, page: `${SITE}/age-table/?year=${y}` }
}

function sun(q: URLSearchParams, now: number) {
  const date = day(q, 'date', kstDate(now))
  const cityId = q.get('city')
  let lat: number, lon: number, place: string
  if (q.get('lat') || q.get('lon')) {
    lat = num(q, 'lat', 33, 39); lon = num(q, 'lon', 124, 132); place = `${lat},${lon}`
  } else {
    const c = CITIES.find(x => x.id === (cityId ?? 'seoul')) ?? bad(`city must be one of ${CITIES.map(x => x.id).join(', ')}`)
    lat = c!.lat; lon = c!.lon; place = c!.id
  }
  const s = sunTimes(date, lat, lon)
  const len = s.dayLength == null ? null : Math.round(s.dayLength / 60000)
  return { tool: 'sun', timezone: 'Asia/Seoul', date, place, lat, lon,
    sunrise: kstTime(s.sunrise), sunset: kstTime(s.sunset), solarNoon: kstTime(s.noon), dayLengthMinutes: len,
    civilDawn: kstTime(s.dawn), civilDusk: kstTime(s.dusk), goldenHourMorningEnds: kstTime(s.goldenEnd), goldenHourEveningStarts: kstTime(s.goldenStart),
    basis: 'sea-level horizon, refraction -0.833°, about ±1 minute vs KASI', page: `${SITE}/sunrise-sunset/?date=${date}${cityId ? `&city=${cityId}` : ''}` }
}

export function handleCalc(name: string, q: URLSearchParams, now = Date.now()): CalcResult {
  try {
    const body = name === 'salary' ? salary(q) : name === 'four-insurance' ? insurance(q) : name === 'age' ? age(q, now) : name === 'sun' ? sun(q, now) : null
    if (!body) return { status: 404, body: { error: `unknown calculator '${name}'`, available: CALC_NAMES, docs: `${SITE}/openapi.json` } }
    return { status: 200, body: { ...body, source: 'ToolHub (toolhub.ai.kr)' } }
  } catch (e) {
    if (e instanceof BadInput) return { status: 400, body: { error: e.message, docs: `${SITE}/openapi.json` } }
    throw e
  }
}
