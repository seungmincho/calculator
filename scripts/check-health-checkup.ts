// 건강검진 대상 회귀 체크: node scripts/check-health-checkup.ts
import { checkup, generalOf, extrasOf, cancersOf, nextGeneralYear, daysLeft, type CheckupInput } from '../src/utils/healthCheckup.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want)
  if (g !== w) { fail++; console.log('FAIL', name, g, '!=', w) }
}
const base: CheckupInput = { birthYear: 1976, sex: 'f', member: 'office', year: 2026 }
const ids = (xs: { id: string }[]) => xs.map((x) => x.id)

// 홀짝: 짝수년생은 짝수년도, 홀수년생은 홀수년도
eq('even born 2026', generalOf(base).kind, 'general')
eq('odd born 2026', generalOf({ ...base, birthYear: 1977 }).reason, 'parity')
eq('odd born 2027', generalOf({ ...base, birthYear: 1977, year: 2027 }).kind, 'general')
eq('even born 2027', generalOf({ ...base, year: 2027 }).kind, null)
// 비사무직: 매년
eq('field odd', generalOf({ ...base, member: 'field', birthYear: 1977 }).kind, 'general')
eq('field next', nextGeneralYear({ ...base, member: 'field' }), 2027)
eq('office next', nextGeneralYear(base), 2028)
eq('office odd next', nextGeneralYear({ ...base, birthYear: 1977 }), 2027)
// 세대원·피부양자·의료급여 20세 이상 / 세대주·직장은 나이 무관
eq('dep 20', generalOf({ ...base, member: 'dependent', birthYear: 2006 }).kind, 'general')
eq('dep 18', generalOf({ ...base, member: 'dependent', birthYear: 2008 }).reason, 'under20')
eq('dep 18 next', nextGeneralYear({ ...base, member: 'dependent', birthYear: 2008 }), 2028)
eq('dep 19 next', nextGeneralYear({ ...base, member: 'dependent', birthYear: 2007 }), 2027)
eq('head 18', generalOf({ ...base, member: 'head', birthYear: 2008 }).kind, 'general')
eq('member 18', generalOf({ ...base, member: 'member', birthYear: 2008 }).reason, 'under20')
// 의료급여: 20~64 일반, 66+ 생애전환기
eq('aid 64', generalOf({ ...base, member: 'aid', birthYear: 1962 }).kind, 'general')
eq('aid 66', generalOf({ ...base, member: 'aid', birthYear: 1960 }).kind, 'aidTransition')
eq('aid 65 (2027 66)', nextGeneralYear({ ...base, member: 'aid', birthYear: 1961 }), 2027)

// 성·연령별 추가 검사
eq('lipid m24', ids(extrasOf(24, 'm', 'general')).includes('lipid'), true)
eq('lipid m26', ids(extrasOf(26, 'm', 'general')).includes('lipid'), false)
eq('lipid f36', ids(extrasOf(36, 'f', 'general')).includes('lipid'), false)
eq('lipid f40', ids(extrasOf(40, 'f', 'general')).includes('lipid'), true)
eq('age40 m', ids(extrasOf(40, 'm', 'general')), ['lipid', 'hepB', 'depression', 'lifestyle', 'plaque'])
eq('age40 dep range', extrasOf(40, 'm', 'general').find((e) => e.id === 'depression')?.range, [40, 49])
eq('age56', ids(extrasOf(56, 'm', 'general')), ['lipid', 'hepC', 'pft', 'depression'])
eq('age54 f bone', ids(extrasOf(54, 'f', 'general')).includes('bone'), true)
eq('age60 f bone', ids(extrasOf(60, 'f', 'general')).includes('bone'), true)
eq('age58 f bone', ids(extrasOf(58, 'f', 'general')).includes('bone'), false)
eq('age60 m bone', ids(extrasOf(60, 'm', 'general')).includes('bone'), false)
eq('age66 f', ids(extrasOf(66, 'f', 'general')), ['pft', 'bone', 'cognitive', 'depression', 'physical'])
eq('age68 cog', ids(extrasOf(68, 'm', 'general')).includes('cognitive'), true)
eq('age67 cog (field)', ids(extrasOf(67, 'm', 'general')).includes('cognitive'), false)
eq('age70', ids(extrasOf(70, 'm', 'general')), ['cognitive', 'depression', 'lifestyle', 'physical'])
eq('age80', ids(extrasOf(80, 'm', 'general')), ['lipid', 'cognitive', 'physical'])
eq('age20 mental', ids(extrasOf(20, 'm', 'general')), ['depression', 'psychosis'])
eq('age34 mental', ids(extrasOf(34, 'f', 'general')), ['depression', 'psychosis'])
eq('age21 mental (field)', ids(extrasOf(21, 'm', 'general')), [])
eq('age36 f', extrasOf(36, 'f', 'general'), [{ id: 'depression', range: [35, 39] }])
eq('aid 66 f', ids(extrasOf(66, 'f', 'aidTransition')), ['pft', 'bone', 'cognitive', 'depression', 'physical'])
eq('aid 70', ids(extrasOf(70, 'm', 'aidTransition')), ['cognitive', 'depression', 'lifestyle', 'physical'])
eq('aid 82', ids(extrasOf(82, 'm', 'aidTransition')), ['cognitive'])

