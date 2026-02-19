'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { GraduationCap, Plus, Trash2, BookOpen, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface Course {
  id: string
  name: string
  credits: number
  grade: string
}

interface Semester {
  id: string
  courses: Course[]
  isExpanded: boolean
}

type GpaScale = '4.5' | '4.3'

const GRADE_VALUES_45: Record<string, number> = {
  'A+': 4.5,
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D+': 1.5,
  'D': 1.0,
  'F': 0.0,
}

const GRADE_VALUES_43: Record<string, number> = {
  'A+': 4.3,
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D': 1.0,
  'D-': 0.7,
  'F': 0.0,
}

export default function GpaCalculator() {
  const t = useTranslations('gpaCalculator')

  const [scale, setScale] = useState<GpaScale>('4.5')
  const [semesters, setSemesters] = useState<Semester[]>([
    {
      id: '1',
      courses: [{ id: '1', name: '', credits: 3, grade: '' }],
      isExpanded: true,
    },
  ])

  const gradeValues = scale === '4.5' ? GRADE_VALUES_45 : GRADE_VALUES_43
  const gradeOptions = Object.keys(gradeValues)

  const calculateSemesterGPA = useCallback((courses: Course[]) => {
    const validCourses = courses.filter(c => c.grade && c.credits > 0)
    if (validCourses.length === 0) return { gpa: 0, credits: 0 }

    const totalPoints = validCourses.reduce((sum, course) => {
      return sum + (gradeValues[course.grade] || 0) * course.credits
    }, 0)
    const totalCredits = validCourses.reduce((sum, course) => sum + course.credits, 0)

    return {
      gpa: totalCredits > 0 ? totalPoints / totalCredits : 0,
      credits: totalCredits,
    }
  }, [gradeValues])

  const cumulativeStats = useMemo(() => {
    let totalPoints = 0
    let totalCredits = 0
    let totalCourses = 0

    semesters.forEach(semester => {
      semester.courses.forEach(course => {
        if (course.grade && course.credits > 0) {
          totalPoints += (gradeValues[course.grade] || 0) * course.credits
          totalCredits += course.credits
          totalCourses++
        }
      })
    })

    return {
      gpa: totalCredits > 0 ? totalPoints / totalCredits : 0,
      credits: totalCredits,
      courses: totalCourses,
    }
  }, [semesters, gradeValues])

  const addSemester = useCallback(() => {
    const newId = String(Date.now())
    setSemesters(prev => [
      ...prev,
      {
        id: newId,
        courses: [{ id: `${newId}-1`, name: '', credits: 3, grade: '' }],
        isExpanded: true,
      },
    ])
  }, [])

  const removeSemester = useCallback((semesterId: string) => {
    setSemesters(prev => prev.filter(s => s.id !== semesterId))
  }, [])

  const toggleSemester = useCallback((semesterId: string) => {
    setSemesters(prev =>
      prev.map(s =>
        s.id === semesterId ? { ...s, isExpanded: !s.isExpanded } : s
      )
    )
  }, [])

  const addCourse = useCallback((semesterId: string) => {
    setSemesters(prev =>
      prev.map(s =>
        s.id === semesterId
          ? {
              ...s,
              courses: [
                ...s.courses,
                {
                  id: `${semesterId}-${Date.now()}`,
                  name: '',
                  credits: 3,
                  grade: '',
                },
              ],
            }
          : s
      )
    )
  }, [])

  const removeCourse = useCallback((semesterId: string, courseId: string) => {
    setSemesters(prev =>
      prev.map(s =>
        s.id === semesterId
          ? { ...s, courses: s.courses.filter(c => c.id !== courseId) }
          : s
      )
    )
  }, [])

  const updateCourse = useCallback(
    (semesterId: string, courseId: string, field: keyof Course, value: string | number) => {
      setSemesters(prev =>
        prev.map(s =>
          s.id === semesterId
            ? {
                ...s,
                courses: s.courses.map(c =>
                  c.id === courseId ? { ...c, [field]: value } : c
                ),
              }
            : s
        )
      )
    },
    []
  )

  const reset = useCallback(() => {
    setSemesters([
      {
        id: '1',
        courses: [{ id: '1', name: '', credits: 3, grade: '' }],
        isExpanded: true,
      },
    ])
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="w-7 h-7" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Panel: Settings & Guide */}
        <div className="lg:col-span-1 space-y-6">
          {/* Scale Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('scale')}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setScale('4.5')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  scale === '4.5'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('scale45')}
              </button>
              <button
                onClick={() => setScale('4.3')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  scale === '4.3'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('scale43')}
              </button>
            </div>
            <button
              onClick={reset}
              className="w-full mt-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reset')}
            </button>
          </div>

          {/* Quick Guide */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              {(t.raw('guide.howToUse.items') as string[]).map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Panel: Semesters & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cumulative Results */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">{t('result.cumulativeGpa')}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-sm opacity-90 mb-1">{t('result.cumulativeGpa')}</div>
                <div className="text-3xl font-bold">
                  {cumulativeStats.gpa.toFixed(2)}
                </div>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-sm opacity-90 mb-1">{t('result.totalCredits')}</div>
                <div className="text-3xl font-bold">{cumulativeStats.credits}</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-sm opacity-90 mb-1">{t('result.totalCourses')}</div>
                <div className="text-3xl font-bold">{cumulativeStats.courses}</div>
              </div>
            </div>
          </div>

          {/* Semesters */}
          <div className="space-y-4">
            {semesters.map((semester, semesterIdx) => {
              const semesterStats = calculateSemesterGPA(semester.courses)
              return (
                <div key={semester.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  {/* Semester Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
                    onClick={() => toggleSemester(semester.id)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-gray-600 dark:text-gray-400">
                        {semester.isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {semesterIdx + 1}{t('semester')}
                      </h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('result.semesterGpa')}: <span className="font-semibold text-blue-600 dark:text-blue-400">{semesterStats.gpa.toFixed(2)}</span>
                        {' '}({semesterStats.credits} {t('credits')})
                      </div>
                    </div>
                    {semesters.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSemester(semester.id)
                        }}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Semester Body */}
                  {semester.isExpanded && (
                    <div className="p-6 space-y-4">
                      {/* Course Headers */}
                      <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        <div className="col-span-5">{t('courseName')}</div>
                        <div className="col-span-3">{t('credits')}</div>
                        <div className="col-span-3">{t('grade')}</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Courses */}
                      {semester.courses.map((course) => (
                        <div key={course.id} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={course.name}
                              onChange={(e) =>
                                updateCourse(semester.id, course.id, 'name', e.target.value)
                              }
                              placeholder="예: 자료구조론"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="col-span-3">
                            <select
                              value={course.credits}
                              onChange={(e) =>
                                updateCourse(semester.id, course.id, 'credits', Number(e.target.value))
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                            </select>
                          </div>
                          <div className="col-span-3">
                            <select
                              value={course.grade}
                              onChange={(e) =>
                                updateCourse(semester.id, course.id, 'grade', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">성적 선택</option>
                              {gradeOptions.map(grade => (
                                <option key={grade} value={grade}>
                                  {grade} ({gradeValues[grade].toFixed(1)})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            {semester.courses.length > 1 && (
                              <button
                                onClick={() => removeCourse(semester.id, course.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add Course Button */}
                      <button
                        onClick={() => addCourse(semester.id)}
                        className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {t('addCourse')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Semester Button */}
            <button
              onClick={addSemester}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('addSemester')}
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          {/* How to Use */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.howToUse.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Scale Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              학점 기준표
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('scale45')}
                </h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {Object.entries(GRADE_VALUES_45).map(([grade, value]) => (
                    <div key={grade} className="flex justify-between">
                      <span>{grade}</span>
                      <span className="font-semibold">{value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {t('scale43')}
                </h4>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {Object.entries(GRADE_VALUES_43).map(([grade, value]) => (
                    <div key={grade} className="flex justify-between">
                      <span>{grade}</span>
                      <span className="font-semibold">{value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
