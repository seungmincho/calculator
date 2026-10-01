'use client'

import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import { Plus, Trash2, Download, Printer, FilePlus2, X } from 'lucide-react'
import { formatBizNo, validate as validateBizNo } from '@/utils/businessNumber'
import {
  computeTotals, amountInKorean, nextDocNumber, won,
  type DocType, type VatMode, type VatBasis, type DocTotals,
} from '@/utils/invoiceDoc'

// ── Types ──────────────────────────────────────────────────────────────────

interface Party {
  name: string
  bizNo: string
  rep: string
  address: string
  bizType: string
  bizItem: string
  phone: string
  email: string
}

interface Item {
  id: string
  name: string
  spec: string
  qty: number
  price: number
  taxable: boolean
}

interface Doc {
  type: DocType
  number: string
  date: string
  validUntil: string
  delivery: string
  payment: string
  dueDate: string
  account: string
  supplier: Party
  client: Party
  items: Item[]
  vatMode: VatMode
  basis: VatBasis
  notes: string
  stamp: string // dataURL (축소·흰 배경 투명 처리)
}

// ── Helpers ────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'invoiceGenerator_draft'
const CLIENTS_KEY = 'invoiceGenerator_clients'
const LAST_NO_KEY = 'invoiceGenerator_lastNo'
const LEGACY_KEY = 'invoiceGenerator_saved'
const PAPER_W = 794 // A4 210mm @96dpi
const PAPER_H = 1123

const EMPTY_PARTY: Party = { name: '', bizNo: '', rep: '', address: '', bizType: '', bizItem: '', phone: '', email: '' }

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const plusDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return ymd(d)
}
const newItem = (name = '', price = 0): Item => ({
  id: Math.random().toString(36).slice(2),
  name,
  spec: '',
  qty: 1,
  price,
  taxable: true,
})
const dots = (s: string) => s.replace(/-/g, '. ')

function blankDoc(sampleItem: string): Doc {
  return {
    type: 'quote',
    number: '',
    date: '',
    validUntil: '',
    delivery: '',
    payment: '',
    dueDate: '',
    account: '',
    supplier: { ...EMPTY_PARTY },
    client: { ...EMPTY_PARTY },
    items: [sampleItem ? newItem(sampleItem, 1_000_000) : newItem()],
    vatMode: 'excl',
    basis: 'line',
    notes: '',
    stamp: '',
  }
}

/** 저장된 값(구버전 포함)을 현재 형태로 */
function restore(raw: Partial<Doc>, base: Doc): Doc {
  const items = Array.isArray(raw.items) && raw.items.length
    ? raw.items.map((i) => ({ ...newItem(), ...i, qty: Number(i.qty) || 0, price: Number(i.price) || 0 }))
    : base.items
  return {
    ...base,
    ...raw,
    supplier: { ...EMPTY_PARTY, ...raw.supplier },
    client: { ...EMPTY_PARTY, ...raw.client },
    items,
  }
}

type LegacyCompany = { name?: string; regNumber?: string; representative?: string; address?: string; phone?: string; email?: string }
const fromLegacy = (c: LegacyCompany = {}): Party => ({
  ...EMPTY_PARTY,
  name: c.name ?? '',
  bizNo: c.regNumber ?? '',
  rep: c.representative ?? '',
  address: c.address ?? '',
  phone: c.phone ?? '',
  email: c.email ?? '',
})

/** 도장 이미지: 최대 200px로 줄이고 흰 배경을 투명하게 */
async function loadStamp(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const s = Math.min(1, 200 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * s))
    c.height = Math.max(1, Math.round(img.height * s))
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0, c.width, c.height)
    const d = ctx.getImageData(0, 0, c.width, c.height)
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 225 && d.data[i + 1] > 225 && d.data[i + 2] > 225) d.data[i + 3] = 0
    }
    ctx.putImageData(d, 0, 0)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Paper (문서 본문: 테마와 무관하게 흰 종이, 인라인 스타일 → 인쇄 iframe·PDF 캡처에 그대로 복제) ──

