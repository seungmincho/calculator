'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useTranslations } from '@/lib/i18n'
import { useSearchParams } from '@/hooks/useSearchParams'
import { Copy, Check, RotateCcw } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import {
  chosung, jamoString, composeJamo, composeKeys, stats as textStats, codePoint, codePoints, nfdEscaped,
  romanize, decompose, nfc, josa, JOSA_PAIRS, JOSA_SNIPPET,
} from '@/utils/koreanSyllable'

const SAMPLE = '안녕하세요 대한민국 닭갈비'
const SAMPLES = ['대한민국', '종로구 청계천', '닭갈비 먹고 싶다', '같이 해돋이 보러 가요']
const TABLE_MAX = 60

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-sub hover:bg-subtle'}`}
    >
      {label}
    </button>
  )
}

export default function KoreanSyllable() {
  const t = useTranslations('koreanSyllable')
  const searchParams = useSearchParams()
  const ready = useRef(false)

  const [input, setInput] = useState(SAMPLE)
  const [keepOther, setKeepOther] = useState(true)
  const [splitCompound, setSplitCompound] = useState(false)
  const [capitalize, setCapitalize] = useState(false)
  const [composeMode, setComposeMode] = useState<'jamo' | 'keys'>('jamo')
  const [composeInput, setComposeInput] = useState('ㅎㅏㄴㄱㅡㄹ ㄷㅏㄹㄱ')
  const [word, setWord] = useState('서울')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // URL → 입력 (공유 링크·뒤로가기). 자기 replaceState로 돌아온 값은 같아서 무해
  useEffect(() => {
    const q = searchParams.get('t')
    if (q !== null) setInput(q)
  }, [searchParams])

  // 입력 → URL (샘플이면 생략). 입력이 샘플에서 한 번 바뀌기 전엔 URL을 건드리지 않음(공유 링크 t 보존)
  useEffect(() => {
    if (!ready.current) { if (input === SAMPLE) return; ready.current = true }
    const p = new URLSearchParams(window.location.search)
    if (input && input !== SAMPLE) p.set('t', input)
    else p.delete('t')
    const qs = p.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [input])

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
    } catch { /* 권한 없음: 무시 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      type="button"
      onClick={() => copy(text, id)}
      disabled={!text}
      aria-label={t('copy')}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-soft hover:bg-subtle text-body rounded-lg text-sm disabled:opacity-40 transition-colors"
    >
      {copiedId === id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
      <span>{copiedId === id ? t('copied') : t('copy')}</span>
    </button>
  )

  const isNfd = input !== nfc(input)
  const st = useMemo(() => textStats(input), [input])

  const outputs = useMemo(() => [
    { id: 'cho', label: t('out.chosung'), value: chosung(input, keepOther), big: true,
      opt: <Toggle on={keepOther} onClick={() => setKeepOther((v) => !v)} label={t('opt.keepOther')} /> },
    { id: 'jamo', label: t('out.jamo'), value: jamoString(input, splitCompound),
      opt: <Toggle on={splitCompound} onClick={() => setSplitCompound((v) => !v)} label={t('opt.splitCompound')} /> },
    { id: 'roman', label: t('out.roman'), value: romanize(input, capitalize), note: t('romanNote'),
      opt: <Toggle on={capitalize} onClick={() => setCapitalize((v) => !v)} label={t('opt.capitalize')} /> },
    { id: 'code', label: t('out.code'), value: codePoints(input), mono: true },
    { id: 'nfd', label: t('out.nfd'), value: nfdEscaped(input), mono: true },
  ], [input, keepOther, splitCompound, capitalize, t])

  const rows = useMemo(() => Array.from(nfc(input)).filter((c) => c.trim()).slice(0, TABLE_MAX), [input])
  const totalRows = useMemo(() => Array.from(nfc(input)).filter((c) => c.trim()).length, [input])

  const composed = composeMode === 'jamo' ? composeJamo(composeInput) : composeKeys(composeInput)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 입력 */}
        <div className="lg:col-span-1">
          <div className="ui-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="ks-input" className="text-sm font-medium text-fg">{t('input')}</label>
              <button type="button" onClick={() => setInput('')} aria-label={t('reset')} className="p-1 text-faint hover:text-body">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <textarea
              id="ks-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholder')}
              rows={5}
              className="ui-field w-full px-4 py-3 resize-y"
            />
            {isNfd && (
              <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm space-y-2">
                <p>{t('nfd.notice')}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setInput(nfc(input))} className="ui-btn px-3 py-1.5 text-sm">{t('nfd.fix')}</button>
                  <CopyBtn text={nfc(input)} id="nfc" />
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-sub mb-2">{t('examples')}</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${input === s ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <dl className="pt-4 border-t border-line grid grid-cols-3 gap-2 text-center">
              {([['chars', st.chars], ['syllables', st.syllables], ['keystrokes', st.keystrokes]] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{t(`stats.${k}`)}</dt>
                  <dd className="text-lg font-bold text-fg tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* 결과 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="ui-card divide-y divide-line">
            {outputs.map((o) => (
              <div key={o.id} className="p-5 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-sub">{o.label}</h2>
                    {o.opt}
                  </div>
                  <CopyBtn text={o.value} id={o.id} />
                </div>
                <p className={`break-all text-fg ${o.big ? 'text-3xl font-bold tracking-wider' : o.mono ? 'font-mono text-sm' : 'text-lg'}`}>
                  {o.value || <span className="text-faint text-base font-normal">{t('empty')}</span>}
                </p>
                {o.note && <p className="text-xs text-muted">{o.note}</p>}
              </div>
            ))}
          </div>

          {rows.length > 0 && (
            <div className="ui-card p-5">
              <h2 className="text-sm font-semibold text-sub mb-3">{t('table.title')}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th className="py-2 pr-3 font-medium">{t('table.char')}</th>
                      <th className="py-2 pr-3 font-medium">{t('chosung')}</th>
                      <th className="py-2 pr-3 font-medium">{t('jungsung')}</th>
                      <th className="py-2 pr-3 font-medium">{t('jongsung')}</th>
                      <th className="py-2 font-medium">{t('table.code')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c, i) => {
                      const d = decompose(c)
                      return (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className="py-2 pr-3 text-xl font-bold text-fg">{c}</td>
                          <td className="py-2 pr-3 text-lg text-fg">{d?.cho ?? '-'}</td>
                          <td className="py-2 pr-3 text-lg text-fg">{d?.jung ?? '-'}</td>
                          <td className="py-2 pr-3 text-lg text-fg">{d ? d.jong || <span className="text-faint text-sm">{t('table.none')}</span> : '-'}</td>
                          <td className="py-2 font-mono text-xs text-sub">{codePoint(c)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {totalRows > TABLE_MAX && <p className="text-xs text-muted mt-2">{t('table.more', { n: TABLE_MAX })}</p>}
            </div>
          )}
        </div>
      </div>

      {/* 자모 합치기 */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="ui-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('compose.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('compose.desc')}</p>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-soft rounded-xl" role="tablist">
            {(['jamo', 'keys'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={composeMode === m}
                onClick={() => {
                  setComposeMode(m)
                  setComposeInput(m === 'jamo' ? 'ㅎㅏㄴㄱㅡㄹ ㄷㅏㄹㄱ' : 'dkssudgktpdy')
                }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${composeMode === m ? 'bg-primary text-white' : 'text-body hover:bg-subtle'}`}
              >
                {t(`compose.${m}`)}
              </button>
            ))}
          </div>
          <input
            value={composeInput}
            onChange={(e) => setComposeInput(e.target.value)}
            aria-label={t(`compose.${composeMode}`)}
            className="ui-field w-full px-4 py-3 font-mono"
          />
          <div className="bg-subtle rounded-2xl p-5 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold text-fg break-all">{composed || <span className="text-faint text-base font-normal">{t('empty')}</span>}</p>
            <CopyBtn text={composed} id="compose" />
          </div>
        </div>

        {/* 조사 자동 선택 */}
        <div className="ui-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('josa.title')}</h2>
            <p className="text-sm text-muted mt-1">{t('josa.desc')}</p>
          </div>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            aria-label={t('josa.word')}
            placeholder={t('josa.word')}
            className="ui-field w-full px-4 py-3"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {JOSA_PAIRS.map((p) => {
              const w = `${word.trim()}${josa(word, p)}`
              const id = `josa-${p[1]}`
              return (
                <button
                  key={p[1]}
                  type="button"
                  onClick={() => copy(w, id)}
                  disabled={!word.trim()}
                  className="text-left px-3 py-2 rounded-xl bg-soft hover:bg-subtle transition-colors disabled:opacity-40"
                >
                  <span className="block text-xs text-muted">{p[0]}/{p[1]}</span>
                  <span className="block text-base font-semibold text-fg break-all">{copiedId === id ? t('copied') : w}</span>
                </button>
              )
            })}
          </div>
          <details className="bg-subtle rounded-2xl p-4">
            <summary className="cursor-pointer text-sm font-medium text-body">{t('josa.snippet')}</summary>
            <pre className="mt-3 text-xs font-mono text-body overflow-x-auto whitespace-pre">{JOSA_SNIPPET}</pre>
            <div className="mt-2"><CopyBtn text={JOSA_SNIPPET} id="snippet" /></div>
          </details>
        </div>
      </div>

      <GuideSection namespace="koreanSyllable" defaultOpen />
    </div>
  )
}
