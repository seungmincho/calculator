'use client'

// 차용증 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개
import type { CSSProperties, ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, PaperTitle, Article, Seal, pTable, pTh, pTd, pNum } from '@/components/document/paper'
import { Section, AmountField, DateField, NumberField, TextField, Segmented, Check, PartyFields, labelCls } from '@/components/document/fields'
import { EMPTY_PARTY, maskId, krDate, amountText, won, docFileName, type Party } from '@/utils/document'
import { addYears } from '@/utils/dday'
import {
  schedule, withholding, giftInterestGap, giftFreePrincipal, overMaxRate,
  MAX_RATE, FAIR_RATE, type RepayMethod, type Schedule,
} from '@/utils/iou'

interface Iou {
  debtor: Party
  creditor: Party
  guarantors: Party[]
  amount: number
  loanDate: string
  dueDate: string
  writtenDate: string
  rate: number // 연 %
  payDay: number // 매월 N일
  method: RepayMethod
  receive: 'transfer' | 'cash'
  account: string
  family: boolean
  acceleration: boolean
  late: boolean
  lateRate: number
  prepay: boolean
  court: boolean
  courtName: string
  extra: string
  attachSchedule: boolean
}

const initial = (today: string): Iou => ({
  debtor: { ...EMPTY_PARTY },
  creditor: { ...EMPTY_PARTY },
  guarantors: [],
  amount: 10_000_000,
  loanDate: today,
  dueDate: today ? addYears(today, 1) : '',
  writtenDate: today,
  rate: 5,
  payDay: today ? Number(today.slice(8)) : 1,
  method: 'bullet',
  receive: 'transfer',
  account: '',
  family: false,
  acceleration: true,
  late: true,
  lateRate: 12,
  prepay: true,
  court: false,
  courtName: '채권자 주소지 관할 법원',
  extra: '',
  attachSchedule: false,
})

