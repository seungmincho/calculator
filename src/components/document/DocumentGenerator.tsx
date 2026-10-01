'use client'

/**
 * 문서 작성기 공통 엔진: 좌 입력 / 우 A4 실시간 미리보기(모바일은 탭), 도장, 자동 저장, PDF·인쇄, 가이드.
 * 양식 1개 = DocTemplate 객체. 사용 예는 src/components/IouGenerator.tsx.
 *
 * 개인정보: 입력값은 이 브라우저 localStorage에만 저장(양식별 키). URL에는 아무것도 넣지 않음.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { Download, Printer, RotateCcw, Link2, Check as CheckIcon } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { todayKST } from '@/utils/dday'
import { mergeSaved } from '@/utils/document'
import { PAPER_W, exportPdf, printPaper, nameStamp, loadStampImage } from './paper'
import { segCls } from './fields'

export type TFn = ReturnType<typeof useTranslations>

export interface Insight {
  level: 'error' | 'warn' | 'info'
  text: string
}

export interface Signer {
  id: string // Paper의 stamps[id]로 조회
  name: string
}

export interface DocTemplate<T extends object> {
  /** localStorage 키 접미사 ('iou' → docgen_iou) */
  id: string
  /** i18n 네임스페이스: title, description, guide.* 를 읽음 */
  ns: string
  /** 기본값. today = '' (서버 렌더) 또는 'YYYY-MM-DD' (브라우저) */
  initial: (today: string) => T
  /** 입력 폼 (Section·PartyFields 등 fields.tsx 부품으로 구성) */
  Form: ComponentType<{ v: T; set: (patch: Partial<T>) => void; t: TFn }>
  /** A4 본문 — <Page>로 감싸 반환, 서명란은 <Seal name stamp={stamps[id]} /> */
  Paper: ComponentType<{ v: T; stamps: Record<string, string> }>
  /** 도장 찍을 사람들. [0] = 업로드 도장의 주인 */
  signers: (v: T) => Signer[]
  /** 검사·안내 (error는 맨 위 빨강, warn 노랑, info 회색) */
  insights?: (v: T, t: TFn) => Insight[]
  /** 확장자 없는 파일명 — docFileName('차용증', 이름, 날짜) */
  fileName: (v: T) => string
}

type StampMode = 'auto' | 'image' | 'none'
interface Saved<T> {
  v: T
  stampMode: StampMode
  stampImage: string
}

const INSIGHT_CLS: Record<Insight['level'], string> = {
  error: 'bg-red-50 text-red-700',
  warn: 'bg-amber-50 text-amber-800',
  info: 'bg-subtle text-sub',
}

