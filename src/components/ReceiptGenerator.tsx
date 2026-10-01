'use client'

// 영수증 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개
import type { CSSProperties } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, Seal, pTable, pTh, pTd, pNum } from '@/components/document/paper'
import { Section, AmountField, DateField, TextField, Segmented, Check, fieldCls, labelCls } from '@/components/document/fields'
import { krDate, amountText, won, docFileName } from '@/utils/document'
import { formatBizNo } from '@/utils/businessNumber'
import { nextDocNumber } from '@/utils/invoiceDoc'
import {
  PURPOSES, PROOF_LIMIT, CASH_RECEIPT_MIN, presetSubject, presetItems, statement, totals, bizStatus, cashReceiptDuty, overProofLimit,
  type Purpose, type Pay, type VatMode, type Item,
} from '@/utils/receipt'

interface Receipt {
  no: string
  date: string
  purpose: Purpose
  subject: string // 명목
  buyer: string // 공급받는 자
  issuerName: string // 공급자 성명·상호
  issuerBiz: string
  issuerAddress: string
  issuerPhone: string
  useItems: boolean
  items: Item[]
  amount: number // 금액만 모드 = 금액, 품목 모드 = 영수 금액 직접 입력(0이면 품목 합계)
  vat: VatMode
  pay: Pay
  note: string
  copies: boolean // A4 한 장에 공급자/공급받는자 보관용 2부
}

const MAX_ITEMS = 15
const COPY_ROWS = 5 // 2부 모드에서 반장(약 470px)에 들어가는 품목 수 — 부가세·비고 줄까지 들어가는 보수적 값

const initial = (today: string): Receipt => ({
  no: today ? nextDocNumber(today) : '',
  date: today,
  purpose: 'general',
  subject: presetSubject('general', today),
  buyer: '',
  issuerName: '',
  issuerBiz: '',
  issuerAddress: '',
  issuerPhone: '',
  ...presetItems('general', today),
  vat: 'none',
  pay: 'transfer',
  note: '',
  copies: true,
})

