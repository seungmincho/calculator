'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/donationTaxCredit'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { TAX_YEAR } from '@/utils/yearEndTax'
import { analyze, KINDS, EXTRA, EXAMPLES, BRACKET, POLITICAL_FULL, type Gifts, type Kind } from '@/utils/donationTaxCredit'

// 계산은 donationTaxCredit.ts → yearEndTax.ts (연말정산 계산기와 같은 함수).
// URL: s 총급여 · dn 일반기부금(종교단체 외)은 /year-end-tax와 같은 키. dp 정치자금 · ds 특례 · dr 종교단체
const KEY: Record<Kind, string> = { political: 'dp', special: 'ds', general: 'dn', religious: 'dr' }
const SALARY_PRESETS = [30_000_000, 50_000_000, 80_000_000, 100_000_000]
const EXTRA_PRESETS = [100_000, 300_000, 500_000, 1_000_000]
// 기본값 = 페이지 예시와 같은 값 (첫 화면에 결과가 보이게)
const DEF = { salary: EXAMPLES.d.salary, g: EXAMPLES.d.g as Gifts }
const MAX = 10_000_000_000
const NEXT = { yearEnd: '/year-end-tax/', hometown: '/hometown-donation/', medical: '/medical-tax-credit/', pension: '/pension-tax-credit/' } as const

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })
const digits = (s: string) => s.replace(/[^\d]/g, '')
const amount = (v: string | null) => (v && /^\d{1,11}$/.test(v) ? Number(v) : null)

