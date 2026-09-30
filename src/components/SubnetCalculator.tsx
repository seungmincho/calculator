'use client'

import { useState, useMemo, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Link2, Download } from 'lucide-react'
import {
  type Block, type V4Parsed, parseV4Input, v4Info, formatIPv4, formatBlock, prefixToMask, usableHosts, toBits, toHex,
  reverseZones, splitEqual, vlsm, parseVlsmReqs, parseV4List, summarize, supernet, overlaps, parseRange, rangeToCidrs,
  contains, parseV6Input, v6Info, compressIPv6, expandIPv6, v6ReverseZones, v6SubnetCount, v6Size,
  V6_SPLIT_TARGETS, parseIPv4,
} from '@/utils/subnet'

type Tab = 'calc' | 'split' | 'list' | 'range' | 'lookup' | 'v6'
type SplitMode = 'equal' | 'vlsm'
const TABS: { id: Tab; key: string }[] = [
  { id: 'calc', key: 'tabCalculator' },
  { id: 'split', key: 'tabSplit' },
  { id: 'list', key: 'tabList' },
  { id: 'range', key: 'tabRange' },
  { id: 'lookup', key: 'tabLookup' },
  { id: 'v6', key: 'tabV6' },
]
const DEFAULT_IP = '192.168.1.10/24'
const DEFAULT_LIST = '10.1.0.0/24\n10.1.1.0/24\n10.1.2.0/24\n10.1.3.0/24\n10.1.2.128/25\n10.1.5.0/24'
const DEFAULT_RANGE = '10.0.0.5 - 10.0.0.20'
const DEFAULT_NETS = '10.0.0.0/8\n10.1.0.0/16\n172.16.0.0/12\n192.168.0.0/16'
const DEFAULT_IPS = '10.1.2.3\n10.200.0.1\n172.16.5.100\n8.8.8.8'
const DEFAULT_V6 = '2001:db8:abcd::/48'
const V4_EXAMPLES = ['10.0.0.0/8', '172.16.5.4 255.255.240.0', '10.10.0.0 0.0.255.255', '100.64.0.1/10', '192.168.1.1/31']
const V6_EXAMPLES = ['2001:db8:abcd::/48', 'fe80::1ff:fe23:4567:890a/64', 'fd12:3456:789a::/56', '::ffff:192.168.1.1']
const TABLE_ROWS = 256 // 화면 표시
const EXPORT_ROWS = 4096 // CSV·마크다운

