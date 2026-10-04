'use client'

import { useState, type CSSProperties } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/residentNumber'
import { formatRrn, onlyDigits, parseRrn, type RrnResult } from '@/utils/residentNumber'

// 개인정보: 입력값은 컴포넌트 state에만 존재. 네트워크 요청·localStorage·URL·히스토리·클립보드 사용 없음.
const MASK_STYLE = { WebkitTextSecurity: 'disc' } as CSSProperties

const STATUS_STYLE: Record<RrnResult['status'], string> = {
  valid: 'bg-subtle text-fg',
  checksumMismatch: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  invalidDate: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  futureDate: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200',
}

const pad = (n: number) => String(n).padStart(2, '0')

export default function ResidentNumber() {
  const t = useTranslations('residentNumber')
  const [input, setInput] = useState('')
  const [masked, setMasked] = useState(false)

  const digits = onlyDigits(input)
  const result = parseRrn(digits)
  const hasDetails = result && (result.status === 'valid' || result.status === 'checksumMismatch')

  const statusDesc = (r: RrnResult) =>
    r.status === 'checksumMismatch' && r.afterReform
      ? t('status.checksumMismatchAfterReform')
      : t(`status.${r.status}Desc`)

  const rows: [string, string][] = hasDetails
    ? [
        [t('info.number'), `${digits.slice(0, 6)}-${digits[6]}******`],
        [t('info.birthDate'), `${result.year}.${pad(result.month)}.${pad(result.day)}`],
        [t('info.age'), t('info.ageValue', { age: result.age })],
        [t('info.gender'), result.male ? t('info.male') : t('info.female')],
        [t('info.type'), result.foreigner ? t('info.foreigner') : t('info.korean')],
        [t('info.century'), t('info.centuryValue', { century: Math.floor(result.year / 100) * 100 })],
        [t('info.checksum'), result.status === 'valid' ? t('info.checksumOk') : t('info.checksumNo')],
      ]
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="ui-card p-6 space-y-4">
        <div>
          <label htmlFor="resident-input" className="block text-sm font-medium text-body mb-2">
            {t('inputLabel')}
          </label>
          <input
            id="resident-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(formatRrn(e.target.value))}
            placeholder={t('inputPlaceholder')}
            className="ui-field px-4 py-3 w-full font-mono text-lg tabular-nums tracking-wider"
            style={masked ? MASK_STYLE : undefined}
            maxLength={14}
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <label className="flex items-center gap-2 text-body cursor-pointer">
              <input type="checkbox" checked={masked} onChange={(e) => setMasked(e.target.checked)} className="accent-blue-600" />
              {t('mask')}
            </label>
            <span className="text-muted tabular-nums">{t('status.incomplete', { count: digits.length })}</span>
          </div>
        </div>

        <p className="text-sm text-muted">{t('privacyNote')}</p>

        <button
          onClick={() => setInput('')}
          disabled={!input}
          className="ui-btn-soft px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('reset')}
        </button>
      </div>

      {result && (
        <div className="ui-card p-6 space-y-4" aria-live="polite">
          <div className={`rounded-2xl p-5 ${STATUS_STYLE[result.status]}`}>
            <h2 className="text-xl font-semibold">{t(`status.${result.status}`)}</h2>
            <p className="text-sm mt-1">{statusDesc(result)}</p>
          </div>

          {hasDetails && (
            <dl className="divide-y divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-body">{k}</dt>
                  <dd className="text-fg font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">{t('guide.structure.title')}</h3>
            <ul className="list-disc pl-5 space-y-2 text-body">
              {(t.raw('guide.structure.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">{t('guide.codes.title')}</h3>
            <ul className="list-disc pl-5 space-y-2 text-body">
              <li>{t('guide.codes.c1900')}</li>
              <li>{t('guide.codes.c2000')}</li>
              <li>{t('guide.codes.foreigner')}</li>
              <li>{t('guide.codes.c1800')}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-fg mb-3">{t('guide.validation.title')}</h3>
            <ul className="list-disc pl-5 space-y-2 text-body">
              {(t.raw('guide.validation.items') as string[]).map((item, i) => <li key={i}>{item}</li>)}
              <li>{t('guide.foreignerNote')}</li>
            </ul>
          </div>
          <div className="bg-subtle rounded-2xl p-5 text-sub text-sm">
            <p className="font-medium text-fg mb-1">{t('guide.reform.title')}</p>
            <p>{t('guide.reform.body')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
