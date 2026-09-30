// 학점 계산 회귀 체크: node scripts/check-gpa.ts
import { computeStats, normalizeGrade, parseCourses, requiredAverage, minGradeFor, supersededIds } from '../src/utils/gpa.ts'
let fail = 0
const eq = (label: string, a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', label, a, '!=', b) } }
const near = (label: string, a: number, b: number) => { if (Math.abs(a - b) > 1e-9) { fail++; console.log('FAIL', label, a, '!=', b) } }
const c = (id: string, name: string, credits: number, grade: string, extra = {}) => ({ id, name, credits, grade, ...extra })

// 4.5: (4.5*3 + 3.5*3 + 0*2) / 8, P 과목은 평점 제외·취득학점 포함, F는 평점 포함·취득 제외
const s = computeStats([c('1', 'a', 3, 'A+', { major: true }), c('2', 'b', 3, 'B+'), c('3', 'c', 1, 'P'), c('4', 'd', 2, 'F'), c('5', 'e', 3, '')], '4.5')
near('gpa', s.gpa, 24 / 8); eq('gpaCredits', s.gpaCredits, 8); eq('earned', s.earnedCredits, 7); near('major', s.majorGpa, 4.5); eq('courses', s.courses, 4)
near('4.3', computeStats([c('1', 'a', 3, 'A-'), c('2', 'b', 3, 'B+')], '4.3').gpa, 3.5)
// 재수강: 뒤 과목이 retake면 앞 같은 이름 과목 제외
const sems = [{ id: 's1', courses: [c('1', '미적분 학', 3, 'C+'), c('2', 'x', 3, 'A0')] }, { id: 's2', courses: [c('3', '미적분학', 3, 'A+', { retake: true })] }]
const ex = supersededIds(sems); eq('superseded', [...ex], ['1'])
near('retake gpa', computeStats(sems.flatMap(s => s.courses), '4.5', ex).gpa, 4.25)
eq('norm', ['a', 'B', 'Ao', 'A-', 'pass', 'x'].map(g => normalizeGrade(g, '4.5')), ['A0', 'B0', 'A0', 'A0', 'P', ''])
eq('norm43', normalizeGrade('A-', '4.3'), 'A-')
near('required', requiredAverage(3.5, 60, 3.8, 60)!, 4.1)
eq('minGrade', [minGradeFor(3.2, '4.5'), minGradeFor(4.6, '4.5'), minGradeFor(3.2, '4.3')], ['B+', null, 'B+'])
eq('parse', parseCourses('1\tCSE2010\t자료구조\t전공필수\t3\tA+\t4.5\n교양 글쓰기 2 B0\n체육 1 P\n헤더 과목명 학점 성적', '4.5'), [
  { name: '자료구조', credits: 3, grade: 'A+', major: true },
  { name: '글쓰기', credits: 2, grade: 'B0', major: false },
  { name: '체육', credits: 1, grade: 'P', major: false },
])
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
