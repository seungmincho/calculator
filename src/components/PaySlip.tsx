'use client'

// 급여명세서(임금명세서) 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개.
// 근로기준법 제48조②·시행령 제27조의2 기재사항(항목별 금액·계산방법·연장/야간/휴일 시간수·공제내역)을 한 장에.
import { useId, type CSSProperties } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, Seal, pTable, pTh, pTd, pNum } from '@/components/document/paper'
import { Section, Field, DateField, NumberField, TextField, Segmented, Check, fieldCls, labelCls } from '@/components/document/fields'
import { krDate, won, docFileName } from '@/utils/document'
import { INSURANCE } from '@/utils/insuranceRates'
import {
  computePay, ordinaryHourly, MIN_WAGE_2026, ROW_TYPES, ROW_NAME, TAX_FREE_LIMIT, DED_KEYS,
  type PayInput, type PayRow, type RowType, type DedKey, type Line,
} from '@/utils/paySlip'

interface V extends PayInput {
  company: string
  ceo: string
  worker: string
  birth: string
  empNo: string
  dept: string
  position: string
  month: string // YYYY-MM 귀속월
  payDate: string
}

const AUTO: Record<DedKey, number | null> = { pension: null, health: null, care: null, employment: null, incomeTax: null, localTax: null }
const ROW_METHOD: Record<RowType, string> = { meal: '매월 고정 지급', car: '본인 차량 업무 사용, 매월 고정 지급', child: '6세 이하 자녀 보육, 매월 고정 지급', bonus: '', other: '' }
const newRow = (type: RowType): PayRow => ({ type, name: ROW_NAME[type], amount: type === 'bonus' ? 0 : 200_000, taxFree: type in TAX_FREE_LIMIT, method: ROW_METHOD[type] })

const initial = (today: string): V => ({
  company: '',
  ceo: '',
  worker: '',
  birth: '',
  empNo: '',
  dept: '',
  position: '',
  month: today.slice(0, 7),
  payDate: today,
  mode: 'ins',
  small: false,
  wageType: 'monthly',
  base: 2_800_000,
  workHours: 130,
  holidayHours: 26,
  monthHours: 209,
  ordinary: 0,
  ot: 8,
  night: 0,
  hol: 0,
  hol8: 0,
  rows: [newRow('meal')],
  dependents: 1,
  children: 0,
  taxPct: 100,
  insBase: 0,
  ded: { ...AUTO },
  extraDeds: [],
})

const hr = (n: number) => String(Math.round(n * 100) / 100)
const monthText = (m: string) => {
  const x = /^(\d{4})-(\d{2})$/.exec(m)
  return x ? `${x[1]}년 ${Number(x[2])}월분` : '        년      월분'
}

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: V, t: TFn): Insight[] {
  const out: Insight[] = []
  const r = computePay(v)
  const ins = v.mode === 'ins'

  if (!v.worker.trim()) out.push({ level: 'warn', text: t('insight.noName') })
  if (!v.birth.trim() && !v.empNo.trim()) out.push({ level: 'warn', text: t('insight.noId') })
  if (!v.payDate) out.push({ level: 'warn', text: t('insight.noPayDate') })
  if (r.net < 0) out.push({ level: 'error', text: t('insight.negative') })

  if (ins && v.base > 0) {
    const m = r.minWage
    const vars = { hourly: won(m.hourly), min: won(MIN_WAGE_2026), short: won(m.shortfall), hours: hr(v.monthHours), required: won(m.required) }
    if (m.ok) out.push({ level: 'info', text: t(v.wageType === 'hourly' ? 'insight.minWageOkHourly' : 'insight.minWageOk', vars) })
    else out.push({ level: 'error', text: t(v.wageType === 'hourly' ? 'insight.minWageLowHourly' : 'insight.minWageLow', vars) })
  }
  for (const e of r.excess) out.push({ level: 'warn', text: t('insight.taxFreeOver', { name: e.name, limit: won(e.limit), excess: won(e.excess) }) })
  if (r.missingMethod.length) out.push({ level: 'warn', text: t('insight.noMethod', { names: r.missingMethod.join(', ') }) })
  if (r.pensionClamp) out.push({ level: 'info', text: t(r.pensionClamp === 'cap' ? 'insight.pensionCap' : 'insight.pensionFloor', { cap: won(INSURANCE.pensionMonthlyCap), floor: won(INSURANCE.pensionMonthlyFloor) }) })
  if (ins && !v.small && v.ot > 52) out.push({ level: 'warn', text: t('insight.otOver', { hours: hr(v.ot) }) })
  if (v.small) out.push({ level: 'info', text: t('insight.small') })
  if (!ins) out.push({ level: 'warn', text: t('insight.biz') })
  if (ins && DED_KEYS.some((k) => v.ded[k] !== null)) out.push({ level: 'info', text: t('insight.manual') })
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className={`tabular-nums text-right ${strong ? 'text-fg font-semibold' : 'text-body'}`}>{v}</dd>
    </div>
  )
}

