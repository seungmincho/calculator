import { INQ_SOC, INQ_SCI, type InqKey } from './csatGrade.ts'
import { evaluateCsatGradeAreas } from './csatGradeGoalEvaluation.ts'

export const CSAT_DIRECT_GRADE_FIELDS = ['kor', 'math', 'eng', 'inq1', 'inq2'] as const
export type CsatDirectGradeField = typeof CSAT_DIRECT_GRADE_FIELDS[number]
export interface CsatDirectGradeInput {
  grades: Record<CsatDirectGradeField, string>
  inquiry: { inq1: string; inq2: string }
}
export interface CsatDirectGradeArea {
  id: 'kor' | 'math' | 'eng' | 'inq'
  field: CsatDirectGradeField
  subject: 'kor' | 'math' | 'eng' | InqKey
  grade: number
}
const inquirySubjects = new Set<string>([...INQ_SOC, ...INQ_SCI])
export const isCsatDirectGrade = (value: unknown): value is string => typeof value === 'string' && /^[1-9]$/.test(value)
export function emptyCsatDirectGrades(): CsatDirectGradeInput {
  return { grades: { kor: '', math: '', eng: '', inq1: '', inq2: '' }, inquiry: { inq1: '', inq2: '' } }
}

export function evaluateCsatDirectGoal(input: CsatDirectGradeInput, condition: { areas: number; maxSum: number }) {
  const available: CsatDirectGradeArea[] = []
  const invalidFields: CsatDirectGradeField[] = [], missingSubjects: ('inq1' | 'inq2')[] = []
  for (const field of ['kor', 'math', 'eng'] as const) {
    const raw = input.grades[field]
    if (raw === '') continue
    if (!isCsatDirectGrade(raw)) { invalidFields.push(field); continue }
    available.push({ id: field, field, subject: field, grade: Number(raw) })
  }
  const inquiry: CsatDirectGradeArea[] = []
  for (const field of ['inq1', 'inq2'] as const) {
    const raw = input.grades[field], subject = input.inquiry[field]
    if (raw === '') continue
    if (!isCsatDirectGrade(raw)) { invalidFields.push(field); continue }
    if (!inquirySubjects.has(subject)) { missingSubjects.push(field); continue }
    inquiry.push({ id: 'inq', field, subject: subject as InqKey, grade: Number(raw) })
  }
  const duplicateInquiry = inquiry.length > 0 && input.inquiry.inq1 === input.inquiry.inq2
  const inquiryConflict = duplicateInquiry && inquiry.length === 2 && inquiry[0].grade !== inquiry[1].grade
  const bestInquiry = inquiryConflict ? null : [...inquiry].sort((a, b) => a.grade - b.grade)[0] ?? null
  if (bestInquiry) available.push(bestInquiry)
  const singleInquiry = bestInquiry && (inquiry.length === 1 || duplicateInquiry) ? bestInquiry : null
  return { ...evaluateCsatGradeAreas(available, condition), available, invalidFields, missingSubjects, duplicateInquiry, inquiryConflict, singleInquiry }
}
export type CsatDirectGoalEvaluation = ReturnType<typeof evaluateCsatDirectGoal>
