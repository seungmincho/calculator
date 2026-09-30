// 주민/외국인등록번호 파서 회귀 체크: node scripts/check-resident-number.ts  (가짜 예시 번호만 사용)
import { parseRrn, expectedCheckDigit, formatRrn } from '../src/utils/residentNumber.ts'
const today = new Date(2026, 8, 30)
const withCheck = (d12: string, f = false) => d12 + expectedCheckDigit(d12, f)
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { if (a !== b) { fail++; console.log('FAIL', name, a, '!=', b) } }
const a = parseRrn(withCheck('900101123456'), today)!
eq('valid', a.status, 'valid'); eq('year', a.year, 1990); eq('age', a.age, 36); eq('male', a.male, true); eq('foreigner', a.foreigner, false)
const b = parseRrn(withCheck('050930412345'), today)!
eq('2000s female', b.year * 10 + Number(b.male), 20050); eq('age birthday today', b.age, 21)
eq('age day before', parseRrn(withCheck('051001412345'), today)!.age, 20)
const c = parseRrn(withCheck('880515612345', true), today)!
eq('foreigner valid', c.status, 'valid'); eq('foreigner flag', c.foreigner, true); eq('foreigner female', c.male, false)
eq('1800s', parseRrn(withCheck('991231912345'), today)!.year, 1899)
eq('0230 invalid', parseRrn('900230-1234567', today)!.status, 'invalidDate')
eq('month 13', parseRrn('901301-1234567', today)!.status, 'invalidDate')
eq('leap ok', parseRrn(withCheck('000229312345'), today)!.status, 'valid')
eq('future', parseRrn('301231-3234567', today)!.status, 'futureDate')
const bad = withCheck('210315312345'); const flipped = bad.slice(0, 12) + ((Number(bad[12]) + 1) % 10)
const m = parseRrn(flipped, today)!
eq('mismatch not invalid', m.status, 'checksumMismatch'); eq('after reform', m.afterReform, true)
eq('before reform', parseRrn(withCheck('900101123456'), today)!.afterReform, false)
eq('short', parseRrn('900101-12', today), null)
eq('format', formatRrn('9001011234567'), '900101-1234567')
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