const TITLES: Record<DocType, string> = { quote: '견 적 서', statement: '거 래 명 세 서', bill: '청 구 서' }
const DATE_LABEL: Record<DocType, string> = { quote: '견적일자', statement: '거래일자', bill: '청구일자' }
const LINE = '1px solid #555'
const th: CSSProperties = { border: LINE, background: '#f2f4f6', padding: '6px 6px', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }
const td: CSSProperties = { border: LINE, padding: '6px 6px', wordBreak: 'keep-all', overflowWrap: 'anywhere' }
const num: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }

function PartyTable({ label, p, stamp }: { label: string; p: Party; stamp?: string }) {
  return (
    <table style={table}>
      <colgroup>
        <col style={{ width: 26 }} />
        <col style={{ width: 62 }} />
        <col />
        <col style={{ width: 46 }} />
        <col style={{ width: '34%' }} />
      </colgroup>
      <tbody>
        <tr>
          <td rowSpan={5} style={{ ...th, padding: '4px 2px', lineHeight: 1.5 }}>
            {label.split('').map((ch, i) => <div key={i}>{ch}</div>)}
          </td>
          <td style={th}>등록번호</td>
          <td colSpan={3} style={{ ...td, fontWeight: 600, letterSpacing: '0.05em' }}>{p.bizNo}</td>
        </tr>
        <tr>
          <td style={th}>상호</td>
          <td style={td}>{p.name}</td>
          <td style={th}>성명</td>
          <td style={{ ...td, position: 'relative' }}>
            {p.rep}
            {stamp !== undefined && <span style={{ float: 'right', color: '#888' }}>(인)</span>}
            {stamp && (
              <img src={stamp} alt="" style={{ position: 'absolute', right: -4, top: -14, width: 54, height: 54, objectFit: 'contain', maxWidth: 'none' }} />
            )}
          </td>
        </tr>
        <tr>
          <td style={th}>주소</td>
          <td colSpan={3} style={td}>{p.address}</td>
        </tr>
        <tr>
          <td style={th}>업태</td>
          <td style={td}>{p.bizType}</td>
          <td style={th}>종목</td>
          <td style={td}>{p.bizItem}</td>
        </tr>
        <tr>
          <td style={th}>연락처</td>
          <td colSpan={3} style={td}>{[p.phone, p.email].filter(Boolean).join(' · ')}</td>
        </tr>
      </tbody>
    </table>
  )
}

