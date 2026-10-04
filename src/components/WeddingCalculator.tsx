'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/weddingCalculator'
import { Copy, Check, ChevronDown, ChevronUp, Plus, Trash2, RotateCcw, FileDown } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import { todayKST } from '@/utils/dday'
import {
  type Region, type SplitMode, type SplitSide, type WeddingItem, type GuestGroup, type SplitConfig,
  CATEGORY_IDS, ITEM_DEFS, GUEST_GROUP_NAMES, DEFAULT_GUEST_GROUPS, buildDefaultItems, defaultSplit,
  guestCountOf, itemCost, computeTotals, congratsTotal, guestEconomics, splitTotals,
  schedule, addDays, daysBetween, isIsoDate, encodeState, decodeState,
} from '@/utils/wedding'

type TabId = 'costs' | 'congratulatory' | 'split' | 'schedule' | 'dashboard'
const TABS: TabId[] = ['costs', 'congratulatory', 'split', 'schedule', 'dashboard']

const STORAGE_KEY = 'wedding-calculator-data'
const CHECK_KEY = 'wedding-calculator-checklist'

const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR')
let uid = 0
const newId = () => `n${Date.now().toString(36)}${uid++}`

/** 콤마 숫자 입력 (단위: 만원/명) */
function NumInput({ value, onChange, className = '', disabled, label }: {
  value: number; onChange: (v: number) => void; className?: string; disabled?: boolean; label?: string
}) {
  return (
    <input
      type="text" inputMode="numeric" aria-label={label} disabled={disabled}
      value={value > 0 ? fmt(value) : ''} placeholder="0"
      className={`ui-field px-2 py-1.5 text-right text-sm tabular-nums min-w-0 ${className}`}
      onChange={e => onChange(Math.min(parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0, 999999))}
    />
  )
}

