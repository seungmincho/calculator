'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Terminal, Shield, BookOpen, Zap } from 'lucide-react'

type PermissionSet = {
  read: boolean
  write: boolean
  execute: boolean
}

type Permissions = {
  owner: PermissionSet
  group: PermissionSet
  others: PermissionSet
}

function permSetToOctal(p: PermissionSet): number {
  return (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0)
}

function octalToPermSet(n: number): PermissionSet {
  return {
    read: (n & 4) !== 0,
    write: (n & 2) !== 0,
    execute: (n & 1) !== 0,
  }
}

function permSetToSymbol(p: PermissionSet): string {
  return (p.read ? 'r' : '-') + (p.write ? 'w' : '-') + (p.execute ? 'x' : '-')
}

const DEFAULT_PERMISSIONS: Permissions = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  others: { read: true, write: false, execute: true },
}

const PRESETS: Array<{ label: string; value: string; octal: [number, number, number] }> = [
  { label: '755', value: '755', octal: [7, 5, 5] },
  { label: '644', value: '644', octal: [6, 4, 4] },
  { label: '777', value: '777', octal: [7, 7, 7] },
  { label: '600', value: '600', octal: [6, 0, 0] },
  { label: '400', value: '400', octal: [4, 0, 0] },
  { label: '750', value: '750', octal: [7, 5, 0] },
]

