'use client'

import { useId, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/csatGrade'
import { INQ_SOC, INQ_SCI } from '@/utils/csatGrade'
import type { CsatGoal } from '@/utils/csatGoals'
import {
  CSAT_DIRECT_GRADE_FIELDS, emptyCsatDirectGrades, evaluateCsatDirectGoal,
  type CsatDirectGradeArea, type CsatDirectGradeField,
} from '@/utils/csatDirectGrades'

/** Independent visit-only inputs. This panel never receives or writes raw-score state. */
export default function CsatDirectGradePanel({ goals, ready, blocked }: {
  goals: readonly CsatGoal[]; ready: boolean; blocked: boolean
}) {
  const t = useTranslations('csatGrade')
  const id = useId()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(emptyCsatDirectGrades)
  const fieldLabel = (field: CsatDirectGradeField) => t(field === 'kor' ? 'subjects.korean' : field === 'math' ? 'subjects.math' : field === 'eng' ? 'subjects.english' : field === 'inq1' ? 'u.inq1' : 'u.inq2')
  const areaLabel = (area: CsatDirectGradeArea) => area.id === 'inq' ? t(`u.cut.${area.subject}`) : fieldLabel(area.field)
  const selectClass = 'ui-field min-h-11 w-full min-w-0 px-3 py-2 text-base'

  return <section id="csat-direct-grade-panel" data-csat-direct-grades className="mt-5 min-w-0 scroll-mt-20 border-t border-line pt-4">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="ui-btn-soft min-h-11 w-full px-4 py-3 text-left text-base font-semibold">{t(open ? 'directGrades.close' : 'directGrades.open')}</button>
    {open && <div id={id} className="mt-4 space-y-4">
      <p className="text-sm font-medium text-fg">{t('directGrades.basis')}</p>
      <p className="text-sm text-sub">{t('directGrades.description')}</p>
      <p className="text-xs text-muted">{t('directGrades.scope')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CSAT_DIRECT_GRADE_FIELDS.map(field => <fieldset key={field} className="min-w-0 space-y-2 rounded-xl bg-subtle p-3">
          <legend className="px-1 text-sm font-semibold text-body">{fieldLabel(field)}</legend>
          {(field === 'inq1' || field === 'inq2') && <label className="block text-sm text-body" htmlFor={`${id}-${field}-subject`}>
            <span className="mb-1 block">{t('directGrades.inquirySubject')}</span>
            <select id={`${id}-${field}-subject`} data-direct-inquiry={field} value={input.inquiry[field]} onChange={event => setInput(value => ({ ...value, inquiry: { ...value.inquiry, [field]: event.target.value } }))} className={selectClass}>
              <option value="">{t('directGrades.chooseSubject')}</option>
              {([['subjects.socialStudies', INQ_SOC], ['subjects.science', INQ_SCI]] as const).map(([label, subjects]) => <optgroup key={label} label={t(label)}>{subjects.map(subject => <option key={subject} value={subject}>{t(`u.cut.${subject}`)}</option>)}</optgroup>)}
            </select>
          </label>}
          <label htmlFor={`${id}-${field}-grade`} className="block text-sm text-body">
            <span className="mb-1 block">{t('directGrades.gradeLabel', { subject: fieldLabel(field) })}</span>
            <select id={`${id}-${field}-grade`} data-direct-grade={field} value={input.grades[field]} onChange={event => setInput(value => ({ ...value, grades: { ...value.grades, [field]: event.target.value } }))} className={selectClass}>
              <option value="">{t('directGrades.missing')}</option>
              {Array.from({ length: 9 }, (_, index) => index + 1).map(grade => <option key={grade} value={grade}>{t('u.gradeN', { g: grade })}</option>)}
            </select>
          </label>
        </fieldset>)}
      </div>
      <button type="button" onClick={() => setInput(emptyCsatDirectGrades())} className="ui-btn-soft min-h-11 px-4 py-2 text-sm">{t('directGrades.reset')}</button>
      <p className="text-xs text-muted">{t('directGrades.rule')}</p>
      {!ready ? <p role="status" className="text-sm text-sub">{t('directGrades.loading')}</p>
        : blocked ? <p role="status" className="text-sm text-body">{t('directGrades.blocked')}</p>
          : !goals.length ? <p className="text-sm text-sub">{t('directGrades.noGoals')}</p>
            : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {goals.map(goal => {
                const result = evaluateCsatDirectGoal(input, goal)
                const label = result.status === 'invalidCondition' ? t('goals.invalidCondition', { min: result.areas, max: result.areas * 9 })
                  : result.status === 'needsInput' ? t('goals.needsInput', { count: result.available.length, required: result.areas })
                    : result.status === 'within' ? t('goals.within') : t('goals.over', { amount: result.over ?? 0 })
                return <article key={goal.id} data-direct-goal={goal.id} data-direct-status={result.status} className="min-w-0 space-y-2 rounded-xl bg-subtle p-4">
                  <h3 className="break-words font-semibold text-fg">{goal.name}</h3>
                  <p className="text-xs text-sub">{t('directGrades.basis')}</p>
                  <p className="text-sm text-body">{t('goals.condition', { areas: goal.areas, max: goal.maxSum })}</p>
                  <p className={`text-lg font-bold ${result.status === 'within' ? 'text-primary' : 'text-fg'}`}>{label}</p>
                  {result.sum !== null && <p className="text-sm text-body tabular-nums">{t('goals.sum', { areas: result.areas, sum: result.sum, max: result.maxSum })}</p>}
                  <p className="text-xs text-sub">{t('directGrades.available', { count: result.available.length })}</p>
                  {!!result.used.length && <div><p className="text-xs font-medium text-body">{t(result.status === 'needsInput' ? 'goals.availableAreas' : 'goals.usedAreas')}</p><ul className="mt-1 space-y-1 text-xs text-sub">{result.used.map(area => <li key={area.id} data-direct-used={area.field}>{t('goals.areaGrade', { subject: areaLabel(area), grade: area.grade })}</li>)}</ul></div>}
                  {result.inquiryConflict && <p className="text-xs text-body">{t('directGrades.inquiryConflict')}</p>}
                  {!result.inquiryConflict && result.duplicateInquiry && <p className="text-xs text-sub">{t('goals.duplicateInquiry')}</p>}
                  {result.singleInquiry && <p className="text-xs text-sub">{t('goals.singleInquiry', { subject: areaLabel(result.singleInquiry) })}</p>}
                  {!!result.missingSubjects.length && <p className="text-xs text-body">{t('directGrades.subjectRequired', { fields: result.missingSubjects.map(fieldLabel).join(', ') })}</p>}
                  {!!result.invalidFields.length && <p className="text-xs text-body">{t('directGrades.invalidGrades', { fields: result.invalidFields.map(fieldLabel).join(', ') })}</p>}
                </article>
              })}
            </div>}
    </div>}
  </section>
}
