'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/quitSmoking'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import { useLanguage } from '@/contexts/LanguageContext'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  CHECKED, C_RANGE, DEFAULT, EXAMPLE_MS, KEYS, KINDS, MIN, N_RANGE, PRICE, SOURCES, STEPS, STORAGE_KEY,
  dday, elapsed, formatD, lifeMinutes, manWon, nextStep, notSmoked, parseD, parseSaved, parseState, perDay, priceRange,
  projection, savedWon, split, stepStatus, toQuery, withdrawal, type Kind, type State,
} from '@/utils/quitSmoking'

// 시계는 마운트 뒤에만(서버·첫 렌더는 0 → 30일 예시). 분 단위라 스냅샷이 1분 동안 같다
const subscribeClock = (cb: () => void) => { const id = setInterval(cb, 15_000); return () => clearInterval(id) }
const minuteNow = () => Math.floor(Date.now() / MIN) * MIN
const serverNow = () => 0
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 7)
const inRange = (v: string, [lo, hi]: readonly [number, number]) => v !== '' && Number(v) >= lo && Number(v) <= hi
const YEARS = [1, 5, 10] as const
const SUPPORT = [
  { id: 'clinic', href: SOURCES.guide },
  { id: 'nhis', href: SOURCES.nhis },
  { id: 'call', href: 'tel:1544-9030' },
  { id: 'camp', href: SOURCES.guide },
] as const
const GUIDE = ['howTo', 'basis'] as const
const SOURCE_KEYS = ['who', 'ucl', 'dhsc', 'msd', 'nhis', 'guide', 'seoul', 'cancer', 'cancerTips', 'gg', 'priceCig', 'priceHeat'] as const

const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'
const linkCls = 'text-primary hover:underline [overflow-wrap:anywhere]'

