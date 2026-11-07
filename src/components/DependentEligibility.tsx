'use client'

import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/dependentEligibility'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { useHydrated } from '@/hooks/useHydrated'
import { useSearchParams } from '@/hooks/useSearchParams'
import { fmtKRW } from '@/utils/bogeumjari'
import { todayKST } from '@/utils/dday'
import { regional } from '@/utils/healthInsurance'
import { INSURANCE } from '@/utils/insuranceRates'
import { DEP, RELATIONS, MARITALS, asks, judge, dataYears, type Relation, type Marital } from '@/utils/dependentEligibility'

// 기본값: 함께 사는 부모님, 공적연금 연 1,500만원, 재산 과표 3억원 (첫 화면에 결과)
const DEFAULTS = {
  rel: 'parent' as Relation, tog: '1', age: '', dis: '0', mar: 'single' as Marital, blk: '0', kid: '0',
  biz: '', reg: '0', hr: '0', fin: '', pen: '15000000', wage: '', oth: '', prop: '300000000',
}
type Form = typeof DEFAULTS
const AMOUNTS = ['biz', 'fin', 'pen', 'wage', 'oth', 'prop'] as const
const FLAGS = ['tog', 'dis', 'blk', 'kid', 'reg', 'hr'] as const

function fromUrl(sp: URLSearchParams): Form {
  const f = { ...DEFAULTS }
  for (const k of AMOUNTS) { const v = sp.get(k); if (v !== null && /^\d{0,13}$/.test(v)) f[k] = v }
  for (const k of FLAGS) { const v = sp.get(k); if (v === '0' || v === '1') f[k] = v }
  const age = sp.get('age'); if (age !== null && /^\d{0,3}$/.test(age)) f.age = age
  const rel = sp.get('rel'); if (RELATIONS.includes(rel as Relation)) f.rel = rel as Relation
  const mar = sp.get('mar'); if (MARITALS.includes(mar as Marital)) f.mar = mar as Marital
  return f
}

const noSub = () => () => {}
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 13)
const num = (s: string) => Number(s) || 0
const comma = (n: number) => Math.round(n).toLocaleString('ko-KR')
const okBadge = (ok: boolean) => `shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${ok ? 'bg-primary-soft text-primary' : 'bg-red-50 text-red-700'}`

