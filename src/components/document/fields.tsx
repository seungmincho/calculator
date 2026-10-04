'use client'

// 문서 작성기 입력 부품 (디자인 토큰만 사용). 라벨 문구는 호출부에서 t()로 넘김 — PartyFields만 공통 네임스페이스 사용.
import { useId, type ReactNode } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/documentGenerator'
import { amountText, type Party } from '@/utils/document'

export const fieldCls = 'ui-field w-full min-w-0 px-3 py-2 text-sm'
export const labelCls = 'block text-xs font-medium text-sub mb-1'

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="ui-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, id, hint, className = '', children }: { label: string; id?: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className={labelCls} htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

type InputMode = 'text' | 'numeric' | 'tel' | 'decimal'

export function TextField({
  label, value, onChange, placeholder, hint, rows, inputMode, maxLength, className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: ReactNode
  rows?: number // 지정하면 textarea
  inputMode?: InputMode
  maxLength?: number
  className?: string
}) {
  const id = useId()
  return (
    <Field label={label} id={id} hint={hint} className={className}>
      {rows ? (
        <textarea id={id} rows={rows} className={`${fieldCls} resize-y`} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className={fieldCls} value={value} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  )
}

export function DateField({ label, value, onChange, min, hint, className }: { label: string; value: string; onChange: (v: string) => void; min?: string; hint?: ReactNode; className?: string }) {
  const id = useId()
  return (
    <Field label={label} id={id} hint={hint} className={className}>
      <input id={id} type="date" className={fieldCls} value={value} min={min} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

/** 원 단위 금액 (쉼표 표시) + 아래에 '금 일천만원정 (₩10,000,000)' */
export function AmountField({ label, value, onChange, className }: { label: string; value: number; onChange: (v: number) => void; className?: string }) {
  const id = useId()
  return (
    <Field label={label} id={id} hint={value > 0 ? amountText(value) : undefined} className={className}>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          className={`${fieldCls} pr-8 text-right tabular-nums`}
          value={value ? value.toLocaleString('ko-KR') : ''}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, 15)) || 0)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">원</span>
      </div>
    </Field>
  )
}

export function NumberField({
  label, value, onChange, unit, min = 0, max, step = 1, hint, className,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  hint?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <Field label={label} id={id} hint={hint} className={className}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`${fieldCls} ${unit ? 'pr-10' : ''} text-right tabular-nums`}
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            onChange(Number.isFinite(n) ? Math.min(max ?? Infinity, Math.max(min, n)) : 0)
          }}
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>}
      </div>
    </Field>
  )
}

export const segCls = (on: boolean) =>
  `px-3 py-2 text-sm font-medium rounded-xl transition-colors ${on ? 'bg-primary text-white' : 'bg-soft text-body hover:bg-subtle'}`

export function Segmented<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={segCls(value === o.value)} aria-pressed={value === o.value}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Check({ label, checked, onChange, hint, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${checked ? 'bg-primary-soft' : 'bg-subtle'}`}>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="min-w-0">
          <span className={`block text-sm font-medium ${checked ? 'text-primary' : 'text-body'}`}>{label}</span>
          {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
        </span>
      </label>
      {checked && children && <div className="mt-2 pl-6">{children}</div>}
    </div>
  )
}

/** 당사자 입력: 이름 · 주민번호 앞 6자리 + 뒷자리 첫째(선택) · 주소 · 연락처. hide로 필요 없는 칸 숨김 */
export function PartyFields({ value, onChange, hide = [], namePlaceholder }: { value: Party; onChange: (p: Party) => void; hide?: (keyof Party)[]; namePlaceholder?: string }) {
  const t = useTranslations('documentGenerator')
  const set = (k: keyof Party, v: string) => onChange({ ...value, [k]: v })
  const idId = useId()
  const show = (k: keyof Party) => !hide.includes(k)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {show('name') && <TextField label={t('party.name')} value={value.name} onChange={(v) => set('name', v)} placeholder={namePlaceholder ?? t('party.namePlaceholder')} maxLength={30} />}
      {show('idFront') && (
        <Field label={t('party.id')} id={idId}>
          <div className="flex items-center gap-1.5">
            <input
              id={idId}
              inputMode="numeric"
              className={`${fieldCls} tabular-nums`}
              value={value.idFront}
              placeholder="900101"
              maxLength={6}
              onChange={(e) => set('idFront', e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <span className="text-muted">-</span>
            <input
              inputMode="numeric"
              aria-label={t('party.idBack1')}
              className="ui-field w-11 shrink-0 px-2 py-2 text-sm text-center tabular-nums"
              value={value.idBack1}
              placeholder="1"
              maxLength={1}
              onChange={(e) => set('idBack1', e.target.value.replace(/\D/g, '').slice(0, 1))}
            />
            <span className="text-faint text-sm tracking-widest shrink-0">******</span>
          </div>
        </Field>
      )}
      {show('address') && <TextField className="sm:col-span-2" label={t('party.address')} value={value.address} onChange={(v) => set('address', v)} placeholder={t('party.addressPlaceholder')} maxLength={120} />}
      {show('phone') && <TextField label={t('party.phone')} value={value.phone} onChange={(v) => set('phone', v)} placeholder="010-0000-0000" inputMode="tel" maxLength={20} />}
    </div>
  )
}
