'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/waterBill'
import { RotateCcw, ExternalLink } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import ShareResult from '@/components/ShareResult'
import { REGIONS, calcBill, avgUsage, savingWon, dailyLitersToM3, type Rates, type RegionId } from '@/utils/waterBill'

type Region = RegionId | 'custom'
const REGION_IDS: Region[] = ['seoul', 'busan', 'custom']
const PEOPLE = [1, 2, 3, 4, 5, 6]

// 숫자 입력은 문자열로 보관 → 지우고 다시 입력 가능
interface State { r: Region; p: number; u: string; cw: string; cs: string; cb: string; cl: string }
const DEFAULTS: State = {
  r: 'seoul', p: 4, u: String(avgUsage(4)),
  cw: String(REGIONS.seoul.water[0].rate), cs: String(REGIONS.seoul.sewer[0].rate),
  cb: String(REGIONS.seoul.basic), cl: String(REGIONS.seoul.levy),
}
const CUSTOM_KEYS = ['cw', 'cs', 'cb', 'cl'] as const

const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0 }
const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
const fmtM3 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ko-KR')

// 절약 팁: 1인 하루 절약량(L) — 가정값은 문구에 그대로 노출
const TIPS = [
  { key: 'shower', liters: 12 },   // 일반 샤워기 분당 약 12L × 1분
  { key: 'toilet', liters: 12 },   // 구형 양변기 1회 약 12L
  { key: 'brush', liters: 5 },     // 양치 시 흘려 쓰기 대신 컵 사용
] as const

