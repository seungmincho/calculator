'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Users, DollarSign, Plus, Minus, BookOpen } from 'lucide-react'

type Participant = {
  id: string
  name: string
  paid: number
  consumed: number
}

type Transfer = {
  from: string
  to: string
  amount: number
}

export default function DutchPay() {
  const t = useTranslations('dutchPay')
  const [mode, setMode] = useState<'equal' | 'custom'>('equal')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Equal split state
  const [totalAmount, setTotalAmount] = useState('')
  const [numberOfPeople, setNumberOfPeople] = useState('')

  // Custom split state
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '', paid: 0, consumed: 0 },
    { id: '2', name: '', paid: 0, consumed: 0 },
  ])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-999999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString('ko-KR')
  }

  const perPersonAmount = useMemo(() => {
    const total = parseFloat(totalAmount) || 0
    const people = parseInt(numberOfPeople) || 0
    if (people <= 0) return 0
    return total / people
  }, [totalAmount, numberOfPeople])

  const calculateTransfers = useMemo((): Transfer[] => {
    const totalPaid = participants.reduce((sum, p) => sum + p.paid, 0)
    const totalConsumed = participants.reduce((sum, p) => sum + p.consumed, 0)

    if (totalConsumed === 0) return []

    // Calculate balance for each participant
    const balances = participants.map(p => ({
      name: p.name || `${t('name')} ${p.id}`,
      balance: p.paid - p.consumed,
    }))

    // Separate debtors and creditors
    const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b, balance: -b.balance }))
    const creditors = balances.filter(b => b.balance > 0)

    const transfers: Transfer[] = []
    let i = 0
    let j = 0

    // Greedy algorithm to minimize number of transfers
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]

      const amount = Math.min(debtor.balance, creditor.balance)

      if (amount > 0.01) {
        transfers.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amount),
        })
      }

      debtor.balance -= amount
      creditor.balance -= amount

      if (debtor.balance < 0.01) i++
      if (creditor.balance < 0.01) j++
    }

    return transfers
  }, [participants, t])

  const addParticipant = () => {
    const newId = (Math.max(...participants.map(p => parseInt(p.id))) + 1).toString()
    setParticipants([...participants, { id: newId, name: '', paid: 0, consumed: 0 }])
  }

  const removeParticipant = (id: string) => {
    if (participants.length > 2) {
      setParticipants(participants.filter(p => p.id !== id))
    }
  }

  const updateParticipant = (id: string, field: 'name' | 'paid' | 'consumed', value: string | number) => {
    setParticipants(participants.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const reset = () => {
    setTotalAmount('')
    setNumberOfPeople('')
    setParticipants([
      { id: '1', name: '', paid: 0, consumed: 0 },
      { id: '2', name: '', paid: 0, consumed: 0 },
    ])
  }

  const getResultText = () => {
    if (mode === 'equal') {
      return `${t('perPerson')}: ${formatNumber(perPersonAmount)}${t('won')}`
    } else {
      if (calculateTransfers.length === 0) {
        return t('noTransfers')
      }
      return calculateTransfers
        .map(tr => `${tr.from} → ${tr.to}: ${formatNumber(tr.amount)}${t('won')}`)
        .join('\n')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('equal')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'equal'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Users className="inline-block w-5 h-5 mr-2" />
          {t('equalSplit')}
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
            mode === 'custom'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          <DollarSign className="inline-block w-5 h-5 mr-2" />
          {t('customSplit')}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {mode === 'equal' ? (
              <>
                {/* Equal Split Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('totalAmount')}
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('numberOfPeople')}
                  </label>
                  <input
                    type="number"
                    value={numberOfPeople}
                    onChange={(e) => setNumberOfPeople(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Custom Split Input */}
                <div className="space-y-4">
                  {participants.map((participant, index) => (
                    <div key={participant.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('name')} {index + 1}
                        </span>
                        {participants.length > 2 && (
                          <button
                            onClick={() => removeParticipant(participant.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => updateParticipant(participant.id, 'name', e.target.value)}
                        placeholder={t('name')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {t('paid')}
                          </label>
                          <input
                            type="number"
                            value={participant.paid || ''}
                            onChange={(e) => updateParticipant(participant.id, 'paid', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {t('consumed')}
                          </label>
                          <input
                            type="number"
                            value={participant.consumed || ''}
                            onChange={(e) => updateParticipant(participant.id, 'consumed', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addParticipant}
                    className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addPerson')}
                  </button>
                </div>
              </>
            )}

            <button
              onClick={reset}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 font-medium"
            >
              {t('reset')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('result')}
              </h2>
              <button
                onClick={() => copyToClipboard(getResultText(), 'result')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
              >
                {copiedId === 'result' ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('copy')}
                  </>
                )}
              </button>
            </div>

            {mode === 'equal' ? (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-8 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('perPerson')}
                </div>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(perPersonAmount)}{t('won')}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {calculateTransfers.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-center">
                    <div className="text-gray-600 dark:text-gray-400">
                      {t('noTransfers')}
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      {t('transfers')}
                    </h3>
                    {calculateTransfers.map((transfer, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {transfer.from}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {transfer.to}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber(transfer.amount)}{t('won')}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
          {t('guide.title')}
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.howToUse.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
