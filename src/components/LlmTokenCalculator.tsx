'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, Upload, Trash2, ExternalLink } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import {
  MODELS, VENDORS, VENDOR_IDS, FX_DEFAULT, textStats, estimateTokens, scenarioCost, contextFit, compareModels,
  fmtUSD, fmtKRW, fmtTokens, toMarkdown, type LlmModel, type VendorId, type Scenario, type Tokenizer,
} from '@/utils/llmPricing'

const seg = (on: boolean) =>
  `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
const chip = (on: boolean) =>
  `px-3 py-1 text-xs rounded-full transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`

const TOKENIZERS: Tokenizer[] = ['openai', 'claude', 'claudeLegacy', 'gemini', 'deepseek']
const DEFAULT_MODEL = 'claude-sonnet-5-5'

interface State { m: string; rpd: number; in: number; out: number; pre: number; hit: number; b: boolean; fx: number }
const DEFAULTS: State = { m: DEFAULT_MODEL, rpd: 1000, in: 2000, out: 500, pre: 50, hit: 80, b: false, fx: FX_DEFAULT.rate }

function decode(sp: URLSearchParams): State {
  const num = (k: string, d: number, max = Infinity) => {
    const v = Number(sp.get(k))
    return sp.has(k) && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : d
  }
  const m = sp.get('m') ?? ''
  return {
    m: MODELS.some((x) => x.id === m) ? m : DEFAULTS.m,
    rpd: num('rpd', DEFAULTS.rpd), in: num('in', DEFAULTS.in), out: num('out', DEFAULTS.out),
    pre: num('pre', DEFAULTS.pre, 100), hit: num('hit', DEFAULTS.hit, 100), b: sp.get('b') === '1',
    fx: num('fx', DEFAULTS.fx) || DEFAULTS.fx,
  }
}

export default function LlmTokenCalculator() {
  const t = useTranslations('llmTokenCalculator')
  const searchParams = useSearchParams()
  const [s, setS] = useState<State>(() => decode(searchParams))
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }))
  const [text, setText] = useState('')
  const [src, setSrc] = useState<'text' | 'manual'>('manual')
  const [vendor, setVendor] = useState<VendorId | 'all'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const model = MODELS.find((x) => x.id === s.m) ?? MODELS[0]
  const stats = useMemo(() => textStats(text), [text])
  const useText = src === 'text' && stats.chars > 0
  const inTokOf = useCallback(
    (m: LlmModel) => (useText ? estimateTokens(stats, m.tok).mid : s.in),
    [useText, stats, s.in],
  )
  const inTok = inTokOf(model)

  // URL 동기화: 텍스트 모드면 선택 모델 추정치를 in으로 기록 (공유 링크는 직접 입력으로 재현)
  useEffect(() => {
    const url = new URL(window.location.href)
    const q: Record<string, string> = {
      m: s.m, rpd: String(s.rpd), in: String(inTok), out: String(s.out), pre: String(s.pre), hit: String(s.hit), b: s.b ? '1' : '0', fx: String(s.fx),
    }
    for (const [k, v] of Object.entries(q)) url.searchParams.set(k, v)
    window.history.replaceState({}, '', url)
  }, [s, inTok])

  const scenario: Scenario = { rpd: s.rpd, inTok, outTok: s.out, prefixPct: s.pre, hitPct: s.hit, batch: s.b }
  const cost = scenarioCost(model, scenario)
  const fit = contextFit(model, inTok, s.out)
  const rows = useMemo(
    () => compareModels(vendor === 'all' ? MODELS : MODELS.filter((m) => m.vendor === vendor), scenario, inTokOf),
    [vendor, JSON.stringify(scenario), inTokOf], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const krw = (usd: number) => fmtKRW(usd, s.fx)
  const nf = (n: number) => Math.round(n).toLocaleString('ko-KR')
  const per1M = (n: number) => `$${+n.toFixed(4)}`

  const copy = useCallback(async (value: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else {
        const ta = document.createElement('textarea')
        ta.value = value
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch { /* 권한 없음 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content === 'string') { setText(content); setSrc('text') }
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const markdown = () =>
    toMarkdown(
      [t('modelName'), t('cmp.inTok'), t('cmp.perReq'), t('cmp.daily'), t('cmp.monthly'), t('cmp.monthlyKrw'), t('cmp.fit')],
      rows.map((r) => [
        r.model.name, nf(r.inTok), fmtUSD(r.cost.perReq.total), fmtUSD(r.cost.daily.total), fmtUSD(r.cost.monthly.total),
        krw(r.cost.monthly.total), r.fit.ok ? t('fit.ok') : t('fit.over'),
      ]),
    ) + `\n\n${t('share.sub', { rpd: nf(s.rpd), in: nf(inTok), out: nf(s.out) })} · ${t('prefix')} ${s.pre}% · ${t('hit')} ${s.hit}% · ${s.b ? t('mode.batch') : t('mode.realtime')} · $1=₩${s.fx}`

  const numField = (k: 'rpd' | 'out' | 'fx', label: string, hint?: string) => (
    <label className="block">
      <span className="block text-sm font-medium text-body mb-1">{label}</span>
      <input
        type="number" min={0} step={k === 'fx' ? 0.1 : 1} inputMode="decimal" value={s[k]}
        onChange={(e) => { const v = Number(e.target.value); set(k, Number.isFinite(v) && v >= 0 ? v : 0) }}
        className="ui-field w-full px-4 py-3 tabular-nums"
      />
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  )
  const pctField = (k: 'pre' | 'hit', label: string, hint: string) => (
    <label className="block">
      <span className="flex justify-between text-sm font-medium text-body mb-1">
        <span>{label}</span><span className="tabular-nums text-primary">{s[k]}%</span>
      </span>
      <input type="range" min={0} max={100} step={5} value={s[k]} onChange={(e) => set(k, Number(e.target.value))} className="w-full accent-blue-600" />
      <span className="block text-xs text-muted">{hint}</span>
    </label>
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 설정 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="ui-card p-6 space-y-5">
            <label className="block">
              <span className="block text-sm font-medium text-body mb-1">{t('selectedModel')}</span>
              <select value={s.m} onChange={(e) => set('m', e.target.value)} className="ui-field w-full px-4 py-3">
                {VENDOR_IDS.map((v) => (
                  <optgroup key={v} label={VENDORS[v].name}>
                    {MODELS.filter((m) => m.vendor === v).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            <div>
              <span className="block text-sm font-medium text-body mb-2">{t('src.label')}</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSrc('text')} className={seg(src === 'text')}>{t('src.text')}</button>
                <button type="button" onClick={() => setSrc('manual')} className={seg(src === 'manual')}>{t('src.manual')}</button>
              </div>
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-body mb-1">{t('inTok')}</span>
              <input
                type="number" min={0} inputMode="numeric" value={inTok}
                onChange={(e) => { const v = Number(e.target.value); setSrc('manual'); set('in', Number.isFinite(v) && v >= 0 ? Math.round(v) : 0) }}
                className="ui-field w-full px-4 py-3 tabular-nums"
              />
              <span className="block text-xs text-muted mt-1">{useText ? t('est.fromText', { model: model.name }) : t('inTokHint')}</span>
            </label>
            {numField('out', t('outputTokensLabel'))}
            {numField('rpd', t('rpd'))}
            {pctField('pre', t('prefix'), t('prefixHint'))}
            {pctField('hit', t('hit'), t('hitHint'))}

            <div>
              <span className="block text-sm font-medium text-body mb-2">{t('mode.label')}</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => set('b', false)} className={seg(!s.b)}>{t('mode.realtime')}</button>
                <button type="button" onClick={() => set('b', true)} className={seg(s.b)}>{t('mode.batch')}</button>
              </div>
            </div>
            {numField('fx', `${t('exchangeRate')} (USD/KRW)`, t('fxHint', { rate: FX_DEFAULT.rate.toLocaleString('ko-KR'), date: FX_DEFAULT.date }))}
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="ui-hero p-6">
            <p className="text-sm text-white/70">{t('hero.label', { model: model.name })}</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{krw(cost.monthly.total)}</p>
            <p className="text-sm text-white/70 mt-1 tabular-nums">
              {fmtUSD(cost.monthly.total)} · {t('hero.note', { days: 30, rpd: nf(s.rpd) })}
            </p>
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70">{t('hero.daily')}</p>
                <p className="text-lg font-semibold tabular-nums">{krw(cost.daily.total)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t('hero.perReq')}</p>
                <p className="text-lg font-semibold tabular-nums">{fmtUSD(cost.perReq.total)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t('hero.saved')}</p>
                <p className="text-lg font-semibold tabular-nums">{krw(cost.savedMonthly)}</p>
              </div>
            </div>
          </div>

          {s.b && model.batch == null && <div className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">{t('noBatch')}</div>}
          {!fit.ok && (
            <div className="bg-red-50 text-red-700 rounded-2xl p-4 text-sm">
              {fit.outOver ? t('fit.outOver', { max: fmtTokens(model.maxOutput) }) : t('fit.overMsg', { model: model.name, limit: fmtTokens(fit.inLimit) })}
            </div>
          )}

          <ShareResult
            card={{
              tool: t('title'),
              label: t('hero.label', { model: model.name }),
              headline: krw(cost.monthly.total),
              sub: t('share.sub', { rpd: nf(s.rpd), in: nf(inTok), out: nf(s.out) }),
              rows: [
                { label: t('hero.daily'), value: krw(cost.daily.total) },
                { label: t('hero.perReq'), value: fmtUSD(cost.perReq.total) },
                { label: t('hero.saved'), value: krw(cost.savedMonthly) },
              ],
            }}
            fileName="llm-cost"
          />

          {/* 텍스트 → 토큰 추정 */}
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-fg">{t('inputLabel')}</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1">
                  <Upload className="w-3 h-3" />{t('fileUpload')}
                </button>
                {text && (
                  <button type="button" onClick={() => setText('')} className="ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />{t('clear')}
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef} type="file" className="hidden"
              accept=".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.py,.java,.c,.cpp,.go,.rs,.yaml,.yml,.toml,.log"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }}
            />
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setSrc('text') }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
              onDragOver={(e) => e.preventDefault()}
              placeholder={`${t('inputPlaceholder')}\n${t('fileUploadDesc')}`}
              rows={8}
              className="ui-field w-full px-4 py-3 font-mono text-sm resize-y"
            />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              {([
                [t('charCount'), stats.chars], [t('wordCount'), stats.words], [t('lineCount'), stats.lines],
                [t('stats.hangul'), stats.hangul], [t('stats.ascii'), stats.ascii], [t('stats.other'), stats.cjk + stats.other],
              ] as const).map(([label, v]) => (
                <div key={label} className="bg-subtle rounded-xl p-2">
                  <div className="font-bold text-fg tabular-nums">{nf(v)}</div>
                  <div className="text-muted">{label}</div>
                </div>
              ))}
            </div>
            {stats.chars > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs">
                      <th className="text-left py-2 pr-2">{t('est.family')}</th>
                      <th className="text-right py-2 pr-2">{t('est.mid')}</th>
                      <th className="text-right py-2 pr-2">{t('est.range')}</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {TOKENIZERS.map((k) => {
                      const e = estimateTokens(stats, k)
                      return (
                        <tr key={k} className="border-b border-line">
                          <td className="py-2 pr-2 text-body">{t(`tok.${k}`)}</td>
                          <td className="py-2 pr-2 text-right font-semibold text-fg tabular-nums">{nf(e.mid)}</td>
                          <td className="py-2 pr-2 text-right text-sub tabular-nums">{nf(e.low)}–{nf(e.high)}</td>
                          <td className="py-2 text-right">
                            <button type="button" onClick={() => copy(String(e.mid), `tok-${k}`)} aria-label={t('copy')} className="text-faint hover:text-primary">
                              {copiedId === `tok-${k}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-muted mt-2">{t('est.note')}</p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 컨텍스트 적합성 */}
            <div className="ui-card p-6">
              <h3 className="text-lg font-semibold text-fg mb-1">{t('fit.title')}</h3>
              <p className="text-sm text-muted mb-4">{model.name} · {t('contextWindow')} {fmtTokens(model.ctx)}</p>
              <div className="h-2 bg-track rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${fit.ok ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${Math.min(100, fit.usedPct)}%` }} />
              </div>
              <p className="text-sm text-sub mt-2 tabular-nums">
                {t('fit.used', { used: nf(inTok + s.out), limit: nf(model.ctx), pct: fit.usedPct.toFixed(1) })}
              </p>
              <p className={`text-sm font-semibold mt-1 ${fit.ok ? 'text-primary' : 'text-red-600'}`}>{fit.ok ? t('fit.ok') : t('fit.over')}</p>
            </div>

            {/* 캐싱 절감액 */}
            <div className="ui-card p-6">
              <h3 className="text-lg font-semibold text-fg mb-4">{t('cache.title')}</h3>
              {s.pre > 0 ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-sub"><span>{t('cache.without')}</span><span className="tabular-nums">{krw(cost.noCacheMonthly)}</span></div>
                  <div className="flex justify-between text-sub"><span>{t('cache.with')}</span><span className="tabular-nums">{krw(cost.monthly.total)}</span></div>
                  <div className="flex justify-between font-bold text-fg border-t border-line pt-2">
                    <span>{t('cache.saved')}</span>
                    <span className="tabular-nums text-primary">
                      {krw(cost.savedMonthly)} ({cost.noCacheMonthly > 0 ? ((cost.savedMonthly / cost.noCacheMonthly) * 100).toFixed(1) : '0'}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
                    {(['input', 'cacheRead', 'cacheWrite', 'output'] as const).map((k) => (
                      <div key={k} className="bg-subtle rounded-xl p-2">
                        <div className="text-muted">{t(`cache.part.${k}`)}</div>
                        <div className="font-semibold text-fg tabular-nums">{krw(cost.monthly[k])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">{t('cache.off')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모델별 비교 */}
      <div className="ui-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-fg">{t('cmp.title')}</h2>
          <button type="button" onClick={() => copy(markdown(), 'md')} className="ui-btn-soft px-3 py-1.5 text-xs flex items-center gap-1">
            {copiedId === 'md' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedId === 'md' ? t('copied') : t('cmp.copyMd')}
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-4">
          <button type="button" onClick={() => setVendor('all')} className={chip(vendor === 'all')}>{t('allModels')}</button>
          {VENDOR_IDS.map((v) => (
            <button type="button" key={v} onClick={() => setVendor(v)} className={chip(vendor === v)}>{VENDORS[v].name}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-muted text-xs">
                <th className="text-left py-2 pr-2">{t('modelName')}</th>
                <th className="text-right py-2 pr-2">{t('cmp.inTok')}</th>
                <th className="text-right py-2 pr-2">{t('cmp.perReq')}</th>
                <th className="text-right py-2 pr-2">{t('cmp.daily')}</th>
                <th className="text-right py-2 pr-2">{t('cmp.monthly')}</th>
                <th className="text-right py-2 pr-2">{t('cmp.monthlyKrw')}</th>
                <th className="text-right py-2">{t('cmp.fit')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const on = r.model.id === s.m
                return (
                  <tr
                    key={r.model.id}
                    onClick={() => set('m', r.model.id)}
                    className={`border-b border-line cursor-pointer transition-colors ${on ? 'bg-primary-soft' : 'hover:bg-subtle'}`}
                  >
                    <td className={`py-2 pr-2 font-medium whitespace-nowrap ${on ? 'text-primary' : 'text-fg'}`}>
                      {r.model.name}
                      <span className="block text-xs font-normal text-muted">{VENDORS[r.model.vendor].name}{s.b && r.model.batch == null ? ` · ${t('prices.noBatch')}` : ''}</span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-sub">{nf(r.inTok)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-sub">{fmtUSD(r.cost.perReq.total)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-sub">{fmtUSD(r.cost.daily.total)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums font-semibold text-fg">{fmtUSD(r.cost.monthly.total)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-fg whitespace-nowrap">{krw(r.cost.monthly.total)}</td>
                    <td className={`py-2 text-right text-xs ${r.fit.ok ? 'text-sub' : 'text-red-600 font-semibold'}`}>{r.fit.ok ? t('fit.ok') : t('fit.over')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {useText && <p className="text-xs text-muted mt-2">{t('cmp.textNote')}</p>}
      </div>

      {/* 단가표 */}
      <div className="ui-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('prices.title')}</h2>
          <p className="text-xs text-muted mt-1">{t('disclaimer')}</p>
        </div>
        {VENDOR_IDS.map((v) => (
          <div key={v}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h3 className="font-semibold text-fg">{VENDORS[v].name}</h3>
              <a href={VENDORS[v].url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                {t('prices.checked', { date: VENDORS[v].checked })} · {t('prices.source')}<ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-muted text-xs">
                    <th className="text-left py-2 pr-2">{t('modelName')}</th>
                    <th className="text-right py-2 pr-2">{t('contextWindow')}</th>
                    <th className="text-right py-2 pr-2">{t('inputPrice')}</th>
                    <th className="text-right py-2 pr-2">{t('prices.cached')}</th>
                    <th className="text-right py-2 pr-2">{t('prices.cacheWrite')}</th>
                    <th className="text-right py-2 pr-2">{t('outputPrice')}</th>
                    <th className="text-right py-2 pr-2">{t('prices.batch')}</th>
                    <th className="text-left py-2">{t('prices.note')}</th>
                  </tr>
                </thead>
                <tbody>
                  {MODELS.filter((m) => m.vendor === v).map((m) => {
                    const notes = [
                      m.long && t('prices.long', { over: fmtTokens(m.long.over), input: per1M(m.long.input), output: per1M(m.long.output) }),
                      m.promoUntil && t('prices.promo', { date: m.promoUntil }),
                      m.preview && t('prices.preview'),
                    ].filter(Boolean)
                    return (
                      <tr key={m.id} className="border-b border-line">
                        <td className="py-2 pr-2 font-medium text-fg whitespace-nowrap">{m.name}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sub">{fmtTokens(m.ctx)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sub">{per1M(m.price.input)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sub">{per1M(m.price.cached)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sub">{m.price.cacheWrite != null ? per1M(m.price.cacheWrite) : '—'}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sub">{per1M(m.price.output)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-sub whitespace-nowrap">
                          {m.batch == null ? t('prices.noBatch') : `${per1M(m.price.input * m.batch)} / ${per1M(m.price.output * m.batch)}`}
                        </td>
                        <td className="py-2 text-xs text-muted">{notes.join(' · ')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-2">{t(`vendorNote.${v}`)}</p>
          </div>
        ))}
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(['whatIsToken', 'koreanTokens', 'costTips'] as const).map((sec) => (
            <div key={sec} className="bg-subtle rounded-2xl p-5">
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="space-y-2 list-disc pl-4 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <h3 className="font-semibold text-fg mt-8 mb-3">{t('faq.title')}</h3>
        <div className="space-y-2">
          {(t.raw('faq.items') as { q: string; a: string }[]).map((f, i) => (
            <details key={i} className="bg-subtle rounded-2xl p-4">
              <summary className="font-medium text-fg cursor-pointer">{f.q}</summary>
              <p className="text-sm text-sub mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
