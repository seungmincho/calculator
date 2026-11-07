'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/energyVoucher'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import AddToCalendar from '@/components/AddToCalendar'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { todayKST, daysBetween, ddayLabel } from '@/utils/dday'
import type { IcsEvent } from '@/utils/carMaintenance'
import {
  AMOUNT, APPLY_PERIOD, EV_YEAR, SUMMER, USE_PERIOD, WINTER, judgeVoucher, methodFor, summerClosed,
  type Benefit, type Fuel, type Size, type Trait, type WinterOther,
} from '@/utils/energyVoucher'

const noSub = () => () => {}
const won = (n: number) => n.toLocaleString('ko-KR')

// URL 코드. 다중 선택(b·t)은 글자를 이어 붙이고, 하나도 고르지 않으면 '0'.
const BEN: [string, Benefit][] = [['l', 'livelihood'], ['m', 'medical'], ['h', 'housing'], ['e', 'education']]
const TRA: [string, Trait][] = [['s', 'senior'], ['i', 'infant'], ['d', 'disabled'], ['p', 'pregnant'], ['r', 'illness'], ['o', 'singleParent'], ['c', 'childHead'], ['m', 'multiChild']]
const WIN: [string, WinterOther][] = [['', 'none'], ['e', 'emergency'], ['c', 'coalCoupon'], ['s', 'coalSwitch']]
const FUEL: [string, Fuel][] = [['e', 'electric'], ['g', 'gas'], ['d', 'district'], ['k', 'kerosene'], ['l', 'lpg'], ['c', 'coal']]
const SIZES = ['1', '2', '3', '4'] as const
// 첫 화면 기본값: 생계급여 + 노인 + 1인 + 도시가스 → 대상, 연 295,200원
const DEFAULTS = { b: 'l', t: 's', n: '1', w: '', x: '', f: 'g' }
type Key = keyof typeof DEFAULTS
const MULTI: Partial<Record<Key, [string, string][]>> = { b: BEN, t: TRA }
const SINGLE: Partial<Record<Key, readonly string[]>> = { n: SIZES, w: WIN.map(([c]) => c), x: ['', '1'], f: FUEL.map(([c]) => c) }

const SOURCES = [
  ['support', 'https://www.energyv.or.kr/info/support_info.do'],
  ['apply', 'https://www.energyv.or.kr/info/apl_info.do'],
  ['use', 'https://www.energyv.or.kr/info/use_info.do'],
  ['balance', 'https://www.energyv.or.kr/info/balance_inquiry.do'],
  ['faqDup', 'https://www.energyv.or.kr/board/boardDetail.do?boardId=131&mstBoardId=0'],
  ['faqMove', 'https://www.energyv.or.kr/board/boardDetail.do?boardId=1107&mstBoardId=0'],
  ['policy', 'https://www.korea.kr/news/policyNewsView.do?newsId=148966678'],
  ['bokjiro', 'https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309922_1114.html'],
] as const

