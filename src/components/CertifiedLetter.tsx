'use client'

// 내용증명 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개. 문안·검사 로직은 src/utils/certifiedLetter.ts
import type { CSSProperties } from 'react'
import { RotateCcw, FileDown } from 'lucide-react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, PaperTitle, Seal, pTable, pTh, pTd } from '@/components/document/paper'
import { Section, AmountField, DateField, TextField, Segmented, Check, PartyFields, labelCls, segCls } from '@/components/document/fields'
import { EMPTY_PARTY, krDate, won, docFileName, type Party } from '@/utils/document'
import { addDays, addYears, daysBetween } from '@/utils/dday'
import {
  PURPOSES, FIELDS, ACTIONS, SMALL_CLAIMS_MAX, FEE,
  draftTitle, draftBody, paragraphsOf, paginate, letterFee, leaseWindow, prescription,
  type Letter, type Purpose, type ActionKey,
} from '@/utils/certifiedLetter'

interface V extends Letter {
  sender: Party
  receiver: Party
  title: string // '' = 초안 제목
  body: string // bodyAuto면 무시
  bodyAuto: boolean
}

const ALL_ACTIONS: Record<ActionKey, boolean> = {
  leaseReg: true, paymentOrder: true, smallClaims: false, lawsuit: true, provisional: false, laborOffice: true, damages: true, interest: true,
}

const initial = (today: string): V => ({
  purpose: 'deposit',
  termKind: 'renewal',
  sender: { ...EMPTY_PARTY },
  receiver: { ...EMPTY_PARTY },
  contractDate: today ? addYears(today, -2) : '',
  baseDate: today ? addDays(today, -7) : '',
  amount: 200_000_000,
  property: '',
  item: '',
  account: '',
  hasIou: true,
  demand: '',
  deadline: today ? addDays(today, 14) : '',
  actions: { ...ALL_ACTIONS },
  written: today,
  title: '',
  body: '',
  bodyAuto: true,
})