export default function QuitSmoking() {
  const t = useTranslations('quitSmoking')
  const { language } = useLanguage()
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const now = useSyncExternalStore(subscribeClock, minuteNow, serverNow)

  // 우선순위: 사용자가 고친 값 > URL(공유 링크) > 이 기기에 저장한 값 > 기본값. 하이드레이션 전에는 기본값이라 정적 HTML 과 같다
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const urlHas = hydrated && KEYS.some((k) => sp.get(k) !== null)
  const [boot, setBoot] = useState<{ base: number; saved: State | null } | null>(null)
  const [best, setBest] = useState(0)
  const [storageOk, setStorageOk] = useState(true)
  if (hydrated && now > 0 && !boot) {
    let saved = parseSaved(null)
    try { saved = parseSaved(window.localStorage.getItem(STORAGE_KEY)) } catch { setStorageOk(false) }
    setBoot({ base: now - EXAMPLE_MS, saved: saved.s })
    setBest(saved.best)
  }
  const [edited, setEdited] = useState<State | null>(null)
  const s = edited ?? (urlHas ? fromUrl : boot?.saved ?? DEFAULT)
  const [nDraft, setNDraft] = useState<string | null>(null)
  const [pDraft, setPDraft] = useState<string | null>(null)
  const [cDraft, setCDraft] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  // 남의 공유 링크를 열었는데 이 기기에 내 기록이 따로 있으면 "링크 보기": 고르기 전까지 저장도, 최장 기록 비교도 하지 않는다
  const [linkChosen, setLinkChosen] = useState(false)
  const linkMode = urlHas && !linkChosen && !!boot?.saved && toQuery(boot.saved) !== toQuery(fromUrl)

  const save = (next: State, b: number) => {
    if (linkMode) return
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ q: toQuery(next), best: b })); setStorageOk(true) } catch { setStorageOk(false) }
  }
  const commit = (next: State, b = best) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    save(next, b)
  }
  const pickKind = (k: Kind) => {
    setPDraft(null)
    setCDraft(null)
    commit({ ...s, k, p: PRICE[k], c: DEFAULT.c })
  }
  // 시작일이 있으면 확인 후 지금까지 기간을 최장 기록에 남기고 지금부터. 예시(시작일 없음)는 기록에 넣지 않는다
  const restart = () => {
    if (s.d !== null && !confirming) { setConfirming(true); return }
    const at = minuteNow()
    const b = s.d !== null && !linkMode ? Math.max(best, elapsed(s.d, at)) : best
    setBest(b)
    setConfirming(false)
    commit({ ...s, d: at }, b)
  }

  const adoptLink = () => {
    setLinkChosen(true)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ q: toQuery(s), best })); setStorageOk(true) } catch { setStorageOk(false) }
  }
  const backToMine = () => {
    setLinkChosen(true)
    const mine = boot!.saved!
    setEdited(mine)
    const qs = toQuery(mine)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  // ── 계산
  const start = s.d ?? boot?.base ?? null
  const ms = elapsed(start, now)
  const future = start !== null && now > 0 && start > now
  const e = split(ms)
  const saved = savedWon(s, ms)
  const count = notSmoked(s, ms)
  const life = lifeMinutes(s, ms)
  const nx = nextStep(ms)
  const wd = future ? null : withdrawal(ms)
  const monthly = Math.round((perDay(s) * 365) / 12)

  const locale = language === 'en' ? 'en-US' : 'ko-KR'
  const num = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 })
  const won = (v: number) => t('won', { v: language === 'en' ? v.toLocaleString('en-US') : manWon(v) })
  const dur = (x: number) => {
    const p = split(x)
    return p.d > 0 ? t('dur.dh', { d: num(p.d), h: p.h }) : p.h > 0 ? t('dur.hm', { h: p.h, m: p.m }) : t('dur.m', { m: p.m })
  }
  const leftText = (left: number) => (dday(left) > 0 ? t('next.dday', { n: num(dday(left)) }) : t('next.left', { v: dur(left) }))
  const fmtDate = (x: number) => new Date(x).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const head = future ? t('head.before')
    : e.d > 0 ? t('head.day', { n: num(e.d) })
      : e.h > 0 ? t('head.hour', { n: e.h })
        : e.m > 0 ? t('head.min', { n: e.m }) : t('head.just')
  const countText = count === null ? '' : t('result.countVal', { n: num(count), unit: t(`unit.${s.k}`), packs: num(count / s.c) })
  const lifeText = life === null ? '' : t('result.lifeVal', { v: dur(life * MIN) })
  const nextText = nx ? `${t(`steps.${nx.step.id}.when`)} · ${leftText(nx.left)}` : t('next.allDone')
  const stats = [
    { key: 'saved', label: t('result.saved'), value: won(saved), sub: t('result.perDay', { v: won(Math.round(perDay(s))) }) },
    ...(count !== null ? [{ key: 'count', label: t('result.notSmoked'), value: countText, sub: '' }] : []),
    ...(life !== null ? [{ key: 'life', label: t('result.life'), value: lifeText, sub: t('result.lifeNote') }] : []),
  ]
  const statCols = stats.length === 3 ? 'sm:grid-cols-3' : stats.length === 2 ? 'sm:grid-cols-2' : ''
  const qs = toQuery(s)
  const shareUrl = hydrated ? `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}` : undefined

  const numField = (id: string, value: number, apply: (v: number) => State, label: string, unit: string, range: readonly [number, number],
    draft: string | null, setDraft: (v: string | null) => void, hint?: string) => {
    const text = draft ?? String(value)
    const bad = !inRange(text, range)
    return (
      <div>
        <label htmlFor={id} className={labelCls}>{label}</label>
        <div className="relative">
          <input
            id={id} inputMode="numeric" autoComplete="off" value={text}
            onChange={(ev) => {
              const v = digits(ev.target.value)
              setDraft(v)
              if (inRange(v, range)) commit(apply(Number(v)))
            }}
            onBlur={() => setDraft(null)}
            aria-invalid={bad || undefined} aria-describedby={`${id}-hint`}
            className="ui-field w-full min-h-11 px-4 py-3 pr-16 text-base tabular-nums"
          />
          <span className={unitCls}>{unit}</span>
        </div>
        <p id={`${id}-hint`} className={bad ? 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800' : 'mt-1.5 text-xs text-muted'}>
          {bad ? t('input.err', { min: num(range[0]), max: num(range[1]) }) : hint}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="qs-input">
          <MobileResultLink href="#quit-smoking-result" label={head} value={t('mobile.value', { v: won(saved) })} />
          {linkMode && (
            <div role="status" className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-3">
              <p>{t('link.viewing')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={adoptLink} className="ui-btn px-4 py-2 min-h-11 text-sm">{t('link.adopt')}</button>
                <button type="button" onClick={backToMine} className="ui-btn-soft px-4 py-2 min-h-11 text-sm">{t('link.mine')}</button>
              </div>
            </div>
          )}
          <h2 id="qs-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <label htmlFor="qs-start" className={labelCls}>{t('input.start')}</label>
            <input
              id="qs-start" type="datetime-local" value={start === null ? '' : formatD(start)} max={now ? formatD(now) : undefined}
              onChange={(ev) => {
                const d = parseD(ev.target.value)
                if (d !== null) { setConfirming(false); commit({ ...s, d }) }
              }}
              aria-describedby="qs-start-hint"
              className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums"
            />
            <p id="qs-start-hint" className="mt-1.5 text-xs text-muted">{t(s.d === null ? 'input.startDefault' : 'input.startHint')}</p>
          </div>

          <div>
            <p id="qs-kind" className={labelCls}>{t('input.kind')}</p>
            <div role="group" aria-labelledby="qs-kind" className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button key={k} type="button" aria-pressed={s.k === k} onClick={() => s.k !== k && pickKind(k)} className={seg(s.k === k)}>{t(`kind.${k}`)}</button>
              ))}
            </div>
          </div>

          {s.k === 'liquid'
            ? numField('qs-p', s.p, (p) => ({ ...s, p }), t('input.monthly'), t('unit.wonMonth'), priceRange('liquid'), pDraft, setPDraft, t('input.monthlyHint'))
            : (
              <>
                {numField('qs-n', s.n, (n) => ({ ...s, n }), t(`input.daily.${s.k}`), t(`unit.${s.k}`), N_RANGE, nDraft, setNDraft, t('input.dailyHint'))}
                {numField('qs-p', s.p, (p) => ({ ...s, p }), t(`input.price.${s.k}`), t('unit.won'), priceRange(s.k), pDraft, setPDraft, t(`input.priceHint.${s.k}`))}
                {numField('qs-c', s.c, (c) => ({ ...s, c }), t(`input.pack.${s.k}`), t(`unit.${s.k}`), C_RANGE, cDraft, setCDraft)}
              </>
            )}
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="quit-smoking-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="qs-result-label">
            <div>
              <p id="qs-result-label" className="text-sm text-sub">{t('result.label')}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums" aria-live="polite">{head}</p>
              <p className="mt-1 text-sm text-body tabular-nums">{t('result.elapsed', { d: num(e.d), h: e.h, m: e.m })}</p>
              {s.d === null && <p className="mt-1 text-xs text-muted">{t('result.example')}</p>}
            </div>
            {future && start !== null && <p role="status" className={warnCls}>{t('result.future', { v: dur(start - now) })}</p>}

            <dl className={`grid grid-cols-1 ${statCols} gap-3`}>
              {stats.map((x) => (
                <div key={x.key} className="bg-subtle rounded-2xl px-4 py-3 min-w-0">
                  <dt className="text-xs text-sub">{x.label}</dt>
                  <dd className="mt-0.5 text-xl font-bold text-fg tabular-nums [overflow-wrap:anywhere]">{x.value}</dd>
                  {x.sub && <dd className="mt-0.5 text-xs text-muted">{x.sub}</dd>}
                </div>
              ))}
            </dl>

            <div aria-live="polite">
              <h3 className="text-sm font-semibold text-fg">{t('result.keepTitle')}</h3>
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {YEARS.map((y) => (
                  <div key={y} className="rounded-xl border border-line px-3 py-2 min-w-0 flex items-baseline justify-between gap-2 sm:block">
                    <dt className="text-xs text-sub">{t('result.years', { n: y })}</dt>
                    <dd className="text-sm font-semibold text-fg tabular-nums [overflow-wrap:anywhere]">{won(projection(s, y))}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-1.5 text-xs text-muted">{t('result.keepNote')}</p>
              <Link href={`/savings-calculator?a=${monthly}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
                {t('result.savings', { v: won(monthly) })}
              </Link>
            </div>

            <div className="bg-subtle rounded-2xl p-4 space-y-1">
              <p className="text-xs text-sub">{t('next.title')}</p>
              {nx ? (
                <>
                  <p className="text-base font-semibold text-fg tabular-nums">{nextText}</p>
                  <p className="text-sm text-body">{t(`steps.${nx.step.id}.text`)}</p>
                  {start !== null && <p className="text-xs text-muted tabular-nums">{t('next.on', { date: fmtDate(start + nx.step.at) })}</p>}
                </>
              ) : <p className="text-base font-semibold text-fg">{nextText}</p>}
            </div>
            {wd && <p className="text-sm text-body">{t(`withdrawal.${wd}`)}</p>}

            {/* 기록 */}
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <h3 className="text-sm font-semibold text-fg">{t('record.title')}</h3>
              <p className="text-sm text-body tabular-nums">
                {best > 0 ? t('record.best', { v: dur(Math.max(best, s.d !== null ? ms : 0)) }) : t('record.none')}
              </p>
              {best > 0 && s.d !== null && ms >= best && <p className="text-xs font-medium text-primary">{t('record.newBest')}</p>}
              {confirming && <p role="alert" className={warnCls}>{t('record.confirmDesc', { v: dur(ms) })}</p>}
              <div className="flex flex-wrap gap-2">
                {confirming ? (
                  <>
                    <button type="button" onClick={restart} className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium bg-amber-50 text-amber-800">{t('record.confirm')}</button>
                    <button type="button" onClick={() => setConfirming(false)} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('record.cancel')}</button>
                  </>
                ) : (
                  <button type="button" onClick={restart} disabled={!boot} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-50">
                    {t(s.d === null ? 'record.startNow' : 'record.restart')}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted">{t('record.local')}</p>
              {!storageOk && <p className={warnCls}>{t('record.storageError')}</p>}
            </div>

            <p className="text-xs text-muted leading-relaxed">{t('sources.disclaimer')}</p>
          </section>

          <ShareResult
            fileName="quit-smoking"
            url={shareUrl}
            card={{
              tool: t('share.tool'),
              label: t('share.label'),
              headline: head,
              sub: t('share.sub', { v: won(saved) }),
              rows: [
                ...(count !== null ? [{ label: t('result.notSmoked'), value: countText }] : []),
                { label: t('share.rows.next'), value: nextText },
                ...(life !== null ? [{ label: t('result.life'), value: lifeText }] : []),
                { label: t('share.rows.year'), value: won(projection(s, 1)) },
              ],
            }}
            text={t('share.text', { head, v: won(saved) })}
          />
        </div>
      </div>

      {/* 건강 회복 타임라인 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="qs-timeline">
        <div>
          <h2 id="qs-timeline" className="text-lg font-semibold text-fg">{t('timeline.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('timeline.desc')}</p>
        </div>
        {s.k !== 'cig' && <p className="bg-subtle rounded-2xl px-4 py-3 text-sm text-sub">{t('timeline.ecig')}</p>}
        <ol className="space-y-2">
          {STEPS.map((st, i) => {
            const status = stepStatus(st, ms)
            return (
              <li key={st.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${nx?.i === i ? 'border-primary' : 'border-line'}`}>
                <span className="w-16 shrink-0 text-sm font-semibold text-fg tabular-nums">{t(`steps.${st.id}.when`)}</span>
                <span className={`min-w-0 flex-1 text-sm ${status === 'todo' ? 'text-sub' : 'text-body'}`}>{t(`steps.${st.id}.text`)}</span>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium tabular-nums ${status === 'done' ? 'bg-primary text-white' : status === 'now' ? 'bg-primary-soft text-primary' : 'bg-soft text-sub'}`}>
                  {status === 'todo' ? leftText(st.at - ms) : t(`timeline.${status}`)}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="text-xs text-muted">
          <a href={SOURCES.who} target="_blank" rel="noopener noreferrer" className={linkCls}>{t('timeline.src')}</a>
        </p>
      </section>

      {/* 지원 제도 */}
      <section className="ui-card p-6 space-y-5" aria-labelledby="qs-support">
        <div>
          <h2 id="qs-support" className="text-lg font-semibold text-fg">{t('support.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('support.desc')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUPPORT.map((x) => (
            <section key={x.id} className="rounded-2xl border border-line p-5 space-y-3 min-w-0" aria-labelledby={`qs-support-${x.id}`}>
              <h3 id={`qs-support-${x.id}`} className="font-semibold text-fg">{t(`support.list.${x.id}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
                {(t.raw(`support.list.${x.id}.points`) as string[]).map((p) => <li key={p}>{p}</li>)}
              </ul>
              <a href={x.href} {...(x.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
                {t(`support.list.${x.id}.link`)}
              </a>
            </section>
          ))}
        </div>
      </section>

      {/* 흡연 욕구 대처 */}
      <section className="ui-card p-6 space-y-3" aria-labelledby="qs-tips">
        <h2 id="qs-tips" className="text-lg font-semibold text-fg">{t('tips.title')}</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('tips.items') as string[]).map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="text-xs text-muted">{t('tips.src')}</p>
      </section>

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
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f) => (
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
              <li key={k}><a href={SOURCES[k]} target="_blank" rel="noopener noreferrer" className={linkCls}>{t(`sources.${k}`)}</a></li>
            ))}
          </ul>
          <p className="text-xs text-muted">{t('sources.asOf', { date: CHECKED })}</p>
          <p className="text-xs text-muted">{t('sources.disclaimer')}</p>
        </section>
      </div>
    </div>
  )
}