const fmtN = (n: number | bigint) => n.toLocaleString('en-US')
const chip = (on: boolean) =>
  `rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const toCsv = (rows: (string | number)[][]) =>
  rows.map(r => r.map(c => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n')
const toMarkdown = ([head, ...body]: (string | number)[][]) =>
  [head, head.map(() => '---'), ...body].map(r => `| ${r.join(' | ')} |`).join('\n')

// ── 공용 UI 조각 (모듈 레벨: 렌더마다 재마운트되어 포커스를 잃지 않도록) ──
interface Ui { t: ReturnType<typeof useTranslations>; copy: (text: string, id: string) => void; copiedId: string | null; flash: (id: string) => void }
const UiCtx = createContext<Ui>(null as unknown as Ui)

function CopyBtn({ text, id, label, light }: { text: string; id: string; label: string; light?: boolean }) {
  const { t, copy, copiedId } = useContext(UiCtx)
  return (
    <button
      type="button"
      onClick={() => copy(text, id)}
      aria-label={`${t('copy')}: ${label}`}
      title={t('copy')}
      className={`p-1.5 rounded-lg shrink-0 transition-colors ${light ? 'text-white/70 hover:text-white hover:bg-white/15' : 'text-faint hover:text-primary hover:bg-soft'}`}
    >
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

function TextBtn({ onClick, id, icon, label }: { onClick: () => void; id: string; icon?: React.ReactNode; label: string }) {
  const { t, copiedId } = useContext(UiCtx)
  return (
    <button type="button" onClick={onClick} className="ui-btn-soft px-3 py-2 text-sm">
      {copiedId === id ? <Check className="w-4 h-4" /> : icon ?? <Copy className="w-4 h-4" />}
      {copiedId === id ? t('copied') : label}
    </button>
  )
}

function Row({ label, value, id, extra }: { label: string; value: string; id: string; extra?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-line last:border-0">
      <dt className="text-sm text-sub pt-1 shrink-0">{label}</dt>
      <dd className="flex items-start gap-1 min-w-0">
        <span className="text-sm font-mono font-medium text-fg text-right break-all whitespace-pre-line pt-1">
          {value}
          {extra && <span className="block text-xs text-muted font-sans">{extra}</span>}
        </span>
        <CopyBtn text={value.replace(/\n/g, ', ')} id={id} label={label} />
      </dd>
    </div>
  )
}

function ExportBar({ rows, name }: { rows: (string | number)[][]; name: string }) {
  const { t, copy, flash } = useContext(UiCtx)
  return (
    <div className="flex flex-wrap gap-2">
      <TextBtn onClick={() => { downloadText(`${name}.csv`, toCsv(rows), 'text/csv;charset=utf-8'); flash('csv') }} id="csv" icon={<Download className="w-4 h-4" />} label={t('downloadCsv')} />
      <TextBtn onClick={() => copy(toMarkdown(rows), 'md')} id="md" label={t('copyMarkdown')} />
    </div>
  )
}

/** 첫 행 = 헤더. danger와 같은 셀은 빨간 글씨 (VLSM '공간 부족') */
function DataTable({ rows, danger }: { rows: (string | number)[][]; danger?: string }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            {rows[0].map((h, i) => <th key={i} className="px-2 py-2 font-medium whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.slice(1).map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className={`px-2 py-2 whitespace-nowrap ${typeof c === 'number' ? 'text-right tabular-nums' : ''} ${danger && c === danger ? 'text-red-600 font-sans' : 'text-fg'}`}>
                  {typeof c === 'number' ? fmtN(c) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListCopy({ items, id, label }: { items: string[]; id: string; label: string }) {
  const { copy } = useContext(UiCtx)
  return (
    <div className="space-y-1">
      {items.map((s, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-subtle rounded-lg">
          <span className="font-mono text-sm text-fg break-all">{s}</span>
          <CopyBtn text={s} id={`${id}-${i}`} label={s} />
        </div>
      ))}
      <div className="pt-2"><TextBtn onClick={() => copy(items.join('\n'), id)} id={id} label={label} /></div>
    </div>
  )
}

export default function SubnetCalculator() {
  const t = useTranslations('subnetCalculator')
  const sp = useSearchParams()

  const [tab, setTab] = useState<Tab>(() => (TABS.some(x => x.id === sp.get('tab')) ? (sp.get('tab') as Tab) : 'calc'))
  const [input, setInput] = useState(() => sp.get('ip') ?? DEFAULT_IP)
  const [splitMode, setSplitMode] = useState<SplitMode>(() => (sp.get('mode') === 'vlsm' ? 'vlsm' : 'equal'))
  const [target, setTarget] = useState<number | null>(() => {
    const n = parseInt(sp.get('sp') ?? '', 10)
    return n >= 0 && n <= 32 ? n : null
  })
  const [reqText, setReqText] = useState(() => sp.get('req') ?? t('vlsmExample'))
  const [listText, setListText] = useState(() => sp.get('list') ?? DEFAULT_LIST)
  const [rangeText, setRangeText] = useState(() => sp.get('range') ?? DEFAULT_RANGE)
  const [netsText, setNetsText] = useState(() => sp.get('nets') ?? DEFAULT_NETS)
  const [ipsText, setIpsText] = useState(() => sp.get('ips') ?? DEFAULT_IPS)
  const [v6Text, setV6Text] = useState(() => sp.get('v6') ?? DEFAULT_V6)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // URL 동기화: 현재 탭에 필요한 값만
  useEffect(() => {
    const p = new URLSearchParams()
    if (tab !== 'calc') p.set('tab', tab)
    if (tab === 'calc' || tab === 'split') p.set('ip', input)
    if (tab === 'split') {
      p.set('mode', splitMode)
      if (splitMode === 'vlsm') p.set('req', reqText)
      else if (target !== null) p.set('sp', String(target))
    }
    if (tab === 'list') p.set('list', listText)
    if (tab === 'range') p.set('range', rangeText)
    if (tab === 'lookup') { p.set('nets', netsText); p.set('ips', ipsText) }
    if (tab === 'v6') p.set('v6', v6Text)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p}`)
  }, [tab, input, splitMode, target, reqText, listText, rangeText, netsText, ipsText, v6Text])

  const flash = useCallback((id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500)
  }, [])
  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 클립보드 거부: 표시만 */ }
    flash(id)
  }, [flash])

  // ── IPv4 메인 입력 (입력 중 잠깐 틀려도 마지막 정상 결과를 흐리게 유지) ──
  const parsed = useMemo(() => parseV4Input(input), [input])
  const [good, setGood] = useState<Extract<V4Parsed, { ok: true }>>(
    () => (parsed.ok ? parsed : (parseV4Input(DEFAULT_IP) as Extract<V4Parsed, { ok: true }>)),
  )
  if (parsed.ok && parsed !== good) setGood(parsed)
  const stale = !parsed.ok
  const info = useMemo(() => v4Info(good.ip, good.prefix), [good])
  const base: Block = { network: info.network, prefix: info.prefix }

  const setPrefix = useCallback((p: number) => setInput(`${formatIPv4(good.ip)}/${Math.max(0, Math.min(32, p))}`), [good.ip])

  const scopeText = (s: { scope: string; rfc: string | null; block: string | null }) =>
    [t(`scopes.${s.scope}`), s.rfc && `${s.rfc}${s.block ? `, ${s.block}` : ''}`].filter(Boolean).join(' · ')

  const errText = (code: string) => t(`errors.${code}`)

  const calcRows = useMemo(() => {
    const zones = reverseZones(info.network, info.prefix)
    const rows: [string, string, string?][] = [
      [t('inputIp'), formatIPv4(info.ip)],
      [t('networkAddress'), formatIPv4(info.network)],
      [t('broadcastAddress'), info.broadcast === null ? t('none') : formatIPv4(info.broadcast)],
      [t('firstHost'), formatIPv4(info.first)],
      [t('lastHost'), formatIPv4(info.last)],
      [t('usableHosts'), fmtN(info.usable)],
      [t('totalAddresses'), fmtN(info.total)],
      [t('subnetMask'), formatIPv4(info.mask)],
      [t('wildcardMask'), formatIPv4(info.wildcard)],
      [t('cidrNotation'), formatBlock(base)],
      [t('classType'), `${t('classLabel', { cls: info.cls })} · ${scopeText(info)}`],
      [t('hex'), `0x${toHex(info.ip)}`],
      [t('decimal'), String(info.ip)],
      [t('reverseZone'), zones.zones.join('\n'), zones.total > zones.zones.length ? t('moreZones', { count: fmtN(zones.total - zones.zones.length) }) : undefined],
    ]
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, t])

  const copyAllText = useMemo(
    () => calcRows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ', ')}`).join('\n'),
    [calcRows],
  )

  const copyLink = () => copy(window.location.href, 'link')

  // ── 분할 ──
  const splitTarget = target !== null && target > info.prefix ? target : Math.min(32, info.prefix + 2)
  const equal = useMemo(
    () => (info.prefix < 32 ? splitEqual(base, splitTarget, EXPORT_ROWS) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [info.network, info.prefix, splitTarget],
  )
  const vlsmParsed = useMemo(() => parseVlsmReqs(reqText), [reqText])
  const vlsmResult = useMemo(
    () => vlsm(base, vlsmParsed.reqs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [info.network, info.prefix, vlsmParsed],
  )

  const splitTable = useMemo((): (string | number)[][] => {
    if (splitMode === 'equal') {
      if (!equal) return []
      return [
        [t('col.index'), t('col.network'), t('col.range'), t('col.broadcast'), t('col.hosts')],
        ...equal.list.map((b, i) => {
          const x = v4Info(b.network, b.prefix)
          return [i + 1, formatBlock(b), `${formatIPv4(x.first)} - ${formatIPv4(x.last)}`, x.broadcast === null ? '-' : formatIPv4(x.broadcast), x.usable]
        }),
      ]
    }
    return [
      [t('col.name'), t('col.needed'), t('col.network'), t('col.range'), t('col.broadcast'), t('col.mask'), t('col.hosts'), t('col.waste')],
      ...vlsmResult.rows.map(r => {
        if (!r.ok) return [r.name || '-', r.hosts, t('noSpace'), '-', '-', '-', '-', '-']
        const x = v4Info(r.block.network, r.block.prefix)
        return [r.name || '-', r.hosts, formatBlock(r.block), `${formatIPv4(x.first)} - ${formatIPv4(x.last)}`,
          x.broadcast === null ? '-' : formatIPv4(x.broadcast), formatIPv4(x.mask), x.usable, x.usable - r.hosts]
      }),
    ]
  }, [splitMode, equal, vlsmResult, t])

  // ── 목록 요약·겹침 ──
  const listEntries = useMemo(() => parseV4List(listText), [listText])
  const listBlocks = useMemo(() => listEntries.flatMap(e => (e.block ? [e.block] : [])), [listEntries])
  const summary = useMemo(() => summarize(listBlocks), [listBlocks])
  const superBlock = useMemo(() => supernet(listBlocks), [listBlocks])
  const overlapList = useMemo(() => overlaps(listBlocks), [listBlocks])

  // ── 범위 → CIDR ──
  const range = useMemo(() => parseRange(rangeText), [rangeText])
  const rangeCidrs = useMemo(() => (range.ok ? rangeToCidrs(range.start, range.end) : []), [range])

  // ── IP 소속 (최장 일치 우선) ──
  const netEntries = useMemo(() => parseV4List(netsText), [netsText])
  const lookup = useMemo(() => {
    const nets = netEntries.flatMap(e => (e.block ? [e.block] : []))
    return ipsText.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean).map(s => {
      const n = parseIPv4(s)
      const matches = n === null ? [] : nets.filter(b => contains(b, n)).sort((a, b) => b.prefix - a.prefix)
      return { ip: s, valid: n !== null, matches }
    })
  }, [netEntries, ipsText])

  // ── IPv6 ──
  const v6Parsed = useMemo(() => parseV6Input(v6Text), [v6Text])
  const v6 = useMemo(() => (v6Parsed.ok ? v6Info(v6Parsed.ip, v6Parsed.prefix) : null), [v6Parsed])

  const V4Input = (
    <div className="ui-card p-5 space-y-3">
      <label htmlFor="subnet-input" className="block text-sm font-medium text-body">{t('inputLabel')}</label>
      <input
        id="subnet-input"
        type="text"
        inputMode="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            setPrefix(good.prefix + (e.key === 'ArrowUp' ? 1 : -1))
          }
        }}
        placeholder={t('inputPlaceholder')}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-invalid={stale}
        aria-describedby="subnet-input-hint"
        className={`ui-field px-4 py-3 font-mono text-lg ${stale ? 'border-red-400' : ''}`}
      />
      <p id="subnet-input-hint" className={`text-xs ${stale ? 'text-red-600' : 'text-muted'}`} aria-live="polite">
        {!parsed.ok
          ? errText(parsed.error)
          : parsed.via === 'mask' || parsed.via === 'wildcard' || parsed.via === 'host'
            ? t(`via.${parsed.via}`, { prefix: parsed.prefix })
            : parsed.ip !== info.network
              ? t('hostBitsSet', { network: formatBlock(base) })
              : t('inputHint')}
      </p>
      <div className="flex items-center gap-3">
        <input
          type="range" min={0} max={32} value={good.prefix}
          onChange={e => setPrefix(Number(e.target.value))}
          aria-label={t('prefixTitle')}
          className="flex-1 accent-primary"
        />
        <span className="w-10 text-right text-sm font-mono text-primary font-semibold">/{good.prefix}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {V4_EXAMPLES.map(ex => (
          <button key={ex} type="button" onClick={() => setInput(ex)} className="px-2.5 py-1 rounded-lg bg-soft text-sub hover:bg-subtle text-xs font-mono">
            {ex}
          </button>
        ))}
      </div>
    </div>
  )

  // 프리픽스 참고표: 선택 행을 표 안에서만 스크롤 (페이지는 움직이지 않음)
  const tableRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = tableRef.current
    const row = box?.querySelector<HTMLElement>('[data-on="1"]')
    if (box && row) box.scrollTop = row.offsetTop - box.clientHeight / 2
  }, [good.prefix, tab])

  const PrefixCard = (
    <div className="ui-card p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-fg">{t('prefixTitle')}</h2>
        <span className="text-sm font-mono text-primary font-semibold">/{good.prefix}</span>
      </div>
      <div ref={tableRef} className="relative max-h-72 overflow-y-auto rounded-xl border border-line">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-subtle">
            <tr>
              <th className="px-3 py-2 text-left text-muted font-medium">CIDR</th>
              <th className="px-3 py-2 text-left text-muted font-medium">{t('mask')}</th>
              <th className="px-3 py-2 text-right text-muted font-medium">{t('hosts')}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 33 }, (_, p) => (
              <tr
                key={p}
                data-on={p === good.prefix ? '1' : undefined}
                onClick={() => setPrefix(p)}
                className={`cursor-pointer border-t border-line ${p === good.prefix ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-subtle'}`}
              >
                <td className="px-3 py-1.5 font-mono">
                  <button type="button" onClick={() => setPrefix(p)} className="font-mono">/{p}</button>
                </td>
                <td className="px-3 py-1.5 font-mono text-sub">{formatIPv4(prefixToMask(p))}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtN(usableHosts(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const binaryRows: [string, number][] = [
    [t('inputIp'), info.ip],
    [t('subnetMask'), info.mask],
    [t('networkAddress'), info.network],
    ...(info.broadcast === null ? [] : [[t('broadcastAddress'), info.broadcast] as [string, number]]),
  ]

  const textareaCls = 'ui-field px-4 py-3 font-mono text-sm resize-y'

  const ui = useMemo<Ui>(() => ({ t, copy, copiedId, flash }), [t, copy, copiedId, flash])

  return (
    <UiCtx.Provider value={ui}>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div role="tablist" aria-label={t('title')} className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(x => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`${chip(tab === x.id)} px-4 py-2 whitespace-nowrap`}
          >
            {t(x.key)}
          </button>
        ))}
      </div>

      {/* ═══ 계산 ═══ */}
      {tab === 'calc' && (
        <div className="grid lg:grid-cols-3 lg:grid-rows-[auto_1fr] gap-6 items-start">
          {V4Input}

          <div className={`lg:col-span-2 lg:row-span-2 space-y-6 transition-opacity ${stale ? 'opacity-50' : ''}`}>
            <div className="ui-hero p-6">
              <p className="text-sm text-white/70">{t('heroLabel')}</p>
              <div className="flex items-start justify-between gap-3 mt-1">
                <p className="text-3xl sm:text-4xl font-bold font-mono tracking-tight break-all" aria-live="polite">{formatBlock(base)}</p>
                <CopyBtn text={formatBlock(base)} id="hero" label={t('heroLabel')} light />
              </div>
              <p className="text-base font-semibold mt-3 tabular-nums">{t('heroHosts', { hosts: fmtN(info.usable) })}</p>
              <p className="text-sm text-white/80 mt-1 font-mono break-all">
                {formatIPv4(info.first)} – {formatIPv4(info.last)}
              </p>
              <p className="text-sm text-white/70 mt-1">{t('classLabel', { cls: info.cls })} · {scopeText(info)}</p>
              <div className="flex flex-wrap gap-2 mt-5">
                <button type="button" onClick={() => copy(copyAllText, 'all')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-primary text-sm font-semibold">
                  {copiedId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === 'all' ? t('copied') : t('copyAll')}
                </button>
                <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold">
                  {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {copiedId === 'link' ? t('copied') : t('copyLink')}
                </button>
              </div>
            </div>

            {(info.prefix === 31 || info.prefix === 32) && (
              <p className="bg-subtle rounded-2xl p-4 text-sm text-sub">{t(info.prefix === 31 ? 'note31' : 'note32')}</p>
            )}

            <div className="ui-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-2">{t('details')}</h2>
              <dl>
                {calcRows.map(([label, value, extra], i) => <Row key={i} label={label} value={value} extra={extra} id={`r${i}`} />)}
              </dl>
            </div>

            <div className="ui-card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-fg">{t('binaryRepresentation')}</h2>
                <p className="text-xs text-muted">{t('binaryLegend', { net: info.prefix, host: 32 - info.prefix })}</p>
              </div>
              <div className="space-y-2 overflow-x-auto">
                {binaryRows.map(([label, n]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4">
                    <span className="text-xs text-muted sm:w-28 shrink-0">{label}</span>
                    <span className="font-mono text-sm tracking-wide whitespace-nowrap">
                      {toBits(n).split('').map((bit, i) => (
                        <span key={i}>
                          {i > 0 && i % 8 === 0 && <span className="text-faint">.</span>}
                          <span className={i < info.prefix ? 'text-primary font-semibold' : 'text-sub'}>{bit}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {PrefixCard}
        </div>
      )}

      {/* ═══ 분할 ═══ */}
      {tab === 'split' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {V4Input}
            <div className="ui-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-xl">
                {(['equal', 'vlsm'] as SplitMode[]).map(m => (
                  <button key={m} type="button" onClick={() => setSplitMode(m)} aria-pressed={splitMode === m} className={`${chip(splitMode === m)} py-2`}>
                    {t(`splitMode.${m}`)}
                  </button>
                ))}
              </div>
              {splitMode === 'equal' ? (
                info.prefix >= 32 ? <p className="text-sm text-muted">{t('splitNone')}</p> : (
                  <div className="space-y-2">
                    <h2 className="text-sm font-medium text-body">{t('splitTargetTitle')}</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: Math.min(12, 32 - info.prefix) }, (_, i) => info.prefix + 1 + i).map(p => (
                        <button key={p} type="button" onClick={() => setTarget(p)} aria-pressed={splitTarget === p} className={`${chip(splitTarget === p)} px-3 py-2 text-left`}>
                          <span className="block font-mono font-semibold">/{p}</span>
                          <span className={`block text-xs ${splitTarget === p ? 'text-white/80' : 'text-muted'}`}>
                            {t('splitChip', { count: fmtN(2 ** (p - info.prefix)), hosts: fmtN(usableHosts(p)) })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <label htmlFor="vlsm-req" className="block text-sm font-medium text-body">{t('vlsmReqTitle')}</label>
                  <textarea id="vlsm-req" value={reqText} onChange={e => setReqText(e.target.value)} rows={7} spellCheck={false} className={textareaCls} />
                  <p className="text-xs text-muted">{t('vlsmReqHint')}</p>
                  {vlsmParsed.bad.length > 0 && <p className="text-xs text-red-600">{t('vlsmBad', { lines: vlsmParsed.bad.join(', ') })}</p>}
                </div>
              )}
            </div>
          </div>

          <div className={`lg:col-span-2 space-y-6 ${stale ? 'opacity-50' : ''}`}>
            {splitMode === 'equal' && equal && (
              <div className="ui-hero p-6">
                <p className="text-sm text-white/70">{formatBlock(base)} → /{splitTarget}</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{t('splitCount', { count: fmtN(equal.total) })}</p>
                <p className="text-sm text-white/80 mt-2">{t('splitSummary', { hosts: fmtN(usableHosts(splitTarget)), mask: formatIPv4(prefixToMask(splitTarget)) })}</p>
              </div>
            )}
            {splitMode === 'vlsm' && (
              <div className="ui-hero p-6">
                <p className="text-sm text-white/70">{formatBlock(base)} · VLSM</p>
                <p className="text-3xl font-bold tabular-nums mt-1">
                  {t('vlsmUsage', { pct: ((vlsmResult.used / info.total) * 100).toFixed(1) })}
                </p>
                <p className="text-sm text-white/80 mt-2">
                  {t('vlsmAllocated', { used: fmtN(vlsmResult.used), total: fmtN(info.total), ok: vlsmResult.rows.filter(r => r.ok).length, all: vlsmResult.rows.length })}
                </p>
              </div>
            )}

            {splitTable.length > 1 && (
              <div className="ui-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-fg">{t('splitResult')}</h2>
                  <ExportBar rows={splitTable} name={`subnets-${formatBlock(base).replace('/', '_')}`} />
                </div>
                <DataTable rows={splitTable.slice(0, TABLE_ROWS + 1)} danger={t('noSpace')} />
                {splitMode === 'equal' && equal && equal.total > TABLE_ROWS && (
                  <p className="text-xs text-muted">{t('showingFirst', { shown: fmtN(TABLE_ROWS), total: fmtN(equal.total), max: fmtN(EXPORT_ROWS) })}</p>
                )}
              </div>
            )}

            {splitMode === 'vlsm' && vlsmResult.free.length > 0 && (
              <div className="ui-card p-6 space-y-3">
                <h2 className="text-lg font-semibold text-fg">{t('vlsmFree')}</h2>
                <ListCopy items={vlsmResult.free.map(formatBlock)} id="free" label={t('copyList')} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 목록 요약 · 겹침 ═══ */}
      {tab === 'list' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="ui-card p-5 space-y-3 h-fit">
            <label htmlFor="cidr-list" className="block text-sm font-medium text-body">{t('overlapTitle')}</label>
            <textarea id="cidr-list" value={listText} onChange={e => setListText(e.target.value)} rows={10} spellCheck={false} className={textareaCls} />
            <p className="text-xs text-muted">{t('listHint')}</p>
            {listEntries.some(e => e.error) && (
              <div className="text-xs text-red-600 space-y-0.5">
                {listEntries.filter(e => e.error).map((e, i) => <p key={i}><span className="font-mono">{e.text}</span> — {errText(e.error!)}</p>)}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {listBlocks.length > 0 ? (
              <>
                <div className="ui-hero p-6">
                  <p className="text-sm text-white/70">{t('supernetTitle')}</p>
                  <div className="flex items-start justify-between gap-3 mt-1">
                    <p className="text-3xl font-bold font-mono break-all">{superBlock && formatBlock(superBlock.block)}</p>
                    {superBlock && <CopyBtn text={formatBlock(superBlock.block)} id="super" label={t('supernetTitle')} light />}
                  </div>
                  <p className="text-sm text-white/80 mt-2">
                    {superBlock && superBlock.extra > 0 ? t('supernetExtra', { extra: fmtN(superBlock.extra) }) : t('supernetExact')}
                  </p>
                </div>

                <div className="ui-card p-6 space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-fg">{t('summaryTitle')}</h2>
                    <p className="text-xs text-muted mt-1">{t('summaryDesc', { from: listBlocks.length, to: summary.length })}</p>
                  </div>
                  <ListCopy items={summary.map(formatBlock)} id="sum" label={t('copyList')} />
                </div>

                <div className="ui-card p-6 space-y-3">
                  <h2 className="text-lg font-semibold text-fg">{t('overlapResult')}</h2>
                  {overlapList.length === 0 ? (
                    <p className="text-sm text-sub">{listBlocks.length < 2 ? t('overlapPrompt') : t('noOverlap')}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-red-600">{t('overlapFound', { count: overlapList.length })}</p>
                      <ul className="space-y-1">
                        {overlapList.map((o, i) => {
                          const A = formatBlock(listBlocks[o.a]), B = formatBlock(listBlocks[o.b])
                          return (
                            <li key={i} className="px-3 py-2 bg-subtle rounded-lg text-sm">
                              <span className="font-mono text-fg">{A}</span>
                              <span className="text-muted"> ↔ </span>
                              <span className="font-mono text-fg">{B}</span>
                              <span className="text-xs text-muted ml-2">
                                {o.relation === 'same' ? t('relSame')
                                  : t('relContains', o.relation === 'aContainsB' ? { a: A, b: B } : { a: B, b: A })}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="ui-card p-10 text-center text-faint text-sm">{t('overlapPrompt')}</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 범위 → CIDR ═══ */}
      {tab === 'range' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="ui-card p-5 space-y-3 h-fit">
            <label htmlFor="ip-range" className="block text-sm font-medium text-body">{t('rangeLabel')}</label>
            <input
              id="ip-range" type="text" value={rangeText} onChange={e => setRangeText(e.target.value)}
              placeholder={DEFAULT_RANGE} spellCheck={false} autoComplete="off" aria-invalid={!range.ok} aria-describedby="ip-range-hint"
              className={`ui-field px-4 py-3 font-mono ${!range.ok ? 'border-red-400' : ''}`}
            />
            <p id="ip-range-hint" className={`text-xs ${range.ok ? 'text-muted' : 'text-red-600'}`}>
              {range.ok ? t('rangeHint') : errText(range.error)}
            </p>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {range.ok && (
              <>
                <div className="ui-hero p-6">
                  <p className="text-sm text-white/70 font-mono">{formatIPv4(range.start)} – {formatIPv4(range.end)}</p>
                  <p className="text-3xl font-bold tabular-nums mt-1">{t('rangeCount', { count: rangeCidrs.length })}</p>
                  <p className="text-sm text-white/80 mt-2">{t('rangeTotal', { total: fmtN(range.end - range.start + 1) })}</p>
                </div>
                <div className="ui-card p-6">
                  <ListCopy items={rangeCidrs.map(formatBlock)} id="rng" label={t('copyList')} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ IP 소속 ═══ */}
      {tab === 'lookup' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="ui-card p-5 space-y-3">
              <label htmlFor="lookup-nets" className="block text-sm font-medium text-body">{t('lookupCidrTitle')}</label>
              <textarea id="lookup-nets" value={netsText} onChange={e => setNetsText(e.target.value)} rows={6} spellCheck={false} className={textareaCls} />
              {netEntries.some(e => e.error) && (
                <p className="text-xs text-red-600">{netEntries.filter(e => e.error).map(e => e.text).join(', ')} — {t('errors.format')}</p>
              )}
            </div>
            <div className="ui-card p-5 space-y-3">
              <label htmlFor="lookup-ips" className="block text-sm font-medium text-body">{t('lookupIpTitle')}</label>
              <textarea id="lookup-ips" value={ipsText} onChange={e => setIpsText(e.target.value)} rows={6} spellCheck={false} className={textareaCls} />
              <p className="text-xs text-muted">{t('lookupIpDesc')}</p>
            </div>
          </div>
          <div className="lg:col-span-2 ui-card p-6 space-y-4 h-fit">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg">{t('lookupResult')}</h2>
              {lookup.length > 0 && (
                <TextBtn
                  onClick={() => copy(lookup.map(r => `${r.ip}\t${r.matches.map(formatBlock).join(', ') || '-'}`).join('\n'), 'lookup')}
                  id="lookup" label={t('copy')}
                />
              )}
            </div>
            {lookup.length > 0 ? (
              <ul className="space-y-1">
                {lookup.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-subtle rounded-lg text-sm">
                    <span className={`font-mono ${r.valid ? 'text-fg' : 'text-red-600'}`}>{r.ip}</span>
                    <span className="flex flex-wrap gap-1 justify-end">
                      {!r.valid ? <span className="text-xs text-red-600">{t('invalidIp')}</span>
                        : r.matches.length === 0 ? <span className="text-xs text-muted">{t('noMatch')}</span>
                          : r.matches.map((m, j) => (
                            <span key={j} className={`text-xs px-2 py-0.5 rounded-full font-mono ${j === 0 ? 'bg-primary text-white' : 'bg-soft text-sub'}`} title={j === 0 ? t('longestMatch') : undefined}>
                              {formatBlock(m)}
                            </span>
                          ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint text-center py-8">{t('lookupPrompt')}</p>
            )}
            <p className="text-xs text-muted">{t('longestMatchHint')}</p>
          </div>
        </div>
      )}

      {/* ═══ IPv6 ═══ */}
      {tab === 'v6' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="ui-card p-5 space-y-3 h-fit">
            <label htmlFor="v6-input" className="block text-sm font-medium text-body">{t('v6Label')}</label>
            <input
              id="v6-input" type="text" value={v6Text} onChange={e => setV6Text(e.target.value)}
              placeholder={DEFAULT_V6} spellCheck={false} autoComplete="off" autoCapitalize="off" aria-invalid={!v6Parsed.ok} aria-describedby="v6-hint"
              className={`ui-field px-4 py-3 font-mono ${!v6Parsed.ok ? 'border-red-400' : ''}`}
            />
            <p id="v6-hint" className={`text-xs ${v6Parsed.ok ? 'text-muted' : 'text-red-600'}`}>
              {v6Parsed.ok ? t('v6Hint') : errText(v6Parsed.error === 'empty' ? 'empty' : v6Parsed.error === 'prefix' ? 'v6prefix' : 'v6ip')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {V6_EXAMPLES.map(ex => (
                <button key={ex} type="button" onClick={() => setV6Text(ex)} className="px-2.5 py-1 rounded-lg bg-soft text-sub hover:bg-subtle text-xs font-mono break-all text-left">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {v6 && (
            <div className="lg:col-span-2 space-y-6">
              <div className="ui-hero p-6">
                <p className="text-sm text-white/70">{t('heroLabel')}</p>
                <div className="flex items-start justify-between gap-3 mt-1">
                  <p className="text-2xl sm:text-3xl font-bold font-mono break-all">{compressIPv6(v6.network)}/{v6.prefix}</p>
                  <CopyBtn text={`${compressIPv6(v6.network)}/${v6.prefix}`} id="v6hero" label={t('heroLabel')} light />
                </div>
                <p className="text-base font-semibold mt-3">{t('v6Addresses', { exp: 128 - v6.prefix })}</p>
                <p className="text-sm text-white/70 mt-1">{scopeText(v6)}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-primary text-sm font-semibold">
                    {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    {copiedId === 'link' ? t('copied') : t('copyLink')}
                  </button>
                </div>
              </div>

              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-2">{t('details')}</h2>
                <dl>
                  {(() => {
                    const z = v6ReverseZones(v6.network, v6.prefix)
                    const rows: [string, string, string?][] = [
                      [t('compressed'), compressIPv6(v6.ip)],
                      [t('expanded'), expandIPv6(v6.ip)],
                      [t('networkAddress'), `${compressIPv6(v6.network)}/${v6.prefix}`],
                      [t('firstAddress'), compressIPv6(v6.network)],
                      [t('lastAddress'), compressIPv6(v6.last)],
                      [t('totalAddresses'), fmtN(v6.total), `2^${128 - v6.prefix}`],
                      [t('type'), scopeText(v6)],
                      [t('reverseZone'), z.zones.join('\n'), z.total > z.zones.length ? t('moreZones', { count: fmtN(z.total - z.zones.length) }) : undefined],
                    ]
                    return rows.map(([label, value, extra], i) => <Row key={i} label={label} value={value} extra={extra} id={`v${i}`} />)
                  })()}
                </dl>
              </div>

              {V6_SPLIT_TARGETS.some(x => x > v6.prefix) && (
                <div className="ui-card p-6 space-y-3">
                  <h2 className="text-lg font-semibold text-fg">{t('v6SplitTitle')}</h2>
                  <DataTable rows={[
                    [t('col.size'), t('col.count'), t('col.first'), t('col.second')],
                    ...V6_SPLIT_TARGETS.filter(x => x > v6.prefix).map(x => [
                      `/${x}`,
                      fmtN(v6SubnetCount(v6.prefix, x)),
                      `${compressIPv6(v6.network)}/${x}`,
                      `${compressIPv6(v6.network + v6Size(x))}/${x}`,
                    ]),
                  ]} />
                  <p className="text-xs text-muted">{t('v6SplitHint')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-body">
          {(['basics', 'cidr', 'special', 'vlsm', 'classes'] as const).map(k => (
            <section key={k}>
              <h3 className="font-semibold text-fg mb-2">{t(`guide.${k}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {((t.raw(`guide.${k}.items`) as string[] | undefined) ?? []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-2">
            {((t.raw('guide.faq.items') as { q: string; a: string }[] | undefined) ?? []).map((f, i) => (
              <details key={i} className="bg-subtle rounded-xl px-4 py-3">
                <summary className="cursor-pointer font-medium text-fg text-sm">{f.q}</summary>
                <p className="text-sm text-sub mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <p className="bg-subtle rounded-2xl p-5 text-xs text-sub">{t('note')}</p>
    </div>
    </UiCtx.Provider>
  )
}