export default function WaterBillCalculator() {
  const t = useTranslations('waterBill')
  const [s, setS] = useState<State>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }))

  // 공유 링크 복원 → 이후 상태를 URL에 동기화
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const next = { ...DEFAULTS }
    const r = q.get('r') as Region | null
    if (r && REGION_IDS.includes(r)) next.r = r
    const p = Number(q.get('p'))
    if (PEOPLE.includes(p)) { next.p = p; next.u = String(avgUsage(p)) }
    for (const k of ['u', ...CUSTOM_KEYS] as const) {
      const v = q.get(k)
      if (v && Number.isFinite(parseFloat(v))) next[k] = v
    }
    setS(next)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const url = new URL(window.location.href)
    // 결과 재현을 위해 r/p/u는 항상 기록, 직접 입력 단가는 custom일 때만
    url.searchParams.set('r', s.r)
    url.searchParams.set('p', String(s.p))
    url.searchParams.set('u', String(num(s.u)))
    for (const k of CUSTOM_KEYS) {
      if (s.r === 'custom') url.searchParams.set(k, String(num(s[k])))
      else url.searchParams.delete(k)
    }
    window.history.replaceState(window.history.state, '', url)
  }, [loaded, s])

  const rates: Rates = useMemo(() => s.r === 'custom'
    ? { basic: num(s.cb), water: [{ upTo: Infinity, rate: num(s.cw) }], sewer: [{ upTo: Infinity, rate: num(s.cs) }], levy: num(s.cl) }
    : REGIONS[s.r], [s])

  const usage = num(s.u)
  const bill = calcBill(usage, rates)
  const avg = avgUsage(s.p)
  const avgBill = calcBill(avg, rates)
  const diff = bill.total - avgBill.total
  const diffPct = avg > 0 ? Math.round(((usage - avg) / avg) * 100) : 0
  const perM3 = usage > 0 ? (bill.total - bill.basic) / usage : 0
  const regionName = t(`region.${s.r}`)

  const compareText = Math.abs(diffPct) < 5
    ? t('compare.similar')
    : diff < 0
      ? t('compare.less', { won: fmt(-diff), pct: -diffPct })
      : t('compare.more', { won: fmt(diff), pct: diffPct })

  const breakdown: [string, number][] = [
    [t('breakdown.basic'), bill.basic],
    [t('breakdown.water'), bill.water],
    [t('breakdown.sewer'), bill.sewer],
    [t('breakdown.levy'), bill.levy],
  ]
  const barMax = Math.max(usage, avg, 1)
  const SLIDER_MAX = 60

  const reset = () => setS(DEFAULTS)
  const pickPeople = (p: number) => setS((prev) => ({ ...prev, p, u: String(avgUsage(p)) }))

  const seg = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 결과 — 모바일에서 먼저, 데스크톱에선 오른쪽 2열 */}
        <div className="space-y-4 lg:col-span-2 lg:col-start-2 lg:row-start-1">
          <div className="ui-hero p-6">
            <p className="text-sm text-white/70">{t('hero.label', { region: regionName, people: s.p, usage: fmtM3(usage) })}</p>
            <p className="text-4xl font-bold tabular-nums mt-1">{fmt(bill.total)}{t('won')}</p>
            <p className="text-sm text-white/80 mt-2 tabular-nums">
              {t('hero.sub', { bimonthly: fmt(bill.total * 2), yearly: fmt(bill.total * 12) })}
            </p>
            <p className="text-sm text-white/80 mt-1">{compareText}</p>
          </div>

          <ShareResult
            fileName="water-bill"
            card={{
              tool: t('title'),
              label: t('hero.label', { region: regionName, people: s.p, usage: fmtM3(usage) }),
              headline: `${fmt(bill.total)}${t('won')}`,
              sub: compareText,
              rows: [
                ...breakdown.map(([label, v]) => ({ label, value: `${fmt(v)}${t('won')}` })),
                { label: t('compare.avgLabel', { people: s.p }), value: `${fmt(avgBill.total)}${t('won')}` },
              ],
            }}
            text={t('share.text', { region: regionName, people: s.p, total: fmt(bill.total) })}
          />

          <div className="grid md:grid-cols-2 gap-4">
            {/* 항목별 내역 */}
            <div className="ui-card p-5 space-y-3 text-sm">
              <h2 className="font-semibold text-fg">{t('breakdown.title')}</h2>
              {breakdown.map(([label, v]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sub">{label}</span>
                  <span className="text-fg tabular-nums">{fmt(v)}{t('won')}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-3 font-semibold">
                <span className="text-fg">{t('totalAmount')}</span>
                <span className="text-primary tabular-nums">{fmt(bill.total)}{t('won')}</span>
              </div>
              {usage > 0 && <p className="text-xs text-muted">{t('breakdown.perM3', { won: fmt(perM3) })}</p>}
              <p className="text-xs text-muted">{t('breakdown.noVat')}</p>
            </div>

            {/* 평균 비교 */}
            <div className="ui-card p-5 space-y-4 text-sm">
              <h2 className="font-semibold text-fg">{t('compare.title', { people: s.p })}</h2>
              {[
                { label: t('compare.mine'), m3: usage, won: bill.total, mine: true },
                { label: t('compare.avgLabel', { people: s.p }), m3: avg, won: avgBill.total, mine: false },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-body">{row.label} · {fmtM3(row.m3)}㎥</span>
                    <span className="text-fg tabular-nums font-medium">{fmt(row.won)}{t('won')}</span>
                  </div>
                  <div className="h-3 rounded-full bg-track overflow-hidden">
                    <div className={`h-full rounded-full ${row.mine ? 'bg-primary' : 'bg-faint'}`} style={{ width: `${(row.m3 / barMax) * 100}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-fg font-medium">{compareText}</p>
              <p className="text-xs text-muted">{t('compare.note')}</p>
            </div>
          </div>

          {/* 절약 팁: 현재 요율·사용량으로 절감액 계산 */}
          <div className="ui-card p-5 space-y-3 text-sm">
            <h2 className="font-semibold text-fg">{t('tips.title', { people: s.p })}</h2>
            {TIPS.map(({ key, liters }) => {
              const m3 = dailyLitersToM3(liters, s.p)
              const won = savingWon(usage, m3, rates)
              return (
                <div key={key} className="flex items-start justify-between gap-4 border-b border-line last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-fg font-medium">{t(`tips.${key}`)}</p>
                    <p className="text-xs text-muted mt-0.5">{t('tips.detail', { liters, m3: fmtM3(m3) })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-primary font-semibold tabular-nums">{t('tips.perMonth', { won: fmt(won) })}</p>
                    <p className="text-xs text-muted tabular-nums">{t('tips.perYear', { won: fmt(won * 12) })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 입력 */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="ui-card p-6 space-y-6">
            <div>
              <p className="text-sm font-medium text-body mb-2">{t('input.region')}</p>
              <div className="grid grid-cols-3 gap-2">
                {REGION_IDS.map((r) => (
                  <button key={r} onClick={() => set('r', r)} className={seg(s.r === r)} aria-pressed={s.r === r}>
                    {t(`region.${r}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t('input.regionNote')}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-body mb-2">{t('householdSize')}</p>
              <div className="grid grid-cols-6 gap-1.5">
                {PEOPLE.map((p) => (
                  <button key={p} onClick={() => pickPeople(p)} className={seg(s.p === p)} aria-pressed={s.p === p}>
                    {p}{p === 6 ? '+' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t('input.peopleNote')}</p>
            </div>

            <div>
              <label htmlFor="wb-usage" className="block text-sm font-medium text-body mb-2">{t('usage')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={SLIDER_MAX} step={1}
                  value={Math.min(usage, SLIDER_MAX)}
                  onChange={(e) => set('u', e.target.value)}
                  className="flex-1 accent-[var(--primary)]"
                  aria-label={t('usage')}
                />
                <input
                  id="wb-usage" type="number" inputMode="decimal" min={0} step="any"
                  value={s.u}
                  onChange={(e) => set('u', e.target.value)}
                  className="ui-field px-3 py-2 w-24 text-right tabular-nums"
                />
              </div>
              <p className="text-xs text-muted mt-2">{t('input.usageNote')}</p>
            </div>

            {s.r === 'custom' && (
              <div className="bg-subtle rounded-2xl p-4 space-y-3">
                <p className="text-xs text-sub">{t('custom.note')}</p>
                {CUSTOM_KEYS.map((k) => (
                  <label key={k} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-body">{t(`custom.${k}`)}</span>
                    <input
                      type="number" inputMode="decimal" min={0} step="any"
                      value={s[k]}
                      onChange={(e) => set(k, e.target.value)}
                      className="ui-field px-3 py-2 w-28 text-right tabular-nums"
                    />
                  </label>
                ))}
              </div>
            )}

            <button onClick={reset} className="ui-btn-soft w-full px-4 py-2 text-sm">
              <RotateCcw className="w-4 h-4" /> {t('reset')}
            </button>
          </div>
        </div>
      </div>

      {/* 기준·출처 */}
      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub space-y-2">
        <p className="font-medium text-fg">{t('source.title')}</p>
        <p>{t('source.seoul')}</p>
        <p>{t('source.busan')}</p>
        <p>{t('source.others')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {(['seoul', 'busan'] as const).map((r) => (
            <a key={r} href={REGIONS[r].source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {t(`source.link.${r}`)} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>

      <GuideSection namespace="waterBill" />
    </div>
  )
}
