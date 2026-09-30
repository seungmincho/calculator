'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Check, RotateCcw, BookOpen, ChevronDown, ChevronUp, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, ResponsiveContainer, ReferenceLine } from 'recharts'
import ShareResult from '@/components/ShareResult'
import { submitSalarySurvey, getCommunityStats, getCommunityRank, type CommunityStats, type CommunityRank } from '@/utils/salarySurvey'
import { percentileBelow, toTop, topPercent, nextMilestone, shareBetween, NTS_SOURCE_YEAR } from '@/utils/salaryInsights'
import { calculateNetSalary } from '@/utils/netSalary'

// ═══════════════════════════════════════════════════════════════════════════════
// 전체 순위는 salaryInsights.ts의 국세청 백분위표(연봉 계산기와 공유)를 쓴다.
// 아래 연령·성별·직업군 표는 공개 통계의 중위/평균값을 바탕으로 만든 **추정 분포** — 화면에 '추정'으로 표시.
// 연령×성별 교차 통계는 없으므로 합쳐서 계산하지 않는다.
// ═══════════════════════════════════════════════════════════════════════════════

// 연령대별 중위연봉 (만원)
const AGE_MEDIAN: Record<string, number> = { '20s': 2800, '30s': 4000, '40s': 4800, '50s': 4200, '60s': 2600 }

const AGE_PERCENTILES: Record<string, [number, number][]> = {
  '20s': [[10, 500], [25, 1200], [50, 2800], [75, 4000], [90, 5500], [95, 7000], [99, 12000]],
  '30s': [[10, 1200], [25, 2400], [50, 4000], [75, 5800], [90, 8000], [95, 10500], [99, 18000]],
  '40s': [[10, 1500], [25, 2800], [50, 4800], [75, 7200], [90, 10000], [95, 14000], [99, 25000]],
  '50s': [[10, 1200], [25, 2400], [50, 4200], [75, 6500], [90, 9500], [95, 13000], [99, 23000]],
  '60s': [[10, 500], [25, 1200], [50, 2600], [75, 4500], [90, 7000], [95, 10000], [99, 18000]],
}

const GENDER_MEDIAN: Record<string, number> = { male: 4200, female: 2800 }

const GENDER_PERCENTILES: Record<string, [number, number][]> = {
  male: [[10, 1200], [25, 2400], [50, 4200], [75, 6200], [90, 9000], [95, 12000], [99, 22000]],
  female: [[10, 600], [25, 1500], [50, 2800], [75, 4200], [90, 6000], [95, 8500], [99, 16000]],
}

// 직업군별 평균연봉 (만원)
const INDUSTRY_AVG: Record<string, number> = {
  it: 5800, finance: 7200, medical: 5500, civil: 5000, education: 4600, manufacturing: 4200,
  construction: 3800, service: 2800, selfEmployed: 3200, logistics: 3500, media: 4500, legal: 8000,
}

const INDUSTRY_PERCENTILES: Record<string, [number, number][]> = {
  it: [[10, 2800], [25, 4000], [50, 5800], [75, 8000], [90, 12000], [95, 15000], [99, 30000]],
  finance: [[10, 3500], [25, 5000], [50, 7200], [75, 10000], [90, 15000], [95, 20000], [99, 40000]],
  medical: [[10, 2500], [25, 3500], [50, 5500], [75, 9000], [90, 15000], [95, 25000], [99, 50000]],
  civil: [[10, 3000], [25, 3800], [50, 5000], [75, 6500], [90, 8000], [95, 9500], [99, 13000]],
  education: [[10, 2500], [25, 3200], [50, 4600], [75, 6000], [90, 7500], [95, 9000], [99, 12000]],
  manufacturing: [[10, 2000], [25, 2800], [50, 4200], [75, 5800], [90, 7500], [95, 9000], [99, 14000]],
  construction: [[10, 1500], [25, 2400], [50, 3800], [75, 5200], [90, 7000], [95, 8500], [99, 12000]],
  service: [[10, 800], [25, 1500], [50, 2800], [75, 4000], [90, 5500], [95, 7000], [99, 10000]],
  selfEmployed: [[10, 500], [25, 1200], [50, 3200], [75, 5500], [90, 8000], [95, 12000], [99, 25000]],
  logistics: [[10, 1500], [25, 2200], [50, 3500], [75, 5000], [90, 6500], [95, 8000], [99, 12000]],
  media: [[10, 2000], [25, 3000], [50, 4500], [75, 6500], [90, 9000], [95, 12000], [99, 20000]],
  legal: [[10, 3000], [25, 5000], [50, 8000], [75, 12000], [90, 18000], [95, 25000], [99, 50000]],
}

