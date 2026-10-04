// 학점(GPA) 계산 순수 로직. 회귀 체크: node scripts/check-gpa.ts
export type GpaScale = '4.5' | '4.3'

export interface Course {
  id: string
  name: string
  credits: number
  grade: string // '' = 미입력, 'P' / 'NP' = Pass/Fail 과목
  major?: boolean
  retake?: boolean // 재수강: 이전 학기의 같은 과목명 성적을 대체
}

export interface Semester {
  id: string
  courses: Course[]
}

export const GRADE_VALUES: Record<GpaScale, Record<string, number>> = {
  '4.5': { 'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0, 'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0 },
  '4.3': { 'A+': 4.3, 'A0': 4.0, 'A-': 3.7, 'B+': 3.3, 'B0': 3.0, 'B-': 2.7, 'C+': 2.3, 'C0': 2.0, 'C-': 1.7, 'D+': 1.3, 'D0': 1.0, 'D-': 0.7, 'F': 0 },
}
export const PASS_GRADES = ['P', 'NP']

/** 입력/예전 저장값/다른 만점제 등급을 현재 만점제 등급으로 정규화. 모르면 '' */
export function normalizeGrade(raw: string, scale: GpaScale): string {
  const g = raw.trim().toUpperCase().replace(/^([A-D])O?$/, '$1' + '0')
  if (g === 'P' || g === 'S' || g === 'PASS') return 'P'
  if (g === 'NP' || g === 'U' || g === 'FAIL') return 'NP'
  if (g === 'F') return 'F'
  const values = GRADE_VALUES[scale]
  if (g in values) return g
  // 4.5 만점엔 '-' 등급이 없음 → 같은 알파벳 0 등급으로
  if (/^[A-D]-$/.test(g)) return g[0] + '0'
  return ''
}

export interface GpaStats {
  gpa: number // 평점평균 (P/F 제외)
  gpaCredits: number // 평점 산입 학점
  earnedCredits: number // 취득 학점 (P 포함, F/NP 제외)
  majorGpa: number
  majorCredits: number
  courses: number
}

/** 재수강으로 대체된(이전) 과목 id 집합. 같은 과목명(공백 무시) 중 retake 과목보다 앞에 있는 것들. */
export function supersededIds(semesters: Semester[]): Set<string> {
  const flat = semesters.flatMap(s => s.courses)
  const out = new Set<string>()
  const key = (n: string) => n.replace(/\s+/g, '').toLowerCase()
  flat.forEach((c, i) => {
    if (!c.retake || !key(c.name)) return
    for (let j = 0; j < i; j++) if (key(flat[j].name) === key(c.name)) out.add(flat[j].id)
  })
  return out
}

export function computeStats(courses: Course[], scale: GpaScale, exclude: Set<string> = new Set()): GpaStats {
  const values = GRADE_VALUES[scale]
  let pts = 0, cr = 0, mPts = 0, mCr = 0, earned = 0, n = 0
  for (const c of courses) {
    if (exclude.has(c.id) || !c.grade || !(c.credits > 0)) continue
    n++
    if (c.grade === 'P') { earned += c.credits; continue }
    if (c.grade === 'NP') continue
    const v = values[c.grade]
    if (v === undefined) continue
    pts += v * c.credits
    cr += c.credits
    if (v > 0) earned += c.credits
    if (c.major) { mPts += v * c.credits; mCr += c.credits }
  }
  return {
    gpa: cr ? pts / cr : 0,
    gpaCredits: cr,
    earnedCredits: earned,
    majorGpa: mCr ? mPts / mCr : 0,
    majorCredits: mCr,
    courses: n,
  }
}

/** 목표 평점까지 남은 학점에서 필요한 평균. null = 입력 부족 */
export function requiredAverage(currentGpa: number, currentCredits: number, target: number, remaining: number): number | null {
  if (!(remaining > 0) || !Number.isFinite(target)) return null
  return (target * (currentCredits + remaining) - currentGpa * currentCredits) / remaining
}

