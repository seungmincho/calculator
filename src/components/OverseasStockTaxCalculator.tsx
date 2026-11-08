'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/overseasStockTax'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import { analyze, encodeRows, decodeRows, parseFee, DEFAULT_ROWS, DEDUCTION, FEE, MAX, MAX_ROWS, type Position } from '@/utils/overseasStockTax'

// 계산은 overseasStockTax.ts → stock.ts usTax (주식 계산기의 미국 주식 양도세와 같은 함수).
// URL: r 종목 목록(이름~s|h~매수금액~매도·평가금액, | 로 구분) · f 수수료율(%). 기본값과 다를 때만 넣음
type State = { rows: Position[]; fee: string }
const DEF: State = { rows: DEFAULT_ROWS, fee: FEE }
const DEF_R = encodeRows(DEF.rows)
const NEXT = { stock: '/stock-calculator/', exchange: '/exchange-calculator/', dividend: '/dividend-calculator/', dependent: '/dependent-eligibility/' } as const

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')
const signed = (n: number) => `${n > 0 ? '+' : ''}${won(n)}`
const man = (n: number) => (n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })
/** 영어 문구용 백만 단위 */
const mil = (n: number) => (n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })
const digits = (s: string) => s.replace(/[^\d]/g, '')

function MoneyInput({ id, label, value, onChange, unit }: { id: string; label: string; value: number; onChange: (n: number) => void; unit: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-medium text-sub mb-1">{label}</label>
      <div className="relative">
        <input
          id={id} type="text" inputMode="numeric" value={value ? won(value) : ''} placeholder="0"
          onChange={(e) => onChange(Math.min(Number(digits(e.target.value)) || 0, MAX))}
          className="ui-field w-full pl-3 pr-9 py-2.5 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>
      </div>
    </div>
  )
}