export default function DependentEligibility() {
  const t = useTranslations('dependentEligibility')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const today = useSyncExternalStore(noSub, todayKST, () => null) // 정적 HTML·첫 렌더엔 날짜 문구 없음

  // 정적 HTML·첫 렌더는 기본값, hydration 뒤 공유 링크 값, 고치면 그 값
  const [edits, setEdits] = useState<Form | null>(null)
  const f = edits ?? (hydrated ? fromUrl(sp) : DEFAULTS)
  const set = (patch: Partial<Form>) => setEdits((prev) => ({ ...(prev ?? f), ...patch }))

  // 기본값과 같은 칸은 URL에서 빼고, 비운 칸은 `k=` 로 남겨 받는 쪽도 비어 있게
  useEffect(() => {
    if (!edits) return
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(edits)) {
      if (v === DEFAULTS[k as keyof Form]) url.searchParams.delete(k)
      else url.searchParams.set(k, v)
    }
    window.history.replaceState(window.history.state, '', url)
  }, [edits])

  const krw = (n: number) => fmtKRW(n, t)
  const together = f.tog === '1'
  const q = asks(f.rel, together)
  const amt = { business: num(f.biz), financial: num(f.fin), pension: num(f.pen), wage: num(f.wage), other: num(f.oth), propertyTaxBase: num(f.prop) }
  const v = judge({
    ...amt, relation: f.rel, together, age: f.age === '' ? Number.NaN : Number(f.age), disabled: f.dis === '1',
    marital: q.marital ? f.mar : 'single', blocker: q.blocker !== null && f.blk === '1',
    kidsIncome: q.marital && f.mar === 'divorced' && f.kid === '1',
    bizRegistered: f.reg === '1', housingRental: f.hr === '1',
  })
  const prem = regional(amt)
  const verdict = v.eligible ? t('result.ok') : t('result.no')
  const rel = t(`in.relShort.${f.rel}`)
  const reqs = [
    { key: 'support', ok: v.support.ok },
    { key: 'income', ok: v.income.ok },
    { key: 'property', ok: v.property.ok },
  ] as const
  const failed = reqs.filter((r) => !r.ok).map((r) => t(`req.${r.key}`)).join(', ')
  const propKey = v.property.band === 'low' || v.property.band === 'high' ? v.property.band : `${v.property.band}${v.property.ok ? 'Ok' : 'No'}`
  const ym = today ? { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) } : null
  const yrs = ym && dataYears(ym.y, ym.m)
  const hiLink = `/health-insurance/?${new URLSearchParams({ tab: 'regional', biz: String(amt.business), fin: String(amt.financial), wage: String(amt.wage), pen: String(amt.pension), oth: String(amt.other), prop: String(amt.propertyTaxBase) })}`

  const yesNo = [{ v: '1', label: t('in.yes') }, { v: '0', label: t('in.no') }]
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const sources = t.raw('guide.sources.items') as { label: string; url: string }[]
  const money = (key: keyof typeof amt, k: (typeof AMOUNTS)[number], hint?: string) => (
    <Field id={`de-${k}`} label={t(`in.${key}`)} unit={t('won')} value={f[k]} onChange={(s) => set({ [k]: s } as Partial<Form>)}
      hint={[amt[key] > 0 ? krw(amt[key]) : '', hint ?? ''].filter(Boolean).join(' · ')} />
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-5 min-w-0">
          <MobileResultLink href="#dependent-eligibility-result" label={t('result.label', { rel })} value={verdict} />
          <h2 className="font-semibold text-fg">{t('in.title')}</h2>
          <div>
            <label htmlFor="de-rel" className="block text-sm font-medium text-body mb-1.5">{t('in.relation')}</label>
            <select id="de-rel" value={f.rel} onChange={(e) => set({ rel: e.target.value as Relation })}
              className="ui-field w-full min-h-[44px] px-4 py-3 text-sm">
              {RELATIONS.map((r) => <option key={r} value={r}>{t(`in.relations.${r}`)}</option>)}
            </select>
          </div>
          {f.rel !== 'spouse' && f.rel !== 'other' && (
            <Seg label={t('in.together')} value={f.tog} onChange={(s) => set({ tog: s })}
              options={[{ v: '1', label: t('in.togetherYes') }, { v: '0', label: t('in.togetherNo') }]} />
          )}
          {q.age && (
            <Field id="de-age" label={t('in.age')} unit={t('in.ageUnit')} value={f.age} onChange={(s) => set({ age: s.slice(0, 3) })} hint={t('in.ageHint')} plain />
          )}
          {q.marital && (
            <Seg label={t('in.marital')} value={f.mar} onChange={(s) => set({ mar: s })} options={MARITALS.map((m) => ({ v: m, label: t(`in.maritals.${m}`) }))} />
          )}
          {q.marital && f.mar === 'divorced' && (
            <Seg label={t('in.kidsIncome')} value={f.kid} onChange={(s) => set({ kid: s })} options={yesNo} />
          )}
          {q.blocker && <Seg label={t(`in.blocker.${q.blocker}`)} value={f.blk} onChange={(s) => set({ blk: s })} options={yesNo} />}
          <Seg label={t('in.disabled')} value={f.dis} onChange={(s) => set({ dis: s })} options={yesNo} />

          <div className="border-t border-line pt-5 space-y-4">
            <div>
              <h3 className="font-semibold text-fg">{t('in.incomeTitle')}</h3>
              <p className="text-xs text-muted mt-1">{t('in.incomeHint')}</p>
            </div>
            {money('business', 'biz', t('in.businessHint'))}
            {amt.business > 0 && (
              <>
                <Seg label={t('in.bizRegistered')} value={f.reg} onChange={(s) => set({ reg: s })} options={yesNo} />
                <Seg label={t('in.housingRental')} value={f.hr} onChange={(s) => set({ hr: s })} options={yesNo} />
              </>
            )}
            {money('financial', 'fin')}
            {money('pension', 'pen', t('in.pensionHint'))}
            {money('wage', 'wage', t('in.wageHint'))}
            {money('other', 'oth', t('in.otherHint'))}
          </div>
          <div className="border-t border-line pt-5">
            {money('propertyTaxBase', 'prop', t('in.propertyHint'))}
          </div>
        </div>

        <div id="dependent-eligibility-result" className="lg:col-span-2 ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-live="polite">
          <p className="text-sm text-sub">{t('result.label', { rel })}</p>
          <p className="text-3xl font-bold text-fg">{verdict}</p>
          <p className="text-sm text-body">{v.eligible ? t('result.okDesc') : t('result.noDesc', { failed })}</p>

          <ul className="divide-y divide-line border-y border-line">
            <Req name={t('req.support')} ok={v.support.ok} badge={t(v.support.ok ? 'met' : 'unmet')}>
              <p>{t(`support.${v.support.reason}`)}</p>
            </Req>
            <Req name={t('req.income')} ok={v.income.ok} badge={t(v.income.ok ? 'met' : 'unmet')}>
              <p className="tabular-nums">{t(v.income.totalOk ? 'income.totalOk' : 'income.totalNo', { total: krw(v.income.total), limit: krw(DEP.incomeLimit) })}</p>
              <p>{t(`business.${v.income.business.reason}`, { limit: krw(DEP.businessLimit) })}</p>
              {v.eligible && v.room >= 0 && <p className="tabular-nums">{t('income.room', { room: krw(v.room) })}</p>}
              {f.rel !== 'spouse' && <p className="text-muted">{t('income.married')}</p>}
            </Req>
            <Req name={t('req.property')} ok={v.property.ok} badge={t(v.property.ok ? 'met' : 'unmet')}>
              <p className="tabular-nums">{t(`property.${propKey}`, { base: krw(amt.propertyTaxBase), total: krw(v.income.total) })}</p>
            </Req>
          </ul>

          {v.financialUncertain && (
            <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('warn.financial', { fin: krw(amt.financial), alt: v.eligible ? t('result.no') : t('result.ok') })}</p>
          )}

          {!v.eligible && (
            <div className="bg-subtle rounded-2xl p-5 space-y-3">
              <p className="text-sm font-medium text-body">{t('premium.title')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums">{t('premium.value', { v: comma(prem.total) })}</p>
              <dl className="space-y-1 text-sm tabular-nums">
                {([['income', prem.incomePremium], ['property', prem.propertyPremium], ['ltc', prem.ltc]] as const).map(([k, n]) => (
                  <div key={k} className="flex justify-between gap-3 text-body"><dt>{t(`premium.${k}`)}</dt><dd>{t('premium.won', { v: comma(n) })}</dd></div>
                ))}
              </dl>
              {prem.minApplied && <p className="text-xs text-sub">{t('premium.min')}</p>}
              <p className="text-xs text-sub">{t('premium.note', { year: INSURANCE.year })}</p>
              <Link href={hiLink} className="inline-flex items-center min-h-[44px] text-sm font-medium text-primary hover:underline">{t('premium.link')}</Link>
            </div>
          )}

          {ym && yrs && (
            <p className="text-sm text-sub">{t(ym.m >= 11 ? 'timing.late' : 'timing.early', { ...ym, ...yrs })}</p>
          )}
          <p className="text-xs text-muted">{t('result.disclaimer')}</p>

          <ShareResult
            card={{
              tool: t('share.tool'), label: t('result.label', { rel }), headline: verdict,
              sub: t('share.sub', { total: krw(v.income.total), prop: krw(amt.propertyTaxBase) }),
              rows: [
                ...reqs.map((r) => ({ label: t(`req.${r.key}`), value: t(r.ok ? 'met' : 'unmet') })),
                ...(v.eligible ? [] : [{ label: t('premium.short'), value: t('premium.value', { v: comma(prem.total) }) }]),
              ],
            }}
            text={t('share.text', { rel, verdict, total: krw(v.income.total), prop: krw(amt.propertyTaxBase) })}
          />
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['criteria', 'income', 'timing', 'reform', 'tips'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">{(t.raw(`guide.${sec}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((it) => (
              <details key={it.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[24px]">{it.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{it.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">{sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{s.label}</a></li>)}</ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}

function Req({ name, ok, badge, children }: { name: string; ok: boolean; badge: string; children: ReactNode }) {
  return (
    <li className="py-3 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-fg">{name}</span>
        <span className={okBadge(ok)}>{badge}</span>
      </div>
      <div className="text-sm text-sub space-y-1">{children}</div>
    </li>
  )
}

function Field({ id, label, value, onChange, unit, hint, plain }: {
  id: string; label: string; value: string; onChange: (v: string) => void; unit: string; hint?: string; plain?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} type="text" inputMode="numeric" autoComplete="off"
          value={plain || !value ? value : num(value).toLocaleString('ko-KR')}
          onChange={(e) => onChange(digits(e.target.value))}
          placeholder="0" aria-describedby={hint ? `${id}-hint` : undefined}
          className="ui-field w-full min-h-[44px] px-4 py-3 pr-12 text-sm tabular-nums" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-faint pointer-events-none">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5 tabular-nums">{hint}</p>}
    </div>
  )
}

function Seg<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div>
      <p id={id} className="text-sm font-medium text-body mb-1.5">{label}</p>
      <div role="group" aria-labelledby={id} className="flex gap-1 bg-soft rounded-xl p-1">
        {options.map((o) => (
          <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
            className={`flex-1 min-h-[44px] rounded-lg px-2 text-sm font-medium ${value === o.v ? 'bg-primary text-white' : 'text-sub hover:text-fg'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