export default function WeddingCalculator() {
  const t = useTranslations('weddingCalculator')
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('costs')
  const [region, setRegion] = useState<Region>('seoul')
  const [items, setItems] = useState<WeddingItem[]>(() => buildDefaultItems('seoul'))
  const [guests, setGuests] = useState<GuestGroup[]>(DEFAULT_GUEST_GROUPS)
  const [splitConfig, setSplitConfig] = useState<SplitConfig>(defaultSplit)
  const [weddingDate, setWeddingDate] = useState('')
  const [today, setToday] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['venue']))
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 금액 표시: 1억 이상은 "2억 500만원"
  const money = useCallback((n: number) => {
    const v = Math.round(n), a = Math.abs(v), sign = v < 0 ? '-' : ''
    const mil = (a / 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
    if (a < 10000) return sign + t('amount.man', { n: fmt(a), mil })
    const e = Math.floor(a / 10000), m = a % 10000
    return sign + (m ? t('amount.eok', { e, n: fmt(m), mil }) : t('amount.eokOnly', { e, mil }))
  }, [t])

  // ── 복원: 공유 링크(b=...) > localStorage > 기본값 ──
  useEffect(() => {
    const now = todayKST()
    setToday(now)
    const tab = searchParams.get('tab')
    if (TABS.includes(tab as TabId)) setActiveTab(tab as TabId)
    const fromUrl = decodeState(k => searchParams.get(k))
    let date = fromUrl?.date || ''
    if (fromUrl) {
      setRegion(fromUrl.region); setItems(fromUrl.items); setGuests(fromUrl.guests); setSplitConfig(fromUrl.split)
    } else {
      const r = searchParams.get('region')
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const d = JSON.parse(saved)
          if (d.region === 'seoul' || d.region === 'regional') setRegion(d.region)
          if (Array.isArray(d.items) && d.items.length) {
            // 저장본에 없는 새 항목은 기본값으로 보충
            const base = buildDefaultItems(d.region === 'regional' ? 'regional' : 'seoul')
            setItems(base.map(b => d.items.find((i: WeddingItem) => i.id === b.id) ?? b))
          }
          if (Array.isArray(d.guests)) setGuests(d.guests)
          if (d.splitConfig) setSplitConfig({ ...defaultSplit(), ...d.splitConfig })
          if (isIsoDate(d.weddingDate)) date = d.weddingDate
        } else if (r === 'regional') {
          setRegion('regional'); setItems(buildDefaultItems('regional'))
        }
      } catch { /* ignore */ }
    }
    setWeddingDate(date || addDays(now, 365))
    try {
      const c = JSON.parse(localStorage.getItem(CHECK_KEY) || '[]')
      if (Array.isArray(c)) setChecked(c)
    } catch { /* ignore */ }
    setLoaded(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 저장 + URL 동기화 ──
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ region, items, guests, splitConfig, weddingDate, lastUpdated: new Date().toISOString() }))
    } catch { /* ignore */ }
    const p = new URLSearchParams(encodeState({ region, items, guests, split: splitConfig, date: weddingDate }))
    p.set('tab', activeTab)
    window.history.replaceState({}, '', `${window.location.pathname}?${p}`)
  }, [region, items, guests, splitConfig, weddingDate, activeTab, loaded])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(checked)) } catch { /* ignore */ }
  }, [checked, loaded])

  const handleRegionChange = useCallback((r: Region) => {
    setRegion(r)
    setItems(prev => prev.map(item => {
      const def = ITEM_DEFS.find(d => d.id === item.id)
      return def ? { ...item, budget: r === 'seoul' ? def.seoulDefault : def.regionalDefault } : item
    }))
  }, [])

  const updateItem = useCallback((id: string, field: keyof WeddingItem, value: string | number | boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }, [])
  const updateGuest = useCallback((id: string, field: keyof GuestGroup, value: string | number) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
  }, [])

  // ── 계산 ──
  const guestCount = guestCountOf(items)
  const totals = useMemo(() => computeTotals(items), [items])
  const gifts = useMemo(() => congratsTotal(guests), [guests])
  const econ = useMemo(() => guestEconomics(guests, items), [guests, items])
  const split = useMemo(() => splitTotals(splitConfig, totals), [splitConfig, totals])
  const netEx = totals.exHousing - gifts
  const coverageEx = totals.exHousing > 0 ? (gifts / totals.exHousing) * 100 : 0
  const plan = useMemo(() => (isIsoDate(weddingDate) && today ? schedule(weddingDate, today) : []), [weddingDate, today])
  const dday = isIsoDate(weddingDate) && today ? daysBetween(today, weddingDate) : null

  const ddayLabel = (n: number) => n === 0 ? t('schedule.today') : n > 0 ? `D-${n}` : `D+${-n}`

  const copyText = useCallback(async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* 권한 없음 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleReset = () => {
    if (!window.confirm(t('actions.resetConfirm'))) return
    setItems(buildDefaultItems(region))
    setGuests(DEFAULT_GUEST_GROUPS.map(g => ({ ...g })))
    setSplitConfig(defaultSplit())
    setChecked([])
    setActiveTab('costs')
    setOpenCategories(new Set(['venue']))
  }

  const summaryText = () => {
    const lines = [`=== ${t('title')} ===`, `${t('region.label')}: ${t(`region.${region}`)}`, '']
    for (const c of CATEGORY_IDS) lines.push(`${t(`categories.${c}`)}: ${money(totals.categories[c].effective)}`)
    lines.push('', `${t('stats.prepCost')}: ${money(totals.exHousing)}`, `${t('stats.housing')}: ${money(totals.housing)}`,
      `${t('stats.gifts')}: ${money(gifts)}`, `${t('hero.label')}: ${money(netEx)}`,
      `${t('split.groomSide')} ${money(split.groom)} / ${t('split.brideSide')} ${money(split.bride)}`)
    return lines.join('\n')
  }

  const handlePdfExport = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    // 한글 폰트 미내장 → 영문 요약
    doc.setFontSize(16); doc.text('Wedding Cost Summary (unit: 10,000 KRW)', 20, 20); doc.setFontSize(10)
    let y = 35
    const line = (s: string) => { doc.text(s, 20, y); y += 6 }
    line(`Region: ${region === 'seoul' ? 'Seoul/Metro' : 'Regional'}`)
    for (const c of CATEGORY_IDS) {
      const cat = totals.categories[c]
      line(`[${c}] Budget ${fmt(cat.budget)} / Actual ${fmt(cat.actual)} / Current ${fmt(cat.effective)}`)
    }
    y += 4
    line(`Wedding cost excl. housing: ${fmt(totals.exHousing)}`)
    line(`Housing: ${fmt(totals.housing)}`)
    line(`Gift money: ${fmt(gifts)}`)
    line(`Net burden excl. housing: ${fmt(netEx)}`)
    line(`Groom side: ${fmt(split.groom)} / Bride side: ${fmt(split.bride)}`)
    doc.save('wedding-cost-plan.pdf')
  }

  const surplus = netEx < 0
  const segBtn = (on: boolean) => `px-4 py-2 text-sm font-medium rounded-xl transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button onClick={handleReset} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2 text-sm">
          <RotateCcw size={14} />{t('actions.reset')}
        </button>
      </div>

      {/* 결과 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="ui-hero p-6" aria-live="polite">
            <div className="text-sm text-white/80">{surplus ? t('hero.labelSurplus') : t('hero.label')}</div>
            <div className="text-3xl sm:text-4xl font-bold mt-2 tabular-nums">{money(Math.abs(netEx))}</div>
            <div className="text-sm text-white/80 mt-2 tabular-nums">
              {t('hero.sub', { cost: money(totals.exHousing), gift: money(gifts) })}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('hero.total', { n: money(totals.effective) })}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm tabular-nums">{t('hero.coverage', { n: coverageEx.toFixed(0) })}</span>
            </div>
          </div>
          <ShareResult
            fileName="wedding-cost"
            card={{
              tool: t('title'),
              label: surplus ? t('hero.labelSurplus') : t('hero.label'),
              headline: money(Math.abs(netEx)),
              sub: t(`region.${region}`),
              rows: [
                { label: t('stats.prepCost'), value: money(totals.exHousing) },
                { label: t('stats.gifts'), value: money(gifts) },
                { label: t('stats.housing'), value: money(totals.housing) },
                { label: `${t('split.groomSide')} / ${t('split.brideSide')}`, value: `${money(split.groom)} / ${money(split.bride)}` },
              ],
            }}
            text={t('share.text', { cost: money(totals.exHousing), net: money(netEx) })}
          />
        </div>
        <div className="ui-card p-5 space-y-3 text-sm">
          {[
            [t('stats.prepCost'), money(totals.exHousing)],
            [t('stats.housing'), money(totals.housing)],
            [t('stats.gifts'), money(gifts)],
            [t('econ.margin'), `${money(Math.abs(econ.margin))} ${econ.margin >= 0 ? t('econ.surplus') : t('econ.deficit')}`],
            [t('split.groomSide'), money(split.groom)],
            [t('split.brideSide'), money(split.bride)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-sub">{k}</span>
              <span className="font-semibold text-fg tabular-nums text-right">{v}</span>
            </div>
          ))}
          <p className="text-xs text-muted pt-2 border-t border-line">{t('hero.basis')}</p>
        </div>
      </div>

      {/* 지역 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-body">{t('region.label')}</span>
        {(['seoul', 'regional'] as Region[]).map(r => (
          <button key={r} onClick={() => handleRegionChange(r)} className={segBtn(region === r)} aria-pressed={region === r}>
            {t(`region.${r}`)}
          </button>
        ))}
      </div>

      {/* 탭 */}
      <div className="ui-card">
        <div className="flex flex-wrap gap-2 p-3 border-b border-line" role="tablist">
          {TABS.map(id => (
            <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={segBtn(activeTab === id)}>
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* 1. 비용 입력 */}
          {activeTab === 'costs' && (
            <div className="space-y-3">
              {CATEGORY_IDS.map(catId => {
                const isOpen = openCategories.has(catId)
                const cat = totals.categories[catId]
                const diff = cat.actual > 0 ? cat.effective - cat.budget : 0
                return (
                  <div key={catId} className="border border-line rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenCategories(prev => { const n = new Set(prev); if (n.has(catId)) n.delete(catId); else n.add(catId); return n })}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-subtle hover:bg-soft transition-colors text-left"
                      aria-expanded={isOpen} aria-controls={`cat-${catId}`}
                    >
                      <span className="font-medium text-fg min-w-0">{t(`categories.${catId}`)}</span>
                      <span className="flex flex-wrap items-center justify-end gap-x-2 text-sm text-muted tabular-nums shrink-0">
                        {money(cat.effective)}
                        {diff !== 0 && (
                          <span className={diff > 0 ? 'text-amber-700' : 'text-primary'}>
                            {fmt(Math.abs(diff))} {diff > 0 ? t('dashboard.overBudget') : t('dashboard.underBudget')}
                          </span>
                        )}
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>

                    {isOpen && (
                      <div id={`cat-${catId}`} className="p-4 space-y-2">
                        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted px-1">
                          <div className="col-span-4">{t('fields.include')}</div>
                          <div className="col-span-2 text-right">{t('fields.budget')}</div>
                          <div className="col-span-2 text-right">{t('fields.actual')}</div>
                          <div className="col-span-1 text-right">{t('fields.difference')}</div>
                          <div className="col-span-3">{t('fields.memo')}</div>
                        </div>
                        {items.filter(i => i.categoryId === catId).map(item => {
                          const def = ITEM_DEFS.find(d => d.id === item.id)
                          const name = t(`items.${item.id}`)
                          const check = (
                            <input type="checkbox" checked={item.included} aria-label={name}
                              onChange={e => updateItem(item.id, 'included', e.target.checked)} className="accent-[var(--primary)] w-4 h-4 shrink-0" />
                          )
                          if (def?.isGuestCount) {
                            return (
                              <div key={item.id} className="flex flex-wrap items-center gap-2 py-2 border-b border-line last:border-0">
                                {check}
                                <span className="text-sm text-body min-w-[100px]">{name}</span>
                                <NumInput value={item.budget} onChange={v => updateItem(item.id, 'budget', v)} className="w-24" label={name} />
                                <span className="text-xs text-muted">{t('guestUnit')}</span>
                              </div>
                            )
                          }
                          const c = itemCost(item, guestCount)
                          const d = c.actual > 0 ? c.actual - c.budget : 0
                          return (
                            <div key={item.id} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center py-2 border-b border-line last:border-0">
                              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 text-sm text-body">
                                {check}
                                <span>{name}{def?.isPerPerson && <span className="text-xs text-muted ml-1">× {guestCount}{t('guestUnit')}</span>}</span>
                              </div>
                              <label className="sm:col-span-2 flex items-center gap-1">
                                <span className="sm:hidden text-xs text-muted w-8 shrink-0">{t('fields.budget')}</span>
                                <NumInput value={item.budget} onChange={v => updateItem(item.id, 'budget', v)} disabled={!item.included} className="w-full" label={`${name} ${t('fields.budget')}`} />
                              </label>
                              <label className="sm:col-span-2 flex items-center gap-1">
                                <span className="sm:hidden text-xs text-muted w-8 shrink-0">{t('fields.actual')}</span>
                                <NumInput value={item.actual} onChange={v => updateItem(item.id, 'actual', v)} disabled={!item.included} className="w-full" label={`${name} ${t('fields.actual')}`} />
                              </label>
                              <div className={`col-span-2 sm:col-span-1 text-right text-sm tabular-nums ${d > 0 ? 'text-amber-700' : 'text-primary'}`}>
                                {d !== 0 && `${d > 0 ? '+' : '-'}${fmt(Math.abs(d))}`}
                              </div>
                              <input type="text" value={item.note} onChange={e => updateItem(item.id, 'note', e.target.value)}
                                placeholder={t('fields.memo')} disabled={!item.included} aria-label={`${name} ${t('fields.memo')}`}
                                className="hidden sm:block sm:col-span-3 ui-field px-2 py-1.5 text-sm min-w-0" />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="sticky bottom-20 md:bottom-4 bg-primary rounded-2xl p-4 text-white" aria-live="polite">
                <div className="flex flex-wrap justify-between items-center gap-3 tabular-nums">
                  <div>
                    <div className="text-xs text-white/80">{t('costs.current')}</div>
                    <div className="text-lg font-bold">{money(totals.effective)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/80">{t('fields.budget')}</div>
                    <div className="text-sm font-semibold">{money(totals.budget)}</div>
                    {totals.effective !== totals.budget && (
                      <div className="text-xs">
                        {money(Math.abs(totals.effective - totals.budget))} {totals.effective > totals.budget ? t('dashboard.overBudget') : t('dashboard.underBudget')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. 축의금 */}
          {activeTab === 'congratulatory' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-fg">{t('congratulatory.guestGroup')}</h3>
                  <button onClick={() => setGuests(p => [...p, { id: newId(), name: 'friend', count: 10, perPerson: 10 }])}
                    className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-sm">
                    <Plus size={14} />{t('congratulatory.addGroup')}
                  </button>
                </div>
                <div className="hidden sm:grid grid-cols-12 gap-3 text-xs text-muted px-3">
                  <div className="col-span-3">{t('congratulatory.groupName')}</div>
                  <div className="col-span-2 text-right">{t('congratulatory.personCount')}</div>
                  <div className="col-span-3 text-right">{t('congratulatory.perPerson')}</div>
                  <div className="col-span-3 text-right">{t('congratulatory.subtotal')}</div>
                </div>
                {guests.map(g => (
                  <div key={g.id} className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 items-center p-3 bg-subtle rounded-xl">
                    <select value={g.name} onChange={e => updateGuest(g.id, 'name', e.target.value)}
                      aria-label={t('congratulatory.groupName')} className="col-span-2 sm:col-span-3 ui-field px-2 py-1.5 text-sm">
                      {GUEST_GROUP_NAMES.map(n => <option key={n} value={n}>{t(`congratulatory.groups.${n}`)}</option>)}
                    </select>
                    <label className="sm:col-span-2 flex items-center gap-1">
                      <NumInput value={g.count} onChange={v => updateGuest(g.id, 'count', v)} className="w-full" label={t('congratulatory.personCount')} />
                      <span className="text-xs text-muted shrink-0">{t('guestUnit')}</span>
                    </label>
                    <label className="sm:col-span-3 flex items-center gap-1">
                      <NumInput value={g.perPerson} onChange={v => updateGuest(g.id, 'perPerson', v)} className="w-full" label={t('congratulatory.perPerson')} />
                      <span className="text-xs text-muted shrink-0">{t('fields.unit')}</span>
                    </label>
                    <div className="sm:col-span-3 text-sm text-right">
                      <div className="font-medium text-fg tabular-nums">{money(g.count * g.perPerson)}</div>
                      {econ.mealPer > 0 && (
                        <div className={`text-xs ${g.perPerson >= econ.mealPer ? 'text-muted' : 'text-amber-700'}`}>
                          {g.perPerson >= econ.mealPer ? t('econ.groupAbove') : t('econ.groupBelow')}
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <button onClick={() => setGuests(p => p.filter(x => x.id !== g.id))} className="p-1 text-muted hover:text-red-600" aria-label={t('congratulatory.remove')}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  [t('congratulatory.total'), money(gifts)],
                  [t('congratulatory.excludingHousing'), `${coverageEx.toFixed(1)}%`],
                  [t('hero.label'), `${money(Math.abs(netEx))}${surplus ? ` ${t('econ.surplus')}` : ''}`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-subtle rounded-2xl p-4">
                    <div className="text-sm text-muted">{k}</div>
                    <div className="text-2xl font-bold text-fg tabular-nums mt-1">{v}</div>
                  </div>
                ))}
              </div>

              {/* 축의금 vs 식대 */}
              <div className="ui-card p-5 space-y-4">
                <h3 className="text-lg font-semibold text-fg">{t('econ.title')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    [t('econ.diners'), `${fmt(econ.diners)}${t('guestUnit')}`],
                    [t('econ.envelopes'), `${fmt(econ.envelopes)}${t('guestUnit')}`],
                    [t('econ.mealPer'), money(econ.mealPer)],
                    [t('econ.avgGift'), t('amount.man', { n: econ.avgGift.toFixed(1), mil: (econ.avgGift / 100).toFixed(3) })],
                    [t('econ.breakEven'), t('amount.man', { n: econ.breakEvenGift.toFixed(1), mil: (econ.breakEvenGift / 100).toFixed(3) })],
                    [t('econ.margin'), `${money(Math.abs(econ.margin))} ${econ.margin >= 0 ? t('econ.surplus') : t('econ.deficit')}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-muted">{k}</div>
                      <div className="font-semibold text-fg tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-sub">{t('econ.breakEvenHint')}</p>
                {econ.envelopes > 0 && econ.diners !== econ.envelopes && (
                  <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-3">
                    <p>{t('econ.mismatch', { d: fmt(econ.diners), e: fmt(econ.envelopes) })}</p>
                    <button onClick={() => updateItem('guestCount', 'budget', econ.envelopes)} className="ui-btn-soft px-3 py-1.5 text-sm">
                      {t('econ.sync', { n: fmt(econ.envelopes) })}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. 양가 분담 */}
          {activeTab === 'split' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {(['item', 'ratio', 'amount'] as SplitMode[]).map(mode => (
                  <button key={mode} onClick={() => setSplitConfig(p => ({ ...p, mode }))} className={segBtn(splitConfig.mode === mode)} aria-pressed={splitConfig.mode === mode}>
                    {t(`split.by${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                  </button>
                ))}
              </div>

              {splitConfig.mode === 'item' && (
                <div className="space-y-2">
                  {CATEGORY_IDS.map(catId => {
                    const cost = totals.categories[catId].effective
                    if (cost === 0) return null
                    const side = splitConfig.itemSplits[catId] || 'shared'
                    return (
                      <div key={catId} className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 bg-subtle rounded-xl">
                        <span className="text-sm text-fg">
                          <span className="font-medium">{t(`categories.${catId}`)}</span>
                          <span className="text-muted ml-2 tabular-nums">{money(cost)}</span>
                        </span>
                        <div className="flex gap-1">
                          {(['groom', 'shared', 'bride'] as SplitSide[]).map(s => (
                            <button key={s} aria-pressed={side === s}
                              onClick={() => setSplitConfig(p => ({ ...p, itemSplits: { ...p.itemSplits, [catId]: s } }))}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg ${side === s ? 'bg-primary text-white' : 'bg-surface text-body border border-line'}`}>
                              {t(`split.${s === 'groom' ? 'groomSide' : s === 'bride' ? 'brideSide' : 'shared'}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {splitConfig.mode === 'ratio' && (
                <div className="space-y-3 p-4 bg-subtle rounded-2xl">
                  <div className="flex justify-between text-sm font-medium text-fg">
                    <span>{t('split.groomSide')} {splitConfig.ratio}%</span>
                    <span>{t('split.brideSide')} {100 - splitConfig.ratio}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5} value={splitConfig.ratio} aria-label={t('split.byRatio')}
                    onChange={e => setSplitConfig(p => ({ ...p, ratio: parseInt(e.target.value, 10) }))} className="w-full accent-[var(--primary)]" />
                </div>
              )}

              {splitConfig.mode === 'amount' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['groomAmount', 'brideAmount'] as const).map(k => (
                    <label key={k} className="bg-subtle rounded-2xl p-4 block">
                      <span className="block text-sm font-medium text-sub mb-2">{t(k === 'groomAmount' ? 'split.groomSide' : 'split.brideSide')}</span>
                      <span className="flex items-center gap-1">
                        <NumInput value={splitConfig[k]} onChange={v => setSplitConfig(p => ({ ...p, [k]: v }))} className="w-full px-3 py-2" />
                        <span className="text-sm text-muted">{t('fields.unit')}</span>
                      </span>
                    </label>
                  ))}
                  {split.total !== totals.effective && (
                    <p className="sm:col-span-2 text-sm text-amber-700">
                      {t('split.amountGap', { total: money(totals.effective), sum: money(split.total) })}
                    </p>
                  )}
                </div>
              )}

              <div className="ui-card p-5 space-y-3">
                <h3 className="text-lg font-semibold text-fg">{t('split.summary')}</h3>
                {split.total > 0 && (
                  <div className="flex h-3 rounded-full overflow-hidden bg-track">
                    <div className="bg-primary" style={{ width: `${(split.groom / split.total) * 100}%` }} />
                  </div>
                )}
                <div className="flex justify-between text-sm tabular-nums">
                  <span className="text-fg"><span className="text-primary font-medium">{t('split.groomSide')}</span> {money(split.groom)}{split.total > 0 && ` (${((split.groom / split.total) * 100).toFixed(0)}%)`}</span>
                  <span className="text-fg text-right"><span className="font-medium">{t('split.brideSide')}</span> {money(split.bride)}{split.total > 0 && ` (${((split.bride / split.total) * 100).toFixed(0)}%)`}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. 준비 일정 */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-body mb-1">{t('schedule.date')}</span>
                  <input type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} className="ui-field px-4 py-2.5 text-sm" />
                </label>
                {dday !== null && <div className="text-3xl font-bold text-fg tabular-nums">{ddayLabel(dday)}</div>}
                <div className="text-sm text-muted">{t('schedule.progress', { done: checked.filter(id => plan.some(p => p.id === id)).length, total: plan.length })}</div>
              </div>
              <p className="text-sm text-sub bg-subtle rounded-2xl p-4">{t('schedule.hint')}</p>
              <ul className="divide-y divide-line">
                {plan.map(p => {
                  const done = checked.includes(p.id)
                  const late = !done && p.left < 0
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <input type="checkbox" checked={done} aria-label={t(`schedule.tasks.${p.id}`)}
                        onChange={e => setChecked(c => e.target.checked ? [...c, p.id] : c.filter(x => x !== p.id))}
                        className="accent-[var(--primary)] w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${done ? 'text-faint line-through' : 'text-fg'}`}>{t(`schedule.tasks.${p.id}`)}</div>
                        <div className="text-xs text-muted tabular-nums">{p.d < 0 ? `D-${-p.d}` : `D+${p.d}`} · {p.due}</div>
                      </div>
                      <span className={`text-xs font-medium shrink-0 tabular-nums ${done ? 'text-primary' : late ? 'text-amber-700' : 'text-sub'}`}>
                        {done ? t('schedule.done') : late ? t('schedule.overdue') : ddayLabel(p.left)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* 5. 종합 */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="ui-card p-5">
                <h3 className="text-sm font-semibold text-fg mb-4">{t('dashboard.categoryBreakdown')}</h3>
                <div className="space-y-3">
                  {[...CATEGORY_IDS].sort((a, b) => totals.categories[b].effective - totals.categories[a].effective).map(c => {
                    const v = totals.categories[c].effective
                    if (!v) return null
                    const pct = totals.effective > 0 ? (v / totals.effective) * 100 : 0
                    return (
                      <div key={c}>
                        <div className="flex justify-between text-sm mb-1 gap-2">
                          <span className="text-body">{t(`categories.${c}`)}</span>
                          <span className="text-fg tabular-nums">{money(v)} <span className="text-muted">{pct.toFixed(1)}%</span></span>
                        </div>
                        <div className="h-2 rounded-full bg-track overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  {totals.effective === 0 && <p className="text-sm text-muted">{t('dashboard.noData')}</p>}
                </div>
              </div>

              <div className="ui-card p-5 overflow-x-auto">
                <h3 className="text-sm font-semibold text-fg mb-4">{t('dashboard.budgetVsActual')}</h3>
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th scope="col" className="text-left py-2 pr-2 font-medium">{t('dashboard.category')}</th>
                      <th scope="col" className="text-right py-2 px-2 font-medium">{t('fields.budget')}</th>
                      <th scope="col" className="text-right py-2 px-2 font-medium">{t('fields.actual')}</th>
                      <th scope="col" className="text-right py-2 pl-2 font-medium">{t('fields.difference')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORY_IDS.map(c => {
                      const cat = totals.categories[c]
                      if (!cat.budget && !cat.actual) return null
                      const d = cat.actual > 0 ? cat.effective - cat.budget : 0
                      return (
                        <tr key={c} className="border-b border-line">
                          <td className="py-2 pr-2 text-fg">{t(`categories.${c}`)}</td>
                          <td className="py-2 px-2 text-right text-body">{fmt(cat.budget)}</td>
                          <td className="py-2 px-2 text-right text-body">{cat.actual > 0 ? fmt(cat.actual) : '-'}</td>
                          <td className={`py-2 pl-2 text-right ${d > 0 ? 'text-amber-700' : 'text-primary'}`}>
                            {d !== 0 ? `${d > 0 ? '+' : '-'}${fmt(Math.abs(d))}` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="font-bold">
                      <td className="py-2 pr-2 text-fg">{t('dashboard.totalCost')}</td>
                      <td className="py-2 px-2 text-right text-fg">{fmt(totals.budget)}</td>
                      <td className="py-2 px-2 text-right text-fg">{totals.actual > 0 ? fmt(totals.actual) : '-'}</td>
                      <td className="py-2 pl-2 text-right text-fg">
                        {totals.effective !== totals.budget ? `${totals.effective > totals.budget ? '+' : '-'}${fmt(Math.abs(totals.effective - totals.budget))}` : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted mt-3">{t('dashboard.unitNote')}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={() => copyText(summaryText(), 'summary')} className="ui-btn-soft flex items-center gap-2 px-4 py-2.5">
                  {copiedId === 'summary' ? <Check size={16} /> : <Copy size={16} />}{t('actions.copyResults')}
                </button>
                <button onClick={handlePdfExport} className="ui-btn flex items-center gap-2 px-4 py-2.5">
                  <FileDown size={16} />{t('actions.savePdf')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 가이드 */}
      <section className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div>
          <h3 className="font-semibold text-fg mb-2">{t('guide.whatIs.title')}</h3>
          <p className="text-sm text-body leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['averageCosts', 'howToUse', 'savingTips', 'tips'] as const).map(k => (
            <div key={k} className="bg-subtle rounded-2xl p-5">
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${k}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-4 text-sm text-body">
                {(t.raw(`guide.${k}.items`) as string[]).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              {k === 'averageCosts' && <p className="text-xs text-muted mt-3">{t('guide.averageCosts.note')}</p>}
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <dl className="space-y-4">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <dt className="text-sm font-medium text-fg">{f.q}</dt>
                <dd className="text-sm text-body mt-1 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