const AGE_GROUPS = ['20s', '30s', '40s', '50s', '60s'] as const
const GENDERS = ['male', 'female'] as const
const INDUSTRIES = ['it', 'finance', 'medical', 'civil', 'education', 'manufacturing', 'construction', 'service', 'selfEmployed', 'logistics', 'media', 'legal'] as const

// 첫 화면 기본값 (30대 중위연봉 근처)
const DEFAULTS = { salary: '40000000', age: '30s', gender: 'male', industry: '' }

// 분포 곡선: 0 ~ 1억5천 (만원), 500만 구간
const CURVE_MAX = 15000
const CURVE_STEP = 500

function group(below: number, extra: number) {
  return { below, top: toTop(below), extra: extra * 10000 }
}

export default function SalaryRank() {
  const t = useTranslations('salaryRank')
  const searchParams = useSearchParams()

  const [salaryInput, setSalaryInput] = useState(DEFAULTS.salary)
  const [ageGroup, setAgeGroup] = useState(DEFAULTS.age)
  const [gender, setGender] = useState(DEFAULTS.gender)
  const [industry, setIndustry] = useState(DEFAULTS.industry)
  // 사용자가 직접 입력을 바꿨는지 — 기본값/공유 링크 값이 익명 통계에 들어가지 않게, URL도 이때만 갱신
  const [touched, setTouched] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [contributed, setContributed] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'already' | 'error'>('idle')
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null)
  const [communityRank, setCommunityRank] = useState<CommunityRank | null>(null)
  const restored = useRef(false)

  const salary = Number(salaryInput) || 0

  // ── 포맷: 만/억 단위 ──
  const formatMan = useCallback((won: number) => {
    const eok = Math.floor(won / 100_000_000)
    const man = Math.floor((won % 100_000_000) / 10_000)
    if (eok > 0) return man > 0 ? `${eok}${t('unitEok')} ${man.toLocaleString()}${t('unitMan')}` : `${eok}${t('unitEok')}`
    if (won >= 10_000) return `${man.toLocaleString()}${t('unitMan')}`
    return won.toLocaleString()
  }, [t])

  // ── URL 복원 (공유 링크) ──
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const s = searchParams.get('salary')
    if (!s || !/^\d{1,12}$/.test(s)) return
    const a = searchParams.get('age') || ''
    const g = searchParams.get('gender') || ''
    const i = searchParams.get('industry') || ''
    setSalaryInput(s)
    setAgeGroup((AGE_GROUPS as readonly string[]).includes(a) ? a : '')
    setGender((GENDERS as readonly string[]).includes(g) ? g : '')
    setIndustry((INDUSTRIES as readonly string[]).includes(i) ? i : '')
  }, [searchParams])

  // ── 사용자가 바꾼 뒤에만 URL 갱신 ──
  useEffect(() => {
    if (!touched) return
    const p = new URLSearchParams()
    if (salary) p.set('salary', String(salary))
    if (ageGroup) p.set('age', ageGroup)
    if (gender) p.set('gender', gender)
    if (industry) p.set('industry', industry)
    const qs = p.toString()
    window.history.replaceState(window.history.state, '', qs ? `?${qs}` : window.location.pathname)
  }, [touched, salary, ageGroup, gender, industry])

  // ── 커뮤니티 통계 (Supabase, 오프라인·미설정이면 null → 섹션 숨김) ──
  useEffect(() => {
    getCommunityStats().then(setCommunityStats).catch(() => {})
  }, [])
  useEffect(() => {
    if (!salary) { setCommunityRank(null); return }
    const id = setTimeout(() => { getCommunityRank(salary).then(setCommunityRank).catch(() => {}) }, 600)
    return () => clearTimeout(id)
  }, [salary])

  // ── 결과 (입력 즉시 계산) ──
  const result = useMemo(() => {
    if (!salary) return null
    const below = percentileBelow(salary)
    return {
      below,
      top: topPercent(salary),
      milestone: nextMilestone(salary),
      netMonthly: calculateNetSalary(salary)?.netMonthly ?? 0,
      byAge: AGE_PERCENTILES[ageGroup] ? group(percentileBelow(salary, AGE_PERCENTILES[ageGroup]), AGE_MEDIAN[ageGroup]) : null,
      byGender: GENDER_PERCENTILES[gender] ? group(percentileBelow(salary, GENDER_PERCENTILES[gender]), GENDER_MEDIAN[gender]) : null,
      byIndustry: INDUSTRY_PERCENTILES[industry] ? group(percentileBelow(salary, INDUSTRY_PERCENTILES[industry]), INDUSTRY_AVG[industry]) : null,
    }
  }, [salary, ageGroup, gender, industry])

  // 분포 곡선: 500만 구간별 근로자 비율(국세청 표에서 파생). mine = 내 연봉 이상(상위 N%) 영역
  const curve = useMemo(() => {
    const you = Math.min(salary / 10000, CURVE_MAX)
    const pts: { x: number; all: number; mine: number | null }[] = []
    for (let a = 0; a < CURVE_MAX; a += CURVE_STEP) {
      const x = a + CURVE_STEP / 2
      const all = Math.round(shareBetween(a, a + CURVE_STEP) * 100) / 100
      pts.push({ x, all, mine: x >= you ? all : null })
      // 내 연봉 지점을 곡선에 끼워 넣어 색칠 영역이 기준선에서 정확히 시작하게
      if (you >= a && (you < a + CURVE_STEP || a + CURVE_STEP === CURVE_MAX) && you !== x) pts.push({ x: you, all, mine: all })
    }
    return pts.sort((p, q) => p.x - q.x)
  }, [salary])

  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setTouched(true) }

  const handleContribute = useCallback(async () => {
    if (!salary) return
    setSubmitStatus('loading')
    const { success, error } = await submitSalarySurvey({ salary, ageGroup, gender, industry })
    if (success) {
      setContributed(true)
      setSubmitStatus('idle')
      getCommunityStats().then(setCommunityStats).catch(() => {})
      getCommunityRank(salary).then(setCommunityRank).catch(() => {})
    } else setSubmitStatus(error === 'already_submitted' ? 'already' : 'error')
  }, [salary, ageGroup, gender, industry])

  const handleReset = useCallback(() => {
    setSalaryInput(DEFAULTS.salary)
    setAgeGroup(DEFAULTS.age)
    setGender(DEFAULTS.gender)
    setIndustry(DEFAULTS.industry)
    setTouched(false)
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !salary) return undefined
    const p = new URLSearchParams({ salary: String(salary) })
    if (ageGroup) p.set('age', ageGroup)
    if (gender) p.set('gender', gender)
    if (industry) p.set('industry', industry)
    return `${window.location.origin}${window.location.pathname}?${p}`
  }, [salary, ageGroup, gender, industry])

  const salaryText = `${formatMan(salary)}${t('won')}`
  const groupLines = result ? [
    result.byAge && t('groupTop', { group: t(`ages.${ageGroup}`), top: result.byAge.top }),
    result.byGender && t('groupTop', { group: t(`genders.${gender}`), top: result.byGender.top }),
  ].filter(Boolean) as string[] : []

  const chip = (on: boolean) => `py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label htmlFor="salary-rank-input" className="block text-sm font-medium text-body mb-2">{t('annualSalary')}</label>
              <div className="relative">
                <input
                  id="salary-rank-input"
                  type="text"
                  inputMode="numeric"
                  value={salary ? salary.toLocaleString() : ''}
                  onChange={e => edit(setSalaryInput)(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
                  placeholder={t('salaryPlaceholder')}
                  className="ui-field w-full px-4 py-3 pr-12 text-lg font-bold tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-faint text-sm">{t('won')}</span>
              </div>
              {salary > 0 && <p className="text-xs text-primary mt-1">= {salaryText}</p>}
              <p className="text-xs text-faint mt-1">{t('salaryHint')}</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000].map(v => (
                <button key={v} onClick={() => edit(setSalaryInput)(String(v * 10000))}
                  className={`${chip(salary === v * 10000)} px-1 text-xs`}>
                  {formatMan(v * 10000)}
                </button>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('ageGroup')}</p>
              <div className="flex flex-wrap gap-1.5">
                {AGE_GROUPS.map(ag => (
                  <button key={ag} onClick={() => edit(setAgeGroup)(ageGroup === ag ? '' : ag)} className={`px-3 ${chip(ageGroup === ag)}`} aria-pressed={ageGroup === ag}>
                    {t(`ages.${ag}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('gender')}</p>
              <div className="flex gap-2">
                {GENDERS.map(g => (
                  <button key={g} onClick={() => edit(setGender)(gender === g ? '' : g)} className={`flex-1 px-3 ${chip(gender === g)}`} aria-pressed={gender === g}>
                    {t(`genders.${g}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="salary-rank-industry" className="block text-sm font-medium text-body mb-2">{t('industry')}</label>
              <select id="salary-rank-industry" value={industry} onChange={e => edit(setIndustry)(e.target.value)} className="ui-field w-full px-3 py-2.5 text-sm">
                <option value="">{t('industryAll')}</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{t(`industries.${i}`)}</option>)}
              </select>
            </div>

            <button onClick={handleReset} className="ui-btn-soft w-full px-4 py-2.5 inline-flex items-center justify-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> {t('reset')}
            </button>
          </div>

          {/* 출처·한계 */}
          <div className="bg-subtle rounded-2xl p-5 space-y-2">
            <p className="text-xs font-semibold text-sub">{t('dataSource')}</p>
            <p className="text-xs text-sub">{t('sourceLine', { year: NTS_SOURCE_YEAR })}</p>
            <ul className="space-y-1">
              {(t.raw('caveats') as string[]).map((c, i) => <li key={i} className="text-xs text-muted">· {c}</li>)}
            </ul>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          {!result ? (
            <div className="ui-card p-16 text-center">
              <p className="text-faint text-lg">{t('enterSalary')}</p>
            </div>
          ) : (
            <>
              <div className="ui-hero p-6 sm:p-8">
                <p className="text-sm opacity-90">{t('heroLabel', { salary: salaryText })}</p>
                <p className="text-5xl sm:text-6xl font-bold my-2 tabular-nums">{t('topValue', { top: result.top })}</p>
                {groupLines.length > 0 && <p className="text-base font-semibold">{groupLines.join(' · ')}</p>}
                <p className="text-sm opacity-90 mt-3">
                  {result.milestone
                    ? t('nextMilestone', { gap: formatMan(result.milestone.gap), top: result.milestone.top })
                    : t('topOfTable')}
                </p>
              </div>

              <ShareResult
                fileName="toolhub-salary-rank"
                url={shareUrl}
                text={t('shareText', { salary: salaryText, top: result.top })}
                card={{
                  tool: t('title'),
                  label: t('cardLabel', { salary: salaryText }),
                  headline: t('topValue', { top: result.top }),
                  sub: t('cardSub', { year: NTS_SOURCE_YEAR }),
                  rows: [
                    { label: t('rowSalary'), value: salaryText },
                    ...(result.byAge ? [{ label: t('rowGroup', { group: t(`ages.${ageGroup}`) }), value: t('topValue', { top: result.byAge.top }) }] : []),
                    ...(result.byGender ? [{ label: t('rowGroup', { group: t(`genders.${gender}`) }), value: t('topValue', { top: result.byGender.top }) }] : []),
                    ...(result.netMonthly ? [{ label: t('rowMonthly'), value: `${result.netMonthly.toLocaleString()}${t('won')}` }] : []),
                  ],
                }}
              />

              {/* 분포 곡선 + 월 실수령 */}
              <div className="ui-card p-6">
                <h2 className="text-base font-semibold text-fg mb-1">{t('curveTitle')}</h2>
                <p className="text-xs text-muted mb-4">{t('beatsPercent', { percent: result.below.toFixed(1) })}</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={curve} margin={{ top: 20, right: 12, left: 12, bottom: 0 }}>
                      <XAxis dataKey="x" type="number" domain={[0, CURVE_MAX]} ticks={[0, 3000, 6000, 9000, 12000, 15000]}
                        tickFormatter={(v: number) => (v ? formatMan(v * 10000) : '0')} tick={{ fontSize: 11, fill: 'var(--muted)' }}
                        stroke="var(--line)" tickLine={false} />
                      <Area type="monotone" dataKey="all" stroke="var(--line-strong)" fill="var(--track)" fillOpacity={1} isAnimationActive={false} />
                      <Area type="monotone" dataKey="mine" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.85} isAnimationActive={false} />
                      <ReferenceLine x={Math.min(salary / 10000, CURVE_MAX)} stroke="var(--fg)" strokeDasharray="4 3"
                        label={{ value: t('curveYou'), position: 'top', fill: 'var(--fg)', fontSize: 12, fontWeight: 700 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-faint mt-2">{t('curveNote', { top: result.top })}</p>

                {result.netMonthly > 0 && (
                  <Link href={`/salary-calculator/?salary=${salary}`}
                    className="mt-4 flex items-center justify-between gap-3 bg-subtle rounded-2xl px-5 py-4 hover:bg-soft transition-colors">
                    <span className="text-sm text-body">{t('monthlyNet')} <b className="text-fg tabular-nums">{result.netMonthly.toLocaleString()}{t('won')}</b></span>
                    <span className="text-sm text-primary font-medium inline-flex items-center shrink-0">{t('monthlyNetLink')}<ChevronRight className="w-4 h-4" /></span>
                  </Link>
                )}
              </div>

              {/* 그룹 비교 (추정) */}
              {(result.byAge || result.byGender || result.byIndustry) && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {([
                    result.byAge && { key: 'age', title: t('ageComparison'), g: result.byAge, name: t(`ages.${ageGroup}`), ref: t('median') },
                    result.byGender && { key: 'gender', title: t('genderComparison'), g: result.byGender, name: t(`genders.${gender}`), ref: t('median') },
                    result.byIndustry && { key: 'industry', title: t('industryComparison'), g: result.byIndustry, name: t(`industries.${industry}`), ref: t('average') },
                  ].filter(Boolean) as { key: string; title: string; g: ReturnType<typeof group>; name: string; ref: string }[]).map(c => (
                    <div key={c.key} className="ui-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-body">{c.title}</p>
                        <span className="text-[11px] text-muted bg-soft rounded px-1.5 py-0.5">{t('estimate')}</span>
                      </div>
                      <p className="text-2xl font-bold text-fg tabular-nums">{t('topValue', { top: c.g.top })}</p>
                      <p className="text-xs text-muted mt-1">{c.name} {c.ref}: {formatMan(c.g.extra)}{t('won')}</p>
                      <div className="mt-2 h-2 bg-track rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${c.g.below}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 익명 기여 — 사용자가 직접 입력한 값만 (기본값·남의 공유 링크 값은 제외) */}
              {touched && (
                <div className="bg-subtle rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-fg">{t('contributeTitle')}</p>
                      <p className="text-xs text-muted mt-0.5">{t('contributeDesc')}</p>
                    </div>
                    {contributed ? (
                      <span className="flex items-center gap-1 text-sm text-primary font-medium shrink-0"><Check className="w-4 h-4" /> {t('contributed')}</span>
                    ) : submitStatus === 'already' ? (
                      <span className="flex items-center gap-1 text-sm text-amber-700 font-medium shrink-0"><AlertCircle className="w-4 h-4" /> {t('contributeAlready')}</span>
                    ) : (
                      <button onClick={handleContribute} disabled={submitStatus === 'loading'}
                        className="ui-btn px-4 py-2 text-sm shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50">
                        {submitStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('contributeBtn')}
                      </button>
                    )}
                  </div>
                  {submitStatus === 'error' && <p className="text-xs text-red-600 mt-2">{t('contributeError')}</p>}
                </div>
              )}

              {/* 커뮤니티 통계 (자가 입력, 5명 이상일 때만) */}
              {communityStats && communityStats.totalCount >= 5 && (
                <div className="ui-card p-6">
                  <h2 className="text-base font-semibold text-fg mb-1">{t('community.title')}</h2>
                  <p className="text-xs text-muted mb-4">{t('community.note')}</p>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      [t('community.participants'), `${communityStats.totalCount.toLocaleString()}${t('community.people')}`],
                      [t('community.avgSalary'), formatMan(communityStats.avgSalary)],
                      [t('community.medianSalary'), formatMan(communityStats.medianSalary)],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-subtle rounded-xl p-3 text-center">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="text-lg font-bold text-fg tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>

                  {communityRank && communityRank.total > 0 && (
                    <div className="bg-subtle rounded-xl p-4 mb-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-sub">{t('community.yourRank')}</p>
                        <p className="text-xl font-bold text-fg tabular-nums">{t('topValue', { top: toTop(communityRank.percentile) })}</p>
                      </div>
                      <div className="mt-2 h-2.5 bg-track rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${communityRank.percentile}%` }} />
                      </div>
                      <p className="text-xs text-muted mt-1.5">
                        {t('community.rankDesc', { below: communityRank.below.toLocaleString(), total: communityRank.total.toLocaleString() })}
                      </p>
                    </div>
                  )}

                  {([
                    ['byAge', AGE_GROUPS, communityStats.byAge, 'ages'],
                    ['byIndustry', INDUSTRIES, communityStats.byIndustry, 'industries'],
                  ] as const).map(([key, keys, data, ns]) => {
                    const rows = (keys as readonly string[]).filter(k => data?.[k])
                    if (!rows.length) return null
                    const maxAvg = Math.max(...rows.map(k => data[k].avg))
                    return (
                      <div key={key} className="mb-4 last:mb-0">
                        <p className="text-xs font-semibold text-sub mb-2">{t(`community.${key}`)}</p>
                        <div className="space-y-1.5">
                          {rows.map(k => (
                            <div key={k} className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-muted truncate shrink-0">{t(`${ns}.${k}`)}</span>
                              <div className="flex-1 h-5 bg-soft rounded overflow-hidden">
                                <div className="h-full bg-primary rounded flex items-center px-1.5 text-white font-medium whitespace-nowrap"
                                  style={{ width: `${(data[k].avg / maxAvg) * 100}%`, minWidth: '3rem' }}>
                                  {formatMan(data[k].avg)}
                                </div>
                              </div>
                              <span className="w-12 text-faint text-right shrink-0">{data[k].count}{t('community.people')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card overflow-hidden">
        <button onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-subtle transition-colors"
          aria-expanded={showGuide}>
          <span className="flex items-center gap-2 font-semibold text-fg">
            <BookOpen className="w-5 h-5" /> {t('guide.title')}
          </span>
          {showGuide ? <ChevronUp className="w-5 h-5 text-faint" /> : <ChevronDown className="w-5 h-5 text-faint" />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 space-y-4">
            {(['howToRead', 'dataExplain', 'tips'] as const).map(section => (
              <div key={section}>
                <h3 className="font-semibold text-body mb-2">{t(`guide.${section}.title`)}</h3>
                <ul className="space-y-1">
                  {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-sub flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span><span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('faqTitle')}</h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <details key={i} className="group">
              <summary className="cursor-pointer font-medium text-body hover:text-primary transition-colors">
                {t(`faq.q${i}.question`)}
              </summary>
              <p className="mt-2 text-sm text-sub pl-4 border-l-2 border-line">{t(`faq.q${i}.answer`)}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
