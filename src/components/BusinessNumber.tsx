'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/businessNumber'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, ShieldCheck, ShieldX, Trash2, Download, ExternalLink, Search, Loader2 } from 'lucide-react'
import {
  validate, formatBizNo, digitsOf, checkSteps, partsOf, entityOf, parseBulk, toCsv, statusKind, ymdDots,
  WEIGHTS, type NtsStatus, type Reason, type StatusKind,
} from '@/utils/businessNumber'

interface HistoryItem { number: string; isValid: boolean; timestamp: string }

const HISTORY_KEY = 'businessNumberHistory'
const HOMETAX_URL = 'https://hometax.go.kr/'
const SAMPLE = '124-81-00998'

type StatusError = 'not_configured' | 'error'

/** /api/business-status 호출. 실패 시 Error(message = StatusError) */
async function fetchStatus(nums: string[]): Promise<NtsStatus[]> {
  let res: Response
  try {
    res = await fetch('/api/business-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b_no: nums }),
    })
  } catch {
    throw new Error('error')
  }
  const body = (await res.json().catch(() => null)) as { data?: NtsStatus[]; error?: string } | null
  if (res.status === 503 && body?.error === 'not_configured') throw new Error('not_configured')
  if (!res.ok || !body?.data) throw new Error('error')
  return body.data
}

const statusTone: Record<StatusKind, string> = {
  active: 'bg-primary-soft text-primary',
  suspended: 'bg-amber-50 text-amber-800',
  closed: 'bg-red-50 text-red-700',
  unregistered: 'bg-red-50 text-red-700',
}