/** 필요 평균 이상인 가장 낮은 등급 (예: 3.4 → 'B+'). 없으면 null */
export function minGradeFor(avg: number, scale: GpaScale): string | null {
  const entries = Object.entries(GRADE_VALUES[scale]).sort((a, b) => a[1] - b[1])
  const hit = entries.find(([, v]) => v >= avg - 1e-9)
  return hit ? hit[0] : null
}

/**
 * 학사시스템 성적표 복사 텍스트 파싱. 한 줄에 과목명 + 학점(숫자) + 성적(A+, B0, P ...)이 있으면 과목으로 인식.
 * 탭/공백 구분, 과목코드·이수구분 등 다른 칸이 섞여도 됨. '전공'이 들어간 줄은 전공으로 표시.
 */
export function parseCourses(text: string, scale: GpaScale): Omit<Course, 'id'>[] {
  const out: Omit<Course, 'id'>[] = []
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/\t|\s{2,}|,|\|/).map(s => s.trim()).filter(Boolean)
    const tokens = cells.length >= 3 ? cells : line.trim().split(/\s+/)
    let gradeIdx = -1, grade = ''
    for (let i = tokens.length - 1; i >= 0; i--) {
      const g = /^([A-Da-d][+0Oo-]?|[Ff]|P|NP|S|U)$/.test(tokens[i]) ? normalizeGrade(tokens[i], scale) : ''
      if (g) { gradeIdx = i; grade = g; break }
    }
    if (gradeIdx < 0) continue
    // 성적 칸에 가장 가까운 학점 숫자 (앞쪽 순번 칸과 혼동 방지)
    let creditIdx = -1
    const isCredit = (tok: string) => /^\d(\.\d)?$/.test(tok) && Number(tok) > 0 && Number(tok) <= 6
    for (let i = 0; i < gradeIdx; i++) if (isCredit(tokens[i])) creditIdx = i
    if (creditIdx < 0) creditIdx = tokens.findIndex((tok, i) => i > gradeIdx && isCredit(tok))
    if (creditIdx < 0) continue
    const name = tokens
      .filter((tok, i) => i !== gradeIdx && i !== creditIdx && /[가-힣A-Za-z]/.test(tok) && !/^[A-Z]{2,4}\d{3,}$/.test(tok) && !/^(전공|교양|일반|전필|전선|교필|교선|기초|필수|선택)/.test(tok) && !/^\d/.test(tok))
      .join(' ')
    out.push({ name, credits: Number(tokens[creditIdx]), grade, major: /전공|전필|전선/.test(line) })
  }
  return out
}

/** 공유 링크용 직렬화: 학기 '!' · 과목 '|' · 필드 '~' (과목명~학점~성적~플래그 m=전공 r=재수강). 빈 줄은 뺌 */
export function encodeSemesters(semesters: { courses: Omit<Course, 'id'>[] }[]): string {
  return semesters.map(s => s.courses.filter(c => c.name.trim() || c.grade).map(c =>
    [c.name.replace(/[~|!]/g, '').slice(0, 30), c.credits, c.grade, (c.major ? 'm' : '') + (c.retake ? 'r' : '')].join('~'),
  ).join('|')).join('!')
}

export function decodeSemesters(s: string, scale: GpaScale): Omit<Course, 'id'>[][] {
  return s.split('!').slice(0, 16).map(sem => (sem ? sem.split('|').slice(0, 40).map(part => {
    const [name = '', credits = '', grade = '', flags = ''] = part.split('~')
    return {
      name: name.slice(0, 30),
      credits: Math.min(30, Math.max(0, parseFloat(credits) || 0)),
      grade: normalizeGrade(grade, scale),
      major: flags.includes('m'),
      retake: flags.includes('r'),
    }
  }) : []))
}