export default function ChmodCalculator() {
  const t = useTranslations('chmodCalculator')
  const [perms, setPerms] = useState<Permissions>(DEFAULT_PERMISSIONS)
  const [filename, setFilename] = useState('filename')
  const [octalInput, setOctalInput] = useState('755')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const getOctalValue = useCallback((p: Permissions): string => {
    return `${permSetToOctal(p.owner)}${permSetToOctal(p.group)}${permSetToOctal(p.others)}`
  }, [])

  const getSymbolic = useCallback((p: Permissions): string => {
    return permSetToSymbol(p.owner) + permSetToSymbol(p.group) + permSetToSymbol(p.others)
  }, [])

  const toSymbolicCmd = useCallback((p: Permissions): string => {
    const parts: string[] = []
    const uPart = permSetToSymbol(p.owner).replace(/-/g, '')
    const gPart = permSetToSymbol(p.group).replace(/-/g, '')
    const oPart = permSetToSymbol(p.others).replace(/-/g, '')
    parts.push(`u=${uPart || ''}`)
    parts.push(`g=${gPart || ''}`)
    parts.push(`o=${oPart || ''}`)
    return `chmod ${parts.join(',')} ${filename}`
  }, [filename])

  const togglePerm = useCallback(
    (entity: keyof Permissions, bit: keyof PermissionSet) => {
      setPerms(prev => {
        const next = {
          ...prev,
          [entity]: { ...prev[entity], [bit]: !prev[entity][bit] },
        }
        setOctalInput(getOctalValue(next))
        return next
      })
    },
    [getOctalValue]
  )

  const applyOctal = useCallback((val: string) => {
    setOctalInput(val)
    if (/^[0-7]{3}$/.test(val)) {
      const digits = val.split('').map(Number)
      setPerms({
        owner: octalToPermSet(digits[0]),
        group: octalToPermSet(digits[1]),
        others: octalToPermSet(digits[2]),
      })
    }
  }, [])

  const applyPreset = useCallback(
    ([o, g, ot]: [number, number, number]) => {
      const next = {
        owner: octalToPermSet(o),
        group: octalToPermSet(g),
        others: octalToPermSet(ot),
      }
      setPerms(next)
      setOctalInput(getOctalValue(next))
    },
    [getOctalValue]
  )

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // fallback silent
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const octal = getOctalValue(perms)
  const symbolic = getSymbolic(perms)
  const chmodCmd = `chmod ${octal} ${filename}`
  const chmodSymCmd = toSymbolicCmd(perms)

  const getPermDescription = useCallback(
    (p: Permissions): string => {
      const describe = (ps: PermissionSet): string => {
        const parts: string[] = []
        if (ps.read) parts.push(t('read'))
        if (ps.write) parts.push(t('write'))
        if (ps.execute) parts.push(t('execute'))
        return parts.length > 0 ? parts.join(', ') : t('noPermission')
      }
      return `${t('owner')}: ${describe(p.owner)} / ${t('group')}: ${describe(p.group)} / ${t('others')}: ${describe(p.others)}`
    },
    [t]
  )

  const entities: Array<{ key: keyof Permissions; label: string }> = [
    { key: 'owner', label: t('owner') },
    { key: 'group', label: t('group') },
    { key: 'others', label: t('others') },
  ]

  const bits: Array<{ key: keyof PermissionSet; label: string; symbol: string }> = [
    { key: 'read', label: t('read'), symbol: 'r' },
    { key: 'write', label: t('write'), symbol: 'w' },
    { key: 'execute', label: t('execute'), symbol: 'x' },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Presets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          {t('presets')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => applyPreset(preset.octal)}
              className={`px-4 py-2 rounded-lg text-sm font-mono font-medium transition-colors ${
                octal === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-600'
              }`}
            >
              <span className="font-bold">{preset.value}</span>
              <span className="ml-2 text-xs opacity-75">{t(`preset_${preset.value}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Permission Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('permGrid')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-3 text-gray-500 dark:text-gray-400 font-medium w-24"></th>
                  {bits.map(bit => (
                    <th key={bit.key} className="text-center pb-3 text-gray-500 dark:text-gray-400 font-medium">
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{bit.symbol}</span>
                      <br />
                      <span className="text-xs">{bit.label}</span>
                    </th>
                  ))}
                  <th className="text-center pb-3 text-gray-500 dark:text-gray-400 font-medium text-xs">{t('octalDigit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {entities.map(entity => (
                  <tr key={entity.key}>
                    <td className="py-3 font-medium text-gray-700 dark:text-gray-200 text-sm">{entity.label}</td>
                    {bits.map(bit => (
                      <td key={bit.key} className="py-3 text-center">
                        <button
                          onClick={() => togglePerm(entity.key, bit.key)}
                          aria-label={`${entity.label} ${bit.label} ${perms[entity.key][bit.key] ? t('on') : t('off')}`}
                          className={`w-9 h-9 rounded-lg border-2 font-mono font-bold transition-all duration-150 text-sm ${
                            perms[entity.key][bit.key]
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-blue-400'
                          }`}
                        >
                          {perms[entity.key][bit.key] ? bit.symbol : '-'}
                        </button>
                      </td>
                    ))}
                    <td className="py-3 text-center">
                      <span className="inline-block w-8 h-8 leading-8 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono font-bold text-center">
                        {permSetToOctal(perms[entity.key])}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Result Panel */}
        <div className="space-y-4">
          {/* Octal Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{t('octal')}</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={octalInput}
                onChange={e => applyOctal(e.target.value)}
                maxLength={3}
                className="w-28 text-center text-4xl font-mono font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 py-2"
                aria-label={t('octalInput')}
              />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('octalHint')}</p>
                {!/^[0-7]{3}$/.test(octalInput) && (
                  <p className="text-xs text-red-500 mt-1">{t('octalError')}</p>
                )}
              </div>
            </div>

            {/* Symbolic string */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('symbolic')}</p>
              <div className="flex gap-0.5 font-mono text-lg font-bold">
                {symbolic.split('').map((ch, i) => (
                  <span
                    key={i}
                    className={`w-7 h-7 flex items-center justify-center rounded text-sm ${
                      ch !== '-'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Permission Description */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('permDescTitle')}</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">{getPermDescription(perms)}</p>
          </div>
        </div>
      </div>

      {/* Filename input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <label className="block text-base font-semibold text-gray-900 dark:text-white mb-3">
          {t('filenameLabel')}
        </label>
        <input
          type="text"
          value={filename}
          onChange={e => setFilename(e.target.value || 'filename')}
          placeholder="filename"
          className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      {/* Commands */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-500" />
          {t('commands')}
        </h2>

        {/* Octal command */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('octalCommand')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto">
              {chmodCmd}
            </code>
            <button
              onClick={() => copyToClipboard(chmodCmd, 'octal')}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors text-sm"
              aria-label={t('copyCommand')}
            >
              {copiedId === 'octal' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{copiedId === 'octal' ? t('copied') : t('copyCommand')}</span>
            </button>
          </div>
        </div>

        {/* Symbolic command */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('symbolicCommand')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 dark:bg-gray-950 text-green-400 rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto">
              {chmodSymCmd}
            </code>
            <button
              onClick={() => copyToClipboard(chmodSymCmd, 'symbolic')}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors text-sm"
              aria-label={t('copyCommand')}
            >
              {copiedId === 'symbolic' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{copiedId === 'symbolic' ? t('copied') : t('copyCommand')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {t('guide.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('guide.basics.title')}</h3>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.basics.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('guide.common.title')}</h3>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.common.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('guide.security.title')}</h3>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.security.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('guide.tips.title')}</h3>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
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
