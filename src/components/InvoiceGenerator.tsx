'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Trash2,
  Download,
  Printer,
  Save,
  FolderOpen,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  Building2,
  User,
  Package,
  StickyNote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface CompanyInfo {
  name: string
  regNumber: string
  representative: string
  address: string
  phone: string
  email: string
}

interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  taxable: boolean
}

interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  sender: CompanyInfo
  recipient: CompanyInfo
  items: InvoiceItem[]
  notes: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `INV-${y}${m}${d}-${rand}`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dueDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

const EMPTY_COMPANY: CompanyInfo = {
  name: '',
  regNumber: '',
  representative: '',
  address: '',
  phone: '',
  email: '',
}

const EMPTY_ITEM = (): InvoiceItem => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  quantity: 1,
  unitPrice: 0,
  taxable: true,
})

const DEFAULT_INVOICE = (): InvoiceData => ({
  invoiceNumber: generateInvoiceNumber(),
  invoiceDate: todayStr(),
  dueDate: dueDateStr(),
  sender: { ...EMPTY_COMPANY },
  recipient: { ...EMPTY_COMPANY },
  items: [EMPTY_ITEM()],
  notes: '',
})

const STORAGE_KEY = 'invoiceGenerator_saved'

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
  )
}

function CompanyForm({
  label,
  data,
  onChange,
  t,
}: {
  label: string
  data: CompanyInfo
  onChange: (field: keyof CompanyInfo, value: string) => void
  t: ReturnType<typeof useTranslations>
}) {
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'

  const Field = ({
    field,
    placeholder,
    type = 'text',
  }: {
    field: keyof CompanyInfo
    placeholder?: string
    type?: string
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {t(`company.${field}`)}
      </label>
      <input
        type={type}
        className={inputClass}
        value={data[field]}
        placeholder={placeholder}
        onChange={(e) => onChange(field, e.target.value)}
      />
    </div>
  )

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-3">
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field field="name" placeholder={t('company.namePlaceholder')} />
        <Field field="regNumber" placeholder="000-00-00000" />
        <Field field="representative" placeholder={t('company.repPlaceholder')} />
        <Field field="phone" placeholder="02-0000-0000" type="tel" />
        <div className="sm:col-span-2">
          <Field field="address" placeholder={t('company.addressPlaceholder')} />
        </div>
        <div className="sm:col-span-2">
          <Field field="email" placeholder="example@company.com" type="email" />
        </div>
      </div>
    </div>
  )
}

// ── Preview component ──────────────────────────────────────────────────────

