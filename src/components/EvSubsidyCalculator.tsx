'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import {
  DATA_DATE, GUIDE_YEAR, MODELS, REGIONS, SIDOS, CHARGE_RATES, INCENTIVE_MAX,
  regionByCd, localFor, estimateLocal, estimateNational, calcSubsidy, priceFactor, runningCost,
  type SizeClass,
} from '@/utils/evSubsidy'

const EV_URL = 'https://ev.or.kr/nportal/buySupprt/initPsLocalCarPirceAction.do'
const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// 입력 상태 = URL 파라미터 (키 이름 그대로 공유 링크에 들어감)
const DEFAULTS = {
  m: 'ioniq5-lr', // 모델 id | 'custom'
  cm: 'direct', // custom: direct | estimate
  nat: '400', // custom direct 국비
  p: '5000', // 차량가(만원)
  d: '0', // 제조사 할인(만원)
  r: '1100', // 지자체 코드
  loc: '', // 지방비 직접 입력(빈칸 = 자동)
  cv: '0', y: '0', li: '0', ch: '0', // 전환·청년·차상위·자녀 수
  sz: 'large', ef: '5.0', rr: '450', cr: '380', bg: '1', eg: '1', ag: '1', inc: '200', // 성능 추정
  km: '15000', ee: '5.0', rate: 'fast', ie: '12', fp: '', // 유지비
}
type State = typeof DEFAULTS
type Key = keyof State

