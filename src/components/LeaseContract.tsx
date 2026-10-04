'use client'

// 부동산(주택) 임대차계약서 작성기 — 법무부·국토부 주택임대차표준계약서(2023.10.6. 개정) 구조 기반.
// 공통 문서 엔진(src/components/document) 위의 양식 1개. 문안·검사·쪽 나눔은 src/utils/leaseContract.ts
import type { CSSProperties, ReactNode } from 'react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, PaperTitle, Seal, pTable, pTh, pTd } from '@/components/document/paper'
import { Section, AmountField, DateField, NumberField, TextField, Segmented, Check, PartyFields } from '@/components/document/fields'
import { EMPTY_PARTY, maskId, krDate, amountText, won, docFileName, type Party } from '@/utils/document'
import { addDays, ymd } from '@/utils/dday'
import {
  SPECIAL_KEYS, SPECIALS, DEFAULT_SPECIALS, MGMT_ITEMS, MGMT_LABEL, MGMT_DETAIL_MIN, REPORT_DEPOSIT, REPORT_RENT, RENEW_CAP,
  specialLines, hasSpecial, toggleSpecial, twoYearEnd, isShortTerm, payGap, overRenewCap, reportRegion, reportByAmount, mgmtSum,
  laterClauses, standardSpecials, textPx, paginate, LINE, BODY_PX,
  type Kind, type ContractType, type MgmtItem,
} from '@/utils/leaseContract'
import '@/lib/i18n/ns/leaseContract'

interface V {
  kind: Kind
  contractType: ContractType
  prevDeposit: number
  prevRent: number
  lessor: Party
  lessee: Party
  address: string
  landCategory: string
  landArea: string
  structure: string
  use: string
  buildingArea: string
  leasePart: string
  leaseArea: string
  deposit: number
  down: number
  middle: number
  middleDate: string
  balance: number
  balanceDate: string
  rent: number
  rentDay: number
  rentAccount: string
  mgmt: 'none' | 'fixed' | 'variable'
  mgmtTotal: number
  mgmtItems: Partial<Record<MgmtItem, number>>
  mgmtNote: string
  start: string
  end: string
  taxArrears: 'none' | 'some'
  taxNote: string
  priorLease: 'none' | 'some'
  priorNote: string
  repair: boolean
  repairWhat: string
  repairBy: string
  repairDeduct: boolean
  special: string
  mediation: boolean
  demolish: boolean
  demolishNote: string
  addressConsent: boolean
  brokered: boolean
  contractDate: string
}

const initial = (today: string): V => {
  const bal = today ? addDays(today, 30) : ''
  return {
    kind: 'jeonse',
    contractType: 'new',
    prevDeposit: 0,
    prevRent: 0,
    lessor: { ...EMPTY_PARTY },
    lessee: { ...EMPTY_PARTY },
    address: '',
    landCategory: '대',
    landArea: '',
    structure: '철근콘크리트구조',
    use: '아파트',
    buildingArea: '',
    leasePart: '',
    leaseArea: '',
    deposit: 200_000_000,
    down: 20_000_000,
    middle: 0,
    middleDate: today ? addDays(today, 14) : '',
    balance: 180_000_000,
    balanceDate: bal,
    rent: 0,
    rentDay: bal ? Number(bal.slice(8)) : 1,
    rentAccount: '',
    mgmt: 'fixed',
    mgmtTotal: 150_000,
    mgmtItems: {},
    mgmtNote: '',
    start: bal,
    end: bal ? twoYearEnd(bal) : '',
    taxArrears: 'none',
    taxNote: '',
    priorLease: 'none',
    priorNote: '',
    repair: false,
    repairWhat: '',
    repairBy: bal,
    repairDeduct: true,
    special: DEFAULT_SPECIALS.map((k) => SPECIALS[k]).join('\n'),
    mediation: true,
    demolish: false,
    demolishNote: '',
    addressConsent: true,
    brokered: false,
    contractDate: today,
  }
}