export default function EnergyVoucher() {
  const t = useTranslations('energyVoucher')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const today = useSyncExternalStore(noSub, todayKST, () => null) // KST, 서버·하이드레이션은 null

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다.
  const fromUrl = useMemo(() => {
    const next = { ...DEFAULTS }
    if (!hydrated) return next
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      const q = sp.get(k)
      if (q == null) continue
      const multi = MULTI[k]
      if (multi) next[k] = q === '0' ? '' : multi.filter(([c]) => q.includes(c)).map(([c]) => c).join('')
      else if (SINGLE[k]!.includes(q)) next[k] = q
    }
    return next
  }, [hydrated, sp])
  const [edited, setEdited] = useState<typeof DEFAULTS | null>(null)
  const v = edited ?? fromUrl

  const set = (k: Key, val: string) => {
    const next = { ...v, [k]: val }
    setEdited(next)
    const url = new URL(window.location.href)
    for (const key of Object.keys(DEFAULTS) as Key[]) {
      const q = MULTI[key] && next[key] === '' ? '0' : next[key]
      if (next[key] !== DEFAULTS[key]) url.searchParams.set(key, q)
      else url.searchParams.delete(key)
    }
    window.history.replaceState(window.history.state, '', url)
  }
  const toggle = (k: 'b' | 't', code: string, on: boolean) =>
    set(k, MULTI[k]!.filter(([c]) => (c === code ? on : v[k].includes(c))).map(([c]) => c).join(''))

  const benefits = BEN.filter(([c]) => v.b.includes(c)).map(([, b]) => b)
  const traits = TRA.filter(([c]) => v.t.includes(c)).map(([, x]) => x)
  const winterOther = WIN.find(([c]) => c === v.w)![1]
  const fuel = FUEL.find(([c]) => c === v.f)![1]
  const r = judgeVoucher({ benefits, traits, size: Number(v.n), winterOther, facility: v.x === '1' })
  const method = methodFor(fuel)

  const D = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return t('fmt.date', { y, m, d })
  }
  const S = (s: string) => { const [y, m, d] = s.split('-').map(Number); return t('fmt.short', { y, m, d }) }
  const span = (a: string, b: string) => t('fmt.range', { a: S(a), b: S(b) })
  const W = (n: number) => t('unit.won', { v: won(n) })
  const size = t(`input.sizes.${r.size}`)
  const program = t(`input.winters.${winterOther}`)
  const headline = r.status === 'ineligible' ? t('result.notEligible') : W(r.amount)
  const applyLeft = today ? daysBetween(today, APPLY_PERIOD.end) : null
  const applyState = today == null ? null : today < APPLY_PERIOD.start ? 'before' : applyLeft! < 0 ? 'closed' : 'open'
  const summerGone = r.status === 'summerOnly' && today != null && summerClosed(today)
  const badge = r.status === 'eligible' ? 'bg-primary text-white' : r.status === 'summerOnly' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'

  const note = t('calendar.note', { url: 'https://toolhub.ai.kr/energy-voucher/' })
  const events: IcsEvent[] = [
    { uid: `energy-voucher-apply-${APPLY_PERIOD.end}`, date: APPLY_PERIOD.end, alarmDays: 7, title: t('calendar.apply', { year: EV_YEAR }), description: note },
    { uid: `energy-voucher-use-${USE_PERIOD.end}`, date: USE_PERIOD.end, alarmDays: 14, title: t('calendar.use', { year: EV_YEAR }), description: note },
  ]

  const names = (keys: string[], group: string) => keys.map((k) => t(`input.${group}.${k}`)).join('·') || t('share.none')
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="ui-card p-6 space-y-6 min-w-0">
          <MobileResultLink href="#energy-voucher-result" label={t('result.label', { year: EV_YEAR })} value={headline} />
          <h2 className="font-semibold text-fg">{t('input.title')}</h2>

          <fieldset>
            <legend className="text-sm font-medium text-body mb-1.5">{t('input.benefit')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {BEN.map(([c, b]) => (
                <Opt key={c} type="checkbox" label={t(`input.benefits.${b}`)} checked={v.b.includes(c)} onChange={(on) => toggle('b', c, on)} />
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">{t('input.benefitHint')}</p>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-body mb-1.5">{t('input.trait')}</legend>
            <p className="text-xs text-muted mb-2">{t('input.traitHint')}</p>
            <div className="grid grid-cols-1 gap-2">
              {TRA.map(([c, x]) => (
                <Opt key={c} type="checkbox" id={`ev-t-${c}`} label={t(`input.traits.${x}`)} hint={t(`input.traitHints.${x}`)}
                  checked={v.t.includes(c)} onChange={(on) => toggle('t', c, on)} />
              ))}
            </div>
          </fieldset>

          <Seg id="ev-n" label={t('input.size')} hint={t('input.sizeHint')} cols="grid-cols-4"
            options={SIZES.map((n) => [n, t(`input.sizes.${n}`)])} value={v.n} onChange={(n) => set('n', n)} />

          <fieldset>
            <legend className="text-sm font-medium text-body mb-1.5">{t('input.winter')}</legend>
            <p className="text-xs text-muted mb-2">{t('input.winterHint')}</p>
            <div className="grid grid-cols-1 gap-2">
              {WIN.map(([c, w]) => (
                <Opt key={w} type="radio" name="ev-w" label={t(`input.winters.${w}`)} checked={v.w === c} onChange={() => set('w', c)} />
              ))}
            </div>
          </fieldset>

          <Seg id="ev-f" label={t('input.fuel')} hint={t('input.fuelHint')} cols="grid-cols-3"
            options={FUEL.map(([c, f]) => [c, t(`input.fuels.${f}`)])} value={v.f} onChange={(f) => set('f', f)} />

          <Opt type="checkbox" id="ev-x" label={t('input.facility')} hint={t('input.facilityHint')} checked={v.x === '1'} onChange={(on) => set('x', on ? '1' : '')} />
        </div>

        <div id="energy-voucher-result" className="lg:col-span-2 ui-card p-6 space-y-6 scroll-mt-20 min-w-0" aria-live="polite">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-sub">{t('result.label', { year: EV_YEAR })}</p>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${badge}`}>{t(`result.badge.${r.status}`)}</span>
            </div>
            <p className="text-3xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{headline}</p>
            {r.status !== 'ineligible' && <p className="text-sm text-body">{t(`result.amountNote.${r.status}`, { size })}</p>}
          </div>

          {r.status === 'ineligible' ? (
            <ul className="bg-subtle rounded-2xl p-5 text-sm text-body space-y-2 list-disc pl-9">
              {r.reasons.map((k) => <li key={k}>{t(`result.reason.${k}`)}</li>)}
            </ul>
          ) : (
            <p className="bg-subtle rounded-2xl p-5 text-sm text-body">{t(`result.reason.${r.status}`, { program })}</p>
          )}
          {summerGone && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('result.summerOver', { date: D(SUMMER.end) })}</p>}
          {r.status === 'summerOnly' && <p className="text-sm text-sub">{t('result.compare', { v: W(r.full) })}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section aria-labelledby="ev-table">
              <h3 id="ev-table" className="font-semibold text-fg mb-3">{t('table.title')}</h3>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">{t('table.caption', { year: EV_YEAR })}</caption>
                  <thead>
                    <tr className="text-xs text-muted border-b border-line">
                      <th scope="col" className="text-left font-medium py-2 px-2">{t('table.size')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('table.total')}</th>
                      <th scope="col" className="text-right font-medium py-2 px-2">{t('table.summerOnly')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SIZES.map((n) => {
                      const on = Number(n) === r.size
                      return (
                        <tr key={n} className={on ? 'bg-primary-soft text-primary font-semibold' : 'text-body border-b border-line'} aria-current={on ? 'true' : undefined}>
                          <th scope="row" className="text-left font-medium py-2 px-2">{t(`input.sizes.${n}`)}</th>
                          <td className="text-right py-2 px-2">{W(AMOUNT[Number(n) as Size].total)}</td>
                          <td className="text-right py-2 px-2">{W(AMOUNT[Number(n) as Size].summerOnly)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted mt-2">{t('table.note')}</p>
            </section>

            <section aria-labelledby="ev-period">
              <h3 id="ev-period" className="font-semibold text-fg mb-3">{t('period.title')}</h3>
              <dl className="space-y-1.5 text-sm">
                <Row label={t('period.summer')} value={span(SUMMER.start, SUMMER.end)} />
                {r.status !== 'summerOnly' && <>
                  <Row label={t('period.winterVirtual')} value={span(WINTER.virtual, WINTER.end)} />
                  <Row label={t('period.winterCard')} value={span(WINTER.card, WINTER.end)} />
                </>}
              </dl>
              <p className="mt-3 bg-subtle rounded-2xl p-4 text-xs text-sub">
                {r.status === 'summerOnly' ? t('period.summerOnly', { date: D(SUMMER.end) }) : t('period.free')}
              </p>
              {r.status === 'eligible' && today && today <= USE_PERIOD.end && (
                <p className="mt-2 text-sm text-body tabular-nums">{t('period.useLeft', { date: D(USE_PERIOD.end), d: ddayLabel(daysBetween(today, USE_PERIOD.end)) })}</p>
              )}
            </section>
          </div>

          <section aria-labelledby="ev-apply" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="ev-apply" className="font-semibold text-fg">{t('apply.title')}</h3>
              <AddToCalendar file={`energy-voucher-${EV_YEAR}.ics`} events={events} />
            </div>
            <p className="text-sm text-body tabular-nums">
              {t('apply.period', { range: span(APPLY_PERIOD.start, APPLY_PERIOD.end) })}
              {applyState === 'open' && <strong className="ml-2 text-primary">{ddayLabel(applyLeft!)}</strong>}
            </p>
            {applyState === 'before' && <p className="text-sm text-sub">{t('apply.before')}</p>}
            {applyState === 'closed' && <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('apply.closed')}</p>}
            {applyState !== 'closed' && <p className="text-sm text-sub">{r.status === 'eligible' && `${t('apply.late')} `}{t('apply.pause')}</p>}
            {r.status !== 'ineligible' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-fg mb-2">{t('apply.where')}</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
                    {(t.raw('apply.whereItems') as string[]).map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-fg mb-2">{t('apply.bring')}</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
                    {(t.raw('apply.bringItems') as string[]).map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              </div>
            )}
            <p className="text-sm text-sub">{t('apply.auto')} {t('apply.contact')}</p>
          </section>

          {r.status !== 'ineligible' && (
            <section aria-labelledby="ev-method">
              <h3 id="ev-method" className="font-semibold text-fg mb-3">{t('method.title')}</h3>
              {r.status === 'summerOnly' ? (
                <p className="text-sm text-sub">{t('method.summerOnly')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['virtual', 'card'] as const).map((m) => {
                      const on = m === method
                      return (
                        <div key={m} className={`rounded-2xl border p-4 ${on ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`font-semibold ${on ? 'text-primary' : 'text-fg'}`}>{t(`method.${m}.name`)}</p>
                            {on && <span className="rounded-lg bg-primary text-white px-2 py-0.5 text-xs font-semibold">{t('method.recommend')}</span>}
                          </div>
                          <p className="text-sm text-body mb-2">{t(`method.${m}.desc`)}</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs text-sub">
                            {(t.raw(`method.${m}.items`) as string[]).map((s) => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-sm text-body">{t(`method.why.${fuel}`)}</p>
                </>
              )}
            </section>
          )}

          <p className="text-xs text-muted">{t('result.disclaimer')}</p>
          <ShareResult
            card={{
              tool: t('share.tool'), label: t('result.label', { year: EV_YEAR }), headline,
              sub: t('share.sub', { size, benefit: names(benefits, 'benefits'), trait: names(traits, 'traits') }),
              rows: r.status === 'ineligible' ? [{ label: t('share.deadline'), value: D(APPLY_PERIOD.end) }] : [
                { label: t('share.period'), value: span(r.period.start, r.period.end) },
                { label: t('share.deadline'), value: D(APPLY_PERIOD.end) },
              ],
            }}
            text={r.status === 'eligible' ? t('share.text', { size, amount: headline, date: D(APPLY_PERIOD.end) })
              : r.status === 'summerOnly' ? t('share.textSummer', { size, amount: headline, program })
                : t('share.textNo')}
          />
        </div>
      </div>

      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['eligibility', 'amount', 'use', 'other'] as const).map((sec) => (
            <div key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <p className="font-medium text-body">{t('guide.sources.title')}</p>
          <ul className="space-y-1">
            {SOURCES.map(([k, url]) => (
              <li key={k}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t(`guide.sources.items.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('guide.sources.asOf')}</p>
        </div>
      </div>
    </div>
  )
}

function Seg({ id, label, hint, options, value, onChange, cols }: {
  id: string; label: string; hint?: string; options: [string, string][]; value: string; onChange: (v: string) => void; cols: string
}) {
  return (
    <div>
      <p id={id} className="block text-sm font-medium text-body mb-1.5">{label}</p>
      <div className={`grid ${cols} gap-2`} role="group" aria-labelledby={id} aria-describedby={hint ? `${id}-hint` : undefined}>
        {options.map(([c, text]) => (
          <button key={c} type="button" aria-pressed={c === value} onClick={() => onChange(c)}
            className={`min-h-[44px] px-2 rounded-xl text-sm font-medium ${c === value ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}>
            {text}
          </button>
        ))}
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

/** 체크박스·라디오 옵션 카드(네이티브 input 이라 Tab·Space·방향키가 그대로 된다) */
function Opt({ type, id, name, label, hint, checked, onChange }: {
  type: 'checkbox' | 'radio'; id?: string; name?: string; label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void
}) {
  const hintId = hint && id ? `${id}-hint` : undefined
  return (
    <label className={`flex items-start gap-3 min-h-[44px] px-3 py-2.5 rounded-xl border cursor-pointer text-sm ${checked ? 'border-primary bg-primary-soft text-primary' : 'border-line text-body hover:bg-soft'}`}>
      <input type={type} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={hintId}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span id={hintId} className="block text-xs text-muted mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 text-body">
      <dt className="min-w-0">{label}</dt>
      <dd className="ml-auto text-right tabular-nums">{value}</dd>
    </div>
  )
}
