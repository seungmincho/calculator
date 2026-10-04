'use client'

import { useState, useCallback, useEffect, useMemo, Fragment } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/baseConverter'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import GuideSection from '@/components/GuideSection'
import {
  parse, show, format, toNumber, isInteger, intPart, twos, ones, signMag, decode, bitString, range, WIDTHS,
  ieee, parseFloatInput, divisionSteps, fractionSteps, placeTerms, groupSteps, groupDigits,
  textToBytes, bytesToText, showBytes, parseBytes, type Rational,
} from '@/utils/baseConvert'

type Method = 'div' | 'place' | 'group'
const MAX_FRAC = 32
const SAMPLES = ['13', '173', '255', '-128', '0.1', '13.625', '65535', '18446744073709551615']
const COMMON = [0, 1, 7, 8, 10, 15, 16, 127, 128, 255, 256, 1024, 4096, 65535]
const FLOAT_SAMPLES = ['0.1', '0.5', '1', '-2.5', '-0', 'Infinity', 'NaN']
const intOr = <T extends number>(v: string | null, ok: readonly T[], d: T): T => (v !== null && ok.includes(Number(v) as T) ? (Number(v) as T) : d)

const seg = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-track'}`

export default function BaseConverter() {
  const t = useTranslations('baseConverter')
  const sp = useSearchParams()

  const [src, setSrc] = useState(() => {
    const b = Number(sp.get('b'))
    return { base: b >= 2 && b <= 36 ? b : 10, text: sp.get('v') ?? '173' }
  })
  const [custom, setCustom] = useState(() => { const c = Number(sp.get('c')); return c >= 2 && c <= 36 ? c : 36 })
  const [prefix, setPrefix] = useState(() => sp.get('p') === '1')
  const [group, setGroup] = useState(() => intOr(sp.get('g'), [0, 4, 8] as const, 4))
  const [width, setWidth] = useState(() => intOr(sp.get('w'), WIDTHS, 8))
  const [fText, setFText] = useState(() => sp.get('f') ?? '0.1')
  const [fWidth, setFWidth] = useState(() => intOr(sp.get('fw'), [32, 64] as const, 32))
  const [method, setMethod] = useState<Method>(() => (['div', 'place', 'group'].includes(sp.get('m') ?? '') ? (sp.get('m') as Method) : 'div'))
  const [stepBase, setStepBase] = useState(() => { const s = Number(sp.get('sb')); return s >= 2 && s <= 36 ? s : 2 })
  const [text, setText] = useState('Hello 한글')
  const [bytesIn, setBytesIn] = useState('48 69 20 EC 95 88 EB 85 95')
  const [bytesBase, setBytesBase] = useState<2 | 16>(16)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams
    q.set('v', src.text); q.set('b', String(src.base)); q.set('c', String(custom)); q.set('g', String(group))
    q.set('w', String(width)); q.set('f', fText); q.set('fw', String(fWidth)); q.set('m', method); q.set('sb', String(stepBase))
    if (prefix) q.set('p', '1'); else q.delete('p')
    window.history.replaceState({}, '', url)
  }, [src, custom, prefix, group, width, fText, fWidth, method, stepBase])

  const copy = useCallback(async (value: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
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

  const copyBtn = (value: string, id: string) => (
    <button
      onClick={() => copy(value, id)}
      disabled={!value}
      aria-label={t('copy')}
      className="shrink-0 bg-soft hover:bg-track text-body rounded-xl px-3 py-2 disabled:opacity-40"
    >
      {copiedId === id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
    </button>
  )

  const value = useMemo(() => parse(src.text, src.base), [src])
  const bases = [2, 8, 10, 16, ...(custom === 2 || custom === 8 || custom === 10 || custom === 16 ? [] : [custom])]
  const groupFor = (b: number) => (!group ? 0 : b === 2 ? group : b === 16 ? 2 : b === 8 || b === 10 ? 3 : 0)
  const fieldText = (b: number) =>
    b === src.base ? src.text : value ? show(value, b, { prefix, group: groupFor(b), sep: b === 10 ? ',' : ' ', maxFrac: MAX_FRAC }) : ''
  const baseName = (b: number) => (b === 2 ? t('binary') : b === 8 ? t('octal') : b === 10 ? t('decimal') : b === 16 ? t('hex') : t('customBase', { n: b }))
  const setValue = (s: string) => setSrc({ base: 10, text: s })
  const fracFmt = value && !isInteger(value) ? bases.map((b) => format(value, b, MAX_FRAC)) : []
  const hasRep = fracFmt.some((x) => x.rep), hasTrunc = fracFmt.some((x) => x.truncated)

  // ── 부호 있는 정수 ──
  const iv = value ? intPart(value) : null
  const tw = iv !== null ? twos(iv, width) : null
  const rg = range(width)
  const toggleBit = (i: number) => {
    if (!tw || iv === null) return
    const bits = tw.bits ^ (BigInt(1) << BigInt(i))
    setValue((iv < BigInt(0) ? BigInt.asIntN(width, bits) : bits).toString())
  }
  const pat = (bits: bigint | null) => (bits === null ? null : groupDigits(bitString(bits, width), 4))
  const reps = iv === null ? [] : [
    { id: 'twos', label: t('signedInt.twos'), bits: tw!.overflow ? null : tw!.bits },
    { id: 'ones', label: t('signedInt.ones'), bits: ones(iv, width) },
    { id: 'sm', label: t('signedInt.signMag'), bits: signMag(iv, width) },
    { id: 'uns', label: t('signedInt.unsigned'), bits: iv >= BigInt(0) && iv <= rg.uMax ? iv : null },
  ]
  const dec = tw ? decode(tw.bits, width) : null

  // ── IEEE 754 ──
  const fNum = parseFloatInput(fText)
  const fl = fNum === null ? null : ieee(fNum, fWidth)
  const kindLabel = fl ? t(`ieee.kinds.${fl.kind}`) : ''
  const exactIn = parse(fText, 10)
  const inexact = !!(fl?.stored && exactIn && exactIn.num * fl.stored.den !== fl.stored.num * exactIn.den)

  // ── 풀이 ──
  const sb = stepBase
  const absV: Rational | null = value ? { num: value.num < BigInt(0) ? -value.num : value.num, den: value.den } : null
  const div = absV ? divisionSteps(intPart(absV), sb) : null
  const fr = absV && !isInteger(absV) ? fractionSteps(absV, sb) : null
  const inB = absV ? format(absV, sb, 12) : null
  const terms = inB ? placeTerms(inB, sb) : []
  const binInt = absV ? intPart(absV).toString(2) : ''
  const dec10 = (r: Rational) => show(r, 10, { maxFrac: 12 })

  // ── 텍스트 ↔ 바이트 ──
  const enc = textToBytes(text)
  const parsedBytes = parseBytes(bytesIn, bytesBase)
  const decoded = parsedBytes ? bytesToText(parsedBytes) : null

  const binStr = value ? show(value, 2, { group: 4, maxFrac: MAX_FRAC }) : ''
  const decStr = value ? show(value, 10, { maxFrac: MAX_FRAC }) : ''

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <button onClick={() => setValue('0')} className="flex items-center gap-2 bg-soft hover:bg-track text-body rounded-xl px-4 py-2 shrink-0">
          <RotateCcw className="w-4 h-4" />
          {t('reset')}
        </button>
      </div>

      {/* 변환 */}
      <div className="ui-card p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2 text-body cursor-pointer">
            <input type="checkbox" checked={prefix} onChange={(e) => setPrefix(e.target.checked)} className="accent-[var(--primary)] w-4 h-4" />
            {t('options.prefix')}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sub">{t('options.group')}</span>
            {([0, 4, 8] as const).map((g) => (
              <button key={g} onClick={() => setGroup(g)} className={seg(group === g)}>{t(`options.group${g}`)}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sub">
            {t('options.custom')}
            <select value={custom} onChange={(e) => setCustom(Number(e.target.value))} className="ui-field px-3 py-1.5 w-auto">
              {Array.from({ length: 35 }, (_, i) => i + 2).map((b) => <option key={b} value={b}>{t('customBase', { n: b })}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-4">
          {bases.map((b) => {
            const invalid = b === src.base && src.text.trim() !== '' && !value
            return (
              <div key={b}>
                <label htmlFor={`base-${b}`} className="flex items-baseline gap-2 mb-1.5">
                  <span className="font-semibold text-fg">{baseName(b)}</span>
                  <span className="text-xs text-muted">{t('baseN', { n: b })}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id={`base-${b}`}
                    type="text"
                    inputMode={b <= 10 ? 'decimal' : 'text'}
                    spellCheck={false}
                    autoComplete="off"
                    maxLength={4096}
                    value={fieldText(b)}
                    onChange={(e) => setSrc({ base: b, text: e.target.value })}
                    placeholder="0"
                    aria-invalid={invalid}
                    className={`ui-field px-4 py-3 font-mono text-base break-all ${invalid ? 'border-red-500' : ''}`}
                  />
                  {copyBtn(fieldText(b), `f${b}`)}
                </div>
                {invalid && <p className="text-xs text-red-600 mt-1">{t('invalid', { n: b })}</p>}
              </div>
            )
          })}
        </div>

        {(hasRep || hasTrunc) && (
          <div className="bg-subtle rounded-2xl p-4 text-sm text-sub space-y-1">
            {hasRep && <p>{t('fraction.repeating')}</p>}
            {hasTrunc && <p>{t('fraction.truncated', { n: MAX_FRAC })}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-sub mr-1">{t('samples')}</span>
          {SAMPLES.map((s) => (
            <button key={s} onClick={() => setValue(s)} className={seg(src.base === 10 && src.text === s)}>
              <span className="font-mono">{s.length > 12 ? '2⁶⁴−1' : s}</span>
            </button>
          ))}
        </div>

        {value && (
          <ShareResult
            card={{
              tool: t('title'),
              label: t('share.label', { v: decStr.length > 24 ? decStr.slice(0, 24) + '…' : decStr }),
              headline: binStr.length > 24 ? show(value, 16, { prefix: true, maxFrac: 8 }) : binStr,
              rows: [8, 16, custom].filter((b, i, a) => a.indexOf(b) === i).map((b) => ({ label: baseName(b), value: show(value, b, { maxFrac: 12 }).slice(0, 28) })),
            }}
            text={t('share.text', { v: decStr.slice(0, 40), b: binStr.slice(0, 60) })}
            fileName="base-converter"
          />
        )}
      </div>

      {/* 풀이 과정 */}
      <div className="ui-card p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-fg">{t('steps.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('steps.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['div', 'place', 'group'] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={seg(method === m)}>{t(`steps.${m}`)}</button>
          ))}
          {method !== 'group' && (
            <select value={sb} onChange={(e) => setStepBase(Number(e.target.value))} className="ui-field px-3 py-1.5 w-auto text-sm" aria-label={t('steps.base')}>
              {[...new Set([2, 8, 16, custom, sb])].map((b) => <option key={b} value={b}>{baseName(b)}</option>)}
            </select>
          )}
        </div>

        {!absV ? (
          <p className="text-sm text-muted">{t('steps.empty')}</p>
        ) : method === 'div' ? (
          <div className="space-y-5">
            {value!.num < BigInt(0) && <p className="text-sm text-sub">{t('steps.negative')}</p>}
            <div>
              <h3 className="text-sm font-semibold text-body mb-2">{t('steps.intPart')}</h3>
              {div!.steps.length === 0 ? (
                <p className="font-mono text-body">0</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-sm font-mono tabular-nums">
                    <tbody>
                      {div!.steps.map((s, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className="py-1.5 pr-3 text-right text-body whitespace-nowrap">{s.n.toString()} ÷ {sb}</td>
                          <td className="py-1.5 pr-3 text-sub whitespace-nowrap">= {s.q.toString()}</td>
                          <td className="py-1.5 pr-3 text-sub whitespace-nowrap">{t('steps.remainder')}</td>
                          <td className="py-1.5"><span className="inline-block min-w-7 text-center rounded-md bg-primary-soft text-primary font-bold px-1.5">{show({ num: BigInt(s.r), den: BigInt(1) }, sb)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {div!.truncated && <p className="text-xs text-muted mt-2">{t('steps.tooMany')}</p>}
              <p className="text-sm text-body mt-3">
                {t('steps.readUp')} <span className="font-mono font-bold text-fg">{show({ num: intPart(absV), den: BigInt(1) }, sb)}</span>
              </p>
            </div>
            {fr && (
              <div>
                <h3 className="text-sm font-semibold text-body mb-2">{t('steps.fracPart')}</h3>
                <div className="overflow-x-auto">
                  <table className="text-sm font-mono tabular-nums">
                    <tbody>
                      {fr.steps.map((s, i) => (
                        <tr key={i} className={`border-b border-line last:border-0 ${fr.repeatAt >= 0 && i >= fr.repeatAt ? 'bg-subtle' : ''}`}>
                          <td className="py-1.5 px-2 text-right text-body whitespace-nowrap">{dec10(s.frac)} × {sb}</td>
                          <td className="py-1.5 pr-3 text-sub whitespace-nowrap">= {dec10(s.product)}</td>
                          <td className="py-1.5 pr-2 text-sub whitespace-nowrap">{t('steps.take')}</td>
                          <td className="py-1.5"><span className="inline-block min-w-7 text-center rounded-md bg-primary-soft text-primary font-bold px-1.5">{show({ num: BigInt(s.digit), den: BigInt(1) }, sb)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {fr.repeatAt >= 0 && <p className="text-xs text-sub mt-2">{t('steps.repeatFrom', { n: fr.repeatAt + 1 })}</p>}
                {fr.truncated && <p className="text-xs text-muted mt-2">{t('steps.fracLimit', { n: fr.steps.length })}</p>}
                <p className="text-sm text-body mt-3">
                  {t('steps.readDown')} <span className="font-mono font-bold text-fg">{show(absV, sb, { maxFrac: MAX_FRAC })}</span>
                </p>
              </div>
            )}
          </div>
        ) : method === 'place' ? (
          <div className="space-y-3">
            {value!.num < BigInt(0) && <p className="text-sm text-sub">{t('steps.negative')}</p>}
            <p className="text-sm text-body">
              <span className="font-mono font-bold text-fg">{show(absV, sb, { maxFrac: 12 })}</span>
              <sub className="text-muted">{sb}</sub>
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm font-mono tabular-nums">
                <tbody>
                  {terms.map((x, i) => {
                    const B = BigInt(sb)
                    const val = x.power >= 0 ? (BigInt(x.digit) * B ** BigInt(x.power)).toString() : dec10({ num: BigInt(x.digit), den: B ** BigInt(-x.power) })
                    return (
                      <tr key={i} className={`border-b border-line last:border-0 ${x.digit === 0 ? 'text-faint' : 'text-body'}`}>
                        <td className="py-1.5 pr-3 whitespace-nowrap">{show({ num: BigInt(x.digit), den: BigInt(1) }, sb)} × {sb}<sup>{x.power}</sup></td>
                        <td className="py-1.5 whitespace-nowrap">= {val}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-body">
              {t('steps.sum')} <span className="font-mono font-bold text-fg">{dec10(absV)}</span>
            </p>
            {inB && (inB.rep || inB.truncated) && <p className="text-xs text-muted">{t('steps.placeNote')}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            {[4, 3].map((n) => (
              <div key={n}>
                <h3 className="text-sm font-semibold text-body mb-2">{t(n === 4 ? 'steps.toHex' : 'steps.toOct')}</h3>
                <div className="flex flex-wrap gap-2">
                  {groupSteps(binInt, n as 3 | 4).map((g, i) => (
                    <div key={i} className="bg-subtle rounded-xl px-3 py-2 text-center">
                      <div className="font-mono text-sm text-sub">{g.bits}</div>
                      <div className="font-mono font-bold text-fg">{g.digit}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted">{t('steps.groupNote')}</p>
          </div>
        )}
      </div>

      {/* 부호 있는 정수 · 비트 */}
      <div className="ui-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">{t('signedInt.title')}</h2>
          <div className="flex gap-2">
            {WIDTHS.map((w) => <button key={w} onClick={() => setWidth(w)} className={seg(width === w)}>{t('bits', { n: w })}</button>)}
          </div>
        </div>
        {iv === null ? (
          <p className="text-sm text-muted">{t('steps.empty')}</p>
        ) : (
          <>
            <p className="text-sm text-sub">
              {t('signedInt.range', { w: width, min: rg.sMin.toString(), max: rg.sMax.toString(), umax: rg.uMax.toString() })}
              {!isInteger(value!) && <> {t('signedInt.intOnly', { v: iv.toString() })}</>}
            </p>
            {tw!.overflow && (
              <p className="flex gap-2 bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {t('signedInt.overflow', { w: width, v: dec!.twos.toString() })}
              </p>
            )}
            <div className="divide-y divide-line">
              {reps.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="w-32 text-sm text-body">{r.label}</span>
                  {r.bits === null ? (
                    <span className="flex-1 text-sm text-faint">{t('signedInt.na')}</span>
                  ) : (
                    <>
                      <span className="flex-1 font-mono text-sm text-fg break-all">{pat(r.bits)}</span>
                      <span className="font-mono text-sm text-sub">0x{r.bits.toString(16).toUpperCase().padStart(width / 4, '0')}</span>
                      {copyBtn(bitString(r.bits, width), `s-${r.id}`)}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-body mb-1">{t('signedInt.bitView')}</h3>
              <p className="text-xs text-muted mb-3">{t('signedInt.bitHint')}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-3">
                {Array.from({ length: width / 8 }, (_, byte) => (
                  <div key={byte} className="flex gap-0.5">
                    {Array.from({ length: 8 }, (_, j) => {
                      const i = width - 1 - (byte * 8 + j)
                      const on = (tw!.bits >> BigInt(i)) & BigInt(1)
                      return (
                        <Fragment key={i}>
                          {j === 4 && <span className="w-1" />}
                          <button
                            onClick={() => toggleBit(i)}
                            aria-label={t('signedInt.bitLabel', { i, v: on.toString() })}
                            aria-pressed={on === BigInt(1)}
                            className="flex flex-col items-center"
                          >
                            <span className="text-[10px] leading-4 text-faint tabular-nums">{i}</span>
                            <span className={`w-7 h-8 flex items-center justify-center rounded-md font-mono text-sm font-bold transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-track'}`}>
                              {on.toString()}
                            </span>
                          </button>
                        </Fragment>
                      )
                    })}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t('signedInt.msbNote')}</p>
            </div>

            <div className="bg-subtle rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-body mb-2">{t('signedInt.interpret')}</h3>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  [t('signedInt.unsigned'), dec!.unsigned.toString()],
                  [t('signedInt.twos'), dec!.twos.toString()],
                  [t('signedInt.ones'), dec!.ones],
                  [t('signedInt.signMag'), dec!.signMag],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="font-mono font-bold text-fg tabular-nums break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </div>

      {/* IEEE 754 */}
      <div className="ui-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('ieee.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('ieee.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {([32, 64] as const).map((w) => <button key={w} onClick={() => setFWidth(w)} className={seg(fWidth === w)}>{t(`ieee.f${w}`)}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={fText}
            onChange={(e) => setFText(e.target.value)}
            spellCheck={false}
            aria-label={t('ieee.input')}
            placeholder="0.1"
            className={`ui-field px-4 py-3 font-mono flex-1 min-w-40 ${fText.trim() && fNum === null ? 'border-red-500' : ''}`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FLOAT_SAMPLES.map((s) => <button key={s} onClick={() => setFText(s)} className={seg(fText === s)}><span className="font-mono">{s}</span></button>)}
          {value && <button onClick={() => setFText(String(toNumber(value)))} className={seg(false)}>{t('ieee.useCurrent')}</button>}
        </div>
        {fText.trim() && fNum === null && <p className="text-xs text-red-600">{t('ieee.invalid')}</p>}
        {fl && (
          <>
            <div className="overflow-x-auto">
              <div className="inline-flex gap-1 font-mono text-sm min-w-max">
                {[
                  { k: 'sign', bits: String(fl.sign), cls: 'bg-primary text-white' },
                  { k: 'exponent', bits: fl.expBits, cls: 'bg-primary-soft text-primary' },
                  { k: 'mantissa', bits: fl.mantBits, cls: 'bg-soft text-body' },
                ].map((p) => (
                  <div key={p.k}>
                    <div className="text-xs text-muted mb-1 font-sans">{t(`ieee.${p.k}`)} ({p.bits.length})</div>
                    <div className={`rounded-lg px-2 py-1.5 tracking-wider ${p.cls}`}>{p.bits}</div>
                  </div>
                ))}
              </div>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted">{t('ieee.kind')}</dt><dd className="text-fg font-medium">{kindLabel}</dd></div>
              <div>
                <dt className="text-muted">{t('ieee.hex')}</dt>
                <dd className="flex items-center gap-2"><span className="font-mono text-fg">0x{fl.hex}</span>{copyBtn(`0x${fl.hex}`, "ieee-hex")}</dd>
              </div>
              <div>
                <dt className="text-muted">{t('ieee.exponent')}</dt>
                <dd className="font-mono text-fg">
                  {fl.kind === 'normal' ? t('ieee.expCalc', { raw: fl.expRaw, bias: fl.bias, e: fl.exp }) : fl.kind === 'subnormal' ? t('ieee.expSub', { e: fl.exp }) : `${fl.expRaw}`}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t('ieee.formula')}</dt>
                <dd className="font-mono text-fg break-all">
                  {fl.kind === 'normal' || fl.kind === 'subnormal'
                    ? <>(−1)<sup>{fl.sign}</sup> × {fl.kind === 'normal' ? '1' : '0'}.{fl.mantBits.replace(/0+$/, '') || '0'}<sub>2</sub> × 2<sup>{fl.exp}</sup></>
                    : kindLabel}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">{t('ieee.stored')}</dt>
                <dd className="flex items-start gap-2">
                  <span className="font-mono text-fg break-all flex-1">
                    {fl.stored ? (fl.sign && fl.stored.num === BigInt(0) ? '-0' : show(fl.stored, 10, { maxFrac: 80 })) : kindLabel}
                  </span>
                </dd>
                {inexact && (
                  <p className="text-xs text-sub mt-1">{t('ieee.inexact')}</p>
                )}
              </div>
            </dl>
          </>
        )}
      </div>

      {/* 텍스트 ↔ UTF-8 */}
      <div className="ui-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-fg">{t('text.title')}</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label htmlFor="bc-text" className="block text-sm font-medium text-body">{t('text.toBytes')}</label>
            <textarea id="bc-text" value={text} onChange={(e) => setText(e.target.value)} rows={2} className="ui-field px-4 py-3" />
            {([16, 2, 10] as const).map((b) => (
              <div key={b}>
                <div className="text-xs text-muted mb-1">{baseName(b)} · {t('text.bytes', { n: enc.length })}</div>
                <div className="flex gap-2">
                  <code className="flex-1 bg-subtle rounded-xl px-3 py-2 font-mono text-sm text-fg break-all">{showBytes(enc, b) || '—'}</code>
                  {copyBtn(showBytes(enc, b), `tb${b}`)}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="bc-bytes" className="text-sm font-medium text-body">{t('text.fromBytes')}</label>
              <div className="flex gap-2">
                {([16, 2] as const).map((b) => <button key={b} onClick={() => setBytesBase(b)} className={seg(bytesBase === b)}>{baseName(b)}</button>)}
              </div>
            </div>
            <textarea id="bc-bytes" value={bytesIn} onChange={(e) => setBytesIn(e.target.value)} rows={2} spellCheck={false} className="ui-field px-4 py-3 font-mono" />
            <div className="flex gap-2">
              <div className="flex-1 bg-subtle rounded-xl px-3 py-2 text-fg break-all min-h-10">
                {parsedBytes === null ? <span className="text-red-600 text-sm">{t('text.badBytes')}</span>
                  : decoded === null ? <span className="text-red-600 text-sm">{t('text.badUtf8')}</span>
                  : decoded || <span className="text-faint">—</span>}
              </div>
              {copyBtn(decoded ?? "", "fromBytes")}
            </div>
            <p className="text-xs text-muted">{t('text.note')}</p>
          </div>
        </div>
      </div>

      {/* 자주 쓰는 값 */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold text-fg mb-4">{t('commonValues')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {[10, 2, 8, 16].map((b) => <th key={b} className="text-left py-2 px-3 text-body font-semibold">{baseName(b)}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMMON.map((n) => (
                <tr key={n} onClick={() => setValue(String(n))} className="border-b border-line hover:bg-subtle cursor-pointer">
                  {[10, 2, 8, 16].map((b) => (
                    <td key={b} className={`py-2 px-3 font-mono ${b === 10 ? 'text-fg' : 'text-body'}`}>{n.toString(b).toUpperCase()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <GuideSection namespace="baseConverter" defaultOpen />
    </div>
  )
}