const rentOf = (v: V) => (v.kind === 'monthly' ? v.rent : 0)

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: V, t: TFn): Insight[] {
  const out: Insight[] = []
  const rent = rentOf(v)
  if (!(v.deposit > 0) && !(rent > 0)) out.push({ level: 'error', text: t('insight.noAmount') })
  if (v.start && v.end && v.end <= v.start) out.push({ level: 'error', text: t('insight.endBeforeStart') })

  const gap = payGap(v.deposit, v.down, v.middle, v.balance)
  if (v.deposit > 0 && gap !== 0) {
    out.push({ level: 'warn', text: t('insight.payGap', { sum: won(v.down + v.middle + v.balance), deposit: won(v.deposit), diff: won(Math.abs(gap)), dir: t(gap > 0 ? 'insight.over' : 'insight.under') }) })
  }
  if (v.middle > 0 && v.middleDate && v.balanceDate && v.middleDate > v.balanceDate) out.push({ level: 'warn', text: t('insight.middleAfterBalance') })
  if (v.contractDate && v.balanceDate && v.balanceDate < v.contractDate) out.push({ level: 'warn', text: t('insight.balanceBeforeContract') })

  if (isShortTerm(v.start, v.end)) out.push({ level: 'info', text: t('insight.shortTerm') })

  if (v.contractType !== 'new') {
    const cap = overRenewCap(v.prevDeposit, v.deposit, v.prevRent, rent)
    const over = (cap.deposit && v.prevDeposit > 0) || (cap.rent && v.prevRent > 0)
    if (over) {
      out.push({
        level: v.contractType === 'renew' ? 'warn' : 'info',
        text: t(v.contractType === 'renew' ? 'insight.renewCap' : 'insight.agreedCap', { maxDeposit: won(cap.maxDeposit), maxRent: won(cap.maxRent), pct: RENEW_CAP * 100 }),
      })
    }
  }

  if (v.taxArrears === 'some') out.push({ level: 'warn', text: t('insight.taxArrears') })
  if (v.priorLease === 'some') out.push({ level: 'warn', text: t('insight.priorLease') })

  if (!specialLines(v.special).length) out.push({ level: 'warn', text: t('insight.noSpecials') })

  if (v.balanceDate) out.push({ level: 'info', text: t('insight.moveIn', { date: krDate(v.balanceDate) }) })

  if (reportByAmount(v.deposit, rent, v.contractType, v.prevDeposit, v.prevRent)) {
    const region = reportRegion(v.address)
    const vars = { deadline: v.contractDate ? krDate(addDays(v.contractDate, 30)) : t('insight.in30'), deposit: won(REPORT_DEPOSIT), rent: won(REPORT_RENT) }
    if (region === true) out.push({ level: 'info', text: t('insight.report', vars) })
    else if (region === null) out.push({ level: 'info', text: t('insight.reportMaybe', vars) })
  }

  if (v.mgmt === 'fixed') {
    const sum = mgmtSum(v.mgmtItems)
    if (sum > 0 && sum !== v.mgmtTotal) out.push({ level: 'warn', text: t('insight.mgmtGap', { sum: won(sum), total: won(v.mgmtTotal) }) })
    else if (sum === 0 && v.mgmtTotal >= MGMT_DETAIL_MIN) out.push({ level: 'info', text: t('insight.mgmtDetail') })
  }
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function Form({ v, set, t }: { v: V; set: (p: Partial<V>) => void; t: TFn }) {
  // 잔금이 '보증금 − 계약금 − 중도금'과 맞아 있으면 금액을 바꿀 때 같이 맞춤 (직접 고친 잔금은 유지)
  const setMoney = (p: Partial<Pick<V, 'deposit' | 'down' | 'middle'>>) => {
    const n = { ...v, ...p }
    const synced = payGap(v.deposit, v.down, v.middle, v.balance) === 0
    set(synced ? { ...p, balance: Math.max(0, n.deposit - n.down - n.middle) } : p)
  }
  const rent = rentOf(v)
  const term = v.start && v.end && v.end > v.start ? ymd(v.start, addDays(v.end, 1)) : null

  return (
    <>
      <Section title={t('section.kind')}>
        <Segmented
          label={t('kind')}
          value={v.kind}
          onChange={(kind) => set(kind === 'monthly' && !v.rent ? { kind, rent: 600_000 } : { kind })}
          options={(['jeonse', 'monthly'] as const).map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
        />
        <Segmented
          label={t('contractType')}
          value={v.contractType}
          onChange={(contractType) => set({ contractType })}
          options={(['new', 'agreed', 'renew'] as const).map((k) => ({ value: k, label: t(`contractTypes.${k}`) }))}
        />
        {v.contractType !== 'new' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AmountField label={t('prevDeposit')} value={v.prevDeposit} onChange={(prevDeposit) => set({ prevDeposit })} />
            {v.kind === 'monthly' && <AmountField label={t('prevRent')} value={v.prevRent} onChange={(prevRent) => set({ prevRent })} />}
          </div>
        )}
        {v.contractType !== 'new' && <p className="text-xs text-muted -mt-2">{t(`contractTypeHint.${v.contractType}`)}</p>}
      </Section>

      <Section title={t('section.money')} hint={t('sectionHint.money')}>
        <AmountField label={t('deposit')} value={v.deposit} onChange={(deposit) => setMoney({ deposit })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AmountField label={t('down')} value={v.down} onChange={(down) => setMoney({ down })} />
          <DateField label={t('contractDate')} value={v.contractDate} onChange={(contractDate) => set({ contractDate })} />
          <AmountField label={t('middle')} value={v.middle} onChange={(middle) => setMoney({ middle })} />
          {v.middle > 0 ? <DateField label={t('middleDate')} value={v.middleDate} onChange={(middleDate) => set({ middleDate })} /> : <p className="text-xs text-muted sm:pt-6">{t('middleHint')}</p>}
          <AmountField label={t('balance')} value={v.balance} onChange={(balance) => set({ balance })} />
          <DateField label={t('balanceDate')} value={v.balanceDate} onChange={(balanceDate) => set({ balanceDate })} />
        </div>
        {v.kind === 'monthly' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AmountField label={t('rent')} value={v.rent} onChange={(r) => set({ rent: r })} />
            <NumberField label={t('rentDay')} value={v.rentDay} unit={t('dayUnit')} min={1} max={31} onChange={(rentDay) => set({ rentDay: Math.round(rentDay) || 1 })} />
            <TextField className="sm:col-span-2" label={t('rentAccount')} value={v.rentAccount} onChange={(rentAccount) => set({ rentAccount })} placeholder={t('rentAccountPlaceholder')} maxLength={80} />
          </div>
        )}

        <Segmented
          label={t('mgmt')}
          value={v.mgmt}
          onChange={(mgmt) => set({ mgmt })}
          options={(['fixed', 'variable', 'none'] as const).map((k) => ({ value: k, label: t(`mgmts.${k}`) }))}
        />
        {v.mgmt === 'fixed' && (
          <>
            <AmountField label={t('mgmtTotal')} value={v.mgmtTotal} onChange={(mgmtTotal) => set({ mgmtTotal })} />
            <details open={mgmtSum(v.mgmtItems) > 0}>
              <summary className="text-xs font-medium text-primary cursor-pointer select-none">{t('mgmtItemsToggle', { min: won(MGMT_DETAIL_MIN) })}</summary>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {MGMT_ITEMS.map((k) => (
                  <NumberField key={k} label={t(`mgmtItems.${k}`)} value={v.mgmtItems[k] ?? 0} unit={t('wonUnit')} step={1000} onChange={(n) => set({ mgmtItems: { ...v.mgmtItems, [k]: n } })} />
                ))}
              </div>
            </details>
          </>
        )}
        {v.mgmt === 'variable' && (
          <TextField label={t('mgmtNote')} value={v.mgmtNote} onChange={(mgmtNote) => set({ mgmtNote })} placeholder={t('mgmtNotePlaceholder')} rows={2} maxLength={200} />
        )}

        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm text-sub">{t(v.kind === 'monthly' ? 'summary.monthly' : 'summary.jeonse')}</p>
          <p className="text-3xl font-bold text-fg tabular-nums mt-1">
            {won(v.deposit)}<span className="text-lg font-semibold ml-1">{t('wonUnit')}</span>
            {v.kind === 'monthly' && <span className="text-xl font-semibold text-body"> / {t('summary.perMonth', { rent: won(rent) })}</span>}
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t('down')}</dt><dd className="text-body tabular-nums">{won(v.down)} {v.deposit > 0 && <span className="text-muted">({Math.round((v.down / v.deposit) * 1000) / 10}%)</span>}</dd></div>
            {v.middle > 0 && <div className="flex justify-between gap-3"><dt className="text-muted">{t('middle')}</dt><dd className="text-body tabular-nums">{won(v.middle)}</dd></div>}
            <div className="flex justify-between gap-3"><dt className="text-muted">{t('balance')}</dt><dd className="text-body tabular-nums">{won(v.balance)}</dd></div>
            {v.mgmt === 'fixed' && <div className="flex justify-between gap-3"><dt className="text-muted">{t('mgmt')}</dt><dd className="text-body tabular-nums">{t('summary.perMonth', { rent: won(v.mgmtTotal) })}</dd></div>}
          </dl>
        </div>
      </Section>

      <Section title={t('section.period')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateField label={t('start')} value={v.start} onChange={(start) => set({ start })} hint={t('startHint')} />
          <DateField label={t('end')} value={v.end} min={v.start} onChange={(end) => set({ end })} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!v.start} onClick={() => v.start && set({ end: twoYearEnd(v.start) })} className="ui-btn-soft px-3 py-1.5 text-xs">{t('twoYears')}</button>
          {v.start && v.balanceDate !== v.start && (
            <button type="button" onClick={() => set({ start: v.balanceDate, end: v.balanceDate ? twoYearEnd(v.balanceDate) : v.end })} className="ui-btn-soft px-3 py-1.5 text-xs">{t('startFromBalance')}</button>
          )}
          {term && <span className="text-sm text-sub tabular-nums">{t('termLabel', { y: term.years, m: term.months, d: term.days })}</span>}
        </div>
      </Section>

      <Section title={t('section.property')} hint={t('sectionHint.property')}>
        <TextField label={t('address')} value={v.address} onChange={(address) => set({ address })} placeholder={t('addressPlaceholder')} maxLength={120} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label={t('landCategory')} value={v.landCategory} onChange={(landCategory) => set({ landCategory })} placeholder="대" maxLength={20} />
          <TextField label={t('landArea')} value={v.landArea} onChange={(landArea) => set({ landArea })} placeholder="0.00" inputMode="decimal" maxLength={20} />
          <TextField label={t('structure')} value={v.structure} onChange={(structure) => set({ structure })} placeholder={t('structurePlaceholder')} maxLength={30} />
          <TextField label={t('use')} value={v.use} onChange={(use) => set({ use })} placeholder={t('usePlaceholder')} maxLength={30} />
          <TextField className="col-span-2" label={t('buildingArea')} value={v.buildingArea} onChange={(buildingArea) => set({ buildingArea })} placeholder="0.00" inputMode="decimal" maxLength={20} />
          <TextField label={t('leasePart')} value={v.leasePart} onChange={(leasePart) => set({ leasePart })} placeholder={t('leasePartPlaceholder')} maxLength={60} />
          <TextField label={t('leaseArea')} value={v.leaseArea} onChange={(leaseArea) => set({ leaseArea })} placeholder="0.00" inputMode="decimal" maxLength={20} />
        </div>
        <p className="text-xs text-muted">{t('areaHint')}</p>
      </Section>

      <Section title={t('section.notice')} hint={t('sectionHint.notice')}>
        <Segmented label={t('taxArrears')} value={v.taxArrears} onChange={(taxArrears) => set({ taxArrears })} options={(['none', 'some'] as const).map((k) => ({ value: k, label: t(`taxArrearsOpt.${k}`) }))} />
        {v.taxArrears === 'some' && <TextField label={t('noticeNote')} value={v.taxNote} onChange={(taxNote) => set({ taxNote })} maxLength={100} />}
        <Segmented label={t('priorLease')} value={v.priorLease} onChange={(priorLease) => set({ priorLease })} options={(['none', 'some'] as const).map((k) => ({ value: k, label: t(`priorLeaseOpt.${k}`) }))} />
        {v.priorLease === 'some' && <TextField label={t('noticeNote')} value={v.priorNote} onChange={(priorNote) => set({ priorNote })} maxLength={100} />}
      </Section>

      <Section title={t('section.repair')}>
        <Check label={t('repair')} hint={t('repairHint')} checked={v.repair} onChange={(repair) => set({ repair })}>
          <div className="space-y-3">
            <TextField label={t('repairWhat')} value={v.repairWhat} onChange={(repairWhat) => set({ repairWhat })} placeholder={t('repairWhatPlaceholder')} maxLength={100} />
            <DateField label={t('repairBy')} value={v.repairBy} onChange={(repairBy) => set({ repairBy })} />
            <Check label={t('repairDeduct')} checked={v.repairDeduct} onChange={(repairDeduct) => set({ repairDeduct })} />
          </div>
        </Check>
      </Section>

      <Section title={t('section.lessor')} hint={t('sectionHint.lessor')}>
        <PartyFields value={v.lessor} onChange={(lessor) => set({ lessor })} />
      </Section>
      <Section title={t('section.lessee')}>
        <PartyFields value={v.lessee} onChange={(lessee) => set({ lessee })} />
      </Section>

      <Section title={t('section.specials')} hint={t('sectionHint.specials')}>
        <div className="space-y-2">
          {SPECIAL_KEYS.map((k) => (
            <Check key={k} label={t(`specials.${k}.label`)} hint={t(`specials.${k}.hint`)} checked={hasSpecial(v.special, k)} onChange={(on) => set({ special: toggleSpecial(v.special, k, on) })} />
          ))}
        </div>
        <TextField label={t('special')} value={v.special} onChange={(special) => set({ special })} rows={8} maxLength={4000} hint={t('specialHint')} />
        <p className="text-xs font-medium text-sub">{t('standardSpecials')}</p>
        <div className="space-y-2">
          <Check label={t('mediation')} hint={t('mediationHint')} checked={v.mediation} onChange={(mediation) => set({ mediation })} />
          <Check label={t('demolish')} checked={v.demolish} onChange={(demolish) => set({ demolish })}>
            <TextField label={t('demolishNote')} value={v.demolishNote} onChange={(demolishNote) => set({ demolishNote })} placeholder={t('demolishNotePlaceholder')} maxLength={80} />
          </Check>
          <Check label={t('addressConsent')} hint={t('addressConsentHint')} checked={v.addressConsent} onChange={(addressConsent) => set({ addressConsent })} />
          <Check label={t('brokered')} hint={t('brokeredHint')} checked={v.brokered} onChange={(brokered) => set({ brokered })} />
        </div>
      </Section>
    </>
  )
}

