'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/scientificCalculator'
import { useSearchParams } from '@/hooks/useSearchParams'
import { useHydrated } from '@/hooks/useHydrated'
import ShareResult from '@/components/ShareResult'
import {
  evaluate, formatNumber, backspace, inlineAns, parseHistory,
  MAX_EXPR, HISTORY_MAX, HISTORY_KEY, SETTINGS_KEY, type Angle, type CalcError, type HistoryItem,
} from '@/utils/scientificCalculator'

/** ins: 넣을 글자. op: 결과가 나온 뒤 누르면 Ans 에 이어 붙인다(아니면 새 식) */
type Key = { id: string; face: string; ins?: string; op?: boolean }
const k = (id: string, face: string, ins?: string, op?: boolean): Key => ({ id, face, ins, op })
const d = (n: string) => k(n, n, n)

const SCI: Key[] = [
  k('sin', 'sin', 'sin('), k('cos', 'cos', 'cos('), k('tan', 'tan', 'tan('), k('pi', 'π', 'π'),
  k('asin', 'sin⁻¹', 'asin('), k('acos', 'cos⁻¹', 'acos('), k('atan', 'tan⁻¹', 'atan('), k('e', 'e', 'e'),
  k('sinh', 'sinh', 'sinh('), k('cosh', 'cosh', 'cosh('), k('tanh', 'tanh', 'tanh('), k('ans', 'Ans', 'Ans'),
  k('log', 'log', 'log('), k('ln', 'ln', 'ln('), k('log2', 'log₂', 'log₂('), k('ee', 'EXP', 'E'),
  k('pow10', '10ˣ', '10^('), k('exp', 'eˣ', 'e^('), k('sq', 'x²', '^2', true), k('cube', 'x³', '^3', true),
  k('pow', 'xʸ', '^', true), k('sqrt', '√', '√('), k('cbrt', '∛', '∛('), k('inv', '1/x', '^(−1)', true),
  k('fact', 'x!', '!', true), k('abs', '|x|', 'abs('), k('npr', 'nPr', 'P', true), k('ncr', 'nCr', 'C', true),
]
const BASIC: Key[] = [
  k('ac', 'AC'), k('back', '⌫'), k('lp', '(', '('), k('rp', ')', ')'),
  d('7'), d('8'), d('9'), k('div', '÷', '÷', true),
  d('4'), d('5'), d('6'), k('mul', '×', '×', true),
  d('1'), d('2'), d('3'), k('sub', '−', '−', true),
  d('0'), k('dot', '.', '.'), k('percent', '%', '%', true), k('add', '+', '+', true),
  k('eq', '='),
]
const OPS = new Set(['div', 'mul', 'sub', 'add'])
/** 키보드 한 글자 → 넣을 글자와 op 여부 */
const KEYBOARD: Record<string, [string, boolean]> = {
  '+': ['+', true], '-': ['−', true], '*': ['×', true], '/': ['÷', true], '^': ['^', true], '!': ['!', true], '%': ['%', true],
  '(': ['(', false], ')': [')', false], '.': ['.', false], P: ['P', true], C: ['C', true],
}
/** 화면용 기호 ↔ 링크용 ASCII */
const pretty = (s: string) => s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')
const ascii = (s: string) => s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')

type Done = { expr: string; shown: string; value: number }

