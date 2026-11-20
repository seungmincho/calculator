import { CUTS, cutsFor, INQ_SOC, INQ_SCI, gradeOf, estimate, pointsToNext, gradeAverages, type CutKey } from './csatGrade.ts'
import { CSAT_SCORE_FIELDS, csatScoreSubject, isCsatRawScore, type CsatScoreField, type CsatScoreSnapshot } from './csatScoreRecords.ts'

interface RowBase { id: CsatScoreField; cut: CutKey | null; max: number; absolute: boolean }
export type CsatRawGradeRow = RowBase & (
  { status: 'valid'; score: number; grade: number; est: ReturnType<typeof estimate>; next: number | null }
  | { status: 'missing' | 'invalid'; score: null; grade: null; est: null; next: null }
)
const inquirySubjects = new Set<string>([...INQ_SOC, ...INQ_SCI])

/** Shared row/hero/share/table validity: an empty score is never converted into zero. */
export function csatRawGradeRow(snapshot: CsatScoreSnapshot, id: CsatScoreField): CsatRawGradeRow {
  const raw = snapshot.scores[id], subject = csatScoreSubject(id, snapshot)
  const validSubject = id === 'kor' ? ['lm', 'hj'].includes(snapshot.selection.kor)
    : id === 'math' ? ['prob', 'calc', 'geo'].includes(snapshot.selection.math)
      : id === 'inq1' || id === 'inq2' ? inquirySubjects.has(snapshot.selection[id]) : true
  const set = cutsFor(snapshot.referenceYear)
  const cut = validSubject && Object.hasOwn(CUTS, subject) ? subject as CutKey : null
  const base = { id, cut, max: id === 'hist' || id === 'inq1' || id === 'inq2' ? 50 : 100, absolute: id === 'eng' || id === 'hist' }
  if (raw === '') return { ...base, status: 'missing', score: null, grade: null, est: null, next: null }
  if (!cut || !isCsatRawScore(raw, id)) return { ...base, status: 'invalid', score: null, grade: null, est: null, next: null }
  const score = Number(raw)
  return { ...base, status: 'valid', score, grade: gradeOf(cut, score, set), est: estimate(cut, score, set), next: pointsToNext(cut, score, set) }
}

export function summarizeCsatRawGrades(snapshot: CsatScoreSnapshot) {
  const rows = CSAT_SCORE_FIELDS.map(id => csatRawGradeRow(snapshot, id))
  const [kor, math, eng, , inq1, inq2] = rows
  const duplicateInquiry = (inq1.status === 'valid' || inq2.status === 'valid') && snapshot.selection.inq1 === snapshot.selection.inq2
  const inquiryConflict = duplicateInquiry && inq1.status === 'valid' && inq2.status === 'valid' && inq1.score !== inq2.score
  let all: number | null = null, noEng: number | null = null
  if (!inquiryConflict && kor.status === 'valid' && math.status === 'valid' && inq1.status === 'valid' && inq2.status === 'valid') {
    const average = gradeAverages({ kor: kor.grade, math: math.grade, eng: eng.status === 'valid' ? eng.grade : 9, hist: 9, inq1: inq1.grade, inq2: inq2.grade })
    noEng = average.noEng
    if (eng.status === 'valid') all = average.all
  }
  return { rows, averages: { all, noEng }, duplicateInquiry, inquiryConflict }
}
