'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/passportName'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  CHECKED, DEFAULT, N_MAX, SOURCES, SURNAME_ALTS, S_MAX,
  convert, isHangul, parseState, surnameOptions, surnameStd, toQuery, type State,
} from '@/utils/passportName'

const GUIDE = ['rules', 'change', 'tips'] as const
const SOURCE_KEYS = ['rr', 'rule', 'decree', 'notice', 'basic', 'change', 'nikl1991'] as const
type CopyKey = 'passport' | 'ticket' | 'mrz'

const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const errCls = 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800'
const copyCls = 'ui-btn-soft min-h-11 px-3 py-2 text-sm shrink-0'

export default function PassportName() {
  const t = useTranslations('passportName')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 사용자가 고치면 그 값이 우선
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const st = edited ?? fromUrl
  const [sDraft, setSDraft] = useState<string | null>(null)
  const [nDraft, setNDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState<CopyKey | 'fail' | null>(null)

  const commit = (next: State) => {
    setEdited(next)
    setCopied(null)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  const sText = sDraft ?? st.s
  const nText = nDraft ?? st.n
  const sBad = !isHangul(sText.trim(), S_MAX)
  const nBad = !isHangul(nText.trim(), N_MAX)
  const r = convert(st)!
  const options = surnameOptions(st.s)

  const copy = async (key: CopyKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
    } catch {
      setCopied('fail')
    }
  }
  const copyBtn = (key: CopyKey, text: string) => (
    <button type="button" onClick={() => copy(key, text)} aria-label={t('result.copyAria', { what: t(`result.copyWhat.${key}`) })} className={copyCls}>
      {copied === key ? t('result.copied') : t('result.copy')}
    </button>
  )

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const keep = t.raw('keep.items') as string[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="pn-input">
          <MobileResultLink href="#passport-name-result" label={t('result.label')} value={r.passport} />
          <h2 id="pn-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] lg:grid-cols-1 gap-4">
            <div className="min-w-0">
              <label htmlFor="pn-surname" className={labelCls}>{t('input.surname')}</label>
              <input
                id="pn-surname" lang="ko" autoComplete="off" value={sText}
                onChange={(e) => {
                  const v = e.target.value.normalize('NFC')
                  setSDraft(v)
                  if (isHangul(v.trim(), S_MAX)) commit({ ...st, s: v.trim(), v: '' })
                }}
                onBlur={() => setSDraft(null)}
                aria-invalid={sBad || undefined} aria-describedby="pn-surname-hint"
                className="ui-field w-full min-h-11 px-4 py-3 text-base"
              />
              <p id="pn-surname-hint" className={sBad ? errCls : 'mt-1.5 text-xs text-muted'}>
                {sBad ? t('input.surnameErr', { max: S_MAX }) : t('input.surnameHint')}
              </p>
            </div>
            <div className="min-w-0">
              <label htmlFor="pn-given" className={labelCls}>{t('input.given')}</label>
              <input
                id="pn-given" lang="ko" autoComplete="off" value={nText}
                onChange={(e) => {
                  const v = e.target.value.normalize('NFC')
                  setNDraft(v)
                  if (isHangul(v.trim(), N_MAX)) commit({ ...st, n: v.trim() })
                }}
                onBlur={() => setNDraft(null)}
                aria-invalid={nBad || undefined} aria-describedby="pn-given-hint"
                className="ui-field w-full min-h-11 px-4 py-3 text-base"
              />
              <p id="pn-given-hint" className={nBad ? errCls : 'mt-1.5 text-xs text-muted'}>
                {nBad ? t('input.givenErr', { max: N_MAX }) : t('input.givenHint')}
              </p>
            </div>
          </div>

          <div>
            <p id="pn-style" className={labelCls}>{t('input.style')}</p>
            <div role="group" aria-labelledby="pn-style" className="grid grid-cols-2 gap-2">
              {([false, true] as const).map((h) => (
                <button key={String(h)} type="button" aria-pressed={st.h === h} onClick={() => st.h !== h && commit({ ...st, h })} className={seg(st.h === h)}>
                  {t(h ? 'input.styleHyphen' : 'input.styleJoined', { ex: convert({ ...st, h })!.given.toUpperCase() })}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('input.styleHint')}</p>
          </div>

          <div>
            <p id="pn-spelling" className={labelCls}>{t('input.spelling', { s: st.s })}</p>
            <div role="group" aria-labelledby="pn-spelling" className="flex flex-wrap gap-2">
              {options.map((o, i) => {
                const on = r.sur === o
                return (
                  <button key={o} type="button" aria-pressed={on} onClick={() => !on && commit({ ...st, v: i === 0 ? '' : o })} className={seg(on)}>
                    {o.toUpperCase()}{i === 0 && <span className="ml-1 text-xs font-normal opacity-80">{t('input.spellingStd')}</span>}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">{options.length > 1 ? t('input.spellingHint') : t('input.spellingNone')}</p>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="passport-name-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="pn-result-label">
            <div aria-live="polite">
              <p id="pn-result-label" className="text-sm text-sub">{t('result.label')}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <p className="text-3xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{r.passport}</p>
                {copyBtn('passport', r.passport)}
              </div>
              {(sBad || nBad) && <p className="mt-2 text-sm text-muted">{t('result.keepLast')}</p>}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                ['surname', r.sur.toUpperCase()],
                ['given', r.given.toUpperCase()],
                ['rr', r.rr],
              ].map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                  <dt className="text-xs text-sub">{t(`result.${k}`)}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-fg [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>

            {(r.custom || r.ll || r.negative.length > 0 || r.single) && (
              <ul className="space-y-1.5 text-sm text-body">
                {r.custom && <li>{t('result.custom', { v: r.sur.toUpperCase(), std: r.std.toUpperCase() })}</li>}
                {r.ll && <li>{t('result.ll')}</li>}
                {r.single && <li>{t('result.single')}</li>}
                {r.negative.length > 0 && <li>{t('result.negative', { words: r.negative.join(', ') })}</li>}
              </ul>
            )}

            <div className="rounded-2xl border border-line p-4 space-y-2">
              <h3 className="text-sm font-semibold text-fg">{t('result.ticket')}</h3>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xl font-bold text-fg [overflow-wrap:anywhere]">{r.ticket}</p>
                {copyBtn('ticket', r.ticket)}
              </div>
              <p className="text-xs text-muted">{t('result.ticketHint')}</p>
            </div>

            <div className="rounded-2xl border border-line p-4 space-y-2 min-w-0">
              <h3 className="text-sm font-semibold text-fg">{t('result.mrz')}</h3>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1 overflow-x-auto bg-subtle rounded-xl px-3 py-2">
                  <code className="font-mono text-sm text-fg whitespace-pre">{r.mrz}</code>
                </div>
                {copyBtn('mrz', r.mrz)}
              </div>
              <p className="text-xs text-muted">{t('result.mrzHint')}</p>
              {r.mrzCut && <p className={errCls}>{t('result.mrzCut')}</p>}
            </div>

            <p className="sr-only" aria-live="polite">{copied === 'fail' ? t('result.copyFailed') : copied ? t('result.copied') : ''}</p>
            {copied === 'fail' && <p className={errCls}>{t('result.copyFailed')}</p>}
            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          <section className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm space-y-2" aria-labelledby="pn-keep">
            <h2 id="pn-keep" className="font-semibold">{t('keep.title')}</h2>
            <ul className="list-disc pl-5 space-y-1">{keep.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>

          <div className="space-y-2">
            <ShareResult
              fileName="passport-name"
              card={{
                tool: t('share.tool'),
                label: t('share.label'),
                headline: r.passport,
                sub: t('share.sub', { ticket: r.ticket }),
                rows: [
                  { label: t('result.surname'), value: r.sur.toUpperCase() },
                  { label: t('result.given'), value: r.given.toUpperCase() },
                  { label: t('result.rr'), value: r.rr },
                ],
              }}
              text={t('share.text', { passport: r.passport, ticket: r.ticket })}
            />
            <p className="text-xs text-muted">{t('share.privacy')}</p>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDE.map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
          <section className="min-w-0">
            <h3 className="font-semibold text-fg mb-3">{t('guide.surnames.title')}</h3>
            <p className="text-sm text-sub mb-3">{t('guide.surnames.desc')}</p>
            <details className="rounded-xl bg-subtle">
              <summary className="cursor-pointer min-h-11 flex items-center px-4 text-sm font-medium text-body">{t('guide.surnames.open')}</summary>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t('guide.surnames.title')}</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-sub">
                      {(['surname', 'std', 'alts'] as const).map((c) => <th key={c} scope="col" className="py-2 pr-3 font-medium whitespace-nowrap">{t(`guide.surnames.cols.${c}`)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(SURNAME_ALTS).map(([k, alts]) => (
                      <tr key={k} className={`border-b border-line ${k === st.s ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                        <td className="py-2 pr-3">{k}</td>
                        <td className="py-2 pr-3">{surnameStd(k).toUpperCase()}</td>
                        <td className="py-2 pr-3">{alts.length ? alts.map((a) => a.toUpperCase()).join(', ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-11 flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
          <h3 className="font-medium text-body">{t('sources.title')}</h3>
          <ul className="space-y-1">
            {SOURCE_KEYS.map((k) => (
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline [overflow-wrap:anywhere]">{t(`sources.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.method')}</p>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
        </section>
      </div>
    </div>
  )
}