const parasOf = (v: V) => (v.bodyAuto ? draftBody(v) : paragraphsOf(v.body))
const titleOf = (v: V) => v.title.trim() || draftTitle(v)

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: V, t: TFn): Insight[] {
  const out: Insight[] = []
  if (!v.receiver.address.trim()) out.push({ level: 'error', text: t('insight.noReceiverAddress') })
  if (!v.receiver.name.trim()) out.push({ level: 'error', text: t('insight.noReceiverName') })
  if (!v.sender.address.trim()) out.push({ level: 'warn', text: t('insight.noSenderAddress') })
  if (v.deadline && v.written) {
    const gap = daysBetween(v.written, v.deadline)
    if (gap < 0) out.push({ level: 'error', text: t('insight.deadlineBeforeWritten', { deadline: krDate(v.deadline), written: krDate(v.written) }) })
    else if (gap < 7) out.push({ level: 'info', text: t('insight.deadlineShort', { days: gap }) })
  }

  const lease = (v.purpose === 'deposit' || (v.purpose === 'terminate' && v.termKind === 'renewal')) && v.baseDate && v.written
  if (lease) {
    const w = leaseWindow(v.written, v.baseDate)
    const vars = { end: krDate(v.baseDate), two: krDate(w.twoBefore), six: krDate(w.sixBefore), days: w.daysLeft }
    if (v.purpose === 'deposit') {
      if (w.status === 'expired') out.push({ level: 'info', text: t('insight.depositAfter') })
      else {
        out.push({ level: w.status === 'late' ? 'warn' : 'info', text: t(w.status === 'late' ? 'insight.renewalLate' : 'insight.depositBefore', vars) })
        if (v.deadline && v.deadline < v.baseDate) out.push({ level: 'warn', text: t('insight.depositDeadline', vars) })
      }
    } else {
      out.push({ level: w.status === 'ok' ? 'info' : 'warn', text: t(`insight.renewal.${w.status}`, vars) })
    }
  }

  const p = prescription(v.purpose, v.baseDate, v.written)
  if (p && p.status !== 'ok') out.push({ level: 'warn', text: t(`insight.prescription.${p.status}`, { years: p.years, expire: krDate(p.expire) }) })

  if (ACTIONS[v.purpose].includes('smallClaims') && v.actions.smallClaims && v.amount > SMALL_CLAIMS_MAX) {
    out.push({ level: 'warn', text: t('insight.smallClaimsOver') })
  }
  if (v.purpose === 'wage') out.push({ level: 'info', text: t('insight.wage') })
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

/** 차용증 작성기(localStorage docgen_iou)에 저장된 내용 → 대여금 반환 요구 칸 */
function loadIou(): Partial<V> | null {
  try {
    const s = JSON.parse(localStorage.getItem('docgen_iou') || 'null')?.v
    if (!s || typeof s !== 'object') return null
    const party = (p: unknown): Party => ({ ...EMPTY_PARTY, ...(p && typeof p === 'object' ? (p as Partial<Party>) : {}) })
    return {
      sender: party(s.creditor),
      receiver: party(s.debtor),
      amount: Number(s.amount) || 0,
      contractDate: typeof s.loanDate === 'string' ? s.loanDate : '',
      baseDate: typeof s.dueDate === 'string' ? s.dueDate : '',
      hasIou: true,
    }
  } catch {
    return null
  }
}

function Form({ v, set, t }: { v: V; set: (p: Partial<V>) => void; t: TFn }) {
  const fields = FIELDS[v.purpose]
  const has = (k: (typeof fields)[number]) => fields.includes(k)
  const lab = (k: string) => t(`fields.${v.purpose}.${k}`)
  const paras = parasOf(v)
  const pages = paginate(paras).length
  const fee = letterFee(pages)

  const pickPurpose = (purpose: Purpose) => {
    if (purpose === v.purpose) return
    if ((!v.bodyAuto || v.title.trim()) && !window.confirm(t('confirmPurpose'))) return
    set({ purpose, title: '', bodyAuto: true })
  }

  return (
    <>
      <Section title={t('section.purpose')} hint={t('sectionHint.purpose')}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('section.purpose')}>
          {PURPOSES.map((p) => (
            <button key={p} type="button" onClick={() => pickPurpose(p)} className={segCls(v.purpose === p)} aria-pressed={v.purpose === p}>
              {t(`purposes.${p}`)}
            </button>
          ))}
        </div>
        {v.purpose === 'terminate' && (
          <Segmented
            label={t('termKind')}
            value={v.termKind}
            onChange={(termKind) => set({ termKind, title: '' })}
            options={(['renewal', 'contract'] as const).map((k) => ({ value: k, label: t(`termKinds.${k}`) }))}
          />
        )}
        <p className="text-xs text-muted">{t(`purposeHint.${v.purpose}`)}</p>
      </Section>

      <Section title={t('section.sender')} hint={t('sectionHint.sender')}>
        <PartyFields value={v.sender} onChange={(sender) => set({ sender })} hide={['idFront', 'idBack1']} />
      </Section>

      <Section title={t('section.receiver')} hint={t('sectionHint.receiver')}>
        <PartyFields value={v.receiver} onChange={(receiver) => set({ receiver })} hide={['idFront', 'idBack1']} />
      </Section>

      {fields.length > 0 && (
        <Section
          title={t('section.contract')}
          action={
            v.purpose === 'loan' && (
              <button
                type="button"
                onClick={() => {
                  const p = loadIou()
                  if (p) set(p)
                  else window.alert(t('iouNone'))
                }}
                className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs shrink-0"
              >
                <FileDown className="w-3.5 h-3.5" />
                {t('iouLoad')}
              </button>
            )
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {has('contractDate') && <DateField label={lab('contractDate')} value={v.contractDate} onChange={(contractDate) => set({ contractDate })} />}
            {has('baseDate') && <DateField label={lab('baseDate')} value={v.baseDate} onChange={(baseDate) => set({ baseDate })} />}
          </div>
          {has('amount') && <AmountField label={lab('amount')} value={v.amount} onChange={(amount) => set({ amount })} />}
          {has('property') && <TextField label={lab('property')} value={v.property} onChange={(property) => set({ property })} placeholder={t(`placeholder.${v.purpose}.property`)} maxLength={120} />}
          {has('item') && <TextField label={lab('item')} value={v.item} onChange={(item) => set({ item })} placeholder={t(`placeholder.${v.purpose}.item`)} maxLength={200} />}
          {has('account') && <TextField label={lab('account')} value={v.account} onChange={(account) => set({ account })} placeholder={t('accountPlaceholder')} maxLength={80} />}
          {v.purpose === 'loan' && <Check label={t('hasIou')} hint={t('hasIouHint')} checked={v.hasIou} onChange={(hasIou) => set({ hasIou })} />}
        </Section>
      )}

      <Section title={t('section.demand')}>
        <div>
          <DateField label={t('deadline')} value={v.deadline} min={v.written} onChange={(deadline) => set({ deadline })} hint={v.deadline ? t('deadlineText', { date: krDate(v.deadline) }) : undefined} />
          <div className="flex flex-wrap gap-2 mt-2">
            {[7, 14, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => v.written && set({ deadline: addDays(v.written, n) })}
                className={segCls(!!v.written && v.deadline === addDays(v.written, n))}
              >
                {t('deadlineIn', { n })}
              </button>
            ))}
          </div>
        </div>
        <TextField label={t('demand')} value={v.demand} onChange={(demand) => set({ demand })} placeholder={t(v.purpose === 'custom' ? 'demandPlaceholderCustom' : 'demandPlaceholder')} rows={3} maxLength={2000} hint={t('demandHint')} />
        <div>
          <p className={labelCls}>{t('actionsLabel')}</p>
          <div className="space-y-2">
            {ACTIONS[v.purpose].map((k) => (
              <Check key={k} label={t(`actions.${k}`)} hint={t(`actionHints.${k}`)} checked={v.actions[k]} onChange={(on) => set({ actions: { ...v.actions, [k]: on } })} />
            ))}
          </div>
        </div>
        <DateField label={t('written')} value={v.written} onChange={(written) => set({ written })} />
      </Section>

      <Section
        title={t('section.body')}
        hint={t('sectionHint.body')}
        action={
          !v.bodyAuto && (
            <button type="button" onClick={() => set({ bodyAuto: true, body: '' })} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
              {t('bodyReset')}
            </button>
          )
        }
      >
        <TextField label={t('subject')} value={v.title} onChange={(title) => set({ title })} placeholder={draftTitle(v)} maxLength={80} hint={t('subjectHint')} />
        <TextField
          label={t('body')}
          value={v.bodyAuto ? draftBody(v).join('\n') : v.body}
          onChange={(body) => set({ body, bodyAuto: false })}
          rows={12}
          maxLength={8000}
          hint={v.bodyAuto ? t('bodyAutoHint') : t('bodyManualHint')}
        />
      </Section>

      <Section title={t('section.send')}>
        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm text-sub">{t('send.fee', { pages })}</p>
          <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(fee)}<span className="text-lg font-semibold ml-1">{t('won')}</span></p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t('send.postage')}</dt><dd className="text-body tabular-nums">{won(pages <= 4 ? FEE.postage : FEE.postageHeavy)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t('send.registered')}</dt><dd className="text-body tabular-nums">{won(FEE.registered)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t('send.cert', { pages })}</dt><dd className="text-body tabular-nums">{won(FEE.certFirst + FEE.certExtra * (pages - 1))}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t('send.proof')}</dt><dd className="text-body tabular-nums">+{won(FEE.deliveryProof)}</dd></div>
          </dl>
          <p className="text-xs text-muted mt-3">{t('send.feeNote')}</p>
        </div>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-sub">
          {(t.raw('send.steps') as string[]).map((s) => <li key={s}>{s}</li>)}
        </ol>
        <a href="https://service.epost.go.kr/econprf.RetrieveEConprfReqSend.postal" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-primary hover:underline">
          {t('send.epost')}
        </a>
      </Section>
    </>
  )
}

