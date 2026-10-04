'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2, MinusCircle } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/healthCheckup'
import { useSearchParams } from '@/hooks/useSearchParams'
import ShareResult from '@/components/ShareResult'
import { MEMBERS, CANCER_CYCLE, checkup, daysLeft, sameParity, type Sex, type Member, type Extra } from '@/utils/healthCheckup'

const YEARS = [2026, 2027] as const
const BIRTH_MIN = 1920
const BIRTH_MAX = 2011
const BIRTH_YEARS = Array.from({ length: BIRTH_MAX - BIRTH_MIN + 1 }, (_, k) => BIRTH_MAX - k)
const NHIS = {
  target: 'https://www.nhis.or.kr/nhis/healthin/retrieveHealthinCheckUpTargetPerson.do',
  clinic: 'https://www.nhis.or.kr/nhis/healthin/retrieveExmdAdminSearch.do',
  missed: 'https://www.nhis.or.kr/nhis/healthin/retrieveHealthinCheckUpUnexaminedRequest.do',
}
const RELATED = ['blood-pressure', 'blood-sugar', 'bmi-calculator', 'health-insurance', 'age-calculator'] as const

export default function HealthCheckup() {
  const t = useTranslations('healthCheckup')
  const sp = useSearchParams()

  const [birthYear, setBirthYear] = useState(() => {
    const v = Number(sp.get('by'))
    return v >= BIRTH_MIN && v <= BIRTH_MAX ? v : 1976
  })
  const [sex, setSex] = useState<Sex>(() => (sp.get('g') === 'm' ? 'm' : 'f'))
  const [member, setMember] = useState<Member>(() => {
    const v = sp.get('t') as Member
    return MEMBERS.includes(v) ? v : 'office'
  })
  const [year, setYear] = useState<number>(() => (sp.get('y') === '2027' ? 2027 : 2026))
  // 흡연·간질환은 건강 정보라 URL에 넣지 않음
  const [smoker30, setSmoker30] = useState(false)
  const [liverRisk, setLiverRisk] = useState(false)
  const [today, setToday] = useState<string | null>(null) // 클라이언트에서만 (하이드레이션 불일치 방지)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setToday(new Date().toLocaleDateString('sv-SE')) }, [])
  useEffect(() => {
    const q = new URLSearchParams({ by: String(birthYear), g: sex, t: member })
    if (year !== 2026) q.set('y', String(year))
    window.history.replaceState(null, '', `?${q}`)
  }, [birthYear, sex, member, year])

  const r = checkup({ birthYear, sex, member, year, smoker30, liverRisk })
  const age = r.age
  const status = r.general ? 'yes' : r.cancers.length ? 'cancerOnly' : 'no'
  const dl = today ? daysLeft(year, today) : undefined
  const parity = sameParity(year, birthYear)

  const extraDetail = (e: Extra) => (e.range ? t('ex.range', { lo: e.range[0], hi: e.range[1] }) : t(`ex.${e.id}.d`))
  const cancerNames = r.cancers.map((c) => t(`ca.${c.id}.name`))
  const generalLine = r.general === 'aidTransition'
    ? t('res.aidTransition', { next: r.next })
    : member === 'field' ? t('res.field', { next: r.next }) : t('res.biennial', { next: r.next })
  const whyNot = r.reason === 'under20' ? t('res.under20', { next: r.next }) : t('res.parity', { by: birthYear, next: r.next })
  const hints: string[] = []
  if (parity && age >= 54 && age <= 74 && !smoker30) hints.push(t('ca.lungHint'))
  if (age >= 40 && !liverRisk) hints.push(t('ca.liverHint'))
  const dlText = dl === undefined ? '' : dl === null ? t('dl.notYet') : dl < 0 ? t('dl.over') : dl === 0 ? 'D-DAY' : `D-${dl}`
  const milestones = t.raw('ms.rows') as { age: number; items: string }[]

  const pickBirth = (y: number) => {
    setBirthYear(y)
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const radioGroup = <T extends string | number>(name: string, legend: string, value: T, options: [T, string][], set: (v: T) => void, cols: string) => (
    <fieldset>
      <legend className="block text-sm font-medium text-body mb-2">{legend}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map(([v, label]) => (
          <label key={String(v)} className="flex items-center justify-center min-h-11 px-2 rounded-lg text-sm font-medium text-center cursor-pointer bg-soft text-body hover:bg-subtle has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
            <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => set(v)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )

  const checkbox = (id: string, label: string, hint: string, checked: boolean, set: (v: boolean) => void) => (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 min-h-11 cursor-pointer">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} aria-describedby={`${id}-hint`} className="mt-0.5 w-5 h-5 shrink-0 accent-primary" />
        <span className="text-sm text-body">{label}</span>
      </label>
      <p id={`${id}-hint`} className="text-xs text-muted pl-8">{hint}</p>
    </div>
  )

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <div>
              <label htmlFor="hc-birth" className="block text-sm font-medium text-body mb-2">{t('in.birth')}</label>
              <select id="hc-birth" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} aria-describedby="hc-birth-hint" className="ui-field w-full px-4 py-3">
                {BIRTH_YEARS.map((y) => <option key={y} value={y}>{t('in.birthOpt', { y, age: year - y })}</option>)}
              </select>
              <p id="hc-birth-hint" className="text-xs text-muted mt-1.5">{t('in.birthHint')}</p>
            </div>

            {radioGroup<Sex>('hc-sex', t('in.sex'), sex, [['f', t('in.sexF')], ['m', t('in.sexM')]], setSex, 'grid-cols-2')}

            <div>
              {radioGroup<Member>('hc-member', t('in.member'), member, MEMBERS.map((m): [Member, string] => [m, t(`in.memberOpt.${m}`)]), setMember, 'grid-cols-2')}
              <p className="text-xs text-muted mt-1.5">{t(`in.memberHint.${member}`)}</p>
            </div>

            <div>
              {radioGroup<number>('hc-year', t('in.year'), year, YEARS.map((y): [number, string] => [y, t('in.yearOpt', { y })]), setYear, 'grid-cols-2')}
              {year !== 2026 && <p className="text-xs text-muted mt-1.5">{t('in.yearNote')}</p>}
            </div>

            <fieldset className="space-y-3">
              <legend className="block text-sm font-medium text-body mb-2">{t('in.risk')}</legend>
              {checkbox('hc-smoker', t('in.smoker'), t('in.smokerHint'), smoker30, setSmoker30)}
              {checkbox('hc-liver', t('in.liver'), t('in.liverHint'), liverRisk, setLiverRisk)}
              <p className="text-xs text-faint">{t('in.privacy')}</p>
            </fieldset>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div ref={resultRef} className="ui-card p-6 space-y-5 scroll-mt-24">
            <div aria-live="polite" aria-atomic="true">
              <p className="text-sm text-muted">{t('res.label', { year, by: birthYear, age })}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl sm:text-3xl font-bold text-fg">
                {status === 'no'
                  ? <MinusCircle className="w-7 h-7 shrink-0 text-faint" aria-hidden />
                  : <CheckCircle2 className="w-7 h-7 shrink-0 text-primary" aria-hidden />}
                {t(`res.${status}`, { year })}
              </p>
              <p className="text-sm text-sub mt-2">{r.general ? generalLine : whyNot}</p>
              {status === 'cancerOnly' && <p className="text-sm text-sub mt-1">{t('res.cancerOnlyNote', { list: cancerNames.join('·') })}</p>}
            </div>

            {status !== 'no' && (
              <div className="bg-subtle rounded-2xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted">{t('dl.label')}</p>
                    <p className="text-lg font-bold text-fg">{t('dl.date', { year })}</p>
                  </div>
                  <p className="text-2xl font-bold text-primary tabular-nums">{dlText}</p>
                </div>
                <p className="text-xs text-muted mt-2">{dl !== undefined && dl !== null && dl >= 0 && dl <= 92 ? t('dl.rush') : t('dl.period')}</p>
              </div>
            )}

            {r.general && (
              <Section title={t('res.generalTitle')}>
                <Item
                  name={t(r.general === 'aidTransition' ? 'res.aidCommon' : 'res.common')}
                  detail={t(r.general === 'aidTransition' ? 'res.aidCommonD' : 'res.commonD')}
                  tags={[member === 'field' ? t('cycle.1y') : t('cycle.2y'), t('copay.free')]}
                />
                {r.extras.map((e) => (
                  <Item key={e.id} name={t(`ex.${e.id}.name`)} detail={extraDetail(e)} tags={e.range ? [t('ex.refTag')] : []} />
                ))}
              </Section>
            )}

            <Section title={t('res.cancerTitle')}>
              {r.cancers.length === 0 && <li className="py-3 text-sm text-sub">{t('res.noCancer')}</li>}
              {r.cancers.map((c) => (
                <Item
                  key={c.id}
                  name={t(`ca.${c.id}.name`)}
                  detail={t(`ca.${c.id}.d`)}
                  tags={[t(`cycle.${CANCER_CYCLE[c.id]}`), c.copay === 'free' ? t('copay.free') : t('copay.ten')]}
                />
              ))}
            </Section>
            {(hints.length > 0 || member === 'field') && (
              <ul className="space-y-1 text-xs text-muted">
                {hints.map((h) => <li key={h}>{h}</li>)}
                {member === 'field' && <li>{t('ca.fieldNote')}</li>}
              </ul>
            )}

            <ShareResult
              card={{
                tool: t('title'),
                label: t('share.label', { by: birthYear, year }),
                headline: t(`share.headline.${status}`),
                sub: t('share.sub', { c: r.cancers.length, e: r.extras.length }),
                rows: [
                  { label: t('share.general'), value: r.general ? t('share.generalYes') : t('share.generalNext', { next: r.next }) },
                  { label: t('share.cancer'), value: cancerNames.length ? cancerNames.join('·') : t('share.none') },
                  ...(r.extras.length ? [{ label: t('share.extra'), value: r.extras.slice(0, 3).map((e) => t(`ex.${e.id}.short`)).join('·') }] : []),
                  { label: t('share.deadline'), value: t('dl.date', { year }) },
                ],
              }}
              text={t(`share.text.${status}`, { by: birthYear, year, c: r.cancers.length, next: r.next })}
              fileName={`health-checkup-${birthYear}`}
            />
          </div>

          {/* 일정 · 놓쳤을 때 */}
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-fg">{t('plan.title')}</h2>
            <div className="divide-y divide-line border-y border-line text-sm">
              <Row label={t('plan.period')} value={t('plan.periodV', { year })} />
              <Row label={t('plan.confirm')} value={t('plan.confirmV', { y: year + 1 })} />
              {r.general && member !== 'field' && <Row label={t('plan.missed')} value={t('plan.missedV', { y: year + 1 })} />}
              <Row label={t('plan.next')} value={t('plan.nextV', { next: r.next })} />
            </div>
            {(member === 'office' || member === 'field') && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('plan.fine')}</p>}
            <div className="flex flex-wrap gap-2">
              <a href={NHIS.target} target="_blank" rel="noopener noreferrer" className="ui-btn px-4 py-3 text-sm">{t('plan.linkTarget')}</a>
              <a href={NHIS.clinic} target="_blank" rel="noopener noreferrer" className="ui-btn-soft px-4 py-3 text-sm">{t('plan.linkClinic')}</a>
              <a href={NHIS.missed} target="_blank" rel="noopener noreferrer" className="ui-btn-soft px-4 py-3 text-sm">{t('plan.linkMissed')}</a>
            </div>
            <p className="text-xs text-faint">{t('plan.phone')}</p>
          </div>

          {/* 나이별 한눈에 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('ms.title', { year })}</h2>
              <p className="text-sm text-muted mt-1">{t('ms.desc')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2">{t('ms.birth')}</th>
                    <th scope="col" className="text-left font-medium py-2">{t('ms.items')}</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => {
                    const y = year - m.age
                    const cur = y === birthYear
                    return (
                      <tr key={m.age} className={`border-b border-line ${cur ? 'bg-primary-soft' : ''}`}>
                        <td className="py-1 pr-3 align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => pickBirth(y)}
                            aria-pressed={cur}
                            aria-label={t('ms.pick', { y, age: m.age })}
                            className={`min-h-11 px-2 -ml-2 rounded-lg text-left hover:bg-soft ${cur ? 'text-primary font-semibold' : 'text-body'}`}
                          >
                            {t('ms.birthCell', { y, age: m.age })}
                          </button>
                        </td>
                        <td className="py-3 text-sub align-top">{m.items}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-faint">{t('ms.note')}</p>
          </div>

          <p className="text-xs text-faint">{t('disclaimer')}</p>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['prep', 'missed', 'company', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RELATED.map((href) => (
            <Link key={href} href={`/${href}/`} className="ui-btn-soft px-3 py-2 text-sm">{t(`guide.links.${href}`)}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
      <ul className="divide-y divide-line border-y border-line">{children}</ul>
    </div>
  )
}

function Item({ name, detail, tags }: { name: string; detail: string; tags: string[] }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-body">{name}</p>
        <p className="text-xs text-muted mt-0.5">{detail}</p>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 sm:justify-end shrink-0">
          {tags.map((tag) => <span key={tag} className="px-2 py-0.5 rounded-md bg-soft text-xs text-sub">{tag}</span>)}
        </div>
      )}
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-body shrink-0">{label}</span>
      <span className="text-sub text-right">{value}</span>
    </div>
  )
}