const plan = (v: Iou): Schedule => schedule(v.amount, v.rate, v.loanDate, v.dueDate, v.method, v.payDay)

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: Iou, t: TFn): Insight[] {
  const out: Insight[] = []
  if (!(v.amount > 0)) out.push({ level: 'error', text: t('insight.noAmount') })
  if (v.loanDate && v.dueDate && v.dueDate <= v.loanDate) out.push({ level: 'error', text: t('insight.dueBeforeLoan') })
  if (overMaxRate(v.rate)) out.push({ level: 'warn', text: t('insight.rateOver', { rate: v.rate, max: MAX_RATE }) })
  if (v.late && overMaxRate(v.lateRate)) out.push({ level: 'warn', text: t('insight.lateOver', { rate: v.lateRate, max: MAX_RATE }) })
  const s = plan(v)
  if (s.totalInterest > 0) {
    out.push({ level: 'info', text: t('insight.withholding', { interest: won(s.totalInterest), tax: won(withholding(s.totalInterest).total) }) })
  }
  if (v.family && v.amount > 0) {
    if (v.rate >= FAIR_RATE) out.push({ level: 'info', text: t('insight.giftFair', { fair: FAIR_RATE }) })
    else {
      const g = giftInterestGap(v.amount, v.rate)
      const vars = { gap: won(g.gap), fair: FAIR_RATE, limit: won(giftFreePrincipal(v.rate)) }
      out.push({ level: g.taxable ? 'warn' : 'info', text: t(g.taxable ? 'insight.giftTaxable' : 'insight.giftOk', vars) })
    }
  }
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function Form({ v, set, t }: { v: Iou; set: (p: Partial<Iou>) => void; t: TFn }) {
  const s = plan(v)
  const first = s.rows[0]
  const setG = (i: number, p: Party) => set({ guarantors: v.guarantors.map((g, j) => (j === i ? p : g)) })

  return (
    <>
      <Section title={t('section.loan')}>
        <AmountField label={t('amount')} value={v.amount} onChange={(amount) => set({ amount })} />
        <div className="grid grid-cols-2 gap-3">
          <DateField label={t('loanDate')} value={v.loanDate} onChange={(loanDate) => set({ loanDate })} />
          <DateField label={t('dueDate')} value={v.dueDate} min={v.loanDate} onChange={(dueDate) => set({ dueDate })} />
          <NumberField label={t('rate')} value={v.rate} unit="%" step={0.1} max={100} onChange={(rate) => set({ rate })} hint={t('rateHint', { max: MAX_RATE })} />
          <NumberField label={t('payDay')} value={v.payDay} unit={t('payDayUnit')} min={1} max={31} onChange={(payDay) => set({ payDay: Math.round(payDay) || 1 })} />
        </div>
        <Segmented
          label={t('method')}
          value={v.method}
          onChange={(method) => set({ method })}
          options={(['bullet', 'annuity', 'equalPrincipal'] as const).map((m) => ({ value: m, label: t(`methods.${m}`) }))}
        />
        <p className="text-xs text-muted -mt-2">{t(`methodHint.${v.method}`)}</p>
        <Segmented
          label={t('receive')}
          value={v.receive}
          onChange={(receive) => set({ receive })}
          options={(['transfer', 'cash'] as const).map((m) => ({ value: m, label: t(`receives.${m}`) }))}
        />

        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm text-sub">{t('summary.total')}</p>
          <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(s.totalPayment)}<span className="text-lg font-semibold ml-1">{t('won')}</span></p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t('summary.principal')}</dt><dd className="text-body tabular-nums">{won(v.amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t('summary.interest')}</dt><dd className="text-body tabular-nums">{won(s.totalInterest)}</dd></div>
            {first && v.method !== 'bullet' && (
              <div className="flex justify-between"><dt className="text-muted">{t('summary.firstPayment')}</dt><dd className="text-body tabular-nums">{won(first.payment)}</dd></div>
            )}
            {first && v.method === 'bullet' && s.totalInterest > 0 && (
              <div className="flex justify-between"><dt className="text-muted">{t('summary.monthlyInterest')}</dt><dd className="text-body tabular-nums">{won(first.interest)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted">{t('summary.count')}</dt><dd className="text-body tabular-nums">{t('summary.countUnit', { n: s.rows.length })}</dd></div>
          </dl>
        </div>
      </Section>

      <Section title={t('section.debtor')} hint={t('sectionHint.debtor')}>
        <PartyFields value={v.debtor} onChange={(debtor) => set({ debtor })} />
      </Section>

      <Section title={t('section.creditor')} hint={t('sectionHint.creditor')}>
        <PartyFields value={v.creditor} onChange={(creditor) => set({ creditor })} />
        <TextField label={t('account')} value={v.account} onChange={(account) => set({ account })} placeholder={t('accountPlaceholder')} hint={t('accountHint')} maxLength={80} />
        <Check label={t('family')} hint={t('familyHint', { fair: FAIR_RATE })} checked={v.family} onChange={(family) => set({ family })} />
      </Section>

      <Section
        title={t('section.guarantor')}
        hint={t('sectionHint.guarantor')}
        action={
          v.guarantors.length < 3 && (
            <button type="button" onClick={() => set({ guarantors: [...v.guarantors, { ...EMPTY_PARTY }] })} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs shrink-0">
              <Plus className="w-3.5 h-3.5" />
              {t('guarantorAdd')}
            </button>
          )
        }
      >
        {v.guarantors.map((g, i) => (
          <div key={i} className="bg-subtle rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-body">{t('guarantorN', { n: i + 1 })}</p>
              <button type="button" onClick={() => set({ guarantors: v.guarantors.filter((_, j) => j !== i) })} className="p-1.5 rounded-lg text-faint hover:text-red-600" aria-label={t('guarantorRemove')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <PartyFields value={g} onChange={(p) => setG(i, p)} />
          </div>
        ))}
      </Section>

      <Section title={t('section.clauses')}>
        <div className="space-y-2">
          <Check label={t('clause.acceleration')} hint={t('clause.accelerationHint')} checked={v.acceleration} onChange={(acceleration) => set({ acceleration })} />
          <Check label={t('clause.late')} hint={t('clause.lateHint', { max: MAX_RATE })} checked={v.late} onChange={(late) => set({ late })}>
            <NumberField label={t('clause.lateRate')} value={v.lateRate} unit="%" step={0.1} max={100} onChange={(lateRate) => set({ lateRate })} />
          </Check>
          <Check label={t('clause.prepay')} hint={t('clause.prepayHint')} checked={v.prepay} onChange={(prepay) => set({ prepay })} />
          <Check label={t('clause.court')} hint={t('clause.courtHint')} checked={v.court} onChange={(court) => set({ court })}>
            <TextField label={t('clause.courtName')} value={v.courtName} onChange={(courtName) => set({ courtName })} maxLength={40} />
          </Check>
        </div>
        <TextField label={t('clause.extra')} value={v.extra} onChange={(extra) => set({ extra })} placeholder={t('clause.extraPlaceholder')} rows={3} maxLength={1000} />
        <DateField label={t('writtenDate')} value={v.writtenDate} onChange={(writtenDate) => set({ writtenDate })} />
      </Section>

      <Section title={t('section.schedule')}>
        <Check label={t('schedule.attach')} hint={t('schedule.attachHint')} checked={v.attachSchedule} onChange={(attachSchedule) => set({ attachSchedule })} />
        {s.rows.length ? (
          <details className="group">
            <summary className={`${labelCls} cursor-pointer select-none text-primary`}>{t('schedule.show', { n: s.rows.length })}</summary>
            <div className="mt-2 max-h-96 overflow-auto rounded-xl border border-line">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-subtle text-sub sticky top-0">
                  <tr>
                    {(['no', 'date', 'principal', 'interest', 'payment', 'balance'] as const).map((k) => (
                      <th key={k} className="px-2 py-2 font-medium text-right first:text-center whitespace-nowrap">{t(`schedule.${k}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-body">
                  {s.rows.map((r) => (
                    <tr key={r.no} className="border-t border-line">
                      <td className="px-2 py-1.5 text-center">{r.no}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">{r.date}</td>
                      <td className="px-2 py-1.5 text-right">{won(r.principal)}</td>
                      <td className="px-2 py-1.5 text-right">{won(r.interest)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{won(r.payment)}</td>
                      <td className="px-2 py-1.5 text-right">{won(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : (
          <p className="text-sm text-muted">{t('schedule.empty')}</p>
        )}
      </Section>
    </>
  )
}

// ── A4 본문 (법률 문서이므로 한국어 고정) ───────────────────────────────────

const blank = (s: string, w = 10) => s.trim() || ' '.repeat(w)

function PartyBlock({ role, p, stamp }: { role: string; p: Party; stamp?: string }) {
  const lab: CSSProperties = { ...pTh, width: 92 }
  return (
    <table style={{ ...pTable, marginTop: 10 }}>
      <colgroup>
        <col style={{ width: 82 }} />
        <col style={{ width: 92 }} />
        <col />
        <col style={{ width: 110 }} />
        <col style={{ width: 150 }} />
      </colgroup>
      <tbody>
        <tr>
          <td rowSpan={3} style={{ ...pTh, letterSpacing: '0.1em' }}>{role}</td>
          <td style={lab}>성 명</td>
          <td style={{ ...pTd, height: 40 }}><Seal name={p.name} stamp={stamp} /></td>
          <td style={lab}>주민등록번호</td>
          <td style={{ ...pTd, fontVariantNumeric: 'tabular-nums' }}>{maskId(p)}</td>
        </tr>
        <tr>
          <td style={lab}>주 소</td>
          <td colSpan={3} style={pTd}>{p.address}</td>
        </tr>
        <tr>
          <td style={lab}>연 락 처</td>
          <td colSpan={3} style={pTd}>{p.phone}</td>
        </tr>
      </tbody>
    </table>
  )
}

function Paper({ v, stamps }: { v: Iou; stamps: Record<string, string> }) {
  const s = plan(v)
  const rows = s.rows
  const n = rows.length
  const firstDate = rows[0]?.date ?? ''
  const debtor = blank(v.debtor.name)
  const creditor = blank(v.creditor.name)

  const repay =
    v.method === 'bullet' || !n
      ? `채무자는 차용원금 전액을 ${krDate(v.dueDate)}까지 채권자에게 일시에 변제한다.`
      : v.method === 'annuity'
        ? `채무자는 차용원금과 이자를 ${krDate(firstDate)}부터 ${krDate(v.dueDate)}까지 매월 ${v.payDay}일에 ${n}회에 걸쳐 원리금균등분할 방식으로 매회 금 ${won(rows[0].payment)}원씩 변제한다(마지막 회차는 단수 조정).`
        : `채무자는 차용원금을 ${krDate(firstDate)}부터 ${krDate(v.dueDate)}까지 매월 ${v.payDay}일에 ${n}회로 나누어 매회 원금 금 ${won(rows[0].principal)}원과 해당 기간의 이자를 함께 변제한다(마지막 회차는 단수 조정).`

  const articles: { title: string; body: ReactNode }[] = [
    { title: '변제기일 및 방법', body: repay },
    {
      title: '이자',
      body: v.rate > 0
        ? `이자는 연 ${v.rate}%로 하며, ${v.method === 'bullet' ? `매월 ${v.payDay}일에 그 달의 이자를 지급한다` : '각 회차 변제금에 포함하여 지급한다'}.`
        : '이 차용금에는 이자를 붙이지 아니한다.',
    },
    {
      title: '변제 장소',
      body: v.account.trim()
        ? `채무자는 원리금을 채권자 명의의 다음 계좌로 송금하여 변제한다. (${v.account.trim()})`
        : '채무자는 원리금을 채권자에게 직접 지급하거나 채권자가 지정하는 계좌로 송금하여 변제한다.',
    },
  ]
  if (v.late) articles.push({ title: '지연손해금', body: `채무자가 변제기일에 원리금을 지급하지 아니한 때에는 지체된 금액에 대하여 연 ${v.lateRate}%의 비율로 계산한 지연손해금을 가산하여 지급한다.` })
  if (v.acceleration) {
    articles.push({
      title: '기한의 이익 상실',
      body: (
        <>
          채무자가 다음 각 호의 어느 하나에 해당하면 채권자의 별도 통지 없이 기한의 이익을 잃고 남은 채무 전액을 즉시 변제하여야 한다.
          <div>1. 이자 또는 분할 변제금의 지급을 2회 이상 연체한 때</div>
          <div>2. 채무자의 재산에 압류·가압류·강제집행이 있거나 파산·회생 절차가 개시된 때</div>
        </>
      ),
    })
  }
  if (v.prepay) articles.push({ title: '중도상환', body: '채무자는 변제기일 전이라도 원금의 전부 또는 일부를 상환할 수 있으며, 이에 따른 수수료는 없다.' })
  if (v.guarantors.length) articles.push({ title: '연대보증', body: '연대보증인은 채무자와 연대하여 이 차용증에 따른 채무 일체를 이행할 책임을 진다.' })
  if (v.court) articles.push({ title: '관할법원', body: `이 차용과 관련된 분쟁의 관할법원은 ${v.courtName.trim() || '채권자 주소지 관할 법원'}으로 한다.` })
  if (v.extra.trim()) articles.push({ title: '특약사항', body: <span style={{ whiteSpace: 'pre-wrap' }}>{v.extra.trim()}</span> })

  const attach = v.attachSchedule && n > 0

  return (
    <>
      <Page>
        <PaperTitle>차 용 증</PaperTitle>
        <table style={{ ...pTable, marginBottom: 20 }}>
          <tbody>
            <tr>
              <td style={{ ...pTh, width: 110, fontSize: 15 }}>차용금액</td>
              <td style={{ ...pTd, fontSize: 16, fontWeight: 700, padding: '10px 12px' }}>{amountText(v.amount)}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ margin: '0 0 18px', textIndent: '1em' }}>
          채무자 {debtor}은(는) 채권자 {creditor}(으)로부터 위 금액을 {krDate(v.loanDate)}{' '}
          {v.receive === 'transfer' ? '계좌이체로' : '현금으로'} 틀림없이 차용하였으며, 아래 조건에 따라 변제할 것을 약정한다.
        </p>
        {articles.map((a, i) => (
          <Article key={a.title} no={i + 1} title={a.title}>{a.body}</Article>
        ))}
        <p style={{ margin: '18px 0 0' }}>
          위 내용을 증명하기 위하여 이 차용증 2통을 작성하여 채권자와 채무자가 각각 서명(날인)한 후 1통씩 보관한다.
        </p>
        {attach && <p style={{ margin: '4px 0 0' }}>별첨: 상환 일정표 1부</p>}
        <div style={{ textAlign: 'center', margin: '28px 0 18px', fontSize: 15 }}>{krDate(v.writtenDate)}</div>
        <PartyBlock role="채 무 자" p={v.debtor} stamp={stamps.debtor} />
        <PartyBlock role="채 권 자" p={v.creditor} stamp={stamps.creditor} />
        {v.guarantors.map((g, i) => (
          <PartyBlock key={i} role="연대보증인" p={g} stamp={stamps[`g${i}`]} />
        ))}
      </Page>

      {attach && (
        <Page>
          <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', marginBottom: 8 }}>상환 일정표</div>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#444', marginBottom: 16 }}>
            (별첨) 차용금 {won(v.amount)}원 · 연 {v.rate}% · 채무자 {debtor} · 채권자 {creditor}
          </div>
          <table style={{ ...pTable, fontSize: 12, lineHeight: 1.4 }}>
            <thead>
              <tr>
                {['회차', '지급일', '원금', '이자', '합계', '잔액'].map((h) => <th key={h} style={pTh}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.no}>
                  <td style={{ ...pTd, textAlign: 'center' }}>{r.no}</td>
                  <td style={{ ...pTd, textAlign: 'center' }}>{r.date}</td>
                  <td style={pNum}>{won(r.principal)}</td>
                  <td style={pNum}>{won(r.interest)}</td>
                  <td style={pNum}>{won(r.payment)}</td>
                  <td style={pNum}>{won(r.balance)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={pTh}>합 계</td>
                <td style={{ ...pNum, fontWeight: 700 }}>{won(v.amount)}</td>
                <td style={{ ...pNum, fontWeight: 700 }}>{won(s.totalInterest)}</td>
                <td style={{ ...pNum, fontWeight: 700 }}>{won(s.totalPayment)}</td>
                <td style={pTd} />
              </tr>
            </tbody>
          </table>
        </Page>
      )}
    </>
  )
}

const iou: DocTemplate<Iou> = {
  id: 'iou',
  ns: 'iouGenerator',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [
    { id: 'debtor', name: v.debtor.name },
    { id: 'creditor', name: v.creditor.name },
    ...v.guarantors.map((g, i) => ({ id: `g${i}`, name: g.name })),
  ],
  fileName: (v) => docFileName('차용증', v.debtor.name, v.writtenDate || v.loanDate),
}

export default function IouGenerator() {
  return <DocumentGenerator template={iou} />
}