// 암검진 연령 경계 (2026, 짝수년생)
const c = (by: number, extra: Partial<CheckupInput> = {}) => ids(cancersOf({ ...base, birthYear: by, ...extra }))
eq('f 38', c(1988), ['cervix'])
eq('f 40', c(1986), ['stomach', 'breast', 'cervix'])
eq('m 40', c(1986, { sex: 'm' }), ['stomach'])
eq('m 48', c(1978, { sex: 'm' }), ['stomach'])
eq('m 50', c(1976, { sex: 'm' }), ['stomach', 'colon'])
eq('m 49 odd', c(1977, { sex: 'm' }), [])
eq('m 51 odd yr colon only', c(1975, { sex: 'm' }), ['colon'])
eq('f 18', c(2008), [])
eq('f 20', c(2006), ['cervix'])
eq('liver 39', c(1987, { liverRisk: true, sex: 'm' }), [])
eq('liver 40', c(1986, { liverRisk: true, sex: 'm' }), ['stomach', 'liver'])
eq('liver odd 41', c(1985, { liverRisk: true, sex: 'm' }), ['liver'])
eq('lung 52', c(1974, { smoker30: true, sex: 'm' }), ['stomach', 'colon'])
eq('lung 54', c(1972, { smoker30: true, sex: 'm' }), ['stomach', 'colon', 'lung'])
eq('lung 74', c(1952, { smoker30: true, sex: 'm' }), ['stomach', 'colon', 'lung'])
eq('lung 76', c(1950, { smoker30: true, sex: 'm' }), ['stomach', 'colon'])
eq('lung no smoke', c(1972, { sex: 'm' }), ['stomach', 'colon'])
eq('field odd 2y cancers skip', c(1975, { member: 'field' }), ['colon'])

// 본인부담
const cp = (x: Partial<CheckupInput>) => Object.fromEntries(cancersOf({ ...base, ...x }).map((k) => [k.id, k.copay]))
eq('copay ins', cp({ birthYear: 1966, liverRisk: true, smoker30: true }), { stomach: 'ten', colon: 'free', liver: 'ten', breast: 'ten', cervix: 'free', lung: 'ten' })
eq('copay aid', cp({ birthYear: 1966, member: 'aid' }), { stomach: 'free', colon: 'free', breast: 'free', cervix: 'free' })

// 종합
const r = checkup({ ...base, birthYear: 1970, sex: 'm' })
eq('1970 m age', r.age, 56); eq('1970 m general', r.general, 'general'); eq('1970 next', r.next, 2028)
eq('1970 m extras', ids(r.extras), ['lipid', 'hepC', 'pft', 'depression'])

// D-day
eq('dday 10-04', daysLeft(2026, '2026-10-04'), 88)
eq('dday 12-31', daysLeft(2026, '2026-12-31'), 0)
eq('dday future', daysLeft(2027, '2026-10-04'), null)
eq('dday past', daysLeft(2026, '2027-01-02'), -1)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('health-checkup: all ok')