function Paper({ doc, totals }: { doc: Doc; totals: DocTotals }) {
  const withVat = doc.vatMode !== 'none'
  const rows = doc.items.map((it, i) => ({ it, l: totals.lines[i] })).filter(({ it, l }) => it.name || l.total)
  const pad = Math.max(0, 10 - rows.length)
  const cols = withVat ? 7 : 6
  const metaRow = (k: string, v: string) =>
    v ? (
      <tr key={k}>
        <td style={{ ...th, width: 74 }}>{k}</td>
        <td style={td}>{v}</td>
      </tr>
    ) : null

  return (
    <div
      id="invoice-paper"
      style={{
        width: PAPER_W,
        minHeight: PAPER_H,
        boxSizing: 'border-box',
        padding: '44px 42px',
        background: '#ffffff',
        color: '#111111',
        fontFamily: 'Pretendard, "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 30, fontWeight: 700, letterSpacing: '0.3em', marginBottom: 6 }}>
        {TITLES[doc.type]}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: '#555', marginBottom: 14 }}>No. {doc.number}</div>

      {doc.type === 'quote' ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ width: '42%' }}>
            <div style={{ fontSize: 17, fontWeight: 700, borderBottom: '1px solid #111', paddingBottom: 4, marginBottom: 10 }}>
              {doc.client.name || ' '} <span style={{ fontWeight: 400, fontSize: 14 }}>귀하</span>
            </div>
            <table style={table}>
              <tbody>
                {metaRow(DATE_LABEL.quote, dots(doc.date))}
                {metaRow('유효기간', doc.validUntil ? `${dots(doc.validUntil)} 까지` : '')}
                {metaRow('납기', doc.delivery)}
                {metaRow('결제조건', doc.payment)}
              </tbody>
            </table>
            <div style={{ marginTop: 12 }}>아래와 같이 견적합니다.</div>
          </div>
          <div style={{ flex: 1 }}>
            <PartyTable label="공급자" p={doc.supplier} stamp={doc.stamp} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            {DATE_LABEL[doc.type]}: {dots(doc.date)}
            {doc.type === 'bill' && doc.dueDate && <span style={{ marginLeft: 16 }}>결제기한: {dots(doc.dueDate)}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <PartyTable label="공급자" p={doc.supplier} stamp={doc.stamp} />
            </div>
            <div style={{ flex: 1 }}>
              <PartyTable label="공급받는자" p={doc.client} />
            </div>
          </div>
          {doc.type === 'bill' && <div style={{ marginBottom: 10 }}>아래와 같이 청구합니다.</div>}
        </>
      )}

      {/* 합계금액 */}
      <table style={{ ...table, marginBottom: 12 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 150, fontSize: 13 }}>
              합계금액
              <div style={{ fontSize: 10, fontWeight: 400 }}>
                {doc.vatMode === 'none' ? '' : '(공급가액 + 세액)'}
              </div>
            </td>
            <td style={{ ...td, fontSize: 15, fontWeight: 700 }}>
              {amountInKorean(totals.total) || '금 영원정'}
              <span style={{ fontWeight: 400, marginLeft: 8 }}>(₩{won(totals.total)})</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 품목 */}
      <table style={table}>
        <colgroup>
          <col style={{ width: 32 }} />
          <col />
          <col style={{ width: 80 }} />
          <col style={{ width: 52 }} />
          <col style={{ width: 92 }} />
          <col style={{ width: 104 }} />
          {withVat && <col style={{ width: 88 }} />}
        </colgroup>
        <thead>
          <tr>
            <th style={th}>No</th>
            <th style={th}>품목</th>
            <th style={th}>규격</th>
            <th style={th}>수량</th>
            <th style={th}>단가</th>
            <th style={th}>{withVat ? '공급가액' : '금액'}</th>
            {withVat && <th style={th}>세액</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ it, l }, i) => (
            <tr key={it.id}>
              <td style={{ ...td, textAlign: 'center' }}>{i + 1}</td>
              <td style={td}>
                {it.name}
                {withVat && !it.taxable && <span style={{ color: '#666' }}> (면세)</span>}
              </td>
              <td style={{ ...td, textAlign: 'center' }}>{it.spec}</td>
              <td style={num}>{it.qty.toLocaleString('ko-KR')}</td>
              <td style={num}>{won(it.price)}</td>
              <td style={num}>{won(l.supply)}</td>
              {withVat && <td style={num}>{won(l.vat)}</td>}
            </tr>
          ))}
          {Array.from({ length: pad }, (_, i) => (
            <tr key={`pad${i}`}>
              {Array.from({ length: cols }, (_, j) => (
                <td key={j} style={td}>{' '}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={th}>합 계</td>
            <td style={{ ...num, fontWeight: 700 }}>{won(totals.supply)}</td>
            {withVat && <td style={{ ...num, fontWeight: 700 }}>{won(totals.vat)}</td>}
          </tr>
        </tbody>
      </table>
      {doc.vatMode === 'incl' && (
        <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>* 단가는 부가세 포함 금액입니다.</div>
      )}

      {(doc.account || doc.notes) && (
        <table style={{ ...table, marginTop: 12 }}>
          <tbody>
            {doc.account && (
              <tr>
                <td style={{ ...th, width: 90 }}>입금계좌</td>
                <td style={td}>{doc.account}</td>
              </tr>
            )}
            {doc.notes && (
              <tr>
                <td style={{ ...th, width: 90 }}>비고</td>
                <td style={{ ...td, whiteSpace: 'pre-wrap', minHeight: 50 }}>{doc.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {doc.type === 'statement' && (
        <div style={{ textAlign: 'right', marginTop: 28 }}>
          인수자 <span style={{ display: 'inline-block', width: 140, borderBottom: '1px solid #111' }}>{' '}</span> (인)
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function InvoiceGenerator() {
  const t = useTranslations('invoiceGenerator')
  const [doc, setDoc] = useState<Doc>(() => blankDoc(t('sample.item')))
  const [clients, setClients] = useState<Party[]>([])
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [busy, setBusy] = useState(false)
  const [pdfError, setPdfError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const boxRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const stampInput = useRef<HTMLInputElement>(null)

  const totals = computeTotals(doc.items, doc.vatMode, doc.basis)

  // ── localStorage (mount 이후) ──────────────────────────────────────────
  useEffect(() => {
    const today = ymd(new Date())
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        setDoc((d) => restore(JSON.parse(raw), d))
      } else {
        const number = nextDocNumber(today, localStorage.getItem(LAST_NO_KEY))
        localStorage.setItem(LAST_NO_KEY, number)
        let supplier = EMPTY_PARTY
        let client = EMPTY_PARTY
        const legacy = localStorage.getItem(LEGACY_KEY)
        if (legacy) {
          const l = JSON.parse(legacy)
          supplier = fromLegacy(l.sender)
          client = fromLegacy(l.recipient)
        }
        setDoc((d) => ({ ...d, number, date: today, validUntil: plusDays(30), dueDate: plusDays(30), supplier, client }))
      }
      const c = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]')
      if (Array.isArray(c)) setClients(c.map((p) => ({ ...EMPTY_PARTY, ...p })))
    } catch {
      setDoc((d) => ({ ...d, number: nextDocNumber(today), date: today, validUntil: plusDays(30), dueDate: plusDays(30) }))
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(doc))
    } catch {
      // 저장 공간 부족 등: 무시 (작성 내용은 화면에 그대로)
    }
  }, [doc, ready])

  // ── 미리보기 축소 (A4 폭 794px을 상자 폭에 맞춤) ──────────────────────
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

  // ── Updaters ───────────────────────────────────────────────────────────
  const set = useCallback(<K extends keyof Doc>(k: K, v: Doc[K]) => setDoc((d) => ({ ...d, [k]: v })), [])
  const setParty = useCallback((who: 'supplier' | 'client', k: keyof Party, v: string) => {
    setDoc((d) => ({ ...d, [who]: { ...d[who], [k]: k === 'bizNo' ? formatBizNo(v) : v } }))
  }, [])
  const updateItem = useCallback(<K extends keyof Item>(id: string, k: K, v: Item[K]) => {
    setDoc((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, [k]: v } : it)) }))
  }, [])

  const newDoc = useCallback(() => {
    const today = ymd(new Date())
    let number = nextDocNumber(today)
    try {
      number = nextDocNumber(today, localStorage.getItem(LAST_NO_KEY))
      localStorage.setItem(LAST_NO_KEY, number)
    } catch {
      // ignore
    }
    // 내 정보·도장·부가세 설정·문서 종류는 유지
    setDoc((d) => ({
      ...blankDoc(''),
      type: d.type,
      vatMode: d.vatMode,
      basis: d.basis,
      supplier: d.supplier,
      stamp: d.stamp,
      account: d.account,
      payment: d.payment,
      number,
      date: today,
      validUntil: plusDays(30),
      dueDate: plusDays(30),
    }))
  }, [])

  const rememberClient = useCallback(() => {
    const c = doc.client
    if (!c.name.trim()) return
    setClients((prev) => {
      const next = [c, ...prev.filter((p) => !(p.name === c.name && p.bizNo === c.bizNo))].slice(0, 8)
      try {
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [doc.client])

  const removeClient = useCallback((i: number) => {
    setClients((prev) => {
      const next = prev.filter((_, j) => j !== i)
      try {
        localStorage.setItem(CLIENTS_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const onStamp = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      set('stamp', await loadStamp(f))
    } catch {
      // 읽을 수 없는 이미지: 무시
    }
  }, [set])

  const fileName = `${TITLES[doc.type].replace(/\s/g, '')}_${doc.client.name.trim() || doc.number}_${doc.number}`.replace(/[\\/:*?"<>|]/g, '')

  // ── PDF: 미리보기 DOM → html2canvas(한글 그대로) → jsPDF A4 ─────────────
  const exportPDF = useCallback(async () => {
    const el = paperRef.current
    if (!el || busy) return
    setBusy(true)
    setPdfError(false)
    setView('preview') // 모바일: 내려받는 문서를 보여주고, 캡처 대상이 display:none이 아니게
    try {
      await new Promise((r) => setTimeout(r, 50))
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1280, // 복제 문서에서 미리보기 열이 보이도록(lg 이상)
        onclone: (_d, clone) => {
          if (clone.parentElement) clone.parentElement.style.zoom = '1'
        },
      })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageH = Math.floor((canvas.width * 297) / 210)
      // ponytail: 픽셀 단위로 페이지를 자름 — 품목이 아주 많으면 행 중간에서 나뉠 수 있음
      for (let y = 0, i = 0; y < canvas.height; y += pageH, i++) {
        const h = Math.min(pageH, canvas.height - y)
        if (i > 0 && h < 24) break
        const page = document.createElement('canvas')
        page.width = canvas.width
        page.height = h
        page.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
        if (i > 0) pdf.addPage()
        pdf.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, (h * 210) / canvas.width)
      }
      pdf.save(`${fileName}.pdf`)
      rememberClient()
    } catch {
      setPdfError(true)
    } finally {
      setBusy(false)
    }
  }, [busy, fileName, rememberClient])

  // ── 인쇄: 문서만 담은 iframe을 인쇄 (페이지 레이아웃과 무관) ────────────
  const handlePrint = useCallback(() => {
    const el = paperRef.current
    if (!el) return
    const f = document.createElement('iframe')
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(f)
    const d = f.contentDocument
    const w = f.contentWindow
    if (!d || !w) return
    d.open()
    d.write(
      '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}html,body{margin:0}' +
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}#invoice-paper{min-height:auto!important}</style></head><body>' +
        el.outerHTML +
        '</body></html>',
    )
    d.close()
    d.title = fileName // 'PDF로 저장' 시 기본 파일명
    rememberClient()
    const cleanup = () => setTimeout(() => f.remove(), 500)
    w.onafterprint = cleanup
    setTimeout(() => {
      w.focus()
      w.print()
    }, 300)
  }, [fileName, rememberClient])

  // ── Render helpers ─────────────────────────────────────────────────────
  const seg = (on: boolean) =>
    `px-3 py-2 text-sm font-medium rounded-xl transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`
  const label = 'block text-xs font-medium text-sub mb-1'
  const field = 'ui-field w-full min-w-0 px-3 py-2 text-sm'

  const partyForm = (who: 'supplier' | 'client') => {
    const p = doc[who]
    const v = validateBizNo(p.bizNo)
    const input = (k: keyof Party, ph?: string, type = 'text', mode?: 'numeric' | 'tel' | 'email') => (
      <div>
        <label className={label} htmlFor={`${who}-${k}`}>{t(`company.${k}`)}</label>
        <input
          id={`${who}-${k}`}
          type={type}
          inputMode={mode}
          className={field}
          value={p[k]}
          placeholder={ph}
          onChange={(e) => setParty(who, k, e.target.value)}
        />
        {k === 'bizNo' && v.reason === 'checksum' && <p className="text-xs text-red-600 mt-1">{t('bizNoInvalid')}</p>}
        {k === 'bizNo' && v.reason === 'ok' && <p className="text-xs text-primary mt-1">{t('bizNoValid')}</p>}
      </div>
    )
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {input('name', t('company.namePlaceholder'))}
        {input('bizNo', '000-00-00000', 'text', 'numeric')}
        {input('rep', t('company.repPlaceholder'))}
        {input('phone', '02-000-0000', 'tel', 'tel')}
        <div className="sm:col-span-2">{input('address', t('company.addressPlaceholder'))}</div>
        {input('bizType', t('company.bizTypePlaceholder'))}
        {input('bizItem', t('company.bizItemPlaceholder'))}
        <div className="sm:col-span-2">{input('email', 'example@company.com', 'email', 'email')}</div>
      </div>
    )
  }

  const guideSections = t.raw('guide.sections')
  const faq = t.raw('guide.faq.items')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
          <p className="text-sm text-muted mt-1">{t('description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={newDoc} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2 text-sm">
            <FilePlus2 className="w-4 h-4" />
            {t('newDoc')}
          </button>
          <button onClick={handlePrint} className="ui-btn-soft flex items-center gap-1.5 px-3 py-2 text-sm">
            <Printer className="w-4 h-4" />
            {t('print')}
          </button>
          <button onClick={exportPDF} disabled={busy} className="ui-btn flex items-center gap-1.5 px-4 py-2 text-sm">
            <Download className="w-4 h-4" />
            {busy ? t('pdfBusy') : t('exportPDF')}
          </button>
        </div>
      </div>
      {pdfError && <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">{t('pdfError')}</p>}

      {/* 모바일: 작성/미리보기 전환 */}
      <div className="flex gap-2 lg:hidden">
        <button onClick={() => setView('edit')} className={seg(view === 'edit')}>{t('view.edit')}</button>
        <button onClick={() => setView('preview')} className={seg(view === 'preview')}>{t('view.preview')}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ── Editor ─────────────────────────────────────────────────── */}
        <div className={`lg:col-span-2 space-y-6 min-w-0 ${view === 'preview' ? 'hidden lg:block' : ''}`}>
          {/* 문서 */}
          <div className="ui-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('section.doc')}</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('docType.label')}>
              {(['quote', 'statement', 'bill'] as const).map((k) => (
                <button key={k} onClick={() => set('type', k)} className={seg(doc.type === k)} aria-pressed={doc.type === k}>
                  {t(`docType.${k}`)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="doc-number">{t('docNumber')}</label>
                <input id="doc-number" className={field} value={doc.number} onChange={(e) => set('number', e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="doc-date">{t(`dateLabel.${doc.type}`)}</label>
                <input id="doc-date" type="date" className={field} value={doc.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              {doc.type === 'quote' && (
                <>
                  <div>
                    <label className={label} htmlFor="doc-valid">{t('validUntil')}</label>
                    <input id="doc-valid" type="date" className={field} value={doc.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
                  </div>
                  <div>
                    <label className={label} htmlFor="doc-delivery">{t('delivery')}</label>
                    <input id="doc-delivery" className={field} value={doc.delivery} placeholder={t('deliveryPlaceholder')} onChange={(e) => set('delivery', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className={label} htmlFor="doc-payment">{t('payment')}</label>
                    <input id="doc-payment" className={field} value={doc.payment} placeholder={t('paymentPlaceholder')} onChange={(e) => set('payment', e.target.value)} />
                  </div>
                </>
              )}
              {doc.type === 'bill' && (
                <div>
                  <label className={label} htmlFor="doc-due">{t('payDue')}</label>
                  <input id="doc-due" type="date" className={field} value={doc.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
                </div>
              )}
              <div className="col-span-2">
                <label className={label} htmlFor="doc-account">{t('account')}</label>
                <input id="doc-account" className={field} value={doc.account} placeholder={t('accountPlaceholder')} onChange={(e) => set('account', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 공급자 */}
          <div className="ui-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-fg">{t('section.sender')}</h2>
              <p className="text-xs text-muted mt-1">{t('autosaveNote')}</p>
            </div>
            {partyForm('supplier')}
            <div className="bg-subtle rounded-2xl p-4 flex items-center gap-3">
              {doc.stamp ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.stamp} alt={t('stamp.label')} className="w-14 h-14 object-contain bg-surface rounded-lg border border-line" />
              ) : (
                <div className="w-14 h-14 rounded-lg border border-dashed border-line-strong shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-body">{t('stamp.label')}</p>
                <p className="text-xs text-muted">{t('stamp.hint')}</p>
                <Link href="/stamp-generator/" className="text-xs text-primary hover:underline">{t('stamp.make')}</Link>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => stampInput.current?.click()} className="ui-btn-soft px-3 py-1.5 text-xs">
                  {doc.stamp ? t('stamp.change') : t('stamp.upload')}
                </button>
                {doc.stamp && (
                  <button onClick={() => set('stamp', '')} className="text-xs text-muted hover:text-body">{t('stamp.remove')}</button>
                )}
              </div>
              <input ref={stampInput} type="file" accept="image/*" className="hidden" onChange={onStamp} />
            </div>
          </div>

          {/* 공급받는자 */}
          <div className="ui-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('section.recipient')}</h2>
            {clients.length > 0 && (
              <div>
                <p className={label}>{t('recentClients')}</p>
                <div className="flex flex-wrap gap-2">
                  {clients.map((c, i) => (
                    <span key={`${c.name}-${c.bizNo}`} className="inline-flex items-center rounded-full bg-soft text-body text-sm">
                      <button onClick={() => set('client', { ...c })} className="pl-3 pr-1 py-1 hover:text-primary">{c.name}</button>
                      <button onClick={() => removeClient(i)} className="pr-2 pl-1 py-1 text-faint hover:text-body" aria-label={t('removeClient')}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {partyForm('client')}
          </div>

          {/* 품목 */}
          <div className="ui-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-fg">{t('section.items')}</h2>
            <div>
              <p className={label}>{t('vat.label')}</p>
              <div className="flex flex-wrap gap-2">
                {(['excl', 'incl', 'none'] as const).map((m) => (
                  <button key={m} onClick={() => set('vatMode', m)} className={seg(doc.vatMode === m)} aria-pressed={doc.vatMode === m}>
                    {t(`vat.${m}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">{t(`vat.hint.${doc.vatMode}`)}</p>
            </div>
            {doc.vatMode !== 'none' && (
              <div>
                <label className={label} htmlFor="vat-basis">{t('vat.basis')}</label>
                <select id="vat-basis" className={field} value={doc.basis} onChange={(e) => set('basis', e.target.value as VatBasis)}>
                  <option value="line">{t('vat.basisLine')}</option>
                  <option value="total">{t('vat.basisTotal')}</option>
                </select>
                {totals.adjusted !== 0 && (
                  <p className="text-xs text-muted mt-1">{t('vat.adjusted', { n: won(totals.adjusted) })}</p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {doc.items.map((it, i) => {
                const l = totals.lines[i]
                return (
                  <div key={it.id} className="bg-subtle rounded-2xl p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="ui-field flex-1 min-w-0 px-3 py-2 text-sm"
                        aria-label={t('items.name')}
                        placeholder={t('items.namePlaceholder')}
                        value={it.name}
                        onChange={(e) => updateItem(it.id, 'name', e.target.value)}
                      />
                      <input
                        className="ui-field w-24 min-w-0 px-3 py-2 text-sm"
                        aria-label={t('items.spec')}
                        placeholder={t('items.spec')}
                        value={it.spec}
                        onChange={(e) => updateItem(it.id, 'spec', e.target.value)}
                      />
                      <button
                        onClick={() => setDoc((d) => ({ ...d, items: d.items.length > 1 ? d.items.filter((x) => x.id !== it.id) : [newItem()] }))}
                        className="p-2 rounded-lg text-faint hover:text-red-600 shrink-0"
                        aria-label={t('items.remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        className="ui-field w-20 px-3 py-2 text-sm text-right tabular-nums"
                        aria-label={t('items.quantity')}
                        value={Number.isFinite(it.qty) ? it.qty : ''}
                        onChange={(e) => updateItem(it.id, 'qty', Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                      <span className="text-muted text-sm">×</span>
                      <input
                        inputMode="numeric"
                        className="ui-field flex-1 min-w-[7rem] px-3 py-2 text-sm text-right tabular-nums"
                        aria-label={t('items.unitPrice')}
                        placeholder={t('items.unitPrice')}
                        value={it.price ? won(it.price) : ''}
                        onChange={(e) => updateItem(it.id, 'price', Number(e.target.value.replace(/\D/g, '').slice(0, 13)) || 0)}
                      />
                      {doc.vatMode !== 'none' && (
                        <label className="flex items-center gap-1.5 text-xs text-sub cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-blue-600"
                            checked={it.taxable}
                            onChange={(e) => updateItem(it.id, 'taxable', e.target.checked)}
                          />
                          {t('items.taxable')}
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted text-right tabular-nums">
                      {t('summary.subtotal')} {won(l.supply)}
                      {doc.vatMode !== 'none' && ` · ${t('summary.vat')} ${won(l.vat)}`}
                    </p>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => set('items', [...doc.items, newItem()])}
              className="ui-btn-soft w-full flex items-center justify-center gap-2 px-4 py-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('items.add')}
            </button>

            {/* 합계 */}
            <div className="border-t border-line pt-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t('summary.subtotal')}</span>
                <span className="text-body tabular-nums">{won(totals.supply)}</span>
              </div>
              {doc.vatMode !== 'none' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t('summary.vat')}</span>
                  <span className="text-body tabular-nums">{won(totals.vat)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-semibold text-fg">{t('summary.total')}</span>
                <span className="text-2xl font-bold text-fg tabular-nums">{won(totals.total)}</span>
              </div>
              <p className="text-right text-sm text-sub">{amountInKorean(totals.total)}</p>
            </div>
          </div>

          {/* 비고 */}
          <div className="ui-card p-5 space-y-3">
            <h2 className="text-base font-semibold text-fg">{t('section.notes')}</h2>
            <textarea
              className="ui-field w-full px-3 py-2 text-sm resize-y"
              rows={3}
              aria-label={t('notes')}
              placeholder={t('notesPlaceholder')}
              value={doc.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        {/* ── Preview ────────────────────────────────────────────────── */}
        <div className={`lg:col-span-3 min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${view === 'edit' ? 'hidden lg:block' : ''}`}>
          <div className="ui-card p-3 sm:p-4 bg-subtle">
            <div ref={boxRef} className="overflow-hidden">
              <div style={{ zoom }}>
                <div ref={paperRef} style={{ width: PAPER_W }}>
                  <Paper doc={doc} totals={totals} />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-2">{t('previewNote')}</p>
        </div>
      </div>

      {/* Guide */}
      <div className="ui-card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-fg">{t('guide.title')}</h2>
          <p className="text-sm text-sub mt-2 leading-relaxed">{t('guide.whatIs.description')}</p>
        </div>
        {Array.isArray(guideSections) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(guideSections as Array<{ title: string; items: string[] }>).map((s) => (
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
              {(faq as Array<{ q: string; a: string }>).map((f) => (
                <div key={f.q}>
                  <dt className="text-sm font-medium text-body">{f.q}</dt>
                  <dd className="text-sm text-sub mt-1">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
