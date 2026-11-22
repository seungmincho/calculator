'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/petAge'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  ACTIVITIES, CHECKED, DEFAULT, DEF_W, F_RANGE, K_RANGE, LB, LIFESPAN, SIZES, SIZE_MAX_LB, SOURCES, STAGES, W_RANGE, Y_MAX,
  feeding, humanAge, monthsFromBirth, parseState, sizeFor, sizeOf, stageOf, toQuery, ucsdAge,
  type Activity, type Size, type Species, type State,
} from '@/utils/petAge'

const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 })
const span = (r: readonly [number, number]) => (r[0] === r[1] ? fmt(r[0]) : `${fmt(r[0])}~${fmt(r[1])}`)
const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5)
const inRange = (s: string, [lo, hi]: readonly [number, number]) => s.trim() !== '' && Number(s) >= lo && Number(s) <= hi
const TABLE_ROWS = [6, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 12)]
const GUIDE = ['howTo', 'method', 'tips'] as const
const SOURCE_KEYS = Object.keys(SOURCES) as (keyof typeof SOURCES)[]

const seg = (on: boolean) => `min-h-11 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const labelCls = 'block text-sm font-medium text-body mb-1.5'
const hintCls = 'mt-1.5 text-xs text-muted'
const errCls = 'mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800'
const warnCls = 'bg-amber-50 text-amber-800 rounded-2xl px-4 py-3 text-sm'
const unitCls = 'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none'

export default function PetAge() {
  const t = useTranslations('petAge')
  const sp = useSearchParams()
  const hydrated = useHydrated()

  // URL → 값. 하이드레이션 전에는 기본값이라 첫 렌더가 정적 HTML 과 같다. 사용자가 고치면 그 값이 우선, URL 은 기본값과 다른 것만
  const fromUrl = useMemo(() => (hydrated ? parseState((k) => sp.get(k)) : DEFAULT), [hydrated, sp])
  const [edited, setEdited] = useState<State | null>(null)
  const st = edited ?? fromUrl
  const [wDraft, setWDraft] = useState<string | null>(null)
  const [kDraft, setKDraft] = useState<string | null>(null)
  const [birth, setBirth] = useState('')
  const [birthBad, setBirthBad] = useState(false)

  const commit = (next: State) => {
    setEdited(next)
    const qs = toQuery(next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  const setAge = (months: number) => commit({ ...st, y: Math.floor(months / 12), m: months % 12 })
  const pickSpecies = (s: Species) => {
    setWDraft(null)
    commit({ ...st, s, z: null, a: s === 'cat' && st.a === 'active' ? 'normal' : st.a, w: st.w === DEF_W[st.s] ? DEF_W[s] : st.w })
  }
  const onBirth = (v: string) => {
    setBirth(v)
    const mo = v ? monthsFromBirth(v, new Date()) : null // 오늘 날짜는 이벤트 안에서만 읽는다
    const ok = mo !== null && mo <= Y_MAX * 12 + 11
    setBirthBad(v !== '' && !ok)
    if (ok) setAge(mo)
  }

  const isDog = st.s === 'dog'
  const months = st.y * 12 + st.m
  const size = sizeFor(st)
  const age = humanAge(st.s, size, months)
  const human = Math.round(age.value)
  const ucsd = isDog ? ucsdAge(months) : null
  const stage = stageOf(st.s, size, months)
  const names = STAGES[st.s]
  const stageKey = names[stage.to]
  const stageName = (i: number) => t(`stage.name.${names[i]}`)
  const stageLabel = stage.from === stage.to ? stageName(stage.from) : t('stage.moving', { from: stageName(stage.from), to: stageName(stage.to) })
  const stageEn = stage.from === stage.to ? t(`stage.en.${names[stage.from]}`) : `${t(`stage.en.${names[stage.from]}`)} → ${t(`stage.en.${names[stage.to]}`)}`
  const care = t.raw(`care.${st.s}.${stageKey}`) as string[]
  const [lifeLo, lifeHi] = LIFESPAN[size]

  const wText = wDraft ?? String(st.w)
  const kText = kDraft ?? String(st.k)
  const wBad = !inRange(wText, W_RANGE)
  const kBad = !inRange(kText, K_RANGE)
  const feed = feeding(st)
  const growth = months < 12

  const pet = t(`species.${st.s}`)
  const ageText = st.y && st.m ? t('age.ym', { y: st.y, m: st.m }) : st.y ? t('age.y', { y: st.y }) : t('age.m', { m: st.m })
  const resultLabel = t('result.label', { pet, age: ageText })
  const humanText = t('result.years', { n: human })
  const sizeName = t(`size.${size}`)
  const kcalText = `${span(feed.kcal)} kcal`
  const gText = `${span(feed.g)} g`
  const mealText = `${span(feed.meal)} g`
  const curRow = months > 20 * 12 + 11 ? null : months >= 12 ? Math.floor(months / 12) * 12 : months >= 6 ? 6 : null
  const rowLabel = (mo: number) => (mo < 12 ? t('age.m', { m: mo }) : t('age.y', { y: mo / 12 }))

  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <section className="ui-card p-6 space-y-6 min-w-0" aria-labelledby="pa-input">
          <MobileResultLink href="#pet-age-result" label={resultLabel} value={humanText} />
          <h2 id="pa-input" className="text-lg font-semibold text-fg">{t('input.title')}</h2>

          <div>
            <p id="pa-species" className={labelCls}>{t('input.species')}</p>
            <div role="group" aria-labelledby="pa-species" className="grid grid-cols-2 gap-2">
              {(['dog', 'cat'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={st.s === s} onClick={() => st.s !== s && pickSpecies(s)} className={seg(st.s === s)}>{t(`species.${s}`)}</button>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className={labelCls}>{t('input.age')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <select aria-label={t('input.yearsAria')} value={st.y} onChange={(e) => { setBirth(''); setBirthBad(false); commit({ ...st, y: Number(e.target.value) }) }}
                className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                {Array.from({ length: Y_MAX + 1 }, (_, y) => <option key={y} value={y}>{t('age.y', { y })}</option>)}
              </select>
              <select aria-label={t('input.monthsAria')} value={st.m} onChange={(e) => { setBirth(''); setBirthBad(false); commit({ ...st, m: Number(e.target.value) }) }}
                className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                {Array.from({ length: 12 }, (_, m) => <option key={m} value={m}>{t('age.m', { m })}</option>)}
              </select>
            </div>
            <label htmlFor="pa-birth" className="block text-sm text-sub mt-3 mb-1.5">{t('input.birth')}</label>
            <input id="pa-birth" type="date" value={birth} min="1990-01-01" onChange={(e) => onBirth(e.target.value)}
              aria-invalid={birthBad || undefined} aria-describedby="pa-birth-hint"
              className="ui-field w-full min-h-11 px-4 py-3 text-base tabular-nums" />
            <p id="pa-birth-hint" className={birthBad ? errCls : hintCls}>{t(birthBad ? 'input.birthErr' : 'input.birthHint', { max: Y_MAX })}</p>
          </fieldset>

          <div>
            <label htmlFor="pa-weight" className={labelCls}>{t('input.weight')}</label>
            <div className="relative">
              <input
                id="pa-weight" inputMode="decimal" autoComplete="off" value={wText}
                onChange={(e) => {
                  const v = decimal(e.target.value)
                  setWDraft(v)
                  if (inRange(v, W_RANGE)) commit({ ...st, w: Math.round(Number(v) * 10) / 10 })
                }}
                onBlur={() => setWDraft(null)}
                aria-invalid={wBad || undefined} aria-describedby="pa-weight-hint"
                className="ui-field w-full min-h-11 px-4 py-3 pr-12 text-base tabular-nums"
              />
              <span className={unitCls}>kg</span>
            </div>
            <p id="pa-weight-hint" className={wBad ? errCls : hintCls}>
              {wBad ? t('input.weightErr', { min: W_RANGE[0], max: W_RANGE[1] }) : t(st.a === 'loss' ? 'input.weightLoss' : 'input.weightHint')}
            </p>
          </div>

          {isDog && (
            <div>
              <p id="pa-size" className={labelCls}>{t('input.size')}</p>
              <div role="group" aria-labelledby="pa-size" className="grid grid-cols-2 gap-2">
                {SIZES.map((z) => (
                  <button key={z} type="button" aria-pressed={size === z} onClick={() => commit({ ...st, z: z === sizeOf(st.w) ? null : z })} className={`${seg(size === z)} text-left`}>
                    <span className="block">{t(`size.${z}`)}</span>
                    <span className="block text-xs font-normal opacity-80">{t(`sizeRange.${z}`, { kg: fmt(Math.round((z === 'giant' ? SIZE_MAX_LB.large : SIZE_MAX_LB[z]) * LB * 10) / 10) })}</span>
                  </button>
                ))}
              </div>
              <p className={hintCls}>
                {st.z ? (
                  <>
                    {t('input.sizeManual')}{' '}
                    <button type="button" onClick={() => commit({ ...st, z: null })} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">{t('input.sizeAuto')}</button>
                  </>
                ) : t('input.sizeHint', { w: fmt(st.w), size: sizeName })}
              </p>
            </div>
          )}

          <div>
            <p id="pa-neuter" className={labelCls}>{t('input.neuter')}</p>
            <div role="group" aria-labelledby="pa-neuter" className="grid grid-cols-2 gap-2">
              {[true, false].map((n) => (
                <button key={String(n)} type="button" aria-pressed={st.n === n} onClick={() => commit({ ...st, n })} className={seg(st.n === n)}>{t(n ? 'input.neutered' : 'input.intact')}</button>
              ))}
            </div>
          </div>

          <div>
            <p id="pa-act" className={labelCls}>{t('input.activity')}</p>
            <div role="group" aria-labelledby="pa-act" className="flex flex-wrap gap-2">
              {ACTIVITIES.filter((a) => isDog || a !== 'active').map((a: Activity) => (
                <button key={a} type="button" aria-pressed={st.a === a} onClick={() => commit({ ...st, a })} className={seg(st.a === a)}>{t(`act.${a}`)}</button>
              ))}
            </div>
            {growth && <p className={hintCls}>{t('feed.growthNote')}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div>
              <label htmlFor="pa-kcal" className={labelCls}>{t('input.kcal')}</label>
              <div className="relative">
                <input
                  id="pa-kcal" inputMode="numeric" autoComplete="off" value={kText}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                    setKDraft(v)
                    if (inRange(v, K_RANGE)) commit({ ...st, k: Number(v) })
                  }}
                  onBlur={() => setKDraft(null)}
                  aria-invalid={kBad || undefined} aria-describedby="pa-kcal-hint"
                  className="ui-field w-full min-h-11 px-4 py-3 pr-24 text-base tabular-nums"
                />
                <span className={unitCls}>kcal/100g</span>
              </div>
              <p id="pa-kcal-hint" className={kBad ? errCls : hintCls}>
                {kBad ? t('input.kcalErr', { min: K_RANGE[0], max: K_RANGE[1] }) : t('input.kcalHint', { k: DEFAULT.k })}
              </p>
            </div>
            <div>
              <label htmlFor="pa-meals" className={labelCls}>{t('input.meals')}</label>
              <select id="pa-meals" value={st.f} onChange={(e) => commit({ ...st, f: Number(e.target.value) })}
                className="ui-field w-full min-h-11 px-3 py-3 text-base tabular-nums">
                {Array.from({ length: F_RANGE[1] }, (_, i) => i + 1).map((f) => <option key={f} value={f}>{t('input.mealsOpt', { n: f })}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* 결과 */}
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section id="pet-age-result" className="ui-card p-6 space-y-5 scroll-mt-20 min-w-0" aria-labelledby="pa-result-label">
            <div aria-live="polite">
              <p id="pa-result-label" className="text-sm text-sub">{resultLabel}</p>
              <p className="mt-1 text-3xl font-bold text-fg tabular-nums">{humanText}</p>
              <p className="mt-1 text-sm text-body">
                {isDog ? t('result.byDog', { size: sizeName }) : t('result.byCat')}
                {age.estimated && ` ${t('result.estimated')}`}
              </p>
            </div>

            {isDog && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-subtle rounded-2xl px-4 py-3">
                  <dt className="text-xs text-sub">{t('result.tableLabel', { size: sizeName })}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{humanText}{age.estimated && '*'}</dd>
                </div>
                <div className="bg-subtle rounded-2xl px-4 py-3">
                  <dt className="text-xs text-sub">{t('result.ucsdLabel')}</dt>
                  <dd className="mt-0.5 text-base font-semibold text-fg tabular-nums">{ucsd === null ? t('result.ucsdNone') : t('result.years', { n: Math.round(ucsd) })}</dd>
                  <dd className="text-xs text-muted">{t('result.ucsdNote')}</dd>
                </div>
              </dl>
            )}

            <div className="rounded-2xl border border-line p-4 space-y-2">
              <p className="text-xs text-sub">{t('stage.title')}</p>
              <p className="text-lg font-semibold text-fg">{stageLabel}{stageEn !== stageLabel && <span className="text-sm font-normal text-sub"> ({stageEn})</span>}</p>
              <p className="text-sm text-body">
                {t(`stage.range.${st.s}.${stageKey}`)}
                {isDog && stage.to >= 2 && ` ${t('stage.seniorDog', { size: sizeName, lo: lifeLo, hi: lifeHi, a: fmt(lifeLo * 0.75), b: fmt(lifeHi * 0.75) })}`}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-sub">{care.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="text-xs text-muted">{t('stage.endOfLife')}</p>
            </div>
          </section>

          <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="pa-feed">
            <h2 id="pa-feed" className="text-lg font-semibold text-fg">{t('feed.title')}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-live="polite">
              {[
                ['kcal', kcalText],
                ['g', gText],
                ['meal', mealText],
              ].map(([k, v]) => (
                <div key={k} className="bg-subtle rounded-2xl px-4 py-3">
                  <dt className="text-xs text-sub">{t(`feed.${k}`, { n: st.f })}</dt>
                  <dd className="mt-0.5 text-xl font-bold text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="space-y-1 text-xs text-muted tabular-nums">
              <li>{t('feed.how', { w: fmt(st.w), rer: fmt(Math.round(feed.rer)), f: span(feed.factor), name: t(`factor.${feed.key}`), k: st.k })}</li>
              {feed.factor[0] !== feed.factor[1] && <li>{t('feed.rangeWhy')}</li>}
              <li>{t('feed.treat', { kcal: span(feed.treat) })}</li>
              <li>{t('feed.vary')}</li>
            </ul>
            {months < 2 && <p className={warnCls}>{t('feed.weaning')}</p>}
            {!growth && st.a === 'loss' && <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t('feed.lossNote')}</p>}
            <p className="text-xs text-muted leading-relaxed">{t('result.disclaimer')}</p>
          </section>

          <ShareResult
            fileName="pet-age"
            card={{
              tool: t('share.tool'),
              label: resultLabel,
              headline: t('share.headline', { pet, age: ageText, n: human }),
              sub: isDog ? t('share.subDog', { size: sizeName, w: fmt(st.w) }) : t('share.subCat', { w: fmt(st.w) }),
              rows: [
                { label: t('stage.title'), value: stageLabel },
                ...(isDog && ucsd !== null ? [{ label: t('share.ucsd'), value: t('result.years', { n: Math.round(ucsd) }) }] : []),
                { label: t('feed.kcal'), value: kcalText },
                { label: t('feed.g'), value: gText },
                { label: t('feed.meal', { n: st.f }), value: mealText },
              ],
            }}
            text={t('share.text', { pet, age: ageText, n: human, stage: stageLabel, kcal: kcalText, g: gText })}
          />
        </div>
      </div>

      {/* 환산표 */}
      <section className="ui-card p-6 space-y-4 min-w-0" aria-labelledby="pa-table">
        <div>
          <h2 id="pa-table" className="text-lg font-semibold text-fg">{t(`table.title.${st.s}`)}</h2>
          <p className="text-sm text-muted mt-1">{t(`table.desc.${st.s}`)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm tabular-nums ${isDog ? 'min-w-[34rem]' : ''}`}>
            <caption className="sr-only">{t(`table.title.${st.s}`)}</caption>
            <thead>
              <tr className="border-b border-line text-left text-sub">
                <th scope="col" className="py-2 pr-3 font-medium">{t(`table.age.${st.s}`)}</th>
                {isDog ? (
                  <>
                    {SIZES.map((z) => (
                      <th key={z} scope="col" className={`py-2 pr-3 font-medium ${z === size ? 'text-primary' : ''}`}>{t(`size.${z}`)}</th>
                    ))}
                    <th scope="col" className="py-2 pr-3 font-medium">{t('table.ucsd')}</th>
                  </>
                ) : <th scope="col" className="py-2 pr-3 font-medium">{t('table.human')}</th>}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((mo) => {
                const cell = (s: Species, z: Size) => { const r = humanAge(s, z, mo); return `${Math.round(r.value)}${r.estimated ? '*' : ''}` }
                const u = ucsdAge(mo)
                return (
                  <tr key={mo} aria-current={mo === curRow || undefined} className={`border-b border-line ${mo === curRow ? 'bg-primary-soft text-primary font-semibold' : 'text-body'}`}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium whitespace-nowrap">{rowLabel(mo)}</th>
                    {isDog ? (
                      <>
                        {SIZES.map((z) => <td key={z} className="py-2 pr-3 whitespace-nowrap">{cell('dog', z)}</td>)}
                        <td className="py-2 pr-3 whitespace-nowrap">{u === null ? '—' : Math.round(u)}</td>
                      </>
                    ) : <td className="py-2 pr-3 whitespace-nowrap">{cell('cat', 'small')}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">{t(`table.note.${st.s}`)}</p>
      </section>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