/** 원 단위 금액 입력 (쉼표·'원' 표시, 한글 금액 표기 없음) */
function Money({ label, value, onChange, hint, className }: { label: string; value: number; onChange: (v: number) => void; hint?: string; className?: string }) {
  const id = useId()
  return (
    <Field label={label} id={id} hint={hint} className={className}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          className={`${fieldCls} pr-8 text-right tabular-nums`}
          value={value ? value.toLocaleString('ko-KR') : ''}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, 12)) || 0)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">원</span>
      </div>
    </Field>
  )
}

function MonthField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <Field label={label} id={id}>
      <input id={id} type="month" className={`${fieldCls} tabular-nums`} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function Form({ v, set, t }: { v: V; set: (p: Partial<V>) => void; t: TFn }) {
  const r = computePay(v)
  const ins = v.mode === 'ins'
  const hUnit = t('hourUnit')
  const wonU = t('won')
  const setRow = (i: number, p: Partial<PayRow>) => set({ rows: v.rows.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setExtra = (i: number, p: Partial<{ name: string; amount: number }>) => set({ extraDeds: v.extraDeds.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setWageType = (wageType: V['wageType']) => {
    if (wageType === v.wageType) return
    set(wageType === 'hourly' ? { wageType, base: 11_000, ordinary: 0 } : { wageType, base: 2_800_000, ordinary: 0 })
  }
  const dedName = (l: Line) => (l.key.startsWith('ded') ? l.name : t(`${ins ? 'ded' : 'dedBiz'}.${l.key}`))
  const dedAuto = (k: DedKey) => r.auto[k]

  return (
    <>
      {/* 결과 요약 */}
      <section className="ui-card p-5">
        <p className="text-sm text-sub">{t('summary.net')}</p>
        <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(r.net)}<span className="text-lg font-semibold ml-1">{wonU}</span></p>
        <dl className="mt-3 space-y-1 text-sm">
          <Row k={t('summary.gross')} v={`${won(r.gross)}${wonU}`} />
          {r.taxFree > 0 && <Row k={t('summary.taxFree')} v={`${won(r.taxFree)}${wonU}`} />}
          <Row k={t('summary.deductions')} v={`− ${won(r.totalDed)}${wonU}`} />
          {r.ordinary > 0 && <Row k={t('summary.ordinary')} v={`${won(r.ordinary)}${wonU}`} />}
        </dl>
      </section>

      <Section title={t('section.info')} hint={t('sectionHint.info')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t('company')} value={v.company} onChange={(company) => set({ company })} placeholder={t('companyPlaceholder')} maxLength={40} />
          <TextField label={t('ceo')} value={v.ceo} onChange={(ceo) => set({ ceo })} placeholder={t('ceoPlaceholder')} maxLength={30} />
          <TextField label={t('worker')} value={v.worker} onChange={(worker) => set({ worker })} placeholder={t('workerPlaceholder')} maxLength={30} />
          <TextField label={t('birth')} value={v.birth} onChange={(birth) => set({ birth })} placeholder="1995-03-15" maxLength={20} />
          <TextField label={t('empNo')} value={v.empNo} onChange={(empNo) => set({ empNo })} placeholder={t('empNoPlaceholder')} maxLength={20} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label={t('dept')} value={v.dept} onChange={(dept) => set({ dept })} maxLength={20} />
            <TextField label={t('position')} value={v.position} onChange={(position) => set({ position })} maxLength={20} />
          </div>
          <MonthField label={t('month')} value={v.month} onChange={(month) => set({ month })} />
          <DateField label={t('payDate')} value={v.payDate} onChange={(payDate) => set({ payDate })} />
        </div>
      </Section>

      <Section title={t('section.setup')}>
        <Segmented label={t('mode')} value={v.mode} onChange={(mode) => set({ mode })} options={(['ins', 'biz'] as const).map((x) => ({ value: x, label: t(`modes.${x}`) }))} />
        <p className="text-xs text-muted -mt-2">{t(`modeHint.${v.mode}`)}</p>
        <Segmented label={t('wageType')} value={v.wageType} onChange={setWageType} options={(['monthly', 'hourly'] as const).map((x) => ({ value: x, label: t(`wageTypes.${x}`) }))} />
        <Check label={t('small')} hint={t('smallHint')} checked={v.small} onChange={(small) => set({ small })} />
      </Section>

      <Section title={t('section.pay')}>
        <Money label={t(`baseLabel.${v.wageType}`)} value={v.base} onChange={(base) => set({ base })} />
        {v.wageType === 'hourly' ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={t('workHours')} unit={hUnit} value={v.workHours} step={0.5} max={400} onChange={(workHours) => set({ workHours })} />
            <NumberField label={t('holidayHours')} unit={hUnit} value={v.holidayHours} step={0.5} max={60} onChange={(holidayHours) => set({ holidayHours })} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={t('monthHours')} unit={hUnit} value={v.monthHours} max={400} onChange={(monthHours) => set({ monthHours })} />
            <Money label={t('ordinary')} hint={v.ordinary > 0 ? t('ordinaryManual') : t('ordinaryAuto', { value: won(ordinaryHourly({ ...v, ordinary: 0 })) })} value={v.ordinary} onChange={(ordinary) => set({ ordinary })} />
          </div>
        )}
        <p className="text-xs text-muted -mt-2">{t(`hoursHint.${v.wageType}`)}</p>

        <div>
          <p className={labelCls}>{t('premiumTitle')}</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={t('ot')} unit={hUnit} value={v.ot} step={0.5} max={200} onChange={(ot) => set({ ot })} />
            <NumberField label={t('night')} unit={hUnit} value={v.night} step={0.5} max={200} onChange={(night) => set({ night })} />
            <NumberField label={t('hol')} unit={hUnit} value={v.hol} step={0.5} max={200} onChange={(hol) => set({ hol })} />
            <NumberField label={t('hol8')} unit={hUnit} value={v.hol8} step={0.5} max={200} onChange={(hol8) => set({ hol8 })} />
          </div>
          <p className="text-xs text-muted mt-2">{t(v.small ? 'premiumHintSmall' : 'premiumHint')}</p>
        </div>

        <div className="space-y-3">
          <p className={`${labelCls} mb-0`}>{t('rows')}</p>
          {v.rows.length === 0 && <p className="text-xs text-muted">{t('rowsEmpty')}</p>}
          {v.rows.map((x, i) => (
            <div key={i} className="bg-subtle rounded-2xl p-4 space-y-3">
              <div className="flex items-end gap-2">
                <TextField className="flex-1" label={t('rowName')} value={x.name} onChange={(name) => setRow(i, { name })} maxLength={20} />
                <Money className="flex-1" label={t('rowAmount')} value={x.amount} onChange={(amount) => setRow(i, { amount })} />
                <button type="button" onClick={() => set({ rows: v.rows.filter((_, j) => j !== i) })} className="p-2 mb-0.5 rounded-lg text-faint hover:text-red-600" aria-label={t('rowRemove')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <TextField label={t('rowMethod')} value={x.method} onChange={(method) => setRow(i, { method })} placeholder={t('rowMethodPlaceholder')} maxLength={60} />
              {ins && (
                <Check
                  label={TAX_FREE_LIMIT[x.type] ? t('rowTaxFreeLimit', { limit: won(TAX_FREE_LIMIT[x.type]!) }) : t('rowTaxFree')}
                  checked={x.taxFree}
                  onChange={(taxFree) => setRow(i, { taxFree })}
                />
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {ROW_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => set({ rows: [...v.rows, newRow(type)] })} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                {t(`rowTypes.${type}`)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('section.ded')} hint={t(`sectionHint.ded.${v.mode}`)}>
        {ins && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label={t('dependents')} unit={t('personUnit')} value={v.dependents} min={1} max={20} onChange={(n) => set({ dependents: Math.max(1, Math.round(n)) })} />
              <NumberField label={t('children')} unit={t('personUnit')} value={v.children} max={10} onChange={(n) => set({ children: Math.round(n) })} />
            </div>
            <p className="text-xs text-muted -mt-2">{t('dependentsHint')}</p>
            <Segmented label={t('taxPct')} value={String(v.taxPct)} onChange={(p) => set({ taxPct: Number(p) })} options={['80', '100', '120'].map((p) => ({ value: p, label: `${p}%` }))} />
            <Money label={t('insBase')} hint={v.insBase > 0 ? t('insBaseManual') : t('insBaseAuto', { value: won(r.insBase) })} value={v.insBase} onChange={(insBase) => set({ insBase })} />
          </>
        )}

        <div className="space-y-2">
          {(ins ? DED_KEYS : (['incomeTax', 'localTax'] as DedKey[])).map((k) => {
            const manual = v.ded[k] !== null
            const line = r.ded.find((l) => l.key === k)
            return (
              <div key={k} className="flex items-end gap-2">
                <Money
                  className="flex-1"
                  label={ins ? t(`ded.${k}`) : t(`dedBiz.${k}`)}
                  hint={manual ? t('dedManual') : line?.method || t('dedNone')}
                  value={manual ? (v.ded[k] as number) : dedAuto(k)}
                  onChange={(n) => set({ ded: { ...v.ded, [k]: n } })}
                />
                {manual && (
                  <button type="button" onClick={() => set({ ded: { ...v.ded, [k]: null } })} className="p-2 mb-6 rounded-lg text-faint hover:text-primary" aria-label={t('dedReset')} title={t('dedReset')}>
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className={`${labelCls} mb-0`}>{t('extraDeds')}</p>
            {v.extraDeds.length < 5 && (
              <button type="button" onClick={() => set({ extraDeds: [...v.extraDeds, { name: '', amount: 0 }] })} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs shrink-0">
                <Plus className="w-3.5 h-3.5" />
                {t('extraAdd')}
              </button>
            )}
          </div>
          {v.extraDeds.map((d, i) => (
            <div key={i} className="flex items-end gap-2">
              <TextField className="flex-1" label={t('extraName')} value={d.name} onChange={(name) => setExtra(i, { name })} placeholder={t('extraNamePlaceholder')} maxLength={20} />
              <Money className="flex-1" label={t('rowAmount')} value={d.amount} onChange={(amount) => setExtra(i, { amount })} />
              <button type="button" onClick={() => set({ extraDeds: v.extraDeds.filter((_, j) => j !== i) })} className="p-2 mb-0.5 rounded-lg text-faint hover:text-red-600" aria-label={t('rowRemove')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-subtle rounded-2xl p-5">
          <dl className="space-y-1 text-sm">
            {r.ded.map((l) => <Row key={l.key} k={dedName(l)} v={`${won(l.amount)}${wonU}`} />)}
            <Row k={t('summary.deductions')} v={`${won(r.totalDed)}${wonU}`} strong />
          </dl>
        </div>
      </Section>
    </>
  )
}

// ── A4 본문 (법정 서식이라 한국어 고정) ──────────────────────────────────────

const PAGE: CSSProperties = { fontSize: 13, lineHeight: 1.5, padding: '56px 64px' }
const th: CSSProperties = { ...pTh, padding: '5px 8px' }
const td: CSSProperties = { ...pTd, padding: '5px 8px' }
const num: CSSProperties = { ...pNum, padding: '5px 8px' }
const lab: CSSProperties = { ...th, width: 96 }

function Paper({ v, stamps }: { v: V; stamps: Record<string, string> }) {
  const r = computePay(v)
  const biz = v.mode === 'biz'
  const n = Math.max(r.pay.length, r.ded.length, 6)
  const payName = (l: Line) => (l.taxFree > 0 ? `${l.name} (비과세${l.taxFree < l.amount ? ` ${won(l.taxFree)}` : ''})` : l.name)
  const hours = [
    v.wageType === 'hourly' && v.workHours > 0 ? `근로 ${hr(v.workHours)}시간` : '',
    `연장 ${hr(v.ot)}시간`,
    `야간 ${hr(v.night)}시간`,
    `휴일 ${hr(v.hol + v.hol8)}시간${v.hol8 > 0 ? `(8시간 초과 ${hr(v.hol8)}시간)` : ''}`,
  ].filter(Boolean)
  const methods = [...r.pay, ...r.ded.filter((l) => l.method)]

  return (
    <Page style={PAGE}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.35em' }}>{biz ? '급 여 명 세 서' : '임 금 명 세 서'}</div>
        <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>{monthText(v.month)}</div>
      </div>

      <table style={{ ...pTable, marginBottom: 14 }}>
        <colgroup>
          <col style={{ width: 96 }} />
          <col />
          <col style={{ width: 96 }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td style={lab}>성 명</td>
            <td style={td}>{v.worker}</td>
            <td style={lab}>생년월일</td>
            <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{v.birth}</td>
          </tr>
          <tr>
            <td style={lab}>사원번호</td>
            <td style={td}>{v.empNo}</td>
            <td style={lab}>부서 / 직급</td>
            <td style={td}>{[v.dept, v.position].filter((s) => s.trim()).join(' / ')}</td>
          </tr>
          <tr>
            <td style={lab}>회 사 명</td>
            <td style={td}>{v.company}</td>
            <td style={lab}>지 급 일</td>
            <td style={td}>{v.payDate ? krDate(v.payDate) : ''}</td>
          </tr>
        </tbody>
      </table>

      <table style={pTable}>
        <colgroup>
          <col />
          <col style={{ width: 120 }} />
          <col />
          <col style={{ width: 120 }} />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={2} style={th}>지 급 내 역</th>
            <th colSpan={2} style={th}>공 제 내 역</th>
          </tr>
          <tr>
            <th style={{ ...th, fontWeight: 400 }}>항 목</th>
            <th style={{ ...th, fontWeight: 400 }}>금 액</th>
            <th style={{ ...th, fontWeight: 400 }}>항 목</th>
            <th style={{ ...th, fontWeight: 400 }}>금 액</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => {
            const p = r.pay[i]
            const d = r.ded[i]
            return (
              <tr key={i}>
                <td style={{ ...td, height: 28 }}>{p ? payName(p) : ''}</td>
                <td style={num}>{p ? won(p.amount) : ''}</td>
                <td style={td}>{d?.name ?? ''}</td>
                <td style={num}>{d ? won(d.amount) : ''}</td>
              </tr>
            )
          })}
          <tr>
            <td style={th}>지급액 계</td>
            <td style={{ ...num, fontWeight: 700 }}>{won(r.gross)}</td>
            <td style={th}>공제액 계</td>
            <td style={{ ...num, fontWeight: 700 }}>{won(r.totalDed)}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...pTable, marginTop: -1 }}>
        <tbody>
          <tr>
            <td style={{ ...th, width: 160, fontSize: 15 }}>실 지 급 액</td>
            <td style={{ ...num, fontSize: 20, fontWeight: 700, padding: '8px 12px' }}>{won(r.net)} 원</td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontWeight: 700, margin: '18px 0 6px' }}>계 산 방 법</div>
      <table style={{ ...pTable, fontSize: 12 }}>
        <colgroup>
          <col style={{ width: 150 }} />
          <col />
          <col style={{ width: 100 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th}>구 분</th>
            <th style={th}>산 출 식</th>
            <th style={th}>금 액</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((l) => (
            <tr key={l.key}>
              <td style={td}>{l.name}</td>
              <td style={td}>{l.method}</td>
              <td style={num}>{won(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, marginTop: 6 }}>※ 이번 달 근로시간: {hours.join(' · ')}</div>
      {r.taxFree > 0 && <div style={{ fontSize: 12 }}>※ 비과세 {won(r.taxFree)}원은 소득세·4대보험 산정에서 제외</div>}
      {v.small && <div style={{ fontSize: 12 }}>※ 상시 4명 이하 사업장으로 연장·야간·휴일근로 가산수당(근로기준법 제56조)은 적용하지 않음</div>}

      <div style={{ textAlign: 'center', margin: '36px 0 20px', fontSize: 15 }}>귀하의 노고에 감사드립니다.</div>
      <div style={{ textAlign: 'right', fontSize: 14 }}>
        {v.company || ' '.repeat(16)}&nbsp;&nbsp;대표 <Seal name={v.ceo} stamp={stamps.ceo} />
      </div>
    </Page>
  )
}

const tpl: DocTemplate<V> = {
  id: 'payslip',
  ns: 'paySlip',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [{ id: 'ceo', name: v.ceo }],
  fileName: (v) => docFileName('임금명세서', v.worker, v.month),
}

export default function PaySlip() {
  return <DocumentGenerator template={tpl} />
}