const calc = (v: Receipt) => totals(v.useItems, v.items, v.amount, v.vat)

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: Receipt, t: TFn): Insight[] {
  const out: Insight[] = []
  const s = calc(v)
  const biz = bizStatus(v.issuerBiz)
  if (!(s.total > 0)) out.push({ level: 'error', text: t('insight.noAmount') })
  if (s.mismatch) out.push({ level: 'error', text: t('insight.mismatch', { sum: won(s.sum), total: won(s.total) }) })
  if (biz === 'invalid') out.push({ level: 'error', text: t('insight.bizInvalid') })
  if (v.vat !== 'none' && biz !== 'valid') out.push({ level: 'warn', text: t('insight.vatNoBiz') })
  if (cashReceiptDuty(biz === 'valid', v.pay, s.total)) out.push({ level: 'warn', text: t('insight.cashReceipt', { min: won(CASH_RECEIPT_MIN) }) })
  if (v.copies && v.useItems && v.items.length > COPY_ROWS) out.push({ level: 'warn', text: t('insight.tooMany', { n: COPY_ROWS }) })
  if (v.pay === 'card') out.push({ level: 'info', text: t('insight.card') })
  out.push({ level: 'info', text: overProofLimit(s.total) ? t('insight.proof', { limit: won(PROOF_LIMIT) }) : t('insight.notSubstitute') })
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function Form({ v, set, t }: { v: Receipt; set: (p: Partial<Receipt>) => void; t: TFn }) {
  const s = calc(v)
  const biz = bizStatus(v.issuerBiz)
  const setItem = (i: number, p: Partial<Item>) => set({ items: v.items.map((it, j) => (j === i ? { ...it, ...p } : it)) })
  const num = (x: string) => Number(x.replace(/[^\d]/g, '').slice(0, 12)) || 0
  const pick = (purpose: Purpose) => set({ purpose, subject: presetSubject(purpose, v.date), ...presetItems(purpose, v.date) })

  return (
    <>
      <Section title={t('section.purpose')} hint={t('sectionHint.purpose')}>
        <Segmented label={t('purpose')} value={v.purpose} onChange={pick} options={PURPOSES.map((p) => ({ value: p, label: t(`purposes.${p}`) }))} />
        <TextField label={t('subject')} value={v.subject} onChange={(subject) => set({ subject })} placeholder={t('subjectPlaceholder')} maxLength={60} hint={statement(v.purpose, v.subject)} />
      </Section>

      <Section title={t('section.amount')}>
        <Segmented
          label={t('inputMode')}
          value={v.useItems ? 'items' : 'amount'}
          onChange={(m) => set({ useItems: m === 'items', amount: m === 'items' ? 0 : v.vat === 'excl' ? s.supply : s.total, items: m === 'items' && !v.items.length ? [{ name: '', qty: 1, price: v.amount }] : v.items })}
          options={[{ value: 'items', label: t('inputModes.items') }, { value: 'amount', label: t('inputModes.amount') }]}
        />

        {v.useItems && (
          <div className="space-y-2">
            {v.items.map((it, i) => (
              <div key={i} className="bg-subtle rounded-2xl p-3 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5 min-w-0">
                  <label className={labelCls}>{t('item.name')}</label>
                  <input className={fieldCls} value={it.name} maxLength={40} placeholder={t('item.namePlaceholder')} onChange={(e) => setItem(i, { name: e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-2 min-w-0">
                  <label className={labelCls}>{t('item.qty')}</label>
                  <input className={`${fieldCls} text-right tabular-nums`} inputMode="numeric" value={it.qty || ''} onChange={(e) => setItem(i, { qty: num(e.target.value) })} />
                </div>
                <div className="col-span-5 sm:col-span-3 min-w-0">
                  <label className={labelCls}>{t('item.price')}</label>
                  <input className={`${fieldCls} text-right tabular-nums`} inputMode="numeric" value={it.price ? it.price.toLocaleString('ko-KR') : ''} placeholder="0" onChange={(e) => setItem(i, { price: num(e.target.value) })} />
                </div>
                <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-1 pb-2">
                  <span className="text-sm text-body tabular-nums truncate">{won(it.qty * it.price)}</span>
                  <button type="button" onClick={() => set({ items: v.items.filter((_, j) => j !== i) })} className="p-1 rounded-lg text-faint hover:text-red-600 shrink-0" aria-label={t('item.remove')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {v.items.length < MAX_ITEMS && (
              <button type="button" onClick={() => set({ items: [...v.items, { name: '', qty: 1, price: 0 }] })} className="ui-btn-soft flex items-center gap-1 px-3 py-2 text-sm">
                <Plus className="w-4 h-4" />
                {t('item.add')}
              </button>
            )}
          </div>
        )}

        <AmountField label={v.useItems ? t('amountOverride') : v.vat === 'excl' ? t('amountSupply') : t('amount')} value={v.amount} onChange={(amount) => set({ amount })} />
        {v.useItems && <p className="text-xs text-muted -mt-2">{t('amountOverrideHint', { sum: won(s.sum) })}</p>}

        <Segmented label={t('vat')} value={v.vat} onChange={(vat) => set({ vat })} options={(['none', 'excl', 'incl'] as const).map((m) => ({ value: m, label: t(`vats.${m}`) }))} />
        <Segmented label={t('pay')} value={v.pay} onChange={(pay) => set({ pay })} options={(['cash', 'transfer', 'card'] as const).map((m) => ({ value: m, label: t(`pays.${m}`) }))} />

        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm text-sub">{t('summary.total')}</p>
          <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(s.total)}<span className="text-lg font-semibold ml-1">{t('won')}</span></p>
          {s.total > 0 && <p className="text-sm text-body mt-1">{amountText(s.total)}</p>}
          {v.vat !== 'none' && (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">{t('summary.supply')}</dt><dd className="text-body tabular-nums">{won(s.supply)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">{t('summary.vat')}</dt><dd className="text-body tabular-nums">{won(s.vat)}</dd></div>
            </dl>
          )}
        </div>
      </Section>

      <Section title={t('section.buyer')} hint={t('sectionHint.buyer')}>
        <TextField label={t('buyer')} value={v.buyer} onChange={(buyer) => set({ buyer })} placeholder={t('buyerPlaceholder')} maxLength={40} />
      </Section>

      <Section title={t('section.issuer')} hint={t('sectionHint.issuer')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t('issuerName')} value={v.issuerName} onChange={(issuerName) => set({ issuerName })} placeholder={t('issuerNamePlaceholder')} maxLength={40} />
          <TextField
            label={t('issuerBiz')}
            value={v.issuerBiz}
            onChange={(x) => set({ issuerBiz: formatBizNo(x) })}
            placeholder="000-00-00000"
            inputMode="numeric"
            maxLength={12}
            hint={biz === 'none' ? t('issuerBizHint') : biz === 'valid' ? t('bizValid') : <span className="text-red-600">{t('bizInvalid')}</span>}
          />
          <TextField className="sm:col-span-2" label={t('issuerAddress')} value={v.issuerAddress} onChange={(issuerAddress) => set({ issuerAddress })} placeholder={t('issuerAddressPlaceholder')} maxLength={120} />
          <TextField label={t('issuerPhone')} value={v.issuerPhone} onChange={(issuerPhone) => set({ issuerPhone })} placeholder="010-0000-0000" inputMode="tel" maxLength={20} />
        </div>
      </Section>

      <Section title={t('section.info')}>
        <div className="grid grid-cols-2 gap-3">
          <TextField label={t('no')} value={v.no} onChange={(no) => set({ no })} maxLength={20} />
          <DateField label={t('date')} value={v.date} onChange={(date) => set({ date })} />
        </div>
        <TextField label={t('note')} value={v.note} onChange={(note) => set({ note })} placeholder={t('notePlaceholder')} rows={2} maxLength={200} />
        <Check label={t('copies')} hint={t('copiesHint')} checked={v.copies} onChange={(copies) => set({ copies })} />
      </Section>
    </>
  )
}

// ── A4 본문 (문서 문구는 한국어 고정) ───────────────────────────────────────

const PAY_LABEL: Record<Pay, string> = { cash: '현금', transfer: '계좌이체', card: '카드' }

function Copy({ v, stamp, keep }: { v: Receipt; stamp?: string; keep?: string }) {
  const s = calc(v)
  const biz = bizStatus(v.issuerBiz) !== 'none'
  const th: CSSProperties = { ...pTh, padding: '4px 6px' }
  const td: CSSProperties = { ...pTd, padding: '4px 6px' }
  const num: CSSProperties = { ...pNum, padding: '4px 6px' }
  const vatRow = v.vat !== 'none'

  return (
    <div style={{ fontSize: 13, lineHeight: 1.55, minHeight: v.copies ? 470 : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#444' }}>
        <span>No. {v.no}</span>
        <span>{keep}</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '0.6em', margin: '2px 0 10px', paddingLeft: '0.6em' }}>영 수 증</div>
      <div style={{ fontSize: 15, marginBottom: 8 }}>
        <span style={{ display: 'inline-block', minWidth: 160, borderBottom: '1px solid #333', textAlign: 'center' }}>{v.buyer.trim() || ' '}</span> 귀하
      </div>

      <table style={{ ...pTable, marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 90, fontSize: 14 }}>금 액</td>
            <td style={{ ...td, fontSize: 15, fontWeight: 700, padding: '8px 10px' }}>{amountText(s.total)}</td>
          </tr>
        </tbody>
      </table>

      {(v.useItems || vatRow) && (
        <table style={{ ...pTable, marginBottom: 8, fontSize: 12.5 }}>
          {v.useItems && (
            <>
              <colgroup>
                <col />
                <col style={{ width: 60 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>{['품 명', '수량', '단 가', vatRow && v.vat === 'excl' ? '공급가액' : '금 액'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
            </>
          )}
          <tbody>
            {v.useItems && s.lines.map((l, i) => (
              <tr key={i}>
                <td style={td}>{l.name}</td>
                <td style={{ ...td, textAlign: 'center' }}>{l.qty ? won(l.qty) : ''}</td>
                <td style={num}>{l.price ? won(l.price) : ''}</td>
                <td style={num}>{l.amount ? won(l.amount) : ''}</td>
              </tr>
            ))}
            {vatRow && (
              <tr>
                <td colSpan={v.useItems ? 4 : 1} style={{ ...td, textAlign: 'right' }}>
                  공급가액 {won(s.supply)}원 · 부가세 {won(s.vat)}원 ({v.vat === 'incl' ? '포함' : '별도'})
                </td>
              </tr>
            )}
            {v.useItems && (
              <tr>
                <td colSpan={3} style={th}>합 계</td>
                <td style={{ ...num, fontWeight: 700 }}>{won(s.sum)}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginBottom: 4 }}>
        결제 방법&nbsp;&nbsp;
        {(['cash', 'transfer', 'card'] as const).map((p) => (
          <span key={p} style={{ marginRight: 14 }}>{v.pay === p ? '■' : '□'} {PAY_LABEL[p]}</span>
        ))}
      </div>
      {v.note.trim() && <div style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>비고: {v.note.trim()}</div>}

      <p style={{ margin: '10px 0 6px', textAlign: 'center', fontSize: 14 }}>{statement(v.purpose, v.subject)}</p>
      <div style={{ textAlign: 'center', margin: '0 0 10px', fontSize: 14 }}>{krDate(v.date)}</div>

      <table style={{ ...pTable, fontSize: 12.5 }}>
        <colgroup>
          <col style={{ width: 70 }} />
          <col style={{ width: 96 }} />
          <col />
          <col style={{ width: 96 }} />
          <col style={{ width: 150 }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ ...th, letterSpacing: '0.1em' }}>{biz ? '공급자' : '영수인'}</td>
            <td style={th}>{biz ? '상호(성명)' : '성 명'}</td>
            <td style={{ ...td, height: 34 }}><Seal name={v.issuerName.trim()} stamp={stamp} /></td>
            <td style={th}>{biz ? '사업자번호' : '연락처'}</td>
            <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{biz ? v.issuerBiz : v.issuerPhone}</td>
          </tr>
          <tr>
            <td style={th}>주 소</td>
            <td colSpan={biz ? 1 : 3} style={td}>{v.issuerAddress}</td>
            {biz && <td style={th}>연락처</td>}
            {biz && <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{v.issuerPhone}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Paper({ v, stamps }: { v: Receipt; stamps: Record<string, string> }) {
  if (!v.copies) {
    return (
      <Page style={{ padding: '48px 56px' }}>
        <Copy v={v} stamp={stamps.issuer} />
      </Page>
    )
  }
  return (
    <Page style={{ padding: '40px 56px' }}>
      <Copy v={v} stamp={stamps.issuer} keep="(공급자 보관용)" />
      <div style={{ borderTop: '1px dashed #888', margin: '14px -20px 22px', position: 'relative', height: 0 }}>
        <span style={{ position: 'absolute', left: '50%', top: -10, transform: 'translateX(-50%)', background: '#fff', padding: '0 10px', fontSize: 11, color: '#777', lineHeight: '20px', letterSpacing: '0.3em' }}>절 취 선</span>
      </div>
      <Copy v={v} stamp={stamps.issuer} keep="(공급받는자 보관용)" />
    </Page>
  )
}

const receipt: DocTemplate<Receipt> = {
  id: 'receipt',
  ns: 'receiptGenerator',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [{ id: 'issuer', name: v.issuerName }],
  fileName: (v) => docFileName('영수증', v.buyer, v.date),
}

export default function ReceiptGenerator() {
  return <DocumentGenerator template={receipt} />
}