export default function BusinessNumber() {
  const t = useTranslations('businessNumber')
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [input, setInput] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [status, setStatus] = useState<{ loading?: boolean; data?: NtsStatus; error?: StatusError }>({})
  const [bulkStatus, setBulkStatus] = useState<{ loading?: boolean; map?: Record<string, NtsStatus>; error?: StatusError; truncated?: boolean }>({})

  const v = useMemo(() => validate(input), [input])
  const bulkRows = useMemo(() => parseBulk(bulkText), [bulkText])
  const bulkValid = bulkRows.filter(r => r.valid).length

  // localStorage 이력
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* noop */ }
  }, [])

  // ?n= 복원 (공유 링크·뒤로가기)
  const nParam = searchParams.get('n')
  useEffect(() => {
    if (nParam && digitsOf(nParam) !== digitsOf(input)) setInput(formatBizNo(nParam))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nParam])

  // 사용자 입력: URL ?n= 은 10자리 완성일 때만 (effect에서 쓰면 복원 전에 지워짐)
  const edit = (raw: string) => {
    const f = formatBizNo(raw)
    setInput(f)
    const d = digitsOf(f)
    const url = new URL(window.location.href)
    if (d.length === 10) url.searchParams.set('n', d)
    else url.searchParams.delete('n')
    if (url.href !== window.location.href) window.history.replaceState({}, '', url)
  }

  // 10자리 완성 시 이력 저장
  useEffect(() => {
    setStatus({})
    if (v.digits.length !== 10) return
    setHistory(prev => {
      const next = [{ number: v.formatted, isValid: v.valid, timestamp: new Date().toISOString() }, ...prev.filter(h => h.number !== v.formatted)].slice(0, 10)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })
  }, [v.digits, v.formatted, v.valid])

  useEffect(() => { setBulkStatus({}) }, [bulkText])

  const clearHistory = () => {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
  }

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
    } catch { /* noop */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const lookupSingle = async () => {
    setStatus({ loading: true })
    try {
      const [data] = await fetchStatus([v.digits])
      setStatus(data ? { data } : { error: 'error' })
    } catch (e) {
      setStatus({ error: (e as Error).message as StatusError })
    }
  }

  const lookupBulk = async () => {
    const nums = [...new Set(bulkRows.filter(r => r.valid).map(r => r.digits))]
    setBulkStatus({ loading: true })
    try {
      const data = await fetchStatus(nums.slice(0, 100))
      setBulkStatus({ map: Object.fromEntries(data.map(d => [d.b_no, d])), truncated: nums.length > 100 })
    } catch (e) {
      setBulkStatus({ error: (e as Error).message as StatusError })
    }
  }

  const reasonText = (r: Reason) =>
    r === 'ok' ? t('valid') : r === 'checksum' ? t('bulk.reasonChecksum') : r === 'long' ? t('bulk.reasonLong') : t('bulk.reasonShort')
  const statusText = (s: NtsStatus) => {
    const k = statusKind(s)
    return k === 'closed' && s.end_dt ? `${t(`status.${k}`)} (${ymdDots(s.end_dt)})` : t(`status.${k}`)
  }

  const exportCsv = () => {
    const map = bulkStatus.map ?? {}
    const csv = toCsv([
      [t('bulk.colInput'), t('bulk.colFormatted'), t('bulk.colResult'), t('bulk.colType'), t('bulk.colStatus')],
      ...bulkRows.map(r => [
        r.input,
        r.formatted,
        reasonText(r.reason),
        r.valid ? t(`category.${partsOf(r.digits).category}`) : '',
        map[r.digits] ? statusText(map[r.digits]) : '',
      ]),
    ])
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'business-numbers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const CopyBtn = ({ text, id, label }: { text: string; id: string; label: string }) => (
    <button onClick={() => copyToClipboard(text, id)} className="ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1">
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copiedId === id ? t('copied') : label}
    </button>
  )

  const HometaxLink = () => (
    <a href={HOMETAX_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
      {t('status.hometax')} <ExternalLink className="w-4 h-4" />
    </a>
  )

  const StatusFallback = ({ error }: { error: StatusError }) => (
    <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-2">
      <p>{error === 'not_configured' ? t('status.notConfigured') : t('status.error')}</p>
      <p className="text-muted">{t('status.hometaxPath')}</p>
      <HometaxLink />
    </div>
  )

  const parts = v.digits.length === 10 ? partsOf(v.digits) : null
  const steps = v.digits.length >= 9 ? checkSteps(v.digits.slice(0, 9)) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="inline-flex bg-soft rounded-xl p-1" role="tablist">
        {(['single', 'bulk'] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === m ? 'bg-primary text-white' : 'text-body hover:bg-subtle'}`}
          >
            {m === 'single' ? t('modeSingle') : t('modeBulk')}
          </button>
        ))}
      </div>

      {mode === 'single' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 입력 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="ui-card p-6 space-y-4">
              <div>
                <label htmlFor="bizno" className="block text-sm font-medium text-body mb-2">{t('inputLabel')}</label>
                <input
                  id="bizno"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={input}
                  onChange={e => edit(e.target.value)}
                  onPaste={e => { e.preventDefault(); edit(e.clipboardData.getData('text')) }}
                  placeholder={t('inputPlaceholder')}
                  className="ui-field w-full px-4 py-3 font-mono text-lg tabular-nums"
                />
                <p className="text-xs text-muted mt-1">{t('digitCount')}: {v.digits.length}/10</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(SAMPLE)} className="ui-btn-soft flex-1 px-4 py-2 text-sm">{t('sample')}</button>
                <button onClick={() => edit('')} className="ui-btn-soft px-4 py-2 text-sm">{t('reset')}</button>
              </div>
              <p className="text-xs text-muted">{t('privacyNote')}</p>
            </div>

            {history.length > 0 && (
              <div className="ui-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-fg">{t('recentVerifications')}</h2>
                  <button onClick={clearHistory} className="text-sm text-muted hover:text-body flex items-center gap-1">
                    <Trash2 className="w-4 h-4" /> {t('clearHistory')}
                  </button>
                </div>
                <ul className="space-y-1">
                  {history.map(item => (
                    <li key={item.number}>
                      <button onClick={() => edit(item.number)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-soft">
                        <span className="font-mono text-sm text-fg tabular-nums">{item.number}</span>
                        <span className={`text-xs font-medium ${item.isValid ? 'text-primary' : 'text-red-600'}`}>
                          {item.isValid ? t('bulk.ok') : t('bulk.ng')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 결과 */}
          <div className="lg:col-span-2 space-y-6">
            {v.digits.length === 10 && parts ? (
              <>
                <div className={`ui-card p-6 ${v.valid ? 'border-primary' : 'border-red-300'}`}>
                  <div className="flex items-start gap-3">
                    {v.valid ? <ShieldCheck className="w-8 h-8 text-primary shrink-0" /> : <ShieldX className="w-8 h-8 text-red-600 shrink-0" />}
                    <div className="min-w-0">
                      <div className={`text-xl font-bold ${v.valid ? 'text-primary' : 'text-red-600'}`}>
                        {v.valid ? t('valid') : t('invalid')}
                      </div>
                      <p className="text-sm text-sub mt-1">
                        {v.valid ? t('validMessage') : t('expectedCheck', { expected: v.expected ?? '', actual: v.digits[9] })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 text-3xl font-bold text-fg font-mono tabular-nums break-all">{v.formatted}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CopyBtn text={v.formatted} id="formatted" label={t('copy')} />
                    <CopyBtn text={v.digits} id="digits" label={t('copyDigits')} />
                    {typeof window !== 'undefined' && (
                      <CopyBtn text={window.location.href} id="link" label={t('copyLink')} />
                    )}
                  </div>
                </div>

                {/* 구조 해석 */}
                <div className="ui-card p-6">
                  <h2 className="text-lg font-semibold text-fg mb-4">{t('parts.title')}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      ['office', parts.office],
                      ['mid', parts.mid],
                      ['serial', parts.serial],
                      ['check', parts.check],
                    ] as const).map(([k, val]) => (
                      <div key={k} className="bg-subtle rounded-xl p-4">
                        <div className="text-xs text-sub">{t(`parts.${k}`)}</div>
                        <div className="text-2xl font-bold text-fg font-mono tabular-nums mt-1">{val}</div>
                      </div>
                    ))}
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-sub">{t('parts.mid')} {parts.mid}</dt>
                      <dd className="text-fg font-semibold mt-0.5">
                        {t(`entity.${entityOf(parts.category)}`)} · {t(`category.${parts.category}`)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sub">{t('parts.office')} {parts.office}</dt>
                      <dd className="text-body mt-0.5">{t('parts.officeNote')}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted mt-4">{t('categoryNote')}</p>
                </div>

                {/* 상태조회 */}
                <div className="ui-card p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-fg">{t('status.title')}</h2>
                    <button onClick={lookupSingle} disabled={!v.valid || status.loading} className="ui-btn px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {status.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {status.loading ? t('status.loading') : t('status.button')}
                    </button>
                  </div>
                  {!v.valid && <p className="text-sm text-muted">{t('status.invalidFirst')}</p>}
                  {status.data && (
                    <div className="space-y-2">
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-base font-bold ${statusTone[statusKind(status.data)]}`}>
                        {t(`status.${statusKind(status.data)}`)}
                      </span>
                      {status.data.end_dt && <p className="text-sm text-body">{t('status.closedOn', { date: ymdDots(status.data.end_dt) })}</p>}
                      {status.data.tax_type && statusKind(status.data) !== 'unregistered' && (
                        <p className="text-sm text-body">{t('status.taxType')}: {status.data.tax_type}</p>
                      )}
                      <p className="text-xs text-muted">{t('status.source')}</p>
                    </div>
                  )}
                  {status.error && <StatusFallback error={status.error} />}
                  {!status.data && !status.error && v.valid && (
                    <p className="text-sm text-muted">{t('status.hint')} <HometaxLink /></p>
                  )}
                </div>
              </>
            ) : (
              <div className="ui-card p-6">
                <div className="text-center py-10">
                  <div className="text-3xl font-bold font-mono text-faint tabular-nums">{v.formatted || '000-00-00000'}</div>
                  <p className="text-muted mt-3">{v.reason === 'empty' ? t('emptyHint') : t('typing', { n: v.digits.length })}</p>
                </div>
              </div>
            )}

            {/* 검증번호 계산 과정 */}
            {steps && (
              <div className="ui-card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t('calc.title')}</h2>
                <div className="overflow-x-auto">
                  <table className="text-sm tabular-nums font-mono text-center">
                    <tbody>
                      <tr className="text-sub">
                        <th className="pr-3 text-left font-normal font-sans">{t('calc.digit')}</th>
                        {v.digits.slice(0, 9).split('').map((d, i) => <td key={i} className="px-2 py-1">{d}</td>)}
                      </tr>
                      <tr className="text-sub">
                        <th className="pr-3 text-left font-normal font-sans">{t('calc.weight')}</th>
                        {WEIGHTS.map((w, i) => <td key={i} className="px-2 py-1">×{w}</td>)}
                      </tr>
                      <tr className="text-fg font-semibold">
                        <th className="pr-3 text-left font-normal font-sans text-sub">{t('calc.product')}</th>
                        {steps.products.map((p, i) => <td key={i} className="px-2 py-1">{p}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ul className="mt-4 space-y-1 text-sm text-body tabular-nums">
                  <li>{t('calc.bonus', { d: v.digits[8], bonus: steps.bonus })}</li>
                  <li>{t('calc.sum', { sum: steps.sum })}</li>
                  <li className="font-semibold text-fg">{t('calc.formula', { last: steps.sum % 10, expected: steps.expected })}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="ui-card p-6 space-y-4">
              <label htmlFor="bizno-bulk" className="block text-sm font-medium text-body">{t('bulk.label')}</label>
              <textarea
                id="bizno-bulk"
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={t('bulk.placeholder')}
                rows={12}
                className="ui-field w-full px-4 py-3 font-mono text-sm"
              />
              <button onClick={() => setBulkText('')} className="ui-btn-soft w-full px-4 py-2 text-sm">{t('bulk.clear')}</button>
              <p className="text-xs text-muted">{t('privacyNote')}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="ui-card p-6 space-y-4">
              {bulkRows.length === 0 ? (
                <p className="text-center text-muted py-10">{t('bulk.empty')}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-body">{t('bulk.total', { n: bulkRows.length })}</span>
                    <span className="text-primary font-semibold">{t('bulk.valid', { n: bulkValid })}</span>
                    <span className="text-red-600 font-semibold">{t('bulk.invalid', { n: bulkRows.length - bulkValid })}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={exportCsv} className="ui-btn-soft px-3 py-1.5 text-sm inline-flex items-center gap-1">
                      <Download className="w-4 h-4" /> {t('bulk.exportCsv')}
                    </button>
                    <CopyBtn
                      text={[...new Set(bulkRows.filter(r => r.valid).map(r => r.formatted))].join('\n')}
                      id="bulk-valid"
                      label={t('bulk.copyValid')}
                    />
                    <button onClick={lookupBulk} disabled={bulkValid === 0 || bulkStatus.loading} className="ui-btn px-3 py-1.5 text-sm inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                      {bulkStatus.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {bulkStatus.loading ? t('status.loading') : t('bulk.statusButton')}
                    </button>
                  </div>
                  {bulkStatus.error && <StatusFallback error={bulkStatus.error} />}
                  {bulkStatus.truncated && <p className="text-sm text-amber-800">{t('bulk.tooMany')}</p>}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-sub">
                          <th className="py-2 pr-3 font-medium">{t('bulk.colNo')}</th>
                          <th className="py-2 pr-3 font-medium">{t('bulk.colFormatted')}</th>
                          <th className="py-2 pr-3 font-medium">{t('bulk.colResult')}</th>
                          <th className="py-2 pr-3 font-medium">{t('bulk.colType')}</th>
                          {bulkStatus.map && <th className="py-2 font-medium">{t('bulk.colStatus')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((r, i) => {
                          const s = bulkStatus.map?.[r.digits]
                          return (
                            <tr key={i} className="border-b border-line last:border-0">
                              <td className="py-2 pr-3 text-muted tabular-nums">{i + 1}</td>
                              <td className="py-2 pr-3 font-mono tabular-nums text-fg whitespace-nowrap">
                                {r.formatted}
                                {r.dup && <span className="ml-2 text-xs text-muted font-sans">{t('bulk.dup')}</span>}
                              </td>
                              <td className={`py-2 pr-3 whitespace-nowrap font-medium ${r.valid ? 'text-primary' : 'text-red-600'}`}>
                                {r.valid ? t('bulk.ok') : reasonText(r.reason)}
                              </td>
                              <td className="py-2 pr-3 text-body">{r.valid ? t(`category.${partsOf(r.digits).category}`) : ''}</td>
                              {bulkStatus.map && (
                                <td className="py-2 whitespace-nowrap">
                                  {s && <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${statusTone[statusKind(s)]}`}>{statusText(s)}</span>}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-8">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        {(['structure', 'validation', 'howToUse', 'tips'] as const).map(sec => (
          <section key={sec}>
            <h3 className="text-lg font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-body">
              {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>
        ))}
        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.codes.title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {(t.raw('guide.codes.rows') as [string, string][]).map(([code, desc]) => (
                  <tr key={code} className="border-b border-line last:border-0">
                    <td className="py-2 pr-4 font-mono tabular-nums text-fg whitespace-nowrap">{code}</td>
                    <td className="py-2 text-body">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-2">{t('guide.codes.note')}</p>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="space-y-4">
            {(t.raw('guide.faq.items') as { q: string; a: string }[]).map((f, i) => (
              <div key={i}>
                <p className="font-medium text-fg">{f.q}</p>
                <p className="text-body mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