function InvoicePreview({
  data,
  subtotal,
  vat,
  total,
  t,
}: {
  data: InvoiceData
  subtotal: number
  vat: number
  total: number
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div
      id="invoice-preview"
      className="bg-white text-gray-900 rounded-xl shadow-lg p-8 print:shadow-none print:rounded-none"
      style={{ fontFamily: 'Malgun Gothic, Apple SD Gothic Neo, sans-serif' }}
    >
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-widest text-gray-900">견 적 서</h1>
        <p className="text-sm text-gray-500 mt-1">{t('previewSubtitle')}</p>
      </div>

      {/* Invoice meta */}
      <div className="flex justify-end mb-6">
        <table className="text-sm border-collapse">
          <tbody>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-3 py-1 font-medium text-gray-600 text-right">
                {t('invoiceNumber')}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-gray-900">{data.invoiceNumber}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-3 py-1 font-medium text-gray-600 text-right">
                {t('invoiceDate')}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-gray-900">{data.invoiceDate}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-3 py-1 font-medium text-gray-600 text-right">
                {t('dueDate')}
              </td>
              <td className="border border-gray-300 px-3 py-1 text-gray-900">{data.dueDate}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[
          { label: t('sender'), info: data.sender },
          { label: t('recipient'), info: data.recipient },
        ].map(({ label, info }) => (
          <div key={label} className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-1.5 font-semibold text-sm text-gray-700 border-b border-gray-300">
              {label}
            </div>
            <div className="p-3 space-y-1 text-sm">
              <div className="font-bold text-base text-gray-900">{info.name || '-'}</div>
              {info.regNumber && (
                <div className="text-gray-600">
                  {t('company.regNumber')}: {info.regNumber}
                </div>
              )}
              {info.representative && (
                <div className="text-gray-600">
                  {t('company.representative')}: {info.representative}
                </div>
              )}
              {info.address && <div className="text-gray-600">{info.address}</div>}
              {info.phone && <div className="text-gray-600">{info.phone}</div>}
              {info.email && <div className="text-gray-600">{info.email}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Items table */}
      <table className="w-full text-sm border-collapse mb-6">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-600 px-3 py-2 text-left">{t('items.name')}</th>
            <th className="border border-gray-600 px-3 py-2 text-right w-16">{t('items.quantity')}</th>
            <th className="border border-gray-600 px-3 py-2 text-right w-28">{t('items.unitPrice')}</th>
            <th className="border border-gray-600 px-3 py-2 text-right w-28">{t('items.amount')}</th>
            <th className="border border-gray-600 px-3 py-2 text-center w-16">{t('items.taxable')}</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => {
            const amount = item.quantity * item.unitPrice
            return (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-3 py-2">{item.name || '-'}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{item.quantity.toLocaleString()}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{item.unitPrice.toLocaleString()}</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                  {amount.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                  {item.taxable ? '✓' : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <table className="text-sm border-collapse w-56">
          <tbody>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-600">
                {t('summary.subtotal')}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                {subtotal.toLocaleString()}원
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-600">
                {t('summary.vat')} (10%)
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                {vat.toLocaleString()}원
              </td>
            </tr>
            <tr className="bg-blue-600 text-white">
              <td className="border border-blue-500 px-3 py-2 font-bold">{t('summary.total')}</td>
              <td className="border border-blue-500 px-3 py-2 text-right font-bold text-lg">
                {total.toLocaleString()}원
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{t('notes')}</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function InvoiceGenerator() {
  const t = useTranslations('invoiceGenerator')
  const [invoice, setInvoice] = useState<InvoiceData>(DEFAULT_INVOICE)
  const [showPreview, setShowPreview] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // ── Totals ───────────────────────────────────────────────────────────────

  const { subtotal, vat, total } = (() => {
    let taxableSum = 0
    let nonTaxableSum = 0
    for (const item of invoice.items) {
      const amt = item.quantity * item.unitPrice
      if (item.taxable) taxableSum += amt
      else nonTaxableSum += amt
    }
    const vatAmt = Math.round(taxableSum * 0.1)
    return {
      subtotal: taxableSum + nonTaxableSum,
      vat: vatAmt,
      total: taxableSum + nonTaxableSum + vatAmt,
    }
  })()

  // ── Item handlers ────────────────────────────────────────────────────────

  const addItem = useCallback(() => {
    setInvoice((prev) => ({ ...prev, items: [...prev.items, EMPTY_ITEM()] }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((i) => i.id !== id) : prev.items,
    }))
  }, [])

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number | boolean) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }, [])

  // ── Company handlers ─────────────────────────────────────────────────────

  const updateSender = useCallback((field: keyof CompanyInfo, value: string) => {
    setInvoice((prev) => ({ ...prev, sender: { ...prev.sender, [field]: value } }))
  }, [])

  const updateRecipient = useCallback((field: keyof CompanyInfo, value: string) => {
    setInvoice((prev) => ({ ...prev, recipient: { ...prev.recipient, [field]: value } }))
  }, [])

  // ── localStorage ─────────────────────────────────────────────────────────

  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // ignore
    }
  }, [invoice])

  const loadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setInvoice(JSON.parse(raw))
        setLoaded(true)
        setTimeout(() => setLoaded(false), 2000)
      }
    } catch {
      // ignore
    }
  }, [])

  const resetInvoice = useCallback(() => {
    setInvoice(DEFAULT_INVOICE())
  }, [])

  // ── PDF export ───────────────────────────────────────────────────────────

  const exportPDF = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const lm = 20
    const pw = 170
    let y = 20

    const line = (text: string, x: number, yPos: number, size = 10, style: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.text(text, x, yPos)
    }

    const safeStr = (s: string) => s.replace(/[^\x00-\x7F]/g, '?')

    // Title
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE / GYEONJEOKSEO', 105, y, { align: 'center' })
    y += 8

    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(0.8)
    doc.line(lm, y, lm + pw, y)
    y += 6

    // Meta
    line(`Invoice No: ${invoice.invoiceNumber}`, lm, y, 9)
    line(`Date: ${invoice.invoiceDate}`, 130, y, 9)
    y += 5
    line(`Due: ${invoice.dueDate}`, 130, y, 9)
    y += 8

    // Parties
    const partyY = y
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('FROM (Sender):', lm, y)
    doc.text('TO (Recipient):', 110, y)
    y += 4

    const partyFields: (keyof CompanyInfo)[] = ['name', 'regNumber', 'representative', 'address', 'phone', 'email']
    partyFields.forEach((field) => {
      const sv = invoice.sender[field]
      const rv = invoice.recipient[field]
      if (sv || rv) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        if (sv) doc.text(safeStr(sv), lm, y)
        if (rv) doc.text(safeStr(rv), 110, y)
        y += 4
      }
    })
    y = Math.max(y, partyY + 30) + 4

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(lm, y, lm + pw, y)
    y += 5

    // Items header
    doc.setFillColor(30, 58, 138)
    doc.rect(lm, y, pw, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Item', lm + 2, y + 4)
    doc.text('Qty', 125, y + 4, { align: 'right' })
    doc.text('Unit Price', 148, y + 4, { align: 'right' })
    doc.text('Amount', 170, y + 4, { align: 'right' })
    doc.text('VAT', 178, y + 4)
    y += 6

    doc.setTextColor(0, 0, 0)
    invoice.items.forEach((item, i) => {
      const amount = item.quantity * item.unitPrice
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(lm, y, pw, 5.5, 'F')
      }
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(safeStr(item.name || '-'), lm + 2, y + 4)
      doc.text(String(item.quantity), 125, y + 4, { align: 'right' })
      doc.text(item.unitPrice.toLocaleString(), 148, y + 4, { align: 'right' })
      doc.text(amount.toLocaleString(), 170, y + 4, { align: 'right' })
      doc.text(item.taxable ? 'Y' : '-', 178, y + 4)
      y += 5.5
    })

    // Totals
    y += 4
    doc.setDrawColor(200, 200, 200)
    doc.line(lm + pw - 60, y, lm + pw, y)
    y += 4

    const totalsRows = [
      [`Subtotal:`, subtotal.toLocaleString() + ' KRW'],
      [`VAT (10%):`, vat.toLocaleString() + ' KRW'],
      [`TOTAL:`, total.toLocaleString() + ' KRW'],
    ]

    totalsRows.forEach(([label, val], idx) => {
      const isBold = idx === 2
      doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      doc.setFontSize(isBold ? 10 : 8)
      if (isBold) {
        doc.setFillColor(59, 130, 246)
        doc.rect(lm + pw - 62, y - 3, 62, 7, 'F')
        doc.setTextColor(255, 255, 255)
      }
      doc.text(label, lm + pw - 60 + 1, y + 1.5)
      doc.text(val, lm + pw, y + 1.5, { align: 'right' })
      if (isBold) doc.setTextColor(0, 0, 0)
      y += isBold ? 8 : 5
    })

    // Notes
    if (invoice.notes) {
      y += 4
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Notes:', lm, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(safeStr(invoice.notes), pw)
      doc.text(lines, lm, y)
    }

    doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
  }, [invoice, subtotal, vat, total])

  // ── Print ────────────────────────────────────────────────────────────────

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // ── Input classes ────────────────────────────────────────────────────────

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'

  const textareaClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none'

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveToStorage}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? t('savedFeedback') : t('save')}
          </button>
          <button
            onClick={loadFromStorage}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            {loaded ? t('loadedFeedback') : t('load')}
          </button>
          <button
            onClick={resetInvoice}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('reset')}
          </button>
          <button
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? t('editMode') : t('previewMode')}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 dark:bg-gray-200 hover:bg-gray-900 dark:hover:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t('print')}
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-3 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            {t('exportPDF')}
          </button>
        </div>
      </div>

      {showPreview ? (
        /* ── Preview mode ─────────────────────────────────────────────────── */
        <div ref={printRef}>
          <InvoicePreview data={invoice} subtotal={subtotal} vat={vat} total={total} t={t} />
        </div>
      ) : (
        /* ── Edit mode ────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Invoice meta */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={FileText} title={t('section.invoiceInfo')} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('invoiceNumber')}
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('invoiceDate')}
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={invoice.invoiceDate}
                  onChange={(e) => setInvoice((p) => ({ ...p, invoiceDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('dueDate')}
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Sender / Recipient */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <SectionHeader icon={Building2} title={t('section.sender')} />
              <CompanyForm label={t('sender')} data={invoice.sender} onChange={updateSender} t={t} />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <SectionHeader icon={User} title={t('section.recipient')} />
              <CompanyForm label={t('recipient')} data={invoice.recipient} onChange={updateRecipient} t={t} />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={Package} title={t('section.items')} />

            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 mb-2 px-2">
              <div className="col-span-4 text-xs font-medium text-gray-500 dark:text-gray-400">{t('items.name')}</div>
              <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {t('items.quantity')}
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {t('items.unitPrice')}
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">
                {t('items.amount')}
              </div>
              <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                {t('items.taxable')}
              </div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-3">
              {invoice.items.map((item) => {
                const amount = item.quantity * item.unitPrice
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    {/* Name */}
                    <div className="col-span-12 sm:col-span-4">
                      <input
                        type="text"
                        className={inputClass}
                        placeholder={t('items.namePlaceholder')}
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      />
                    </div>
                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min={1}
                        className={inputClass + ' text-right'}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    {/* Unit price */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min={0}
                        className={inputClass + ' text-right'}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    {/* Amount (read-only) */}
                    <div className="col-span-4 sm:col-span-2">
                      <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-right text-sm font-medium text-gray-900 dark:text-white">
                        {amount.toLocaleString()}
                      </div>
                    </div>
                    {/* Taxable */}
                    <div className="col-span-6 sm:col-span-1 flex items-center justify-center">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-600"
                          checked={item.taxable}
                          onChange={(e) => updateItem(item.id, 'taxable', e.target.checked)}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{t('items.taxable')}</span>
                      </label>
                    </div>
                    {/* Remove */}
                    <div className="col-span-6 sm:col-span-1 flex justify-end sm:justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={invoice.items.length === 1}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label={t('items.remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={addItem}
              className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              {t('items.add')}
            </button>

            {/* Summary */}
            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('summary.subtotal')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatKRW(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('summary.vat')} (10%)</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatKRW(vat)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-bold text-gray-900 dark:text-white">{t('summary.total')}</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatKRW(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <SectionHeader icon={StickyNote} title={t('section.notes')} />
            <textarea
              className={textareaClass}
              rows={4}
              placeholder={t('notesPlaceholder')}
              value={invoice.notes}
              onChange={(e) => setInvoice((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setGuideOpen((o) => !o)}
          aria-expanded={guideOpen}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {t('guide.title')}
          </h2>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {guideOpen && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {(t.raw('guide.sections') as Array<{ title: string; items: string[] }>).map((section) => (
              <div key={section.title} className="bg-blue-50 dark:bg-blue-950 rounded-xl p-5">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">{section.title}</h3>
                <ul className="space-y-1.5">
                  {section.items.map((item: string) => (
                    <li key={item} className="flex gap-2 text-sm text-blue-800 dark:text-blue-300">
                      <span className="text-blue-500 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-preview { display: block !important; }
        }
      `}</style>
    </div>
  )
}