export default function DocumentGenerator<T extends object>({ template }: { template: DocTemplate<T> }) {
  const { id, ns, initial, Form, Paper, signers, insights, fileName } = template
  const t = useTranslations(ns)
  const c = useTranslations('documentGenerator')
  const key = `docgen_${id}`

  const [v, setV] = useState<T>(() => initial(''))
  const [stampMode, setStampMode] = useState<StampMode>('auto')
  const [stampImage, setStampImage] = useState('')
  const [stamps, setStamps] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<'' | 'copied' | 'pdfError'>('')
  const [zoom, setZoom] = useState(0.5)
  const boxRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // ── 저장값 복원 (마운트 후: 정적 HTML과 어긋나지 않게) ───────────────────
  useEffect(() => {
    const base = initial(todayKST())
    try {
      const raw = localStorage.getItem(key)
      const s = raw ? (JSON.parse(raw) as Partial<Saved<T>>) : null
      setV(mergeSaved(base, s?.v))
      if (s?.stampMode === 'auto' || s?.stampMode === 'image' || s?.stampMode === 'none') setStampMode(s.stampMode)
      if (typeof s?.stampImage === 'string') setStampImage(s.stampImage)
    } catch {
      setV(base)
    }
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(key, JSON.stringify({ v, stampMode, stampImage } satisfies Saved<T>))
    } catch {
      // 저장 공간 부족 등: 화면의 내용은 그대로
    }
  }, [key, v, stampMode, stampImage, ready])

  const set = useCallback((patch: Partial<T>) => setV((d) => ({ ...d, ...patch })), [])

  // ── 도장 ────────────────────────────────────────────────────────────────
  const people = signers(v)
  const peopleKey = JSON.stringify(people)
  useEffect(() => {
    const list: Signer[] = JSON.parse(peopleKey)
    if (stampMode === 'none') return setStamps({})
    if (stampMode === 'image') return setStamps(stampImage && list[0] ? { [list[0].id]: stampImage } : {})
    let alive = true
    Promise.all(list.map(async (p) => [p.id, p.name.trim() ? await nameStamp(p.name).catch(() => '') : ''] as const)).then((pairs) => {
      if (alive) setStamps(Object.fromEntries(pairs.filter(([, s]) => s)))
    })
    return () => {
      alive = false
    }
  }, [peopleKey, stampMode, stampImage])

  const onStampFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setStampImage(await loadStampImage(f))
      setStampMode('image')
    } catch {
      // 읽을 수 없는 이미지: 무시
    }
  }, [])

  // ── 미리보기 축소 (A4 폭을 상자 폭에 맞춤) ────────────────────────────────
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      if (w > 0) setZoom(Math.min(1, w / PAPER_W))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── 동작 ────────────────────────────────────────────────────────────────
  const name = fileName(v)
  const onPdf = useCallback(async () => {
    if (!paperRef.current || busy) return
    setBusy(true)
    setFlash('')
    setView('preview') // 모바일: 캡처 대상이 display:none이 아니게
    try {
      await new Promise((r) => setTimeout(r, 50))
      await exportPdf(paperRef.current, name)
    } catch {
      setFlash('pdfError')
    } finally {
      setBusy(false)
    }
  }, [busy, name])

  const onPrint = useCallback(() => {
    if (paperRef.current) printPaper(paperRef.current, name)
  }, [name])

  const onReset = useCallback(() => {
    if (!window.confirm(c('resetConfirm'))) return
    setV(initial(todayKST()))
    setStampMode('auto')
    setStampImage('')
  }, [c, initial])

  const onCopyLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;left:-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setFlash('copied')
    setTimeout(() => setFlash(''), 2000)
  }, [])

  const notes = insights ? insights(v, t) : []
  const order = { error: 0, warn: 1, info: 2 }
  const sorted = [...notes].sort((a, b) => order[a.level] - order[b.level])

  const sections = t.raw('guide.sections') as { title: string; items: string[] }[] | undefined
  const faq = t.raw('guide.faq.items') as { q: string; a: string }[] | undefined
  const sources = t.raw('guide.sources') as { label: string; url: string }[] | undefined
  const related = t.raw('guide.related') as { label: string; href: string }[] | undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={onReset} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2 text-sm">
            <RotateCcw className="w-4 h-4" />
            {c('reset')}
          </button>
          <button onClick={onCopyLink} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2 text-sm">
            {flash === 'copied' ? <CheckIcon className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            {flash === 'copied' ? c('linkCopied') : c('copyLink')}
          </button>
          <button onClick={onPrint} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2 text-sm">
            <Printer className="w-4 h-4" />
            {c('print')}
          </button>
          <button onClick={onPdf} disabled={busy} className="ui-btn flex items-center gap-1.5 px-4 py-2 text-sm">
            <Download className="w-4 h-4" />
            {busy ? c('pdfBusy') : c('pdf')}
          </button>
        </div>
      </div>
      {flash === 'pdfError' && <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">{c('pdfError')}</p>}

      {/* 모바일: 입력/미리보기 전환 */}
      <div className="flex gap-2 lg:hidden">
        <button onClick={() => setView('edit')} className={segCls(view === 'edit')} aria-pressed={view === 'edit'}>{c('view.edit')}</button>
        <button onClick={() => setView('preview')} className={segCls(view === 'preview')} aria-pressed={view === 'preview'}>{c('view.preview')}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── 입력 ─────────────────────────────────────────────────────── */}
        <div className={`lg:col-span-2 space-y-6 min-w-0 ${view === 'preview' ? 'hidden lg:block' : ''}`}>
          {sorted.length > 0 && (
            <ul className="space-y-2" aria-live="polite">
              {sorted.map((n) => (
                <li key={n.text} className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${INSIGHT_CLS[n.level]}`}>{n.text}</li>
              ))}
            </ul>
          )}

          <Form v={v} set={set} t={t} />

          {/* 도장 */}
          <section className="ui-card p-5 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-fg">{c('stamp.title')}</h2>
              <p className="text-xs text-muted mt-1">{c(`stamp.hint.${stampMode}`, { name: people[0]?.name || c('stamp.mainSigner') })}</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={c('stamp.title')}>
              {(['auto', 'image', 'none'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => (m === 'image' && !stampImage ? fileInput.current?.click() : setStampMode(m))}
                  className={segCls(stampMode === m)}
                  aria-pressed={stampMode === m}
                >
                  {c(`stamp.${m}`)}
                </button>
              ))}
            </div>
            {stampMode === 'image' && stampImage && (
              <div className="bg-subtle rounded-2xl p-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stampImage} alt={c('stamp.image')} className="w-12 h-12 object-contain bg-surface rounded-lg border border-line" />
                <button onClick={() => fileInput.current?.click()} className="ui-btn-soft px-3 py-1.5 text-xs">{c('stamp.change')}</button>
              </div>
            )}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onStampFile} />
            <Link href="/stamp-generator/" className="inline-block text-xs text-primary hover:underline">{c('stamp.make')}</Link>
          </section>

          <p className="text-xs text-muted leading-relaxed">{c('privacyNote')}</p>
        </div>

        {/* ── 미리보기 ─────────────────────────────────────────────────── */}
        <div className={`lg:col-span-3 min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${view === 'edit' ? 'hidden lg:block' : ''}`}>
          <div className="ui-card p-3 sm:p-4 bg-subtle">
            <div ref={boxRef} className="overflow-hidden">
              <div data-paper-zoom="" style={{ zoom }}>
                <div ref={paperRef} style={{ width: PAPER_W, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <Paper v={v} stamps={stamps} />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-2">{c('previewNote')}</p>
        </div>
      </div>

      {/* 가이드 */}
      {(sections || faq) && (
        <div className="ui-card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
            {typeof t.raw('guide.intro') === 'string' && <p className="text-sm text-sub mt-2 leading-relaxed">{t('guide.intro')}</p>}
          </div>
          {Array.isArray(sections) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((s) => (
                <div key={s.title} className="bg-subtle rounded-2xl p-5">
                  <h3 className="font-semibold text-fg mb-3">{s.title}</h3>
                  <ul className="space-y-1.5 list-disc pl-4 text-sm text-sub">
                    {s.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {Array.isArray(faq) && (
            <div>
              <h3 className="font-semibold text-fg mb-3">{t('guide.faq.title')}</h3>
              <dl className="space-y-4">
                {faq.map((f) => (
                  <div key={f.q}>
                    <dt className="text-sm font-medium text-body">{f.q}</dt>
                    <dd className="text-sm text-sub mt-1 leading-relaxed">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {Array.isArray(related) && (
            <div>
              <h3 className="font-semibold text-fg mb-3">{c('related')}</h3>
              <div className="flex flex-wrap gap-2">
                {related.map((r) => (
                  <Link key={r.href} href={r.href} className="ui-btn-soft px-3 py-2 text-sm">{r.label}</Link>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(sources) && (
            <div>
              <h3 className="text-sm font-semibold text-fg mb-2">{c('sources')}</h3>
              <ul className="space-y-1 text-xs text-muted">
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">{s.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-faint">{c('disclaimer')}</p>
        </div>
      )}
    </div>
  )
}
