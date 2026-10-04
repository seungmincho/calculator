'use client'

// 근로계약서 작성기 — 공통 문서 엔진(src/components/document) 위의 양식 1개.
// 고용노동부 표준근로계약서(정규직·기간제·단시간·연소근로자) 항목 순서를 따름.
import { useId, type CSSProperties, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import DocumentGenerator, { type DocTemplate, type Insight, type TFn } from '@/components/document/DocumentGenerator'
import { Page, Seal, pTable, pTh, pTd } from '@/components/document/paper'
import { Section, Field, AmountField, DateField, NumberField, TextField, Segmented, Check, PartyFields, fieldCls, labelCls, segCls } from '@/components/document/fields'
import { EMPTY_PARTY, maskId, krDate, won, docFileName, type Party } from '@/utils/document'
import { addYears, addDays } from '@/utils/dday'
import { monthlyHoursFor } from '@/utils/weeklyHolidayPay'
import {
  week, minWageCheck, monthlyEstimate, minorLimit, ageAt, MIN_WAGE_2026,
  type Slot, type WageType, type Week,
} from '@/utils/employmentContract'
import '@/lib/i18n/ns/employmentContract'

type Kind = 'regular' | 'fixed' | 'part' | 'minor'
const KINDS: Kind[] = ['regular', 'fixed', 'part', 'minor']

interface Employer {
  company: string
  ceo: string
  bizNo: string
  address: string
  phone: string
}
interface Allowance {
  name: string
  amount: number
}
interface Ins {
  employment: boolean
  accident: boolean
  pension: boolean
  health: boolean
}

interface V {
  kind: Kind
  small: boolean // 상시 5인 미만
  employer: Employer
  worker: Party
  guardian: Party
  relation: string
  start: string
  fixedTerm: boolean
  end: string
  place: string
  job: string
  on: boolean[] // 근무 요일 (월~일)
  perDay: boolean // 요일마다 다른 시간
  time: Slot // 공통 시간
  days: Slot[] // 요일별 시간
  holiday: number // 주휴일 요일 (0=월 … 6=일)
  wageType: WageType
  wage: number
  bonus: boolean
  bonusText: string
  allowances: Allowance[]
  payDay: number
  payMethod: 'transfer' | 'direct'
  ins: Ins
  extra: string
  written: string
}

const FULL: Slot = { start: '09:00', end: '18:00', bStart: '12:00', bEnd: '13:00' }
const PART: Slot = { start: '13:00', end: '17:30', bStart: '15:00', bEnd: '15:30' }
const MINOR: Slot = { start: '10:00', end: '16:30', bStart: '12:00', bEnd: '12:30' }
const weekdays = (n: number) => Array.from({ length: 7 }, (_, i) => i < n)
const isPartGroup = (k: Kind) => k === 'part' || k === 'minor'

/** 유형별 근무시간·임금 기본값 (정규직 월급 / 알바 시급) */
function preset(k: Kind): Pick<V, 'on' | 'perDay' | 'time' | 'days' | 'wageType' | 'wage' | 'holiday'> {
  if (k === 'part') return { on: weekdays(5), perDay: true, time: PART, days: Array(7).fill(PART), wageType: 'hourly', wage: 11_000, holiday: 6 }
  if (k === 'minor') return { on: [false, false, false, false, false, true, true], perDay: false, time: MINOR, days: Array(7).fill(MINOR), wageType: 'hourly', wage: MIN_WAGE_2026, holiday: 0 }
  return { on: weekdays(5), perDay: false, time: FULL, days: Array(7).fill(FULL), wageType: 'monthly', wage: 2_600_000, holiday: 6 }
}

const initial = (today: string): V => ({
  kind: 'regular',
  small: false,
  employer: { company: '', ceo: '', bizNo: '', address: '', phone: '' },
  worker: { ...EMPTY_PARTY },
  guardian: { ...EMPTY_PARTY },
  relation: '',
  start: today,
  fixedTerm: false,
  end: today ? addDays(addYears(today, 1), -1) : '',
  place: '',
  job: '',
  ...preset('regular'),
  bonus: false,
  bonusText: '',
  allowances: [],
  payDay: 10,
  payMethod: 'transfer',
  ins: { employment: true, accident: true, pension: true, health: true },
  extra: '',
  written: today,
})

const isFixed = (v: V) => v.kind === 'fixed' || (v.kind !== 'regular' && v.fixedTerm)
const slots = (v: V) => (v.perDay ? v.days : Array(7).fill(v.time)) as Slot[]
const calc = (v: V): Week => week(slots(v), v.on)
const allowanceSum = (v: V) => v.allowances.reduce((s, a) => s + (a.amount || 0), 0)
/** 4.5 → '4.5', 20 → '20' */
const hr = (n: number) => String(Math.round(n * 100) / 100)

// ── 검사·안내 ───────────────────────────────────────────────────────────────

function insights(v: V, t: TFn): Insight[] {
  const out: Insight[] = []
  const w = calc(v)
  const minor = v.kind === 'minor'
  const dayNames = t.raw('days') as string[]

  if (!(w.weekly > 0)) out.push({ level: 'error', text: t('insight.noDays') })
  else {
    // 최저임금
    if (v.wage > 0) {
      const m = minWageCheck(v.wageType, v.wage, allowanceSum(v), w)
      const vars = { hourly: won(m.hourly), min: won(MIN_WAGE_2026), required: won(m.required), hours: w.monthlyHours, short: won(m.shortfall) }
      if (m.ok) out.push({ level: 'info', text: t('insight.minWageOk', vars) })
      else if (v.wageType === 'monthly' && m.okWithAllowance) out.push({ level: 'warn', text: t('insight.minWageAllowance', vars) })
      else out.push({ level: 'error', text: t(v.wageType === 'hourly' ? 'insight.minWageHourly' : 'insight.minWageMonthly', vars) })
    } else out.push({ level: 'error', text: t('insight.noWage') })

    // 주휴
    const est = monthlyEstimate(v.wageType, v.wage, w, v.small)
    if (w.holidayHours > 0) {
      out.push({
        level: 'info',
        text: v.wageType === 'hourly'
          ? t('insight.holidayPay', { weekly: hr(w.contract), hours: hr(w.holidayHours), pay: won(est.weeklyHolidayPay) })
          : t('insight.holidayIncluded', { weekly: hr(w.contract), hours: w.monthlyHours }),
      })
    } else out.push({ level: 'info', text: t('insight.under15', { weekly: hr(w.contract) }) })

    // 휴게
    if (w.breakShortDays.length) out.push({ level: 'error', text: t('insight.breakShort', { days: w.breakShortDays.map((i) => dayNames[i]).join(', ') }) })

    // 근로시간 한도
    if (minor) {
      const lim = minorLimit(w)
      const vars = { day: hr(w.maxDay), week: hr(w.weekly) }
      if (lim === 'over') out.push({ level: 'error', text: t('insight.minorOver', vars) })
      else if (lim === 'consent') out.push({ level: 'warn', text: t('insight.minorConsent', vars) })
      if (w.night) out.push({ level: 'warn', text: t('insight.minorNight') })
    } else if (w.weekly > 52) {
      out.push({ level: v.small ? 'warn' : 'error', text: t(v.small ? 'insight.over52Small' : 'insight.over52', { week: hr(w.weekly) }) })
    } else if (w.overtime > 0) {
      out.push({ level: 'info', text: t(v.small ? 'insight.overtimeSmall' : 'insight.overtime', { hours: hr(w.overtime), pay: won(est.overtime) }) })
    }

    if (v.on[v.holiday]) out.push({ level: 'warn', text: t('insight.holidayOnWorkday', { day: dayNames[v.holiday] }) })
    if (w.contract * (365 / 7 / 12) < 60) out.push({ level: 'info', text: t('insight.shortInsurance', { hours: monthlyHoursFor(w.contract) }) })
  }

  // 계약기간
  if (isFixed(v) && v.start && v.end) {
    if (v.end < v.start) out.push({ level: 'error', text: t('insight.termOrder') })
    else if (v.end > addDays(addYears(v.start, 2), -1)) out.push({ level: 'warn', text: t('insight.termOver2y') })
  }

  // 사회보험
  if (!v.ins.accident) out.push({ level: 'warn', text: t('insight.noAccident') })

  // 나이
  const age = ageAt(v.worker.idFront, v.worker.idBack1, v.start)
  if (age !== null) {
    if (!minor && age < 18) out.push({ level: 'warn', text: t('insight.ageMinor', { age }) })
    if (minor && age >= 18) out.push({ level: 'info', text: t('insight.ageAdult', { age }) })
    if (age < 15) out.push({ level: 'warn', text: t('insight.under15Age', { age }) })
  }
  if (minor) out.push({ level: 'info', text: t('insight.minorDocs') })
  if (v.small) out.push({ level: 'info', text: t('insight.smallNote') })
  return out
}

// ── 입력 폼 ─────────────────────────────────────────────────────────────────

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <Field label={label} id={id}>
      <input id={id} type="time" className={`${fieldCls} tabular-nums`} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function SlotFields({ s, onChange, t }: { s: Slot; onChange: (s: Slot) => void; t: TFn }) {
  const set = (p: Partial<Slot>) => onChange({ ...s, ...p })
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <TimeField label={t('time.start')} value={s.start} onChange={(start) => set({ start })} />
      <TimeField label={t('time.end')} value={s.end} onChange={(end) => set({ end })} />
      <TimeField label={t('time.bStart')} value={s.bStart} onChange={(bStart) => set({ bStart })} />
      <TimeField label={t('time.bEnd')} value={s.bEnd} onChange={(bEnd) => set({ bEnd })} />
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-body tabular-nums text-right">{v}</dd>
    </div>
  )
}