const inputCls = 'ui-field px-3 py-2.5 tabular-nums'
const segBtn = (on: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-medium transition ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export default function EvSubsidyCalculator() {
  const t = useTranslations('evSubsidy')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(DEFAULTS)
  const set = (k: Key, v: string) => setS((prev) => ({ ...prev, [k]: v }))
  const [fuelDate, setFuelDate] = useState('')
  const [open, setOpen] = useState({ regions: false, models: false })

  // URL → 상태 (최초 1회)
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const next = { ...DEFAULTS }
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      const v = searchParams.get(k)
      if (v !== null && v.length <= 12 && /^[\w.-]*$/.test(v)) next[k] = v
    }
    if (next.m !== 'custom' && !MODELS.some((x) => x.id === next.m)) next.m = DEFAULTS.m
    if (!regionByCd(next.r)) next.r = DEFAULTS.r
    setS(next)
  }, [searchParams])

  // 상태 → URL (기본값은 생략)
  useEffect(() => {
    if (!loaded.current) return
    const url = new URL(window.location.href)
    for (const k of Object.keys(DEFAULTS) as Key[]) {
      if (s[k] === DEFAULTS[k]) url.searchParams.delete(k)
      else url.searchParams.set(k, s[k])
    }
    window.history.replaceState(window.history.state, '', url)
  }, [s])

  // 휘발유 가격: 오피넷 전국 평균 (URL에 fp 있으면 유지)
  useEffect(() => {
    if (searchParams.get('fp')) return
    let dead = false
    fetch('/api/fuel-prices')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const oil = data?.RESULT?.OIL?.find?.((o: { PRODCD: string }) => o.PRODCD === 'B027')
        if (dead || !oil) return
        setS((prev) => (prev.fp ? prev : { ...prev, fp: String(Math.round(Number(oil.PRICE))) }))
        const d = String(oil.TRADE_DT ?? '')
        setFuelDate(/^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : '')
      })
      .catch(() => {})
    return () => { dead = true }
  }, [searchParams])

  const n = (k: Key) => Number(s[k]) || 0
  const man = (v: number) => t('ev.man', { n: fmt(v), won: fmt(v * 10_000) })
  const won = (v: number) => t('ev.won', { n: fmt(v) })

  // ── 계산 ──
  const model = MODELS.find((x) => x.id === s.m)
  const region = regionByCd(s.r) ?? REGIONS[0]
  const price = n('p')
  const est = useMemo(() => estimateNational({
    size: s.sz as SizeClass, priceMan: Number(s.p) || 0,
    roomEff: Number(s.ef) || 0, roomRange: Number(s.rr) || 0, coldRange: Number(s.cr) || 0,
    batteryGrade: Number(s.bg) || 1, envGrade: Number(s.eg) || 1, asGrade: Number(s.ag) || 1,
    incentive: Number(s.inc) || 0,
  }), [s.sz, s.p, s.ef, s.rr, s.cr, s.bg, s.eg, s.ag, s.inc])
  const national = model ? model.national : s.cm === 'estimate' ? est.national : clamp(n('nat'), 0, 580)
  const published = model ? localFor(region, model.id) : null
  const autoLocal = published ?? estimateLocal(region, national)
  const local = s.loc !== '' ? clamp(n('loc'), 0, 5000) : autoLocal
  const localSource: 'manual' | 'published' | 'estimated' = s.loc !== '' ? 'manual' : published !== null ? 'published' : 'estimated'

  const buyer = { conversion: s.cv === '1', youth: s.y === '1', lowIncome: s.li === '1', children: clamp(n('ch'), 0, 9) }
  const res = calcSubsidy({
    priceMan: price, discountMan: n('d'), national, local,
    convLocalRatio: region.convRatio, buyer, light: !!model?.light,
  })
  const pf = priceFactor(price)
  const chargeWon = CHARGE_RATES.find((c) => c.id === s.rate)?.won ?? CHARGE_RATES[2].won
  const fuelWon = Number(s.fp) || 0
  const cost = runningCost({ kmPerYear: n('km'), years: 5, evEff: n('ee'), chargeWon, iceEff: n('ie'), fuelWon })

  // 같은 시·도 지자체 비교 / 선택 지역의 모델 비교
  const regionRows = useMemo(() => REGIONS.filter((r) => r.sido === region.sido).map((r) => {
    const pub = model ? localFor(r, model.id) : null
    const loc = pub ?? estimateLocal(r, national)
    const x = calcSubsidy({ priceMan: price, discountMan: Number(s.d) || 0, national, local: loc, convLocalRatio: r.convRatio, buyer, light: !!model?.light })
    return { r, loc, listed: pub !== null, total: x.total }
  }).sort((a, b) => b.total - a.total), [region.sido, model, national, price, s.d, s.cv, s.y, s.li, s.ch]) // eslint-disable-line react-hooks/exhaustive-deps
  const modelRows = useMemo(() => MODELS.map((m) => {
    const loc = localFor(region, m.id)
    return { m, loc, total: m.national + (loc ?? 0) }
  }).sort((a, b) => b.total - a.total), [region])
  const nationwide = useMemo(() => {
    if (!model) return null
    const list = REGIONS.map((r) => ({ r, v: localFor(r, model.id) })).filter((x) => x.v !== null) as { r: typeof REGIONS[0]; v: number }[]
    if (!list.length) return null
    list.sort((a, b) => b.v - a.v)
    return { max: list[0], min: list[list.length - 1] }
  }, [model])

  const carName = model ? `${model.maker} ${model.name}` : t('ev.car.custom')
  const regionName = REGIONS.filter((r) => r.sido === region.sido).length === 1 ? region.name : `${region.sido} ${region.name}`
  const headline = man(res.total)

  const Row = ({ label, value, strong, sub }: { label: string; value: string; strong?: boolean; sub?: string }) => (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div>
        <div className={strong ? 'font-semibold text-fg' : 'text-body'}>{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      <div className={`tabular-nums text-right ${strong ? 'font-bold text-fg' : 'text-body'}`}>{value}</div>
    </div>
  )

  const numInput = (k: Key, unit: string, opts: { step?: string; label: string; hint?: string }) => (
    <label className="block">
      <span className="block text-sm font-medium text-body mb-1.5">{opts.label}</span>
      <div className="relative">
        <input
          type="number" inputMode="decimal" min={0} step={opts.step ?? '1'} value={s[k]}
          onChange={(e) => set(k, e.target.value)} className={`${inputCls} pr-14`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">{unit}</span>
      </div>
      {opts.hint && <span className="block text-xs text-muted mt-1">{opts.hint}</span>}
    </label>
  )

  const check = (k: Key, label: string, hint: string) => (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <input type="checkbox" checked={s[k] === '1'} onChange={(e) => set(k, e.target.checked ? '1' : '0')} className="mt-1 h-4 w-4 accent-primary" />
      <span>
        <span className="block text-sm font-medium text-body">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('ev.subtitle', { year: GUIDE_YEAR, date: DATA_DATE })}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── 입력 ── */}
        <div className="lg:col-span-1 space-y-5">
          <div className="ui-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('ev.car.title')}</h2>
            <label className="block">
              <span className="block text-sm font-medium text-body mb-1.5">{t('ev.car.model')}</span>
              <select value={s.m} onChange={(e) => setS((p) => ({ ...p, m: e.target.value, loc: '' }))} className={inputCls}>
                {[...new Set(MODELS.map((x) => x.maker))].map((mk) => (
                  <optgroup key={mk} label={mk}>
                    {MODELS.filter((x) => x.maker === mk).map((x) => (
                      <option key={x.id} value={x.id}>{x.name} · {t('ev.car.nationalShort', { n: x.national })}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="custom">{t('ev.car.custom')}</option>
              </select>
              <span className="block text-xs text-muted mt-1">{t('ev.car.modelHint', { date: DATA_DATE })}</span>
            </label>

            {!model && (
              <div className="bg-subtle rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2" role="tablist">
                  {(['direct', 'estimate'] as const).map((mode) => (
                    <button key={mode} type="button" role="tab" aria-selected={s.cm === mode} onClick={() => set('cm', mode)} className={segBtn(s.cm === mode)}>
                      {t(`ev.custom.${mode}`)}
                    </button>
                  ))}
                </div>
                {s.cm === 'direct' ? (
                  <>
                    {numInput('nat', t('ev.unitMan'), { label: t('ev.custom.national'), hint: t('ev.custom.nationalHint') })}
                    <a href={EV_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary">
                      {t('ev.custom.lookup')} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(['large', 'small'] as const).map((sz) => (
                        <button key={sz} type="button" onClick={() => set('sz', sz)} className={segBtn(s.sz === sz)}>{t(`ev.est.${sz}`)}</button>
                      ))}
                    </div>
                    {numInput('ef', 'km/kWh', { step: '0.1', label: t('ev.est.eff') })}
                    <div className="grid grid-cols-2 gap-3">
                      {numInput('rr', 'km', { label: t('ev.est.roomRange') })}
                      {numInput('cr', 'km', { label: t('ev.est.coldRange') })}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([['bg', 5], ['eg', 5], ['ag', 4]] as const).map(([k, max]) => (
                        <label key={k} className="block">
                          <span className="block text-xs font-medium text-body mb-1">{t(`ev.est.${k}`)}</span>
                          <select value={s[k]} onChange={(e) => set(k, e.target.value)} className="ui-field px-2 py-2 text-sm">
                            {Array.from({ length: max }, (_, i) => (
                              <option key={i} value={String(i + 1)}>{t('ev.est.grade', { g: i + 1, c: (1 - 0.1 * i).toFixed(1) })}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    {numInput('inc', t('ev.unitMan'), { label: t('ev.est.incentive'), hint: t('ev.est.incentiveHint', { max: INCENTIVE_MAX }) })}
                    <div className="text-sm text-sub tabular-nums">
                      {t('ev.est.result', { perf: fmt(est.perf), coef: est.coef.toFixed(2), pf: Math.round(est.priceFactor * 100), n: fmt(est.national) })}
                    </div>
                  </>
                )}
              </div>
            )}

            {numInput('p', t('ev.unitMan'), { label: t('ev.car.price'), hint: t(model ? 'ev.car.priceHintPreset' : 'ev.car.priceHint') })}
            <div className="flex flex-wrap gap-1.5" aria-label={t('ev.car.band')}>
              {[{ k: 'full', on: pf === 1 }, { k: 'half', on: pf === 0.5 }, { k: 'none', on: pf === 0 }].map((b) => (
                <span key={b.k} className={`text-xs px-2.5 py-1 rounded-full ${b.on ? 'bg-primary text-white' : 'bg-soft text-sub'}`}>{t(`ev.band.${b.k}`)}</span>
              ))}
            </div>
            {numInput('d', t('ev.unitMan'), { label: t('ev.car.discount'), hint: t('ev.car.discountHint') })}
          </div>

          <div className="ui-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('ev.region.title')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1.5">{t('ev.region.sido')}</span>
                <select
                  value={region.sido}
                  onChange={(e) => { const first = REGIONS.find((r) => r.sido === e.target.value); if (first) setS((p) => ({ ...p, r: first.cd, loc: '' })) }}
                  className={inputCls}
                >
                  {SIDOS.map((sd) => <option key={sd} value={sd}>{sd}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1.5">{t('ev.region.sigungu')}</span>
                <select value={region.cd} onChange={(e) => setS((p) => ({ ...p, r: e.target.value, loc: '' }))} className={inputCls}>
                  {REGIONS.filter((r) => r.sido === region.sido).map((r) => <option key={r.cd} value={r.cd}>{r.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-body mb-1.5">{t('ev.region.local')}</span>
              <div className="relative">
                <input
                  type="number" inputMode="numeric" min={0} value={s.loc} placeholder={fmt(autoLocal)}
                  onChange={(e) => set('loc', e.target.value)} className={`${inputCls} pr-14`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">{t('ev.unitMan')}</span>
              </div>
              <span className="block text-xs text-muted mt-1">
                {localSource === 'published' && t('ev.region.published', { date: DATA_DATE })}
                {localSource === 'estimated' && t('ev.region.estimated', { pct: Math.round(region.ratio * 100) })}
                {localSource === 'manual' && t('ev.region.manual')}
              </span>
            </label>
          </div>

          <div className="ui-card p-6 space-y-2">
            <h2 className="text-base font-semibold text-fg mb-2">{t('ev.buyer.title')}</h2>
            {check('cv', t('ev.buyer.conversion'), t('ev.buyer.conversionHint'))}
            {check('y', t('ev.buyer.youth'), t('ev.buyer.youthHint'))}
            {check('li', t('ev.buyer.lowIncome'), t('ev.buyer.lowIncomeHint'))}
            <div className="pt-2">
              <span className="block text-sm font-medium text-body mb-1.5">{t('ev.buyer.children')}</span>
              <div className="grid grid-cols-4 gap-2">
                {['0', '2', '3', '4'].map((c) => (
                  <button key={c} type="button" onClick={() => set('ch', c)} className={segBtn((s.ch === '1' ? '0' : s.ch) === c)}>
                    {t(`ev.buyer.child${c}`)}
                  </button>
                ))}
              </div>
              <span className="block text-xs text-muted mt-1">{t('ev.buyer.childrenHint')}</span>
            </div>
          </div>
        </div>

        {/* ── 결과 ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="ui-hero p-6">
            <div className="text-sm text-white/70">{t('ev.hero.label', { car: carName, region: regionName })}</div>
            <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums">{headline}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">
              {t('ev.hero.net', { price: man(price), discount: man(n('d')), net: man(res.netPrice) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('ev.hero.national', { v: man(res.national) })}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('ev.hero.local', { v: man(res.local) })}</span>
              {res.extras > 0 && <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('ev.hero.extras', { v: man(res.extras) })}</span>}
              {pf < 1 && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{t(pf === 0 ? 'ev.band.none' : 'ev.band.half')}</span>}
            </div>
          </div>

          <ShareResult
            card={{
              tool: t('title'),
              label: t('ev.share.label', { car: carName, region: regionName }),
              headline,
              sub: t('ev.share.sub', { net: man(res.netPrice) }),
              rows: [
                { label: t('ev.row.national'), value: man(res.national) },
                { label: t('ev.row.local'), value: man(res.local) },
                ...(res.extras > 0 ? [{ label: t('ev.row.extras'), value: man(res.extras) }] : []),
              ],
            }}
            text={t('ev.share.text', { car: carName, region: regionName, total: headline, net: man(res.netPrice) })}
            fileName="ev-subsidy"
          />

          {/* 상세 내역 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ev.detail.title')}</h2>
            <div className="divide-y divide-line mt-2 text-sm">
              <Row label={t('ev.row.national')} value={man(res.national)} sub={model ? t('ev.row.nationalPreset') : s.cm === 'estimate' ? t('ev.row.nationalEst') : t('ev.row.nationalDirect')} />
              <Row label={t('ev.row.local')} value={man(res.local)} sub={regionName} />
              {res.convNational > 0 && <Row label={t('ev.row.conversion')} value={man(res.convNational + res.convLocal)} sub={t('ev.row.conversionSub', { nat: fmt(res.convNational), loc: fmt(res.convLocal) })} />}
              {res.youth > 0 && <Row label={t('ev.row.youth')} value={man(res.youth)} sub={t('ev.row.pct20')} />}
              {res.lowIncome > 0 && <Row label={t('ev.row.lowIncome')} value={man(res.lowIncome)} sub={t('ev.row.pct20')} />}
              {res.multiChild > 0 && <Row label={t('ev.row.multiChild')} value={man(res.multiChild)} />}
              <Row label={t('ev.row.total')} value={man(res.total)} strong />
              <Row label={t('ev.row.price')} value={man(price)} />
              {n('d') > 0 && <Row label={t('ev.row.discount')} value={`− ${man(n('d'))}`} />}
              <Row label={t('ev.row.subsidy')} value={`− ${man(res.total)}`} />
              <Row label={t('ev.row.net')} value={man(res.netPrice)} strong />
            </div>
          </div>

          {/* 취득세 */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg">{t('ev.acq.title')}</h2>
            <p className="text-sm text-muted mt-1">{t(model?.light ? 'ev.acq.descLight' : 'ev.acq.desc')}</p>
            <div className="divide-y divide-line mt-2 text-sm">
              <Row label={t('ev.acq.tax')} value={won(res.acqTax)} />
              <Row label={t('ev.acq.relief')} value={`− ${won(res.acqRelief)}`} />
              <Row label={t('ev.acq.pay')} value={won(res.acqPay)} strong />
            </div>
            <p className="text-xs text-muted mt-3">{t('ev.acq.note')}</p>
          </div>

          {/* 지역 비교 */}
          <div className="ui-card overflow-hidden">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, regions: !o.regions }))} aria-expanded={open.regions}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-subtle transition">
              <span>
                <span className="block text-base font-semibold text-fg">{t('ev.cmpRegion.title', { sido: region.sido })}</span>
                {nationwide && (
                  <span className="block text-xs text-muted mt-0.5">
                    {t('ev.cmpRegion.range', { max: `${nationwide.max.r.sido} ${nationwide.max.r.name}`, maxV: man(nationwide.max.v), min: `${nationwide.min.r.sido} ${nationwide.min.r.name}`, minV: man(nationwide.min.v) })}
                  </span>
                )}
              </span>
              {open.regions ? <ChevronUp className="w-4 h-4 text-faint" /> : <ChevronDown className="w-4 h-4 text-faint" />}
            </button>
            {open.regions && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-subtle text-xs text-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">{t('ev.cmpRegion.region')}</th>
                      <th className="px-4 py-2.5 text-right font-medium">{t('ev.row.local')}</th>
                      <th className="px-4 py-2.5 text-right font-medium">{t('ev.row.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {regionRows.map((row) => (
                      <tr key={row.r.cd} className={row.r.cd === region.cd ? 'bg-primary-soft text-primary' : ''}>
                        <td className="px-4 py-2.5">
                          <button type="button" onClick={() => setS((p) => ({ ...p, r: row.r.cd, loc: '' }))} className="text-left hover:underline">{row.r.name}</button>
                          {!row.listed && <span className="ml-1.5 text-xs text-muted">{t('ev.cmpRegion.est')}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">{man(row.loc)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{man(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 모델 비교 */}
          <div className="ui-card overflow-hidden">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, models: !o.models }))} aria-expanded={open.models}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-subtle transition">
              <span className="text-base font-semibold text-fg">{t('ev.cmpModel.title', { region: regionName })}</span>
              {open.models ? <ChevronUp className="w-4 h-4 text-faint" /> : <ChevronDown className="w-4 h-4 text-faint" />}
            </button>
            {open.models && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="bg-subtle text-xs text-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">{t('ev.cmpModel.model')}</th>
                      <th className="px-4 py-2.5 text-right font-medium">{t('ev.row.national')}</th>
                      <th className="px-4 py-2.5 text-right font-medium">{t('ev.row.local')}</th>
                      <th className="px-4 py-2.5 text-right font-medium">{t('ev.cmpModel.sum')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {modelRows.map((row) => (
                      <tr key={row.m.id} className={row.m.id === s.m ? 'bg-primary-soft text-primary' : ''}>
                        <td className="px-4 py-2.5">
                          <button type="button" onClick={() => setS((p) => ({ ...p, m: row.m.id, loc: '' }))} className="text-left hover:underline">
                            <span className="text-xs text-muted mr-1">{row.m.maker}</span>{row.m.name}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right">{fmt(row.m.national)}</td>
                        <td className="px-4 py-2.5 text-right">{row.loc === null ? t('ev.cmpModel.unlisted') : fmt(row.loc)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-5 py-3 text-xs text-muted">{t('ev.cmpModel.note', { date: DATA_DATE })}</p>
              </div>
            )}
          </div>

          {/* 5년 유지비 */}
          <div className="ui-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-fg">{t('ev.cost.title')}</h2>
              <p className="text-sm text-muted mt-1">{t('ev.cost.desc')}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {numInput('km', 'km', { label: t('ev.cost.km') })}
              {numInput('ee', 'km/kWh', { step: '0.1', label: t('ev.cost.evEff') })}
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1.5">{t('ev.cost.rate')}</span>
                <select value={s.rate} onChange={(e) => set('rate', e.target.value)} className={inputCls}>
                  {CHARGE_RATES.map((c) => <option key={c.id} value={c.id}>{t('ev.cost.rateOpt', { kw: c.kw, won: c.won.toFixed(1) })}</option>)}
                </select>
                <span className="block text-xs text-muted mt-1">{t('ev.cost.rateHint')}</span>
              </label>
              {numInput('ie', 'km/L', { step: '0.1', label: t('ev.cost.iceEff') })}
              {numInput('fp', t('ev.cost.wonPerL'), { label: t('ev.cost.fuel'), hint: fuelDate ? t('ev.cost.fuelOpinet', { date: fuelDate }) : t('ev.cost.fuelManual') })}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-subtle rounded-2xl p-4">
                <div className="text-xs text-muted">{t('ev.cost.ev')}</div>
                <div className="text-lg font-bold text-fg tabular-nums mt-1">{won(cost.ev)}</div>
              </div>
              <div className="bg-subtle rounded-2xl p-4">
                <div className="text-xs text-muted">{t('ev.cost.ice')}</div>
                <div className="text-lg font-bold text-fg tabular-nums mt-1">{fuelWon ? won(cost.ice) : '—'}</div>
              </div>
              <div className="bg-primary-soft rounded-2xl p-4">
                <div className="text-xs text-primary">{t(!fuelWon || cost.saving >= 0 ? 'ev.cost.saving' : 'ev.cost.loss')}</div>
                <div className="text-lg font-bold text-primary tabular-nums mt-1">{fuelWon ? won(Math.abs(cost.saving)) : '—'}</div>
              </div>
            </div>
            <p className="text-xs text-muted">
              {t('ev.cost.note')}{' '}
              <Link href="/fuel-calculator" className="text-primary hover:underline">{t('ev.cost.fuelLink')}</Link>
            </p>
          </div>

          {/* 유의사항 */}
          <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-1.5">
            <div className="font-semibold text-body">{t('ev.notes.title')}</div>
            <ul className="list-disc pl-5 space-y-1">
              {(t.raw('ev.notes.items') as string[]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
              <a href={EV_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">{t('ev.notes.linkModels')} <ExternalLink className="w-3.5 h-3.5" /></a>
              <a href="https://ev.or.kr/nportal/buySupprt/initSubsidyPaymentCheckAction.do" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">{t('ev.notes.linkBudget')} <ExternalLink className="w-3.5 h-3.5" /></a>
            </div>
          </div>
        </div>
      </div>

      <GuideSection namespace="evSubsidy" />
    </div>
  )
}
