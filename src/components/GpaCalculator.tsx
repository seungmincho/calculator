'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import NextLink from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/gpaCalculator'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import ShareResult from '@/components/ShareResult'
import MobileResultLink from '@/components/MobileResultLink'
import {
  type Course, type Semester as BaseSemester, type GpaScale,
  GRADE_VALUES, computeStats, supersededIds, normalizeGrade, requiredAverage, minGradeFor, parseCourses,
  encodeSemesters, decodeSemesters,
} from '@/utils/gpa'

interface Semester extends BaseSemester {
  isExpanded: boolean
}

const STORAGE_KEY = 'gpa-calculator-v2'
const CREDIT_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]

let seq = 0
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`
const emptyCourse = (): Course => ({ id: uid(), name: '', credits: 3, grade: '' })

// 첫 방문 시 결과가 바로 보이도록 예시 학기 (초기화하면 빈 학기로). id 고정 = hydration 일치
const sampleSemesters = (): Semester[] => [
  {
    id: 'sample-1', isExpanded: true, courses: [
      { id: 'sample-2', name: '대학글쓰기', credits: 2, grade: 'A0' },
      { id: 'sample-3', name: '미적분학', credits: 3, grade: 'B+' },
      { id: 'sample-4', name: '프로그래밍기초', credits: 3, grade: 'A+', major: true },
      { id: 'sample-5', name: '일반물리학', credits: 3, grade: 'B0' },
      { id: 'sample-6', name: '체육', credits: 1, grade: 'P' },
    ],
  },
  {
    id: 'sample-7', isExpanded: true, courses: [
      { id: 'sample-8', name: '자료구조', credits: 3, grade: 'A0', major: true },
      { id: 'sample-9', name: '이산수학', credits: 3, grade: 'B+', major: true },
      { id: 'sample-10', name: '영어회화', credits: 2, grade: 'A+' },
      { id: 'sample-11', name: '미적분학', credits: 3, grade: 'A0', retake: true },
    ],
  },
]

const fmt = (n: number) => n.toFixed(2)

export default function GpaCalculator() {
  const t = useTranslations('gpaCalculator')

  const [scale, setScale] = useState<GpaScale>('4.5')
  const [semesters, setSemesters] = useState<Semester[]>(sampleSemesters)
  const [isSample, setIsSample] = useState(true)
  const [targetGpa, setTargetGpa] = useState('')
  const [remainingCredits, setRemainingCredits] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteMsg, setPasteMsg] = useState('')
  const [loaded, setLoaded] = useState(false)
  // 공유 링크(?c=)로 연 성적: 이 기기의 내 기록(localStorage)을 덮어쓰지 않음
  const [fromLink, setFromLink] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)

  // 복원: 공유 링크(c) 또는 localStorage → URL(scale/target/rem) 순으로 덮어씀
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlScale = params.get('scale')
    let nextScale: GpaScale = urlScale === '4.3' ? '4.3' : '4.5'
    const shared = params.get('c')
    if (shared) {
      setSemesters(decodeSemesters(shared, nextScale).map(courses => ({
        id: uid(), isExpanded: true,
        courses: courses.length ? courses.map(c => ({ ...c, id: uid() })) : [emptyCourse()],
      })))
      setIsSample(false)
      setFromLink(true)
    } else try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved && Array.isArray(saved.semesters) && saved.semesters.length) {
        if (!urlScale && saved.scale === '4.3') nextScale = '4.3'
        setSemesters(saved.semesters.map((s: Semester) => ({
          ...s,
          isExpanded: s.isExpanded !== false,
          courses: (s.courses || []).map(c => ({ ...c, credits: Number(c.credits) || 0, grade: normalizeGrade(c.grade || '', nextScale) })),
        })))
        setIsSample(false)
        if (saved.targetGpa) setTargetGpa(String(saved.targetGpa))
        if (saved.remainingCredits) setRemainingCredits(String(saved.remainingCredits))
      }
    } catch { /* 저장소 차단/손상 → 예시 데이터 유지 */ }
    if (params.get('target')) setTargetGpa(params.get('target') as string)
    if (params.get('rem')) setRemainingCredits(params.get('rem') as string)
    setScale(nextScale)
    setLoaded(true)
  }, [])

  // 저장 + URL 동기화 (예시 데이터·공유받은 성적은 저장하지 않음)
  useEffect(() => {
    if (!loaded) return
    if (!isSample && !fromLink) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ scale, semesters, targetGpa, remainingCredits }))
      } catch { /* quota/차단 무시 */ }
    }
    const url = new URL(window.location.href)
    url.searchParams.set('scale', scale)
    if (targetGpa) url.searchParams.set('target', targetGpa)
    else url.searchParams.delete('target')
    if (remainingCredits) url.searchParams.set('rem', remainingCredits)
    else url.searchParams.delete('rem')
    // 공유받은 성적은 저장 대신 주소에 유지 (새로고침해도 그대로)
    if (fromLink) url.searchParams.set('c', encodeSemesters(semesters))
    window.history.replaceState(window.history.state, '', url)
  }, [loaded, isSample, fromLink, scale, semesters, targetGpa, remainingCredits])

  // Enter로 추가한 새 줄에 포커스
  useEffect(() => {
    if (!focusId) return
    document.getElementById(`gpa-course-${focusId}`)?.focus()
    setFocusId(null)
  }, [focusId, semesters])

  const gradeValues = GRADE_VALUES[scale]
  const gradeOptions = Object.keys(gradeValues)
  const maxScale = scale === '4.5' ? 4.5 : 4.3

  const excluded = useMemo(() => supersededIds(semesters), [semesters])
  const cumulative = useMemo(
    () => computeStats(semesters.flatMap(s => s.courses), scale, excluded),
    [semesters, scale, excluded]
  )
  const semesterStats = useMemo(
    // 학기 평점은 학교 성적표처럼 그 학기 성적 그대로 (재수강 대체는 누적에만 반영)
    () => semesters.map(s => computeStats(s.courses, scale)),
    [semesters, scale]
  )

  const reverseResult = useMemo(() => {
    const required = requiredAverage(cumulative.gpa, cumulative.gpaCredits, parseFloat(targetGpa), parseFloat(remainingCredits))
    if (required === null || !targetGpa) return null
    return {
      required,
      alreadyAchieved: required <= 0,
      feasible: required <= maxScale,
      minGrade: minGradeFor(required, scale),
    }
  }, [targetGpa, remainingCredits, cumulative, maxScale, scale])

  const edit = useCallback((fn: (prev: Semester[]) => Semester[]) => {
    setIsSample(false)
    setSemesters(fn)
  }, [])

  const changeScale = useCallback((next: GpaScale) => {
    setScale(next)
    // 4.3 → 4.5 전환 시 A- 같은 등급이 F로 계산되던 문제 방지: 새 만점제 등급으로 변환
    setSemesters(prev => prev.map(s => ({ ...s, courses: s.courses.map(c => ({ ...c, grade: normalizeGrade(c.grade, next) })) })))
  }, [])

  const addSemester = useCallback(() => {
    edit(prev => [...prev, { id: uid(), isExpanded: true, courses: [emptyCourse()] }])
  }, [edit])

  const removeSemester = useCallback((semesterId: string) => {
    edit(prev => prev.filter(s => s.id !== semesterId))
  }, [edit])

  const toggleSemester = useCallback((semesterId: string) => {
    setSemesters(prev => prev.map(s => (s.id === semesterId ? { ...s, isExpanded: !s.isExpanded } : s)))
  }, [])

  const addCourse = useCallback((semesterId: string, afterId?: string) => {
    const course = emptyCourse()
    edit(prev => prev.map(s => {
      if (s.id !== semesterId) return s
      const idx = afterId ? s.courses.findIndex(c => c.id === afterId) : -1
      const courses = [...s.courses]
      courses.splice(idx >= 0 ? idx + 1 : courses.length, 0, course)
      return { ...s, courses }
    }))
    setFocusId(course.id)
  }, [edit])

  const removeCourse = useCallback((semesterId: string, courseId: string) => {
    edit(prev => prev.map(s => (s.id === semesterId ? { ...s, courses: s.courses.filter(c => c.id !== courseId) } : s)))
  }, [edit])

  const updateCourse = useCallback((semesterId: string, courseId: string, patch: Partial<Course>) => {
    edit(prev => prev.map(s => (
      s.id === semesterId ? { ...s, courses: s.courses.map(c => (c.id === courseId ? { ...c, ...patch } : c)) } : s
    )))
  }, [edit])

  const importPasted = useCallback(() => {
    const parsed = parseCourses(pasteText, scale)
    if (!parsed.length) {
      setPasteMsg(t('paste.none'))
      return
    }
    const newSemester: Semester = { id: uid(), isExpanded: true, courses: parsed.map(c => ({ ...c, id: uid() })) }
    // 예시 데이터 상태에서 붙여넣으면 예시는 버리고 새로 시작
    setSemesters(prev => (isSample ? [newSemester] : [...prev.filter(s => s.courses.some(c => c.name || c.grade)), newSemester]))
    setIsSample(false)
    setPasteText('')
    setPasteMsg(t('paste.result', { count: parsed.length }))
  }, [pasteText, scale, isSample, t])

  const reset = useCallback(() => {
    setSemesters([{ id: uid(), isExpanded: true, courses: [emptyCourse()] }])
    setIsSample(false)
    setTargetGpa('')
    setRemainingCredits('')
    setPasteMsg('')
  }, [])

  // 공유 링크: 과목 목록은 주소창 대신 공유할 때만 담음 (window 미사용 → 첫 렌더 결정적)
  const shareUrl = useMemo(() => {
    const q = new URLSearchParams({ scale })
    if (targetGpa) q.set('target', targetGpa)
    if (remainingCredits) q.set('rem', remainingCredits)
    q.set('c', encodeSemesters(semesters))
    return `https://toolhub.ai.kr/gpa-calculator/?${q}`
  }, [scale, targetGpa, remainingCredits, semesters])

  const segBtn = (active: boolean) =>
    `flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-soft hover:bg-subtle text-body'}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Scale */}
          <div className="ui-card p-6">
            <MobileResultLink href="#gpa-calculator-result" className="mb-4" label={t('result.cumulativeGpa')} value={`${fmt(cumulative.gpa)} / ${maxScale}`} />
            <h2 className="text-lg font-semibold text-fg mb-4">{t('scale')}</h2>
            <div className="flex gap-2">
              <button onClick={() => changeScale('4.5')} className={segBtn(scale === '4.5')}>{t('scale45')}</button>
              <button onClick={() => changeScale('4.3')} className={segBtn(scale === '4.3')}>{t('scale43')}</button>
            </div>
            <button onClick={reset} className="w-full mt-3 ui-btn-soft px-4 py-2 font-medium">
              {t('reset')}
            </button>
            <p className="text-xs text-muted mt-3">{t('savedNotice')}</p>
            <NextLink href="/gpa-converter/" className="block text-sm text-primary mt-2 hover:underline">
              {t('converterLink')}
            </NextLink>
          </div>

          {/* Target GPA */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">{t('reverse.title')}</h2>
            <p className="text-xs text-muted mb-4">{t('reverse.description')}</p>
            <div className="space-y-3">
              <div>
                <div className="block text-sm font-medium text-body mb-1">{t('reverse.currentGpa')}</div>
                <div className="w-full px-3 py-2 rounded-xl bg-subtle text-body text-sm tabular-nums">
                  {fmt(cumulative.gpa)} ({cumulative.gpaCredits} {t('credits')})
                </div>
              </div>
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1">{t('reverse.targetGpa')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetGpa}
                  onChange={e => setTargetGpa(e.target.value)}
                  placeholder={`0.00 ~ ${maxScale}`}
                  min={0}
                  max={maxScale}
                  step={0.01}
                  className="w-full px-3 py-2 ui-field text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-body mb-1">{t('reverse.remainingCredits')}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={remainingCredits}
                  onChange={e => setRemainingCredits(e.target.value)}
                  placeholder="30"
                  min={1}
                  className="w-full px-3 py-2 ui-field text-sm"
                />
                <span className="block text-xs text-muted mt-1">{t('reverse.remainingHint')}</span>
              </label>

              {reverseResult && (
                <div className={`rounded-xl p-4 text-sm ${
                  !reverseResult.alreadyAchieved && !reverseResult.feasible
                    ? 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                    : 'bg-subtle text-fg'
                }`}>
                  {reverseResult.alreadyAchieved ? (
                    <p>{t('reverse.alreadyAchieved')}</p>
                  ) : (
                    <>
                      <p className="font-semibold mb-1">{t('reverse.requiredGpa')}</p>
                      <p className="text-2xl font-bold tabular-nums">{fmt(reverseResult.required)}</p>
                      {reverseResult.feasible ? (
                        <p className="mt-1 text-xs text-sub">
                          {reverseResult.minGrade ? t('reverse.minGrade', { grade: reverseResult.minGrade }) : t('reverse.feasible')}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs">{t('reverse.impossible', { max: maxScale })}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Paste import */}
          <div className="ui-card p-6">
            <h2 className="text-lg font-semibold text-fg mb-1">{t('paste.title')}</h2>
            <p className="text-xs text-muted mb-3">{t('paste.description')}</p>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteMsg('') }}
              rows={5}
              placeholder={t('paste.placeholder')}
              className="w-full px-3 py-2 ui-field text-sm font-mono"
            />
            <button
              onClick={importPasted}
              disabled={!pasteText.trim()}
              className="w-full mt-2 ui-btn px-4 py-2.5 font-medium"
            >
              {t('paste.add')}
            </button>
            {pasteMsg && <p className="text-xs text-sub mt-2" role="status">{pasteMsg}</p>}
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cumulative Results */}
          <div id="gpa-calculator-result" className="ui-card p-6 scroll-mt-20">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-fg">{t('result.cumulativeGpa')}</h2>
              {isSample && <span className="text-xs text-muted">{t('sampleNotice')}</span>}
              {fromLink && <span className="text-xs text-muted">{t('sharedNotice')}</span>}
            </div>
            <div className="flex items-baseline gap-2 mb-5" aria-live="polite" aria-atomic="true">
              <span className="text-4xl font-bold text-fg tabular-nums">{fmt(cumulative.gpa)}</span>
              <span className="text-muted">/ {maxScale}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                [t('majorGpa'), cumulative.majorCredits ? fmt(cumulative.majorGpa) : '-'],
                [t('earnedCredits'), cumulative.earnedCredits],
                [t('gpaCredits'), cumulative.gpaCredits],
                [t('result.totalCourses'), cumulative.courses],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-subtle rounded-xl p-3">
                  <div className="text-xs text-muted mb-1">{label}</div>
                  <div className="text-xl font-bold text-fg tabular-nums">{value}</div>
                </div>
              ))}
            </div>
            {semesters.length > 1 && (
              <table className="w-full mt-5 text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-line">
                    <th className="py-2 font-medium">{t('semester')}</th>
                    <th className="py-2 font-medium text-right">{t('result.semesterGpa')}</th>
                    <th className="py-2 font-medium text-right">{t('majorGpa')}</th>
                    <th className="py-2 font-medium text-right">{t('earnedCredits')}</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterStats.map((st, i) => (
                    <tr key={semesters[i].id} className="border-b border-line last:border-0 text-body tabular-nums">
                      <td className="py-2">{i + 1}{t('semester')}</td>
                      <td className="py-2 text-right font-semibold text-fg">{st.gpaCredits ? fmt(st.gpa) : '-'}</td>
                      <td className="py-2 text-right">{st.majorCredits ? fmt(st.majorGpa) : '-'}</td>
                      <td className="py-2 text-right">{st.earnedCredits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <ShareResult
              className="mt-5"
              url={shareUrl}
              card={{
                tool: t('title'),
                label: t('share.label', { max: maxScale }),
                headline: `${fmt(cumulative.gpa)} / ${maxScale}`,
                sub: t('share.sub', { credits: cumulative.earnedCredits, courses: cumulative.courses }),
                rows: [
                  ...(cumulative.majorCredits ? [{ label: t('majorGpa'), value: fmt(cumulative.majorGpa) }] : []),
                  ...semesterStats.map((st, i) => ({ label: `${i + 1}${t('semester')}`, value: st.gpaCredits ? fmt(st.gpa) : '-' })),
                ].slice(0, 5),
              }}
              text={t('share.text', { gpa: fmt(cumulative.gpa), max: maxScale })}
              fileName="gpa"
            />
          </div>

          {/* Semesters */}
          <div className="space-y-4">
            <p className="text-xs text-muted">{t('enterHint')}</p>
            {semesters.map((semester, semesterIdx) => {
              const st = semesterStats[semesterIdx]
              return (
                <div key={semester.id} className="ui-card overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-subtle">
                    <button
                      type="button"
                      onClick={() => toggleSemester(semester.id)}
                      aria-expanded={semester.isExpanded}
                      className="flex items-center gap-3 min-w-0 text-left"
                    >
                      {semester.isExpanded ? <ChevronUp className="w-5 h-5 text-sub shrink-0" /> : <ChevronDown className="w-5 h-5 text-sub shrink-0" />}
                      <span className="font-semibold text-fg">{semesterIdx + 1}{t('semester')}</span>
                      <span className="text-sm text-muted truncate">
                        {t('result.semesterGpa')} <span className="font-semibold text-fg tabular-nums">{fmt(st.gpa)}</span>
                        {' '}({st.earnedCredits} {t('credits')})
                      </span>
                    </button>
                    {semesters.length > 1 && (
                      <button
                        onClick={() => removeSemester(semester.id)}
                        aria-label={t('removeSemester')}
                        title={t('removeSemester')}
                        className="text-muted hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {semester.isExpanded && (
                    <div className="p-4 sm:p-6 space-y-3">
                      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-muted">
                        <div className="col-span-4">{t('courseName')}</div>
                        <div className="col-span-2">{t('credits')}</div>
                        <div className="col-span-2">{t('grade')}</div>
                        <div className="col-span-3">{t('major')} / {t('retake')}</div>
                        <div className="col-span-1" />
                      </div>

                      {semester.courses.map(course => {
                        const isOld = excluded.has(course.id)
                        return (
                          <div key={course.id} className={`grid grid-cols-12 gap-2 items-center ${isOld ? 'opacity-50' : ''}`}>
                            <div className="col-span-12 sm:col-span-4">
                              <input
                                id={`gpa-course-${course.id}`}
                                type="text"
                                value={course.name}
                                onChange={e => updateCourse(semester.id, course.id, { name: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                    e.preventDefault()
                                    addCourse(semester.id, course.id)
                                  }
                                }}
                                placeholder={t('coursePlaceholder')}
                                aria-label={t('courseName')}
                                className={`w-full px-3 py-2 ui-field text-sm ${isOld ? 'line-through' : ''}`}
                              />
                            </div>
                            <div className="col-span-3 sm:col-span-2">
                              <select
                                value={course.credits}
                                onChange={e => updateCourse(semester.id, course.id, { credits: Number(e.target.value) })}
                                aria-label={t('credits')}
                                className="w-full px-2 py-2 ui-field text-sm"
                              >
                                {(CREDIT_OPTIONS.includes(course.credits) ? CREDIT_OPTIONS : [...CREDIT_OPTIONS, course.credits]).map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                              <select
                                value={course.grade}
                                onChange={e => updateCourse(semester.id, course.id, { grade: e.target.value })}
                                aria-label={t('grade')}
                                className="w-full px-2 py-2 ui-field text-sm"
                              >
                                <option value="">{t('selectGrade')}</option>
                                {gradeOptions.map(g => (
                                  <option key={g} value={g}>{g} ({gradeValues[g].toFixed(1)})</option>
                                ))}
                                <option value="P">P</option>
                                <option value="NP">NP</option>
                              </select>
                            </div>
                            <div className="col-span-4 sm:col-span-3 flex items-center gap-3 text-xs text-body">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!course.major}
                                  onChange={e => updateCourse(semester.id, course.id, { major: e.target.checked })}
                                  className="accent-blue-600"
                                />
                                {t('major')}
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer" title={t('retakeHint')}>
                                <input
                                  type="checkbox"
                                  checked={!!course.retake}
                                  onChange={e => updateCourse(semester.id, course.id, { retake: e.target.checked })}
                                  className="accent-blue-600"
                                />
                                {t('retake')}
                              </label>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              {semester.courses.length > 1 && (
                                <button
                                  onClick={() => removeCourse(semester.id, course.id)}
                                  aria-label={t('remove')}
                                  title={t('remove')}
                                  className="text-muted hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {isOld && <p className="col-span-12 text-xs text-muted -mt-1">{t('superseded')}</p>}
                          </div>
                        )
                      })}

                      <button
                        onClick={() => addCourse(semester.id)}
                        className="w-full ui-btn-soft px-4 py-2 font-medium"
                      >
                        {t('addCourse')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <button onClick={addSemester} className="w-full ui-btn px-4 py-3 font-medium">
              {t('addSemester')}
            </button>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="ui-card p-6">
        <h2 className="text-xl font-semibold text-fg mb-6">{t('guide.title')}</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.howToUse.title')}</h3>
            <ul className="space-y-2 text-body list-disc list-inside">
              {(t.raw('guide.howToUse.items') as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('scaleTable')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(['4.5', '4.3'] as GpaScale[]).map(sc => (
                <div key={sc} className="bg-subtle rounded-xl p-4">
                  <h4 className="font-semibold text-fg mb-2">{sc === '4.5' ? t('scale45') : t('scale43')}</h4>
                  <div className="text-sm text-body space-y-1">
                    {Object.entries(GRADE_VALUES[sc]).map(([grade, value]) => (
                      <div key={grade} className="flex justify-between tabular-nums">
                        <span>{grade}</span>
                        <span className="font-semibold">{value.toFixed(1)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-muted pt-1 border-t border-line">
                      <span>P / NP</span>
                      <span>{t('passExcluded')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-fg mb-3">{t('guide.tips.title')}</h3>
            <ul className="space-y-2 text-body list-disc list-inside">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