function MoneyInput({ id, label, value, onChange, hint, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; hint?: string; unit: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-body mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full px-4 py-3 pr-12 tabular-nums" aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  )
}

function Presets({ values, current, onPick, label }: { values: number[]; current: number; onPick: (n: number) => void; label: (n: number) => string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {values.map((n) => (
        <button
          key={n} type="button" onClick={() => onPick(n)} aria-pressed={current === n}
          className={`min-h-[44px] px-3 py-2 rounded-lg text-sm tabular-nums transition-colors ${current === n ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
        >
          {label(n)}
        </button>
      ))}
    </div>
  )
}

export default function DonationTaxCreditCalculator() {
  const t = useTranslations('donationTaxCredit')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 기부금 키가 하나라도 있으면 없는 키는 0. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo(() => {
    if (!hydrated) return DEF
    const g = KINDS.some((k) => sp.has(KEY[k])) ? Object.fromEntries(KINDS.map((k) => [k, amount(sp.get(KEY[k])) ?? 0])) as Gifts : DEF.g
    return { salary: amount(sp.get('s')) ?? DEF.salary, g }
  }, [hydrated, sp])
  const [edited, setEdited] = useState<typeof DEF | null>(null)
  const { salary, g: gifts } = edited ?? fromUrl
  const [extra, setExtra] = useState(EXTRA)

  // 값 → URL. dn은 0이어도 넣음 — 기부금 키가 하나도 없으면 받는 쪽이 예시 기부금으로 계산
  const update = (next: typeof DEF) => {
    setEdited(next)
    const q = new URLSearchParams({ s: String(next.salary), dn: String(next.g.general) })
    for (const k of KINDS) if (k !== 'general' && next.g[k]) q.set(KEY[k], String(next.g[k]))
    window.history.replaceState(window.history.state, '', `?${q}`)
  }
  const setSalary = (n: number) => update({ salary: n, g: gifts })

  const r = analyze(salary, gifts, extra)
  const W = t('won')
  const fullLink = `/year-end-tax/?${new URLSearchParams(gifts.general ? { s: String(salary), dn: String(gifts.general) } : { s: String(salary) })}`
  const statusText = t(`status.${r.status}`, { credit: won(r.credit), donation: won(r.donation), saving: won(r.saving), tax: won(r.tax) })
  const shareVars = { salary: man(salary), salaryM: mil(salary), total: man(r.total), totalM: mil(r.total), credit: won(r.credit), saving: won(r.saving) }
  const card = {
    tool: t('title'),
    label: t('share.label', shareVars),
    headline: r.saving > 0 ? t('share.headline', shareVars) : t('share.headlineZero'),
    sub: t('share.sub', shareVars),
    rows: [
      ...KINDS.filter((k) => gifts[k] > 0).map((k) => ({ label: t(`kinds.${k}.short`), value: `${won(gifts[k])}${W}` })),
      { label: t('credits.total'), value: `${won(r.credit)}${W}` },
      { label: t('result.label'), value: `${won(r.saving)}${W}` },
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle', { year: TAX_YEAR })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#donation-tax-credit-result" label={t('result.label')} value={`${won(r.saving)}${W}`} />
            <div>
              <MoneyInput id="dt-salary" label={t('salary')} value={salary} onChange={setSalary} unit={W} hint={t('salaryHint')} />
              <Presets values={SALARY_PRESETS} current={salary} onPick={setSalary} label={(n) => t('manUnit', { n: man(n), m: mil(n) })} />
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="text-sm font-semibold text-fg">{t('gifts.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('gifts.hint', { year: TAX_YEAR })}</p>
            </div>

            {KINDS.map((k) => (
              <MoneyInput
                key={k} id={`dt-${k}`} label={t(`kinds.${k}.label`)} value={gifts[k]} unit={W} hint={t(`kinds.${k}.hint`)}
                onChange={(v) => update({ salary, g: { ...gifts, [k]: v } })}
              />
            ))}

            <p className="rounded-2xl p-4 bg-subtle text-sm text-sub">
              {t('hometown.text')}{' '}
              <Link href="/hometown-donation/" className="text-primary font-medium hover:underline">{t('hometown.link')}</Link>
            </p>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div id="donation-tax-credit-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.saving)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
            </div>

            {/* 1천만원 구간 */}
            {r.eligible > 0 && (
              <div>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-body">{t('bracket.title')}</span>
                  <span className="text-muted tabular-nums">{t('bracket.of', { eligible: man(r.eligible), eligibleM: mil(r.eligible) })}</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-track overflow-hidden" role="progressbar" aria-label={t('bracket.title')}
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((r.eligible / BRACKET) * 100))}>
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (r.eligible / BRACKET) * 100)}%` }} />
                </div>
                <p className="text-sm text-sub mt-2">
                  {r.high > 0 ? t('bracket.over', { high: won(r.high) }) : t('bracket.under', { left: won(BRACKET - r.eligible) })}
                </p>
              </div>
            )}

            <div className="relative overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">{t('table.caption')}</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="text-left font-medium py-2 pr-2">{t('table.kind')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.amount')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.limit')}</th>
                    <th scope="col" className="text-right font-medium py-2 px-2">{t('table.eligible')}</th>
                    <th scope="col" className="text-right font-medium py-2 pl-2">{t('table.excess')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((x) => (
                    <tr key={x.key} className="border-b border-line">
                      <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`kinds.${x.key}.short`)}</th>
                      <td className="text-right py-3 px-2 text-sub">{won(x.amount)}</td>
                      <td className="text-right py-3 px-2 text-sub">{x.limit === null ? t('table.none') : won(x.limit)}</td>
                      <td className="text-right py-3 px-2 text-fg">{won(x.eligible)}</td>
                      <td className={`text-right py-3 pl-2 ${x.excess > 0 ? 'text-fg font-medium' : 'text-sub'}`}>{won(x.excess)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('credits.donation')}</dt><dd className="tabular-nums text-fg">{won(r.donation)}{W}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('credits.political')}</dt><dd className="tabular-nums text-fg">{won(r.political)}{W}</dd></div>
              <div className="flex justify-between gap-3 border-t border-line pt-1.5"><dt className="font-semibold text-fg">{t('credits.total')}</dt><dd className="tabular-nums font-bold text-primary">{won(r.credit)}{W}</dd></div>
            </dl>
            {r.excess > 0 && <p className="text-sm text-sub">{t('table.excessNote', { excess: won(r.excess) })}</p>}
            <p className="text-xs text-muted">{t('table.note', { income: won(r.income) })}</p>

            <ShareResult card={card} text={t('share.text', shareVars)} fileName="donation-tax-credit" />
            <div className="space-y-2">
              <Link href={fullLink} className="ui-btn inline-block px-4 py-3 text-sm">{t('actions.full')}</Link>
              <p className="text-xs text-muted">{t('actions.fullNote')}</p>
            </div>
          </div>

          {/* 12월에 더 기부하면 */}
          <section aria-labelledby="dt-sim" className="ui-card p-6 space-y-4">
            <div>
              <h2 id="dt-sim" className="text-lg font-semibold text-fg">{t('sim.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('sim.desc')}</p>
            </div>
            <div>
              <MoneyInput id="dt-extra" label={t('sim.extra')} value={extra} onChange={setExtra} unit={W} />
              <Presets values={EXTRA_PRESETS} current={extra} onPick={setExtra} label={(n) => t('manUnit', { n: man(n), m: mil(n) })} />
            </div>
            <div aria-live="polite" className="space-y-2">
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">
                {r.more > 0 ? t('sim.more', { extra: won(extra), more: won(r.more), cost: won(extra - r.more) }) : t('sim.moreZero')}
              </p>
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">
                {r.politicalGap === 0 ? t('sim.politicalDone')
                  : r.politicalGain > 0 ? t('sim.political', { gap: won(r.politicalGap), full: man(POLITICAL_FULL), fullM: mil(POLITICAL_FULL), gain: won(r.politicalGain) })
                    : t('sim.moreZero')}
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* 기부처 종류 */}
      <section aria-labelledby="dt-kinds" className="ui-card p-6 space-y-4">
        <h2 id="dt-kinds" className="text-lg font-semibold text-fg">{t('guide.title')}</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('guide.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 pr-2">{t('guide.cols.kind')}</th>
                <th scope="col" className="text-left font-medium py-2 px-2">{t('guide.cols.examples')}</th>
                <th scope="col" className="text-left font-medium py-2 px-2">{t('guide.cols.limit')}</th>
                <th scope="col" className="text-left font-medium py-2 pl-2">{t('guide.cols.rate')}</th>
              </tr>
            </thead>
            <tbody>
              {(t.raw('guide.rows') as { kind: string; examples: string; limit: string; rate: string }[]).map((x) => (
                <tr key={x.kind} className="border-b border-line align-top">
                  <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{x.kind}</th>
                  <td className="py-3 px-2 text-sub">{x.examples}</td>
                  <td className="py-3 px-2 text-sub">{x.limit}</td>
                  <td className="py-3 pl-2 text-sub">{x.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="dt-tips" className="ui-card p-6 space-y-3">
        <h2 id="dt-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section aria-labelledby="dt-next" className="ui-card p-6 space-y-3">
        <h2 id="dt-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(NEXT) as (keyof typeof NEXT)[]).map((k) => (
            <li key={k}>
              <Link href={NEXT[k]} className="block rounded-2xl p-4 bg-subtle hover:bg-soft transition-colors min-h-[44px]">
                <span className="block text-sm font-semibold text-fg">{t(`next.${k}.title`)}</span>
                <span className="block text-xs text-muted mt-1">{t(`next.${k}.desc`)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('source', { year: TAX_YEAR })}</p>
      </section>
    </div>
  )
}