export default function ScientificCalculator() {
  const t = useTranslations('scientificCalculator')
  const sp = useSearchParams()
  const hydrated = useHydrated()
  const [expr, setExpr] = useState('')
  const [done, setDone] = useState<Done | null>(null)
  const [error, setError] = useState<CalcError | null>(null)
  const [ans, setAns] = useState(0)
  const [angle, setAngle] = useState<Angle>('deg')
  const [grouping, setGrouping] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [storageOk, setStorageOk] = useState(true)
  const [showSci, setShowSci] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // 기록·설정·공유 링크는 하이드레이션 뒤 한 번만 읽는다(첫 렌더는 정적 HTML 과 같게)
  if (hydrated && !loaded) {
    setLoaded(true)
    let h: HistoryItem[] = []
    let a: Angle = 'deg'
    try {
      h = parseHistory(window.localStorage.getItem(HISTORY_KEY))
      const s = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}') as { angle?: unknown; grouping?: unknown } | null
      if (s?.angle === 'rad') a = 'rad'
      setGrouping(s?.grouping === true)
    } catch { setStorageOk(false) }
    setHistory(h)
    const last = h[0] && evaluate(h[0].result)
    const lastAns = last && last.ok ? last.value : 0
    const e = sp.get('e')?.slice(0, MAX_EXPR)
    if (e) {
      // 링크의 식은 링크의 단위로(a 가 없으면 DEG). 내 설정은 바꾸지 않는다
      a = sp.get('a') === 'rad' ? 'rad' : 'deg'
      const p = pretty(e)
      const r = evaluate(p, a, lastAns)
      setExpr(p)
      if (r.ok) { setDone({ expr: p, shown: p, value: r.value }); setAns(r.value) } else { setError(r.error); setAns(lastAns) }
    } else setAns(lastAns)
    setAngle(a)
  }

  const store = (key: string, v: unknown) => {
    try { window.localStorage.setItem(key, JSON.stringify(v)); setStorageOk(true) } catch { setStorageOk(false) }
  }
  const writeUrl = (e: string, a: Angle) => {
    const qs = e ? new URLSearchParams(a === 'rad' ? { e: ascii(e), a } : { e: ascii(e) }).toString() : ''
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }

  const insert = (s: string, op: boolean) => {
    const base = done ? (op ? 'Ans' : '') : expr
    // 10ˣ 를 숫자 뒤에 붙이면 210^( 처럼 숫자가 이어지니 × 를 넣는다
    const next = base + (s === '10^(' && /[\d.)πe!%s]$/.test(base) ? `×${s}` : s)
    if (next.length > MAX_EXPR) return
    setExpr(next)
    setDone(null)
    setError(null)
  }
  const clear = () => {
    setExpr('')
    setDone(null)
    setError(null)
    writeUrl('', angle)
  }
  const back = () => {
    if (!done) setExpr(backspace(expr))
    setDone(null) // 결과가 보일 때는 지우지 않고 식 편집으로 돌아간다
    setError(null)
  }
  const calc = () => {
    if (!expr.trim()) return
    const r = evaluate(expr, angle, ans)
    if (!r.ok) {
      setDone(null)
      setError(r.error)
      return
    }
    const shown = inlineAns(expr, ans)
    const result = formatNumber(r.value)
    setDone({ expr, shown, value: r.value })
    setError(null)
    setAns(r.value)
    const next = [{ expr: shown, result }, ...history.filter((h) => h.expr !== shown || h.result !== result)].slice(0, HISTORY_MAX)
    setHistory(next)
    store(HISTORY_KEY, next)
    writeUrl(shown, angle)
  }
  const press = (key: Key) => {
    if (key.id === 'ac') clear()
    else if (key.id === 'back') back()
    else if (key.id === 'eq') calc()
    else if (key.ins) insert(key.ins, !!key.op)
  }
  const setUnit = (a: Angle) => {
    if (a === angle) return
    setAngle(a)
    setDone(null) // 단위가 바뀌면 식을 다시 계산해야 하니 미리 보기로 돌아간다
    store(SETTINGS_KEY, { angle: a, grouping })
  }
  const toggleGrouping = () => {
    setGrouping(!grouping)
    store(SETTINGS_KEY, { angle, grouping: !grouping })
  }
  const clearHistory = () => {
    setHistory([])
    store(HISTORY_KEY, [])
  }
  const copy = async () => {
    if (!done) return
    try {
      await navigator.clipboard.writeText(formatNumber(done.value))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* 클립보드 권한이 없으면 아무것도 하지 않는다 */ }
  }

  // 키보드·붙여넣기. 입력칸에 있을 때와 버튼·링크에서 Enter/Space 는 건드리지 않는다
  useEffect(() => {
    const skip = (el: EventTarget | null) => el instanceof HTMLElement && !!el.closest('input, textarea, select, [contenteditable="true"]')
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || skip(e.target)) return
      const el = e.target instanceof HTMLElement ? e.target : null
      if ((e.key === 'Enter' || e.key === ' ') && el?.closest('button, a, summary')) return
      const key = e.key
      if (key === 'Enter' || key === '=') calc()
      else if (key === 'Backspace') back()
      else if (key === 'Escape' || key === 'Delete') clear()
      else if (/^\d$/.test(key)) insert(key, false)
      else if (Object.hasOwn(KEYBOARD, key)) insert(...KEYBOARD[key])
      else if (/^[a-zA-Z]$/.test(key)) insert(key === 'E' ? 'E' : key.toLowerCase(), false)
      else return
      e.preventDefault()
    }
    const onPaste = (e: ClipboardEvent) => {
      if (skip(e.target)) return
      const text = e.clipboardData?.getData('text').replace(/[\s,]/g, '')
      if (!text) return
      e.preventDefault()
      insert(pretty(text), false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('paste', onPaste)
    }
  })

  const preview = !done && expr && !/^[\d.]+$/.test(expr) ? evaluate(expr, angle, ans) : null
  const resultText = done ? formatNumber(done.value, grouping) : ''
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[]
  const rows = t.raw('guide.functions.rows') as { key: string; desc: string; example: string }[]

  const keyBtn = (key: Key, cls: string) => (
    <button
      key={key.id}
      type="button"
      onClick={() => press(key)}
      // 마우스로 누른 키에 포커스가 남으면 Enter 가 그 키를 다시 누르므로 포커스를 옮기지 않는다(Tab 포커스는 그대로)
      onMouseDown={(e) => e.preventDefault()}
      aria-label={/^\d$/.test(key.id) ? undefined : t(`keys.${key.id}`)}
      className={`rounded-xl px-1 transition-colors select-none touch-manipulation ${cls}`}
    >
      {key.face}
    </button>
  )
  const basicCls = (key: Key) =>
    key.id === 'eq' ? 'col-span-4 ui-btn text-2xl font-semibold'
      : OPS.has(key.id) ? 'ui-btn-soft text-2xl font-semibold'
        : /^\d$/.test(key.id) || key.id === 'dot' ? 'bg-soft hover:bg-subtle text-fg text-xl font-semibold tabular-nums'
          : 'bg-soft hover:bg-subtle text-body text-lg font-medium'
  const seg = (on: boolean) => `min-h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <section className="ui-card p-4 sm:p-6 space-y-4" aria-label={t('display.label')}>
            {/* 화면 */}
            <div className="bg-subtle rounded-2xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div role="group" aria-label={t('angle.label')} className="flex gap-1">
                  {(['deg', 'rad'] as const).map((a) => (
                    <button key={a} type="button" aria-pressed={angle === a} title={t(`angle.${a}Full`)} onClick={() => setUnit(a)} className={seg(angle === a)}>
                      {t(`angle.${a}`)}
                    </button>
                  ))}
                </div>
                <button type="button" aria-pressed={grouping} onClick={toggleGrouping}
                  className={`min-h-11 px-3 rounded-xl text-sm font-medium transition-colors ${grouping ? 'bg-primary-soft text-primary' : 'bg-soft text-body hover:bg-subtle'}`}>
                  {t('grouping')}
                </button>
              </div>
              <p className="min-h-7 text-right text-base text-sub break-all tabular-nums">
                {done && <><span className="sr-only">{t('display.expression')}: </span>{done.expr} =</>}
              </p>
              <div aria-live="polite" className="text-right">
                {done ? (
                  <p className="text-3xl sm:text-4xl font-bold text-fg tabular-nums break-all"><span className="sr-only">{t('display.result')}: </span>{resultText}</p>
                ) : (
                  <p className="text-2xl sm:text-3xl font-semibold text-fg tabular-nums break-all">{expr || '0'}</p>
                )}
              </div>
              <div className="min-h-11 flex items-center justify-end gap-3">
                {error ? (
                  <p role="alert" className="bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-sm text-left">{t(`errors.${error}`)}</p>
                ) : done ? (
                  <button type="button" onClick={copy} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{copied ? t('copy.done') : t('copy.label')}</button>
                ) : preview?.ok ? (
                  <p className="text-lg text-muted tabular-nums break-all"><span className="sr-only">{t('display.preview')}: </span>= {formatNumber(preview.value, grouping)}</p>
                ) : null}
              </div>
            </div>

            <button type="button" onClick={() => setShowSci(!showSci)} aria-expanded={showSci} aria-controls="sc-sci"
              className="lg:hidden w-full ui-btn-soft min-h-11 px-4 py-2 text-sm">
              {showSci ? t('sci.hide') : t('sci.show')}
            </button>

            {/* 키패드: 넓은 화면은 공학 키(왼쪽)·기본 키(오른쪽) 같은 높이 */}
            <div data-calc-keys className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              <div id="sc-sci" role="group" aria-label={t('sci.label')} className={`${showSci ? 'grid' : 'hidden'} lg:grid grid-cols-4 auto-rows-fr gap-2`}>
                {SCI.map((key) => keyBtn(key, 'min-h-11 bg-soft hover:bg-subtle text-body text-sm font-medium'))}
              </div>
              <div role="group" aria-label={t('sci.basicLabel')} className="grid grid-cols-4 auto-rows-fr gap-2">
                {BASIC.map((key) => keyBtn(key, `min-h-12 ${basicCls(key)}`))}
              </div>
            </div>
            <p className="hidden lg:block text-xs text-muted">{t('keyboardHint')}</p>
          </section>

          {done && (
            <ShareResult
              fileName="scientific-calculator"
              card={{ tool: t('share.tool'), label: t('share.label'), headline: resultText, sub: `${done.shown} =` }}
              text={t('share.text', { expr: done.shown, result: resultText })}
            />
          )}
        </div>

        <section className="ui-card p-6 min-w-0 lg:self-start" aria-labelledby="sc-history">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sc-history" className="text-lg font-semibold text-fg">{t('history.title')}</h2>
            {history.length > 0 && (
              <button type="button" onClick={clearHistory} className="min-h-11 px-3 py-2 rounded-xl text-sm bg-soft hover:bg-subtle text-body">{t('history.clear')}</button>
            )}
          </div>
          <p className="text-sm text-muted mt-1">{t('history.desc')}</p>
          {!storageOk && <p className="mt-3 bg-amber-50 text-amber-800 rounded-xl px-3 py-2 text-sm">{t('history.storageError')}</p>}
          {history.length === 0 ? (
            <p className="mt-4 bg-subtle rounded-2xl p-5 text-sm text-sub">{t('history.empty')}</p>
          ) : (
            <ul className="mt-4 max-h-[28rem] overflow-y-auto divide-y divide-line">
              {history.map((h, i) => (
                <li key={`${i}-${h.expr}`} className="py-2 flex flex-col items-end">
                  <button type="button" onClick={() => { setExpr(h.expr); setDone(null); setError(null) }}
                    aria-label={t('history.useExpr', { expr: h.expr })}
                    className="max-w-full min-h-11 px-2 rounded-lg text-right text-sm text-sub hover:bg-soft break-all tabular-nums">
                    {h.expr}
                  </button>
                  <button type="button" onClick={() => insert(pretty(h.result), false)}
                    aria-label={t('history.useResult', { result: h.result })}
                    className="max-w-full min-h-11 px-2 rounded-lg text-right text-lg font-semibold text-fg hover:bg-soft break-all tabular-nums">
                    = {grouping ? formatNumber(Number(h.result), true) : h.result}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 가이드 */}
      <div className="ui-card p-6 space-y-6">
        <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['howTo', 'order', 'angle'] as const).map((sec) => (
            <section key={sec}>
              <h3 className="font-semibold text-fg mb-3">{t(`guide.${sec}.title`)}</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-sub">
                {(t.raw(`guide.${sec}.items`) as string[]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.functions.title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  <th scope="col" className="py-2 px-2 font-medium">{t('guide.functions.th.key')}</th>
                  <th scope="col" className="py-2 px-2 font-medium">{t('guide.functions.th.desc')}</th>
                  <th scope="col" className="py-2 px-2 font-medium">{t('guide.functions.th.example')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-line">
                    <th scope="row" className="py-2 px-2 text-left font-semibold text-fg whitespace-nowrap">{r.key}</th>
                    <td className="py-2 px-2 text-body">{r.desc}</td>
                    <td className="py-2 px-2 text-sub tabular-nums whitespace-nowrap">{r.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium text-body min-h-[44px] flex items-center">{f.q}</summary>
                <p className="text-sm text-sub mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