// ── A4 본문 (법률 문서이므로 한국어 고정) ───────────────────────────────────

function PartyRows({ role, p }: { role: string; p: Party }) {
  const lab: CSSProperties = { ...pTh, width: 92 }
  return (
    <>
      <tr>
        <td rowSpan={3} style={{ ...pTh, letterSpacing: '0.1em' }}>{role}</td>
        <td style={lab}>성 명</td>
        <td style={pTd}>{p.name}</td>
      </tr>
      <tr>
        <td style={lab}>주 소</td>
        <td style={pTd}>{p.address}</td>
      </tr>
      <tr>
        <td style={lab}>연 락 처</td>
        <td style={pTd}>{p.phone}</td>
      </tr>
    </>
  )
}

const pageNo: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 36, textAlign: 'center', fontSize: 12, color: '#555' }
const item: CSSProperties = { display: 'flex', gap: 6, marginBottom: 8, textAlign: 'justify' }

function Paper({ v, stamps }: { v: V; stamps: Record<string, string> }) {
  const paras = parasOf(v)
  const pages = paginate(paras)
  const n = pages.length
  return (
    <>
      {pages.map((idx, pi) => (
        <Page key={pi} style={{ position: 'relative' }}>
          {pi === 0 && (
            <>
              <PaperTitle>내 용 증 명</PaperTitle>
              <table style={{ ...pTable, marginBottom: 22 }}>
                <colgroup>
                  <col style={{ width: 82 }} />
                  <col style={{ width: 92 }} />
                  <col />
                </colgroup>
                <tbody>
                  <PartyRows role="발 신 인" p={v.sender} />
                  <PartyRows role="수 신 인" p={v.receiver} />
                </tbody>
              </table>
              <div style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px', paddingBottom: 6, borderBottom: '1px solid #333' }}>제 목 : {titleOf(v)}</div>
            </>
          )}
          {idx.map((i) => (
            <div key={i} style={item}>
              <span style={{ flexShrink: 0, minWidth: 22 }}>{i + 1}.</span>
              <span style={{ whiteSpace: 'pre-wrap' }}>{paras[i]}</span>
            </div>
          ))}
          {pi === n - 1 && (
            <>
              <div style={{ textAlign: 'center', margin: '32px 0 22px', fontSize: 15 }}>{krDate(v.written)}</div>
              <div style={{ textAlign: 'right', paddingRight: 20, fontSize: 15 }}>
                위 발신인&nbsp;&nbsp;<Seal name={v.sender.name} stamp={stamps.sender} />
              </div>
            </>
          )}
          {n > 1 && <div style={pageNo}>- {pi + 1} / {n} -</div>}
        </Page>
      ))}
    </>
  )
}

const letter: DocTemplate<V> = {
  id: 'certified',
  ns: 'certifiedLetter',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [{ id: 'sender', name: v.sender.name }],
  fileName: (v) => docFileName('내용증명', v.sender.name, v.written),
}

export default function CertifiedLetter() {
  return <DocumentGenerator template={letter} />
}