// ── A4 본문 (법률 문서이므로 한국어 고정) ───────────────────────────────────

const FONT = 12.5
const pageStyle: CSSProperties = { position: 'relative', padding: '56px 60px', fontSize: FONT, lineHeight: LINE / FONT }
const cell: CSSProperties = { ...pTd, padding: '4px 8px' }
const head: CSSProperties = { ...pTh, padding: '4px 6px' }
const h2: CSSProperties = { fontWeight: 700, fontSize: 14, margin: '10px 0 4px' }
const pageNo: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 30, textAlign: 'center', fontSize: 11, color: '#555' }
const box = (on: boolean) => (on ? '■' : '□')
const area = (s: string) => (s.trim() ? `${s.trim()} ㎡` : '㎡')
const money = (n: number) => (n > 0 ? amountText(n) : '금 　　　　　　　원정 (₩　　　　　)')

function PartyTable({ role, p, stamp }: { role: string; p: Party; stamp?: string }) {
  return (
    <table style={{ ...pTable, marginTop: 8 }}>
      <colgroup>
        <col style={{ width: 70 }} />
        <col style={{ width: 84 }} />
        <col />
        <col style={{ width: 96 }} />
        <col style={{ width: 130 }} />
      </colgroup>
      <tbody>
        <tr>
          <td rowSpan={3} style={{ ...head, letterSpacing: '0.1em' }}>{role}</td>
          <td style={head}>주 소</td>
          <td colSpan={3} style={cell}>{p.address}</td>
        </tr>
        <tr>
          <td style={head}>주민등록번호</td>
          <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{maskId(p)}</td>
          <td style={head}>전 화</td>
          <td style={cell}>{p.phone}</td>
        </tr>
        <tr>
          <td style={head}>성 명</td>
          <td colSpan={3} style={{ ...cell, height: 36 }}>
            <Seal name={p.name} stamp={stamp} /> <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>(서명 또는 날인)</span>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const BrokerTable = () => (
  <table style={{ ...pTable, marginTop: 8 }}>
    <colgroup>
      <col style={{ width: 70 }} />
      <col style={{ width: 84 }} />
      <col />
      <col style={{ width: 96 }} />
      <col style={{ width: 130 }} />
    </colgroup>
    <tbody>
      <tr>
        <td rowSpan={3} style={{ ...head, whiteSpace: 'normal' }}>개업<br />공인중개사</td>
        <td style={head}>사무소소재지</td>
        <td colSpan={3} style={cell} />
      </tr>
      <tr>
        <td style={head}>사무소명칭</td>
        <td style={cell} />
        <td style={head}>등록번호</td>
        <td style={cell} />
      </tr>
      <tr>
        <td style={head}>대표 성명</td>
        <td style={{ ...cell, height: 32 }}>　　　　　　(인)</td>
        <td style={head}>전 화</td>
        <td style={cell} />
      </tr>
    </tbody>
  </table>
)

/** 2쪽부터 들어갈 블록: 조항(제4조~) → 특약 제목 → 특약 각 줄. 높이는 쪽 나눔 추정용 */
function blocksOf(v: V) {
  const clauses = laterClauses(v.brokered)
  const std = standardSpecials({ moveInBy: v.balanceDate, mediation: v.mediation, demolish: v.demolish, demolishNote: v.demolishNote, addressConsent: v.addressConsent }, krDate)
  const specials = [...std, ...specialLines(v.special)]
  const blocks: { px: number; node: ReactNode }[] = clauses.map((c, i) => ({
    px: LINE + textPx(c.body) + 8,
    node: (
      <div key={`c${i}`} style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>제{i + 4}조 ({c.title})</div>
        <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{c.body}</div>
      </div>
    ),
  }))
  blocks.push({ px: 44, node: <div key="sh" style={h2}>[특약사항]</div> })
  specials.forEach((s, i) => {
    blocks.push({
      px: textPx(s, 48) + 4,
      node: (
        <div key={`s${i}`} style={{ display: 'flex', gap: 6, marginBottom: 4, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
          <span style={{ whiteSpace: 'pre-wrap' }}>{s}</span>
        </div>
      ),
    })
  })
  return blocks
}

/** 2열 표(머리칸 + 내용) — 행 높이는 쪽 나눔 추정에 씀 */
type Row = [string, string]
const rowPx = (text: string, cols: number) => textPx(text, cols) + 9
function RowTable({ rows, headW, bold }: { rows: Row[]; headW: number; bold?: number }) {
  return (
    <table style={pTable}>
      <colgroup><col style={{ width: headW }} /><col /></colgroup>
      <tbody>
        {rows.map(([h, d], i) => (
          <tr key={h}>
            <td style={{ ...head, whiteSpace: 'pre-line' }}>{h}</td>
            <td style={{ ...cell, whiteSpace: 'pre-line', fontWeight: i === bold ? 700 : undefined }}>{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** 제1조~제3조: 표 내용을 문자열로 만들어 높이를 추정 */
function firstBlocks(v: V): { px: number; node: ReactNode }[] {
  const monthly = v.kind === 'monthly'
  const mgmtItems = MGMT_ITEMS.filter((k) => (v.mgmtItems[k] ?? 0) > 0)
  const mgmt =
    v.mgmt === 'fixed'
      ? `(정액인 경우) 월 총액 금 ${won(v.mgmtTotal)}원${mgmtItems.length ? ` (${mgmtItems.map((k) => `${MGMT_LABEL[k]} ${won(v.mgmtItems[k] ?? 0)}원`).join(', ')})` : ''}`
      : v.mgmt === 'variable'
        ? `(정액이 아닌 경우) 관리비의 항목 및 산정방식: ${v.mgmtNote.trim() || '관리규약 및 실제 사용량에 따라 부과된 금액'}`
        : '없음'
  const pay: Row[] = [
    ['보 증 금', money(v.deposit)],
    ['계 약 금', `${money(v.down)}은 계약 시에 지불하고 영수함.　영수자　　　　　(인)`],
    ...(v.middle > 0 ? [['중 도 금', `${money(v.middle)}은 ${krDate(v.middleDate)}에 지불하며`] as Row] : []),
    ['잔 금', `${money(v.balance)}은 ${krDate(v.balanceDate)}에 지불한다.`],
    ['차임(월세)', monthly && v.rent > 0 ? `${money(v.rent)}은 매월 ${v.rentDay}일에 지불한다.${v.rentAccount.trim() ? ` (입금계좌: ${v.rentAccount.trim()})` : ''}` : '없음'],
    ['관 리 비', mgmt],
  ]
  const intro1 = '위 부동산의 임대차에 관하여 임대인과 임차인은 합의에 의하여 보증금 및 차임·관리비를 아래와 같이 지불하기로 한다.'
  const art2 = `임대인은 임차주택을 임대차 목적대로 사용·수익할 수 있는 상태로 ${krDate(v.start)}까지 임차인에게 인도하고, 임대차기간은 인도일로부터 ${krDate(v.end)}까지로 한다.`
  const intro3 = '임대인과 임차인은 임차주택의 수리가 필요한 시설물 및 비용부담에 관하여 다음과 같이 합의한다.'
  const repair: Row[] = [
    ['수리 필요 시설', `${box(!v.repair)} 없음　${box(v.repair)} 있음${v.repair ? ` (수리할 내용: ${v.repairWhat.trim() || '　　　　　　'})` : ''}`],
    ['수리 완료 시기', v.repair ? `${krDate(v.repairBy)}까지` : '해당 없음'],
    ['약정한 시기까지\n미수리한 경우', `${box(v.repair && v.repairDeduct)} 수리비를 임차인이 임대인에게 지급하여야 할 보증금 또는 차임에서 공제　${box(v.repair && !v.repairDeduct)} 기타`],
  ]
  const title = (s: string, top = 8) => <div style={{ fontWeight: 700, marginTop: top }}>{s}</div>
  return [
    {
      px: 28 + LINE + textPx(intro1) + 4 + pay.reduce((h, r) => h + rowPx(r[1], 44), 0),
      node: (
        <div key="a1">
          <div style={h2}>[계약내용]</div>
          {title('제1조 (보증금과 차임 및 관리비)', 0)}
          <div style={{ marginBottom: 4 }}>{intro1}</div>
          <RowTable rows={pay} headW={84} bold={0} />
        </div>
      ),
    },
    { px: 8 + LINE + textPx(art2), node: <div key="a2">{title('제2조 (임대차기간)')}<div>{art2}</div></div> },
    {
      px: 8 + LINE + textPx(intro3) + 4 + repair.reduce((h, r) => h + Math.max(2 * LINE, textPx(r[1], 40)) + 9, 0),
      node: (
        <div key="a3">
          {title('제3조 (입주 전 수리)')}
          <div style={{ marginBottom: 4 }}>{intro3}</div>
          <RowTable rows={repair} headW={150} />
        </div>
      ),
    },
  ]
}

function Paper({ v, stamps }: { v: V; stamps: Record<string, string> }) {
  const monthly = v.kind === 'monthly'
  const prev = v.contractType !== 'new' ? ` (종전 보증금 ${won(v.prevDeposit)}원${monthly ? `, 월차임 ${won(v.prevRent)}원` : ''})` : ''
  const notice: Row[] = [
    ['계약의 종류', `${box(v.contractType === 'new')} 신규 계약　${box(v.contractType === 'agreed')} 합의에 의한 재계약\n${box(v.contractType === 'renew')} 주택임대차보호법 제6조의3의 계약갱신요구권 행사에 의한 갱신계약${prev}`],
    ['미납 국세·\n지방세', `${box(v.taxArrears === 'none')} 없음 (임대인 서명 또는 날인　　　　　　(인))　${box(v.taxArrears === 'some')} 있음${v.taxArrears === 'some' && v.taxNote.trim() ? ` (${v.taxNote.trim()})` : ''}`],
    ['선순위\n확정일자 현황', `${box(v.priorLease === 'none')} 해당 없음 (임대인 서명 또는 날인　　　　　　(인))　${box(v.priorLease === 'some')} 해당 있음${v.priorLease === 'some' && v.priorNote.trim() ? ` (${v.priorNote.trim()})` : ''}`],
  ]
  // 1쪽 머리(제목·표시·고지 표) 높이 추정 → 제1조부터는 블록으로 흘려 넣어 A4를 넘지 않게
  const headPx = 150 + rowPx(v.address, 44) + rowPx(v.leasePart, 26) + 2 * 29 + 6 + notice.reduce((h, r) => h + Math.max(2 * LINE, textPx(r[1], 44)) + 9, 0)
  const blocks = [...firstBlocks(v), ...blocksOf(v)]
  const tailPx = 120 + 3 * 110 + (v.brokered ? 110 : 0)
  const pages = paginate(blocks.map((b) => b.px), tailPx, BODY_PX, headPx)
  const n = pages.length
  const lessor = v.lessor.name.trim() || '　　　　'
  const lessee = v.lessee.name.trim() || '　　　　'

  return (
    <>
      {pages.map((idx, pi) => (
        <Page key={pi} style={pageStyle}>
          {pi === 0 && (
            <>
              {/* 확정일자 부여란: 표준계약서처럼 1쪽 오른쪽 위 */}
              <table style={{ ...pTable, position: 'absolute', top: 24, right: 36, width: 120, fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ ...head, padding: '2px 4px' }}>확정일자 부여란</td></tr>
                  <tr><td style={{ ...cell, height: 62 }} /></tr>
                </tbody>
              </table>
              <PaperTitle>주택 임대차 계약서</PaperTitle>
              <div style={{ textAlign: 'center', margin: '-24px 0 14px' }}>
                {box(!monthly)} 전세　{box(monthly)} 보증금 있는 월세
              </div>
              <p style={{ margin: '0 0 6px' }}>
                임대인({lessor})과 임차인({lessee})은 아래와 같이 임대차 계약을 체결한다.
              </p>
              <div style={h2}>[임차주택의 표시]</div>
              <table style={pTable}>
                <colgroup>
                  <col style={{ width: 84 }} />
                  <col style={{ width: 84 }} />
                  <col />
                  <col style={{ width: 60 }} />
                  <col style={{ width: 100 }} />
                </colgroup>
                <tbody>
                  <tr><td style={head}>소 재 지</td><td colSpan={4} style={cell}>{v.address}</td></tr>
                  <tr><td style={head}>토 지</td><td style={head}>지 목</td><td style={cell}>{v.landCategory}</td><td style={head}>면 적</td><td style={{ ...cell, textAlign: 'right' }}>{area(v.landArea)}</td></tr>
                  <tr><td style={head}>건 물</td><td style={head}>구조·용도</td><td style={cell}>{[v.structure, v.use].filter((s) => s.trim()).join(' / ')}</td><td style={head}>면 적</td><td style={{ ...cell, textAlign: 'right' }}>{area(v.buildingArea)}</td></tr>
                  <tr><td style={head}>임차할부분</td><td colSpan={2} style={cell}>{v.leasePart}</td><td style={head}>면 적</td><td style={{ ...cell, textAlign: 'right' }}>{area(v.leaseArea)}</td></tr>
                </tbody>
              </table>
              <div style={{ height: 6 }} />
              <RowTable rows={notice} headW={84} />
            </>
          )}
          {idx.map((i) => blocks[i].node)}
          {pi === n - 1 && (
            <>
              <p style={{ margin: '14px 0 0' }}>
                본 계약을 증명하기 위하여 계약 당사자가 이의 없음을 확인하고 각각 서명·날인 후 임대인, 임차인{v.brokered ? ', 개업공인중개사' : ''}는 매 장마다 간인하여 각각 1통씩 보관한다.
              </p>
              <div style={{ textAlign: 'center', margin: '14px 0 6px', fontSize: 14 }}>{krDate(v.contractDate)}</div>
              <PartyTable role="임 대 인" p={v.lessor} stamp={stamps.lessor} />
              <PartyTable role="임 차 인" p={v.lessee} stamp={stamps.lessee} />
              {v.brokered && <BrokerTable />}
            </>
          )}
          {n > 1 && <div style={pageNo}>- {pi + 1} / {n} -</div>}
        </Page>
      ))}
    </>
  )
}

const lease: DocTemplate<V> = {
  id: 'lease',
  ns: 'leaseContract',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [
    { id: 'lessee', name: v.lessee.name },
    { id: 'lessor', name: v.lessor.name },
  ],
  fileName: (v) => docFileName(v.kind === 'monthly' ? '월세계약서' : '전세계약서', v.lessee.name, v.contractDate),
}

export default function LeaseContract() {
  return <DocumentGenerator template={lease} />
}
