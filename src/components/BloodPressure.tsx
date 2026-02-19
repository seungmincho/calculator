'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Heart, Trash2, BookOpen, Activity } from 'lucide-react'

interface BloodPressureRecord {
  id: string
  date: string
  systolic: number
  diastolic: number
  pulse: number
  memo: string
  classification: string
}

type Classification = 'normal' | 'elevated' | 'high1' | 'high2' | 'crisis'

export default function BloodPressure() {
  const t = useTranslations('bloodPressure')
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [memo, setMemo] = useState('')
  const [records, setRecords] = useState<BloodPressureRecord[]>([])

  // Load records from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bloodPressureRecords')
      if (stored) {
        setRecords(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load blood pressure records:', error)
    }
  }, [])

  // Classify blood pressure
  const classifyBloodPressure = useCallback((sys: number, dia: number): Classification => {
    if (sys > 180 || dia > 120) return 'crisis'
    if (sys >= 140 || dia >= 90) return 'high2'
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'high1'
    if (sys >= 120 && sys <= 129 && dia < 80) return 'elevated'
    return 'normal'
  }, [])

  // Get classification color
  const getClassificationColor = useCallback((classification: Classification) => {
    switch (classification) {
      case 'normal': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
      case 'elevated': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950'
      case 'high1': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
      case 'high2': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
      case 'crisis': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950'
    }
  }, [])

  // Record blood pressure
  const handleRecord = useCallback(() => {
    const sysValue = parseFloat(systolic)
    const diaValue = parseFloat(diastolic)
    const pulseValue = parseFloat(pulse)

    if (!systolic || !diastolic || isNaN(sysValue) || isNaN(diaValue)) {
      alert('수축기 혈압과 이완기 혈압을 입력해주세요.')
      return
    }

    if (sysValue <= 0 || diaValue <= 0 || sysValue > 300 || diaValue > 200) {
      alert('올바른 혈압 값을 입력해주세요.')
      return
    }

    if (pulse && (isNaN(pulseValue) || pulseValue <= 0 || pulseValue > 300)) {
      alert('올바른 맥박 값을 입력해주세요.')
      return
    }

    const classification = classifyBloodPressure(sysValue, diaValue)
    const newRecord: BloodPressureRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      systolic: sysValue,
      diastolic: diaValue,
      pulse: pulseValue || 0,
      memo: memo.trim(),
      classification
    }

    const updatedRecords = [newRecord, ...records]
    setRecords(updatedRecords)
    localStorage.setItem('bloodPressureRecords', JSON.stringify(updatedRecords))

    // Reset form
    setSystolic('')
    setDiastolic('')
    setPulse('')
    setMemo('')
  }, [systolic, diastolic, pulse, memo, records, classifyBloodPressure])

  // Reset form
  const handleReset = useCallback(() => {
    setSystolic('')
    setDiastolic('')
    setPulse('')
    setMemo('')
  }, [])

  // Delete single record
  const handleDelete = useCallback((id: string) => {
    const updatedRecords = records.filter(r => r.id !== id)
    setRecords(updatedRecords)
    localStorage.setItem('bloodPressureRecords', JSON.stringify(updatedRecords))
  }, [records])

  // Clear all records
  const handleClearAll = useCallback(() => {
    if (confirm('모든 기록을 삭제하시겠습니까?')) {
      setRecords([])
      localStorage.removeItem('bloodPressureRecords')
    }
  }, [])

  // Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="w-7 h-7 text-red-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('record')}
            </h2>

            {/* Systolic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('systolic')}
              </label>
              <input
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder={t('systolicPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Diastolic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('diastolic')}
              </label>
              <input
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder={t('diastolicPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Pulse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('pulse')}
              </label>
              <input
                type="number"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder={t('pulsePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Memo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('memo')}
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={t('memoPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleRecord}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-3 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
              >
                {t('record')}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Classification Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Classification */}
          {systolic && diastolic && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('classification.title')}
              </h2>
              <div className={`rounded-xl p-6 ${getClassificationColor(classifyBloodPressure(parseFloat(systolic), parseFloat(diastolic)))}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">
                    {parseFloat(systolic)} / {parseFloat(diastolic)} mmHg
                  </div>
                  <div className="text-xl font-semibold">
                    {t(`classification.${classifyBloodPressure(parseFloat(systolic), parseFloat(diastolic))}`)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Classification Reference Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('classification.title')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                <span className="font-medium">{t('classification.normal')}</span>
                <span className="text-sm">{t('ranges.normal')}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
                <span className="font-medium">{t('classification.elevated')}</span>
                <span className="text-sm">{t('ranges.elevated')}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                <span className="font-medium">{t('classification.high1')}</span>
                <span className="text-sm">{t('ranges.high1')}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
                <span className="font-medium">{t('classification.high2')}</span>
                <span className="text-sm">{t('ranges.high2')}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                <span className="font-medium">{t('classification.crisis')}</span>
                <span className="text-sm">{t('ranges.crisis')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('history.title')}
          </h2>
          {records.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
            >
              {t('history.clearAll')}
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('history.noRecords')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('history.date')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('history.bp')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('history.pulseLabel')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('history.class')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('memo')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('history.delete')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {formatDate(record.date)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {record.systolic}/{record.diastolic}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {record.pulse > 0 ? `${record.pulse} bpm` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getClassificationColor(record.classification as Classification)}`}>
                        {t(`classification.${record.classification}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {record.memo || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Measurement */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.measurement.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.measurement.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
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