function Form({ v, set, t }: { v: V; set: (p: Partial<V>) => void; t: TFn }) {
  const w = calc(v)
  const est = monthlyEstimate(v.wageType, v.wage, w, v.small)
  const m = minWageCheck(v.wageType, v.wage, allowanceSum(v), w)
  const dayNames = t.raw('days') as string[]
  const hUnit = t('hourUnit')

  const setKind = (kind: Kind) => {
    const p: Partial<V> = { kind }
    if (isPartGroup(kind) !== isPartGroup(v.kind)) Object.assign(p, preset(kind))
    if (kind === 'fixed') p.fixedTerm = true
    set(p)
  }
  const setEmp = (p: Partial<Employer>) => set({ employer: { ...v.employer, ...p } })
  const setAl = (i: number, p: Partial<Allowance>) => set({ allowances: v.allowances.map((a, j) => (j === i ? { ...a, ...p } : a)) })
  const setDay = (i: number, s: Slot) => set({ days: v.days.map((d, j) => (j === i ? s : d)) })

  return (
    <>
      <Section title={t('section.kind')}>
        <Segmented label={t('kind')} value={v.kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))} />
        <p className="text-xs text-muted -mt-2">{t(`kindHint.${v.kind}`)}</p>
        <Check label={t('small')} hint={t('smallHint')} checked={v.small} onChange={(small) => set({ small })} />
      </Section>

      <Section title={t('section.employer')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label={t('employer.company')} value={v.employer.company} onChange={(company) => setEmp({ company })} placeholder={t('employer.companyPlaceholder')} maxLength={40} />
          <TextField label={t('employer.ceo')} value={v.employer.ceo} onChange={(ceo) => setEmp({ ceo })} placeholder={t('employer.ceoPlaceholder')} maxLength={30} />
          <TextField label={t('employer.bizNo')} value={v.employer.bizNo} onChange={(bizNo) => setEmp({ bizNo })} placeholder="000-00-00000" inputMode="numeric" maxLength={12} />
          <TextField label={t('employer.phone')} value={v.employer.phone} onChange={(phone) => setEmp({ phone })} placeholder="02-000-0000" inputMode="tel" maxLength={20} />
          <TextField className="sm:col-span-2" label={t('employer.address')} value={v.employer.address} onChange={(address) => setEmp({ address })} maxLength={120} />
        </div>
      </Section>

      <Section title={t('section.worker')} hint={t('sectionHint.worker')}>
        <PartyFields value={v.worker} onChange={(worker) => set({ worker })} />
      </Section>

      {v.kind === 'minor' && (
        <Section title={t('section.guardian')} hint={t('sectionHint.guardian')}>
          <PartyFields value={v.guardian} onChange={(guardian) => set({ guardian })} />
          <TextField label={t('relation')} value={v.relation} onChange={(relation) => set({ relation })} placeholder={t('relationPlaceholder')} maxLength={10} />
        </Section>
      )}

      <Section title={t('section.term')}>
        {(v.kind === 'part' || v.kind === 'minor') && (
          <Check label={t('fixedTerm')} hint={t('fixedTermHint')} checked={v.fixedTerm} onChange={(fixedTerm) => set({ fixedTerm })} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <DateField label={isFixed(v) ? t('startFixed') : t('start')} value={v.start} onChange={(start) => set({ start })} />
          {isFixed(v) && <DateField label={t('end')} value={v.end} min={v.start} onChange={(end) => set({ end })} />}
        </div>
        <TextField label={t('place')} value={v.place} onChange={(place) => set({ place })} placeholder={t('placePlaceholder')} maxLength={80} />
        <TextField label={t('job')} value={v.job} onChange={(job) => set({ job })} placeholder={t('jobPlaceholder')} maxLength={120} />
      </Section>

      <Section title={t('section.time')}>
        <div>
          <p className={labelCls}>{t('workDays')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('workDays')}>
            {dayNames.map((d, i) => (
              <button key={d} type="button" className={`${segCls(v.on[i])} w-11`} aria-pressed={v.on[i]} onClick={() => set({ on: v.on.map((x, j) => (j === i ? !x : x)) })}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <Check label={t('perDay')} hint={t('perDayHint')} checked={v.perDay} onChange={(perDay) => set(perDay ? { perDay, days: v.days.map((d, i) => (v.on[i] ? v.time : d)) } : { perDay })} />
        {v.perDay ? (
          <div className="space-y-3">
            {v.on.map((on, i) =>
              on ? (
                <div key={i} className="bg-subtle rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-medium text-body">{t('dayN', { day: dayNames[i] })} · {hr(w.dayHours[i])}{hUnit}</p>
                  <SlotFields s={v.days[i]} onChange={(s) => setDay(i, s)} t={t} />
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <SlotFields s={v.time} onChange={(time) => set({ time })} t={t} />
        )}
        <p className="text-xs text-muted -mt-2">{t('breakHint')}</p>
        <Segmented label={t('holiday')} value={String(v.holiday)} onChange={(h) => set({ holiday: Number(h) })} options={dayNames.map((d, i) => ({ value: String(i), label: d }))} />

        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm text-sub">{t('summary.weekly')}</p>
          <p className="text-3xl font-bold text-fg tabular-nums mt-1">{hr(w.weekly)}<span className="text-lg font-semibold ml-1">{hUnit}</span></p>
          <dl className="mt-3 space-y-1 text-sm">
            <Row k={t('summary.maxDay')} v={`${hr(w.maxDay)}${hUnit}`} />
            <Row k={t('summary.contract')} v={`${hr(w.contract)}${hUnit}`} />
            {w.overtime > 0 && <Row k={t('summary.overtime')} v={`${hr(w.overtime)}${hUnit}`} />}
            <Row k={t('summary.holidayHours')} v={w.holidayHours > 0 ? `${hr(w.holidayHours)}${hUnit}` : t('summary.none')} />
            <Row k={t('summary.monthlyHours')} v={`${w.monthlyHours}${hUnit}`} />
          </dl>
        </div>
      </Section>

      <Section title={t('section.wage')}>
        <Segmented label={t('wageType')} value={v.wageType} onChange={(wageType) => set({ wageType })} options={(['hourly', 'monthly'] as const).map((x) => ({ value: x, label: t(`wageTypes.${x}`) }))} />
        <AmountField label={t(`wageLabel.${v.wageType}`)} value={v.wage} onChange={(wage) => set({ wage })} />

        <div className="bg-subtle rounded-2xl p-5">
          <p className="text-sm text-sub">{t('summary.monthlyPay')}</p>
          <p className="text-3xl font-bold text-fg tabular-nums mt-1">{won(est.total)}<span className="text-lg font-semibold ml-1">{t('won')}</span></p>
          <dl className="mt-3 space-y-1 text-sm">
            <Row k={t('summary.hourly')} v={`${won(m.hourly)}${t('won')}`} />
            <Row k={t('summary.minWage')} v={`${won(MIN_WAGE_2026)}${t('won')}`} />
            {v.wageType === 'hourly' && w.holidayHours > 0 && <Row k={t('summary.weeklyHolidayPay')} v={`${won(est.weeklyHolidayPay)}${t('won')}`} />}
            {est.overtime > 0 && <Row k={t('summary.overtimePay')} v={`${won(est.overtime)}${t('won')}`} />}
          </dl>
          <p className="text-xs text-muted mt-3">{t('summary.payNote')}</p>
        </div>

        <Check label={t('bonus')} checked={v.bonus} onChange={(bonus) => set({ bonus })}>
          <TextField label={t('bonusText')} value={v.bonusText} onChange={(bonusText) => set({ bonusText })} placeholder={t('bonusPlaceholder')} maxLength={80} />
        </Check>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className={`${labelCls} mb-0`}>{t('allowances')}</p>
            {v.allowances.length < 5 && (
              <button type="button" onClick={() => set({ allowances: [...v.allowances, { name: '', amount: 0 }] })} className="ui-btn-soft flex items-center gap-1 px-3 py-1.5 text-xs shrink-0">
                <Plus className="w-3.5 h-3.5" />
                {t('allowanceAdd')}
              </button>
            )}
          </div>
          {v.allowances.length === 0 && <p className="text-xs text-muted">{t('allowanceEmpty')}</p>}
          {v.allowances.map((a, i) => (
            <div key={i} className="flex items-end gap-2">
              <TextField className="flex-1" label={t('allowanceName')} value={a.name} onChange={(name) => setAl(i, { name })} placeholder={t('allowanceNamePlaceholder')} maxLength={20} />
              <AmountField className="flex-1" label={t('allowanceAmount')} value={a.amount} onChange={(amount) => setAl(i, { amount })} />
              <button type="button" onClick={() => set({ allowances: v.allowances.filter((_, j) => j !== i) })} className="p-2 mb-0.5 rounded-lg text-faint hover:text-red-600" aria-label={t('allowanceRemove')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('payDay')} value={v.payDay} unit={t('dayUnit')} min={1} max={31} onChange={(payDay) => set({ payDay: Math.round(payDay) || 1 })} />
        </div>
        <Segmented label={t('payMethod')} value={v.payMethod} onChange={(payMethod) => set({ payMethod })} options={(['transfer', 'direct'] as const).map((x) => ({ value: x, label: t(`payMethods.${x}`) }))} />
      </Section>

      <Section title={t('section.insurance')} hint={t('sectionHint.insurance')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['employment', 'accident', 'pension', 'health'] as const).map((k) => (
            <Check key={k} label={t(`ins.${k}`)} checked={v.ins[k]} onChange={(on) => set({ ins: { ...v.ins, [k]: on } })} />
          ))}
        </div>
      </Section>

      <Section title={t('section.etc')}>
        <TextField label={t('extra')} value={v.extra} onChange={(extra) => set({ extra })} placeholder={t('extraPlaceholder')} rows={3} maxLength={1000} />
        <DateField label={t('written')} value={v.written} onChange={(written) => set({ written })} />
      </Section>
    </>
  )
}

// ── A4 본문 (법률 문서이므로 한국어 고정) ───────────────────────────────────

const KD = ['월', '화', '수', '목', '금', '토', '일']
const TITLE: Record<Kind, [string, string]> = {
  regular: ['표준근로계약서', '(기간의 정함이 없는 경우)'],
  fixed: ['표준근로계약서', '(기간의 정함이 있는 경우)'],
  part: ['단시간근로자 표준근로계약서', ''],
  minor: ['연소근로자 표준근로계약서', '(18세 미만인 자)'],
}
const PAGE: CSSProperties = { fontSize: 13, lineHeight: 1.55, padding: '44px 64px' }
const cell: CSSProperties = { padding: '2px 4px', textAlign: 'center' }
const hm = (s: string) => (/^\d{2}:\d{2}$/.test(s) ? `${s.slice(0, 2)}시 ${s.slice(3)}분` : '    시    분')
const box = (on: boolean) => (on ? '■' : '□')
const blank = (s: string, n = 12) => s.trim() || ' '.repeat(n)

function Item({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  const head = <b>{no}. {title} :</b>
  // 문장 하나는 제목 뒤에 이어 쓰고(내어쓰기), 목록·표는 제목 아래 들여 씀
  return typeof children === 'string' ? (
    <div style={{ marginBottom: 3, paddingLeft: '1.3em', textIndent: '-1.3em' }}>{head} {children}</div>
  ) : (
    <div style={{ marginBottom: 3 }}>
      {head}
      <div style={{ paddingLeft: '1.3em' }}>{children}</div>
    </div>
  )
}

const lab: CSSProperties = { ...pTh, width: 92 }

function Paper({ v, stamps }: { v: V; stamps: Record<string, string> }) {
  const w = calc(v)
  const est = monthlyEstimate(v.wageType, v.wage, w, v.small)
  const s = slots(v)
  const workIdx = v.on.flatMap((on, i) => (on ? [i] : []))
  const minor = v.kind === 'minor'
  const part = v.kind === 'part'
  const age = ageAt(v.worker.idFront, v.worker.idBack1, v.start)
  const [title, sub] = TITLE[v.kind]
  const company = blank(v.employer.company)
  const worker = blank(v.worker.name, 8)

  const sameTime = !v.perDay || workIdx.every((i) => JSON.stringify(s[i]) === JSON.stringify(s[workIdx[0]]))
  const one = s[workIdx[0] ?? 0]
  const brk = (x: Slot) => (x.bStart && x.bEnd ? `${hm(x.bStart)} ~ ${hm(x.bEnd)}` : '없음')
  const premium = !v.small && (part || minor || w.overtime > 0)

  const items: { title: string; body: ReactNode }[] = [
    {
      title: isFixed(v) ? '근로계약기간' : '근로개시일',
      body: isFixed(v) ? `${krDate(v.start)}부터 ${krDate(v.end)}까지` : `${krDate(v.start)}부터 (기간의 정함이 없음)`,
    },
    { title: '근 무 장 소', body: v.place.trim() },
    { title: '업무의 내용', body: v.job.trim() },
    {
      title: '소정근로시간',
      body: (
        <>
          {sameTime ? (
            <div>{hm(one.start)}부터 {hm(one.end)}까지 (휴게시간 : {brk(one)})</div>
          ) : (
            <table style={{ ...pTable, fontSize: 12, lineHeight: 1.4, margin: '2px 0 4px' }}>
              <thead>
                <tr>
                  <th style={{ ...pTh, ...cell }}>구분</th>
                  {workIdx.map((i) => <th key={i} style={{ ...pTh, ...cell }}>{KD[i]}요일</th>)}
                </tr>
              </thead>
              <tbody>
                {([
                  ['근로시간', (i: number) => `${hr(w.dayHours[i])}시간`],
                  ['시업', (i: number) => s[i].start],
                  ['종업', (i: number) => s[i].end],
                  ['휴게시간', (i: number) => (s[i].bStart && s[i].bEnd ? `${s[i].bStart}~${s[i].bEnd}` : '-')],
                ] as const).map(([h, f]) => (
                  <tr key={h}>
                    <td style={{ ...pTh, ...cell, fontWeight: 400 }}>{h}</td>
                    {workIdx.map((i) => <td key={i} style={{ ...pTd, ...cell }}>{f(i)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div>1주 소정근로시간 {hr(w.contract)}시간{w.overtime > 0 ? `, 1일 8시간·1주 40시간을 초과하는 ${hr(w.overtime)}시간은 연장근로로 함` : ''}</div>
          {minor && <div>18세 미만인 자는 1일 7시간·1주 35시간 이내 (당사자 합의 시 1일 1시간·1주 5시간 한도 연장)</div>}
        </>
      ),
    },
    {
      title: '근무일/휴일',
      body:
        `매주 ${workIdx.length}일(${workIdx.map((i) => KD[i]).join(', ')}) 근무, 주휴일 매주 ${KD[v.holiday]}요일` +
        (w.holidayHours <= 0 ? ' (1주 소정근로시간 15시간 미만으로 유급 주휴 미적용)' : ''),
    },
    {
      title: '임 금',
      body: (
        <>
          <div>- {v.wageType === 'hourly' ? '시간급' : '월급'} : {v.wage > 0 ? won(v.wage) : blank('')}원</div>
          <div>- 상여금 : {v.bonus ? `있음 (${blank(v.bonusText)})` : '없음'}</div>
          <div>
            - 기타급여(제수당 등) : {v.allowances.length ? '있음 ' : '없음'}
            {v.allowances.map((a, i) => <span key={i}>{i ? ', ' : ''}{a.name.trim() || '수당'} {won(a.amount)}원</span>)}
          </div>
          {w.holidayHours > 0 && (
            <div>
              - 주휴수당 : {v.wageType === 'hourly'
                ? `1주 소정근로일을 개근한 경우 유급 주휴 ${hr(w.holidayHours)}시간분(${won(est.weeklyHolidayPay)}원)을 별도 지급함`
                : `월급에 유급 주휴수당을 포함함 (주휴 포함 월 ${w.monthlyHours}시간 기준)`}
            </div>
          )}
          {premium && <div>- {part ? '소정근로시간을 초과한 근로(기간제법 제6조)와 야간·휴일근로(근로기준법 제56조)' : '연장·야간·휴일근로'}에 대하여 통상임금의 50%를 가산하여 지급함</div>}
          <div>- 임금지급일 : 매월 {v.payDay}일 (휴일의 경우에는 전일 지급), 지급방법 : {v.payMethod === 'transfer' ? '근로자 명의 예금통장에 입금' : '근로자에게 직접 지급'}</div>
        </>
      ),
    },
    {
      title: '연차유급휴가',
      body: v.small
        ? '상시 4명 이하 사업장으로 근로기준법 제60조는 적용되지 않으며, 사업장 규정에 따름'
        : w.holidayHours <= 0
          ? '1주 소정근로시간 15시간 미만으로 적용하지 않음 (근로기준법 제18조 제3항)'
          : part || w.contract < 40
            ? '통상근로자의 근로시간에 비례하여 연차유급휴가를 부여함'
            : '연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함',
    },
  ]
  if (minor) {
    items.push({
      title: '가족관계증명서 및 동의서',
      body: (
        <>
          <div>- 가족관계기록사항에 관한 증명서 제출 여부 : 제출 (   ) · 미제출 (   )</div>
          <div>- 친권자 또는 후견인의 동의서 구비 여부 : 별첨 동의서</div>
        </>
      ),
    })
  }
  items.push(
    {
      title: '사회보험 적용여부',
      body: `${box(v.ins.employment)} 고용보험  ${box(v.ins.accident)} 산재보험  ${box(v.ins.pension)} 국민연금  ${box(v.ins.health)} 건강보험`,
    },
    {
      title: '근로계약서 교부',
      body: `사업주는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의 교부요구와 관계없이 근로자에게 교부함 (근로기준법 제17조${minor ? ', 제67조' : ''} 이행)`,
    },
    {
      title: '근로계약, 취업규칙 등의 성실한 이행의무',
      body: '사업주와 근로자는 각자가 근로계약, 취업규칙, 단체협약을 지키고 성실하게 이행하여야 함',
    },
  )
  if (v.extra.trim()) items.push({ title: '특약사항', body: <span style={{ whiteSpace: 'pre-wrap' }}>{v.extra.trim()}</span> })
  items.push({
    title: '기 타',
    body: (
      <>
        {minor && <div>- 13세 이상 15세 미만인 자는 고용노동부장관의 취직인허증을 교부받아야 하며, 18세 미만인 자의 야간·휴일근로는 본인 동의와 고용노동부장관의 인가를 받아야 함</div>}
        <div>{minor ? '- ' : ''}이 계약에 정함이 없는 사항은 근로기준법령에 의함</div>
      </>
    ),
  })

  return (
    <>
      <Page style={PAGE}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.12em' }}>{title}</div>
          {sub && <div style={{ fontSize: 13, color: '#444', marginTop: 2 }}>{sub}</div>}
        </div>
        <p style={{ margin: '0 0 10px' }}>
          {company}(이하 &ldquo;사업주&rdquo;라 함)과(와) {worker}(이하 &ldquo;근로자&rdquo;라 함)은(는) 다음과 같이 근로계약을 체결한다.
        </p>
        {items.map((it, i) => (
          <Item key={it.title} no={i + 1} title={it.title}>{it.body}</Item>
        ))}
        <div style={{ textAlign: 'center', margin: '12px 0 10px', fontSize: 14 }}>{krDate(v.written)}</div>

        <table style={{ ...pTable, lineHeight: 1.35 }}>
          <colgroup>
            <col style={{ width: 70 }} />
            <col style={{ width: 92 }} />
            <col />
            <col style={{ width: 96 }} />
            <col style={{ width: 140 }} />
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan={3} style={pTh}>사업주</td>
              <td style={lab}>사업체명</td>
              <td style={pTd}>{v.employer.company}</td>
              <td style={lab}>전 화</td>
              <td style={pTd}>{v.employer.phone}</td>
            </tr>
            <tr>
              <td style={lab}>주 소</td>
              <td colSpan={3} style={pTd}>{v.employer.address}</td>
            </tr>
            <tr>
              <td style={lab}>대 표 자</td>
              <td style={{ ...pTd, height: 30 }}><Seal name={v.employer.ceo} stamp={stamps.employer} /></td>
              <td style={lab}>사업자번호</td>
              <td style={{ ...pTd, fontVariantNumeric: 'tabular-nums' }}>{v.employer.bizNo}</td>
            </tr>
            <tr>
              <td rowSpan={3} style={pTh}>근로자</td>
              <td style={lab}>성 명</td>
              <td style={{ ...pTd, height: 30 }}><Seal name={v.worker.name} stamp={stamps.worker} /></td>
              <td style={lab}>주민등록번호</td>
              <td style={{ ...pTd, fontVariantNumeric: 'tabular-nums' }}>{maskId(v.worker)}</td>
            </tr>
            <tr>
              <td style={lab}>주 소</td>
              <td colSpan={3} style={pTd}>{v.worker.address}</td>
            </tr>
            <tr>
              <td style={lab}>연 락 처</td>
              <td colSpan={3} style={pTd}>{v.worker.phone}</td>
            </tr>
          </tbody>
        </table>
      </Page>

      {minor && (
        <Page style={PAGE}>
          <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 28 }}>친권자(후견인) 동의서</div>
          {(
            [
              ['친권자(후견인) 인적사항', [['성 명', v.guardian.name], ['주민등록번호', maskId(v.guardian)], ['주 소', v.guardian.address], ['연 락 처', v.guardian.phone], ['연소근로자와의 관계', v.relation]]],
              ['연소근로자 인적사항', [['성 명', `${v.worker.name}${age !== null ? ` (만 ${age}세)` : ''}`], ['주민등록번호', maskId(v.worker)], ['주 소', v.worker.address], ['연 락 처', v.worker.phone]]],
              ['사업장 개요', [['회 사 명', v.employer.company], ['회사주소', v.employer.address], ['대 표 자', v.employer.ceo], ['회사전화', v.employer.phone]]],
            ] as const
          ).map(([h, rows]) => (
            <div key={h} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>○ {h}</div>
              <table style={pTable}>
                <colgroup>
                  <col style={{ width: 150 }} />
                  <col />
                </colgroup>
                <tbody>
                  {rows.map(([k, val]) => (
                    <tr key={k}>
                      <td style={pTh}>{k}</td>
                      <td style={{ ...pTd, height: 32 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p style={{ margin: '24px 0 0', textIndent: '1em' }}>
            본인은 위 연소근로자 {worker}이(가) 위 사업장에서 근로를 하는 것에 대하여 동의합니다.
          </p>
          <div style={{ textAlign: 'center', margin: '36px 0 24px', fontSize: 14 }}>{krDate(v.written)}</div>
          <div style={{ textAlign: 'right', fontSize: 14 }}>
            친권자(후견인) <Seal name={v.guardian.name} stamp={stamps.guardian} />
          </div>
          <div style={{ marginTop: 36 }}>첨 부 : 가족관계증명서 1부</div>
        </Page>
      )}
    </>
  )
}

const tpl: DocTemplate<V> = {
  id: 'employment',
  ns: 'employmentContract',
  initial,
  Form,
  Paper,
  insights,
  signers: (v) => [
    { id: 'employer', name: v.employer.ceo },
    { id: 'worker', name: v.worker.name },
    ...(v.kind === 'minor' ? [{ id: 'guardian', name: v.guardian.name }] : []),
  ],
  fileName: (v) => docFileName('근로계약서', v.worker.name, v.written),
}

export default function EmploymentContract() {
  return <DocumentGenerator template={tpl} />
}