export default function OverseasStockTaxCalculator() {
  const t = useTranslations('overseasStockTax')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo<State>(() => {
    if (!hydrated) return DEF
    return { rows: decodeRows(sp.get('r')) ?? DEF.rows, fee: parseFee(sp.get('f')) ?? DEF.fee }
  }, [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const { rows, fee } = edited ?? fromUrl

  const update = (next: State) => {
    setEdited(next)
    const q = new URLSearchParams()
    const r = encodeRows(next.rows)
    if (r !== DEF_R) q.set('r', r)
    if (next.fee !== DEF.fee) q.set('f', next.fee)
    const s = q.toString()
    window.history.replaceState(window.history.state, '', s ? `?${s}` : window.location.pathname)
  }
  const setRow = (i: number, patch: Partial<Position>) => update({ rows: rows.map((p, j) => (j === i ? { ...p, ...patch } : p)), fee })
  const addRow = (sold: boolean) => update({ rows: [...rows, { name: '', sold, cost: 0, value: 0 }], fee })
  const removeRow = (i: number) => update({ rows: rows.filter((_, j) => j !== i), fee })

  const r = analyze(rows, fee)
  const W = t('won')
  const nameOf = (name: string, i: number) => name || t('rows.unnamed', { n: i + 1 })
  const statusText = t(`status.${r.status}`, { realized: won(Math.abs(r.realized)), base: won(r.tax.base), left: won(DEDUCTION - r.used) })

  const shareVars = { realized: man(r.realized), realizedM: mil(r.realized), tax: won(r.tax.total), saving: won(r.lossSaving), room: won(r.room) }
  const card = {
    tool: t('title'),
    label: t('share.label', shareVars),
    headline: t('share.headline', shareVars),
    sub: r.lossSaving > 0 ? t('share.subLoss', shareVars) : r.room > 0 ? t('share.subRoom', shareVars) : undefined,
    rows: [
      ...r.items.slice(0, 5).map((x, i) => ({ label: `${nameOf(x.name, i)} (${t(x.sold ? 'rows.soldShort' : 'rows.heldShort')})`, value: `${signed(x.gain)}${W}` })),
      { label: t('result.label'), value: `${won(r.tax.total)}${W}` },
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-2 min-w-0">
          <div className="ui-card p-6 space-y-5">
            <MobileResultLink href="#overseas-stock-tax-result" label={t('result.label')} value={`${won(r.tax.total)}${W}`} />
            <div>
              <h2 className="text-sm font-semibold text-fg">{t('rows.title')}</h2>
              <p className="text-xs text-muted mt-1">{t('rows.hint')}</p>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rows.map((p, i) => {
                const name = nameOf(p.name, i)
                const gain = r.items[i].gain
                return (
                  <li key={i} className="rounded-2xl border border-line p-4 space-y-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <label htmlFor={`ost-${i}-name`} className="sr-only">{t('rows.name', { n: i + 1 })}</label>
                      <input
                        id={`ost-${i}-name`} type="text" value={p.name} maxLength={30} placeholder={t('rows.namePlaceholder')}
                        onChange={(e) => setRow(i, { name: e.target.value })}
                        className="ui-field flex-1 min-w-0 px-3 py-2.5 font-medium"
                      />
                      <button
                        type="button" onClick={() => removeRow(i)} aria-label={t('rows.remove', { name })}
                        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-fg transition-colors"
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                    <div role="group" aria-label={t('rows.status', { name })} className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-soft">
                      {[true, false].map((sold) => (
                        <button
                          key={String(sold)} type="button" aria-pressed={p.sold === sold} onClick={() => setRow(i, { sold })}
                          className={`min-h-[40px] rounded-lg text-sm font-medium transition-colors ${p.sold === sold ? 'bg-primary text-white' : 'text-body hover:bg-subtle'}`}
                        >
                          {t(sold ? 'rows.sold' : 'rows.held')}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MoneyInput id={`ost-${i}-cost`} label={t('rows.cost')} value={p.cost} unit={W} onChange={(cost) => setRow(i, { cost })} />
                      <MoneyInput id={`ost-${i}-value`} label={t(p.sold ? 'rows.sellValue' : 'rows.heldValue')} value={p.value} unit={W} onChange={(value) => setRow(i, { value })} />
                    </div>
                    <p className="text-sm flex justify-between gap-2">
                      <span className="text-sub">{t(p.sold ? 'rows.gainSold' : 'rows.gainHeld')}</span>
                      <span className="tabular-nums font-semibold text-fg">{signed(gain)}{W}</span>
                    </p>
                  </li>
                )
              })}
            </ul>

            {rows.length < MAX_ROWS && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addRow(true)} className="ui-btn-soft px-4 py-2 text-sm min-h-[44px]">{t('rows.addSold')}</button>
                <button type="button" onClick={() => addRow(false)} className="ui-btn-soft px-4 py-2 text-sm min-h-[44px]">{t('rows.addHeld')}</button>
              </div>
            )}

            <div className="border-t border-line pt-5 max-w-xs">
              <label htmlFor="ost-fee" className="block text-sm font-medium text-body mb-2">{t('fee.label')}</label>
              <div className="relative">
                <input
                  id="ost-fee" type="text" inputMode="decimal" value={fee} aria-describedby="ost-fee-hint"
                  onChange={(e) => update({ rows, fee: e.target.value.replace(/[^\d.]/g, '').slice(0, 6) })}
                  className="ui-field w-full px-4 py-3 pr-10 tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
              </div>
              <p id="ost-fee-hint" className="text-xs text-muted mt-1.5">{t('fee.hint')}</p>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-1 min-w-0">
          <div id="overseas-stock-tax-result" className="ui-card p-6 space-y-5 scroll-mt-20">
            <div aria-live="polite">
              <p className="text-sm text-muted">{t('result.label')}</p>
              <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.tax.total)}{W}</p>
              <p className="text-sm text-sub mt-1">{statusText}</p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-body">{t('result.deduction')}</span>
                <span className="text-muted tabular-nums">{t('result.deductionOf', { used: man(r.used), usedM: mil(r.used) })}</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-track overflow-hidden" role="progressbar" aria-label={t('result.deduction')}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((r.used / DEDUCTION) * 100)}>
                <div className="h-full bg-primary rounded-full" style={{ width: `${(r.used / DEDUCTION) * 100}%` }} />
              </div>
            </div>

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.realized')}</dt><dd className="tabular-nums text-fg">{signed(r.realized)}{W}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.minusDeduction')}</dt><dd className="tabular-nums text-fg">{won(r.used)}{W}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.base')}</dt><dd className="tabular-nums text-fg">{won(r.tax.base)}{W}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.income')}</dt><dd className="tabular-nums text-fg">{won(r.tax.income)}{W}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-sub">{t('result.local')}</dt><dd className="tabular-nums text-fg">{won(r.tax.local)}{W}</dd></div>
              <div className="flex justify-between gap-3 border-t border-line pt-1.5"><dt className="font-semibold text-fg">{t('result.total')}</dt><dd className="tabular-nums font-bold text-primary">{won(r.tax.total)}{W}</dd></div>
            </dl>
            <p className="text-xs text-muted">{t('result.note')}</p>

            <ShareResult card={card} text={t('share.text', shareVars)} fileName="overseas-stock-tax" />
          </div>
        </div>
      </div>

      {/* 연말 절세 시뮬레이션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section aria-labelledby="ost-loss" className="ui-card p-6 space-y-4 min-w-0">
          <div>
            <h2 id="ost-loss" className="text-lg font-semibold text-fg">{t('loss.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('loss.desc')}</p>
          </div>
          <div aria-live="polite" className="space-y-3">
            {r.need === 0 ? (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">{t('loss.noNeed')}</p>
            ) : r.harvest.length === 0 ? (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">{t('loss.noLoss')}</p>
            ) : (
              <>
                <p className="rounded-2xl p-4 bg-primary-soft text-sm text-body">
                  {t('loss.result', { before: won(r.tax.total), after: won(r.taxAfterLoss), saving: won(r.lossSaving) })}
                </p>
                <ul className="space-y-2 text-sm">
                  {r.harvest.map((x, i) => (
                    <li key={i} className="flex justify-between gap-3 border-b border-line pb-2">
                      <span className="text-body min-w-0">{x.name || t('rows.unnamedShort')}</span>
                      <span className="text-right text-sub tabular-nums">{t(x.full ? 'loss.itemAll' : 'loss.itemPart', { sell: won(x.sell), use: won(x.use) })}</span>
                    </li>
                  ))}
                </ul>
                {r.harvested < r.need && <p className="text-sm text-sub">{t('loss.short', { left: won(r.need - r.harvested) })}</p>}
              </>
            )}
            <p className="text-xs text-muted">{t('loss.note')}</p>
          </div>
        </section>

        <section aria-labelledby="ost-fill" className="ui-card p-6 space-y-4 min-w-0">
          <div>
            <h2 id="ost-fill" className="text-lg font-semibold text-fg">{t('fill.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('fill.desc')}</p>
          </div>
          <div aria-live="polite" className="space-y-3">
            {r.room === 0 ? (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">{t('fill.noRoom')}</p>
            ) : r.fill.length === 0 ? (
              <p className="rounded-2xl p-4 bg-subtle text-sm text-body">{t('fill.noGain', { room: won(r.room) })}</p>
            ) : (
              <>
                <p className="rounded-2xl p-4 bg-primary-soft text-sm text-body">
                  {t('fill.result', { room: won(r.room), filled: won(r.filled), future: won(r.futureSaving) })}
                </p>
                <ul className="space-y-2 text-sm">
                  {r.fill.map((x, i) => (
                    <li key={i} className="flex justify-between gap-3 border-b border-line pb-2">
                      <span className="text-body min-w-0">{x.name || t('rows.unnamedShort')}</span>
                      <span className="text-right text-sub tabular-nums">{t(x.full ? 'fill.itemAll' : 'fill.itemPart', { sell: won(x.sell), gain: won(x.gain) })}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-sub">{t('fill.fees', { fees: won(r.fillFees) })}</p>
              </>
            )}
            <p className="text-xs text-muted">{t('fill.note')}</p>
          </div>
        </section>
      </div>

      {/* 경우별 비교 */}
      <section aria-labelledby="ost-compare" className="ui-card p-6 space-y-4">
        <h2 id="ost-compare" className="text-lg font-semibold text-fg">{t('compare.title')}</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">{t('compare.title')}</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="text-left font-medium py-2 pr-2">{t('compare.case')}</th>
                <th scope="col" className="text-right font-medium py-2 px-2">{t('compare.gain')}</th>
                <th scope="col" className="text-right font-medium py-2 pl-2">{t('compare.tax')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { k: 'now', gain: r.realized, tax: r.tax.total, show: true },
                { k: 'loss', gain: r.afterLoss, tax: r.taxAfterLoss, show: r.harvested > 0 },
                { k: 'all', gain: r.allGain, tax: r.taxAll, show: r.items.some((x) => !x.sold) },
              ].filter((x) => x.show).map((x) => (
                <tr key={x.k} className="border-b border-line">
                  <th scope="row" className="text-left font-medium py-3 pr-2 text-body">{t(`compare.${x.k}`)}</th>
                  <td className="text-right py-3 px-2 text-sub">{signed(x.gain)}</td>
                  <td className="text-right py-3 pl-2 text-fg font-medium">{won(x.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">{t('compare.note')}</p>
      </section>

      {/* 연말·신고 일정 */}
      <section aria-labelledby="ost-when" className="ui-card p-6 space-y-4">
        <h2 id="ost-when" className="text-lg font-semibold text-fg">{t('when.title')}</h2>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['deadline', 'filing', 'agent'] as const).map((k) => (
            <div key={k} className="rounded-2xl p-5 bg-subtle">
              <dt className="text-sm font-semibold text-fg">{t(`when.${k}.title`)}</dt>
              <dd className="text-sm text-sub mt-2 leading-relaxed">{t(`when.${k}.text`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 규칙 */}
      <section aria-labelledby="ost-rules" className="ui-card p-6 space-y-4">
        <h2 id="ost-rules" className="text-lg font-semibold text-fg">{t('rules.title')}</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('rules.title')}</caption>
            <tbody>
              {(t.raw('rules.rows') as { k: string; v: string }[]).map((x) => (
                <tr key={x.k} className="border-b border-line align-top">
                  <th scope="row" className="text-left font-medium py-3 pr-3 text-body whitespace-nowrap">{x.k}</th>
                  <td className="py-3 text-sub">{x.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ost-tips" className="ui-card p-6 space-y-3">
        <h2 id="ost-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section aria-labelledby="ost-next" className="ui-card p-6 space-y-3">
        <h2 id="ost-next" className="text-lg font-semibold text-fg">{t('next.title')}</h2>
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
        <p className="text-xs text-muted">{t('source')}</p>
      </section>
    </div>
  )
}
