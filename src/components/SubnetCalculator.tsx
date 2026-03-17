'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Globe, Copy, Check, BookOpen, AlertCircle, Layers, Search, Plus, Trash2 } from 'lucide-react'

// ── IP 유틸리티 함수 ──

function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return -1
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function numToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join('.')
}

function cidrToMask(cidr: number): number {
  if (cidr === 0) return 0
  return (0xffffffff << (32 - cidr)) >>> 0
}

function maskToCidr(mask: number): number {
  let bits = 0
  let m = mask
  while (m & 0x80000000) {
    bits++
    m = (m << 1) >>> 0
  }
  return bits
}

function isValidMask(mask: number): boolean {
  if (mask === 0) return true
  const inv = (~mask) >>> 0
  return ((inv + 1) & inv) === 0
}

function getIpClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A'
  if (firstOctet < 192) return 'B'
  if (firstOctet < 224) return 'C'
  if (firstOctet < 240) return 'D'
  return 'E'
}

function isPrivateIp(num: number): boolean {
  const first = (num >>> 24) & 0xff
  const second = (num >>> 16) & 0xff
  if (first === 10) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 192 && second === 168) return true
  return false
}

function ipToBinary(num: number): string {
  return Array.from({ length: 4 }, (_, i) =>
    ((num >>> (24 - i * 8)) & 0xff).toString(2).padStart(8, '0')
  ).join('.')
}

interface SubnetResult {
  networkAddress: string
  broadcastAddress: string
  firstHost: string
  lastHost: string
  subnetMask: string
  wildcardMask: string
  cidr: number
  totalAddresses: number
  usableHosts: number
  ipClass: string
  isPrivate: boolean
  binaryIp: string
  binaryMask: string
  binaryNetwork: string
  binaryBroadcast: string
}

function calculateSubnet(ipStr: string, cidr: number): SubnetResult | null {
  const ipNum = ipToNum(ipStr)
  if (ipNum < 0 || cidr < 0 || cidr > 32) return null

  const mask = cidrToMask(cidr)
  const network = (ipNum & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const totalAddresses = Math.pow(2, 32 - cidr)
  const usableHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : totalAddresses - 2
  const firstHost = cidr >= 31 ? network : (network + 1) >>> 0
  const lastHost = cidr >= 31 ? broadcast : (broadcast - 1) >>> 0

  return {
    networkAddress: numToIp(network),
    broadcastAddress: numToIp(broadcast),
    firstHost: numToIp(firstHost),
    lastHost: numToIp(lastHost),
    subnetMask: numToIp(mask),
    wildcardMask: numToIp((~mask) >>> 0),
    cidr,
    totalAddresses,
    usableHosts,
    ipClass: getIpClass((ipNum >>> 24) & 0xff),
    isPrivate: isPrivateIp(ipNum),
    binaryIp: ipToBinary(ipNum),
    binaryMask: ipToBinary(mask),
    binaryNetwork: ipToBinary(network),
    binaryBroadcast: ipToBinary(broadcast),
  }
}

// ── CIDR 대역 겹침/소속 유틸리티 ──

interface CidrRange {
  input: string
  ip: string
  cidr: number
  networkNum: number
  broadcastNum: number
  valid: boolean
}

function parseCidr(input: string): CidrRange {
  const trimmed = input.trim()
  const match = trimmed.match(/^([\d.]+)\/(\d{1,2})$/)
  if (!match) return { input: trimmed, ip: '', cidr: -1, networkNum: 0, broadcastNum: 0, valid: false }

  const ip = match[1]
  const cidr = parseInt(match[2], 10)
  const ipNum = ipToNum(ip)
  if (ipNum < 0 || cidr < 0 || cidr > 32) return { input: trimmed, ip, cidr, networkNum: 0, broadcastNum: 0, valid: false }

  const mask = cidrToMask(cidr)
  const networkNum = (ipNum & mask) >>> 0
  const broadcastNum = (networkNum | (~mask >>> 0)) >>> 0

  return { input: trimmed, ip, cidr, networkNum, broadcastNum, valid: true }
}

function checkOverlap(a: CidrRange, b: CidrRange): boolean {
  if (!a.valid || !b.valid) return false
  return a.networkNum <= b.broadcastNum && b.networkNum <= a.broadcastNum
}

function ipBelongsToCidr(ipStr: string, range: CidrRange): boolean {
  if (!range.valid) return false
  const ipNum = ipToNum(ipStr)
  if (ipNum < 0) return false
  return ipNum >= range.networkNum && ipNum <= range.broadcastNum
}

// ── CIDR 참고 테이블 ──
const CIDR_TABLE = Array.from({ length: 33 }, (_, i) => {
  const c = 32 - i
  const mask = c === 0 ? 0 : (0xffffffff << (32 - c)) >>> 0
  const total = Math.pow(2, 32 - c)
  const hosts = c >= 31 ? (c === 32 ? 1 : 2) : total - 2
  return { cidr: c, mask: numToIp(mask), hosts }
})

type TabType = 'calculator' | 'overlap' | 'lookup'

export default function SubnetCalculator() {
  const t = useTranslations('subnetCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showBinary, setShowBinary] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('calculator')

  // ── 계산기 탭 상태 ──
  const [ipInput, setIpInput] = useState('192.168.1.100')
  const [cidrInput, setCidrInput] = useState('24')
  const [maskInput, setMaskInput] = useState('255.255.255.0')
  const [inputMode, setInputMode] = useState<'cidr' | 'mask'>('cidr')

  // ── 대역 겹침 확인 탭 상태 ──
  const [overlapCidrs, setOverlapCidrs] = useState<string[]>(['10.0.0.0/8', '10.0.1.0/24', '172.16.0.0/12', '192.168.0.0/16'])

  // ── IP 소속 확인 탭 상태 ──
  const [lookupCidrs, setLookupCidrs] = useState<string[]>(['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'])
  const [lookupIps, setLookupIps] = useState('10.0.1.5\n172.16.5.100\n192.168.1.1\n8.8.8.8')

  // CIDR / mask 동기화
  const cidr = useMemo(() => {
    if (inputMode === 'cidr') {
      const c = parseInt(cidrInput, 10)
      return isNaN(c) || c < 0 || c > 32 ? -1 : c
    }
    const maskNum = ipToNum(maskInput)
    if (maskNum < 0 || !isValidMask(maskNum)) return -1
    return maskToCidr(maskNum)
  }, [inputMode, cidrInput, maskInput])

  const result = useMemo(() => {
    if (cidr < 0) return null
    return calculateSubnet(ipInput, cidr)
  }, [ipInput, cidr])

  const ipError = useMemo(() => {
    if (!ipInput) return null
    return ipToNum(ipInput) < 0 ? t('invalidIp') : null
  }, [ipInput, t])

  const maskError = useMemo(() => {
    if (inputMode !== 'mask' || !maskInput) return null
    const maskNum = ipToNum(maskInput)
    if (maskNum < 0) return t('invalidMask')
    if (!isValidMask(maskNum)) return t('invalidMask')
    return null
  }, [inputMode, maskInput, t])

  // ── 대역 겹침 분석 ──
  const overlapResults = useMemo(() => {
    const ranges = overlapCidrs.map(parseCidr).filter(r => r.valid)
    const overlaps: { a: number; b: number; rangeA: CidrRange; rangeB: CidrRange }[] = []
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        if (checkOverlap(ranges[i], ranges[j])) {
          overlaps.push({ a: i, b: j, rangeA: ranges[i], rangeB: ranges[j] })
        }
      }
    }
    return { ranges, overlaps }
  }, [overlapCidrs])

  // ── IP 소속 분석 ──
  const lookupResults = useMemo(() => {
    const ranges = lookupCidrs.map(parseCidr).filter(r => r.valid)
    const ips = lookupIps.split('\n').map(s => s.trim()).filter(Boolean)
    return ips.map(ip => {
      const validIp = ipToNum(ip) >= 0
      const matches = validIp ? ranges.filter(r => ipBelongsToCidr(ip, r)) : []
      return { ip, validIp, matches }
    })
  }, [lookupCidrs, lookupIps])

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

  const buildSummary = useCallback(() => {
    if (!result) return ''
    return [
      `[IP Subnet Calculator]`,
      `IP: ${ipInput}/${result.cidr}`,
      `Network: ${result.networkAddress}`,
      `Broadcast: ${result.broadcastAddress}`,
      `Host Range: ${result.firstHost} - ${result.lastHost}`,
      `Subnet Mask: ${result.subnetMask}`,
      `Usable Hosts: ${result.usableHosts.toLocaleString()}`,
      `Class: ${result.ipClass} | ${result.isPrivate ? 'Private' : 'Public'}`,
    ].join('\n')
  }, [result, ipInput])

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'calculator', label: t('tabCalculator'), icon: <Globe className="w-4 h-4" /> },
    { id: 'overlap', label: t('tabOverlap'), icon: <Layers className="w-4 h-4" /> },
    { id: 'lookup', label: t('tabLookup'), icon: <Search className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ 탭 1: 서브넷 계산기 (기존) ═══ */}
      {activeTab === 'calculator' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 입력 패널 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputTitle')}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('ipAddress')}</label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={e => setIpInput(e.target.value.trim())}
                  onPaste={e => {
                    const pasted = e.clipboardData.getData('text').trim()
                    const cidrMatch = pasted.match(/^([\d.]+)\/(\d{1,2})$/)
                    if (cidrMatch) {
                      e.preventDefault()
                      setIpInput(cidrMatch[1])
                      const prefix = parseInt(cidrMatch[2], 10)
                      if (prefix >= 0 && prefix <= 32) {
                        setCidrInput(cidrMatch[2])
                        setInputMode('cidr')
                      }
                    }
                  }}
                  placeholder="192.168.1.100 또는 10.0.0.0/24"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono ${
                    ipError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {ipError && <p className="text-xs text-red-500 mt-1">{ipError}</p>}
              </div>

              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    if (inputMode === 'mask') {
                      const maskNum = ipToNum(maskInput)
                      if (maskNum >= 0 && isValidMask(maskNum)) {
                        setCidrInput(String(maskToCidr(maskNum)))
                      }
                    }
                    setInputMode('cidr')
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'cidr' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  CIDR (/24)
                </button>
                <button
                  onClick={() => {
                    if (inputMode === 'cidr') {
                      const c = parseInt(cidrInput, 10)
                      if (!isNaN(c) && c >= 0 && c <= 32) {
                        setMaskInput(numToIp(cidrToMask(c)))
                      }
                    }
                    setInputMode('mask')
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'mask' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  {t('subnetMask')}
                </button>
              </div>

              {inputMode === 'cidr' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CIDR {t('prefix')}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono">/</span>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={cidrInput}
                      onChange={e => setCidrInput(e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                    <input
                      type="range"
                      min="0"
                      max="32"
                      value={cidrInput}
                      onChange={e => setCidrInput(e.target.value)}
                      className="flex-1 accent-blue-600"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('subnetMask')}</label>
                  <input
                    type="text"
                    value={maskInput}
                    onChange={e => setMaskInput(e.target.value)}
                    placeholder="255.255.255.0"
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono ${
                      maskError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {maskError && <p className="text-xs text-red-500 mt-1">{maskError}</p>}
                </div>
              )}
            </div>

            {/* CIDR 참고표 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('cidrReference')}</h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs" aria-label={t('cidrReference')}>
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">CIDR</th>
                      <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">{t('mask')}</th>
                      <th className="px-2 py-1.5 text-right text-gray-500 dark:text-gray-400">{t('hosts')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {CIDR_TABLE.map(row => (
                      <tr
                        key={row.cidr}
                        onClick={() => {
                          setCidrInput(String(row.cidr))
                          setInputMode('cidr')
                        }}
                        className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors ${cidr === row.cidr ? 'bg-blue-50 dark:bg-blue-950/30 font-semibold' : ''}`}
                      >
                        <td className="px-2 py-1 font-mono text-gray-900 dark:text-white">/{row.cidr}</td>
                        <td className="px-2 py-1 font-mono text-gray-600 dark:text-gray-400">{row.mask}</td>
                        <td className="px-2 py-1 text-right text-gray-900 dark:text-white">{row.hosts.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-2 space-y-4">
            {result ? (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('result')}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBinary(!showBinary)}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        {showBinary ? t('hideBinary') : t('showBinary')}
                      </button>
                      <button
                        onClick={() => copyToClipboard(buildSummary(), 'result')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        {copiedId === 'result' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        {copiedId === 'result' ? t('copied') : t('copy')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('usableHosts')}</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{result.usableHosts.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">CIDR</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-400">/{result.cidr}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('class')}</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{t('classLabel', { cls: result.ipClass })}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">{t('type')}</p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{result.isPrivate ? t('private') : t('public')}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <InfoRow label={t('networkAddress')} value={result.networkAddress} id="net" onCopy={copyToClipboard} copiedId={copiedId} />
                    <InfoRow label={t('broadcastAddress')} value={result.broadcastAddress} id="bcast" onCopy={copyToClipboard} copiedId={copiedId} />
                    <InfoRow label={t('hostRange')} value={`${result.firstHost} - ${result.lastHost}`} id="range" onCopy={copyToClipboard} copiedId={copiedId} />
                    <InfoRow label={t('subnetMask')} value={result.subnetMask} id="mask" onCopy={copyToClipboard} copiedId={copiedId} />
                    <InfoRow label={t('wildcardMask')} value={result.wildcardMask} id="wild" onCopy={copyToClipboard} copiedId={copiedId} />
                    <InfoRow label={t('totalAddresses')} value={result.totalAddresses.toLocaleString()} id="total" onCopy={copyToClipboard} copiedId={copiedId} />
                  </div>
                </div>

                {showBinary && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('binaryRepresentation')}</h3>
                    <div className="space-y-2 font-mono text-xs">
                      <BinaryRow label={t('ipAddress')} binary={result.binaryIp} />
                      <BinaryRow label={t('subnetMask')} binary={result.binaryMask} />
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <BinaryRow label={t('networkAddress')} binary={result.binaryNetwork} />
                      <BinaryRow label={t('broadcastAddress')} binary={result.binaryBroadcast} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{ipError || maskError || t('inputPrompt')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 탭 2: 대역 겹침 확인 ═══ */}
      {activeTab === 'overlap' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 입력 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('overlapTitle')}</h2>
              <button
                onClick={() => setOverlapCidrs(prev => [...prev, ''])}
                className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {t('addCidr')}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('overlapDesc')}</p>

            <div className="space-y-2">
              {overlapCidrs.map((cidrVal, idx) => {
                const parsed = parseCidr(cidrVal)
                const hasError = cidrVal.trim() !== '' && !parsed.valid
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6 text-right shrink-0">#{idx + 1}</span>
                    <input
                      type="text"
                      value={cidrVal}
                      onChange={e => {
                        const next = [...overlapCidrs]
                        next[idx] = e.target.value
                        setOverlapCidrs(next)
                      }}
                      placeholder="10.0.0.0/8"
                      className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono ${
                        hasError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {overlapCidrs.length > 2 && (
                      <button
                        onClick={() => setOverlapCidrs(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 결과 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('overlapResult')}</h2>

            {/* 유효한 대역 목록 */}
            {overlapResults.ranges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('parsedRanges')}</h3>
                <div className="space-y-1">
                  {overlapResults.ranges.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                      <span className="font-mono text-gray-900 dark:text-white">{numToIp(r.networkNum)}/{r.cidr}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {numToIp(r.networkNum)} ~ {numToIp(r.broadcastNum)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 겹침 결과 */}
            {overlapResults.overlaps.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {t('overlapFound', { count: overlapResults.overlaps.length })}
                </h3>
                {overlapResults.overlaps.map((o, i) => (
                  <div key={i} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <span className="text-red-700 dark:text-red-300">{numToIp(o.rangeA.networkNum)}/{o.rangeA.cidr}</span>
                      <span className="text-red-400">↔</span>
                      <span className="text-red-700 dark:text-red-300">{numToIp(o.rangeB.networkNum)}/{o.rangeB.cidr}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : overlapResults.ranges.length >= 2 ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-sm text-green-700 dark:text-green-300">{t('noOverlap')}</p>
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('overlapPrompt')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 탭 3: IP 소속 확인 ═══ */}
      {activeTab === 'lookup' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 입력 */}
          <div className="space-y-4">
            {/* CIDR 대역 목록 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('lookupCidrTitle')}</h2>
                <button
                  onClick={() => setLookupCidrs(prev => [...prev, ''])}
                  className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {t('addCidr')}
                </button>
              </div>
              <div className="space-y-2">
                {lookupCidrs.map((cidrVal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cidrVal}
                      onChange={e => {
                        const next = [...lookupCidrs]
                        next[idx] = e.target.value
                        setLookupCidrs(next)
                      }}
                      placeholder="10.0.0.0/8"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                    {lookupCidrs.length > 1 && (
                      <button
                        onClick={() => setLookupCidrs(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* IP 목록 입력 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('lookupIpTitle')}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('lookupIpDesc')}</p>
              <textarea
                value={lookupIps}
                onChange={e => setLookupIps(e.target.value)}
                placeholder={"10.0.1.5\n172.16.5.100\n192.168.1.1"}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-y"
              />
            </div>
          </div>

          {/* 결과 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('lookupResult')}</h2>
              {lookupResults.length > 0 && (
                <button
                  onClick={() => {
                    const text = lookupResults.map(r =>
                      `${r.ip} → ${r.matches.length > 0 ? r.matches.map(m => `${numToIp(m.networkNum)}/${m.cidr}`).join(', ') : 'N/A'}`
                    ).join('\n')
                    copyToClipboard(text, 'lookup')
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {copiedId === 'lookup' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'lookup' ? t('copied') : t('copy')}
                </button>
              )}
            </div>

            {lookupResults.length > 0 ? (
              <div className="space-y-1">
                {lookupResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      !r.validIp
                        ? 'bg-red-50 dark:bg-red-950/20'
                        : r.matches.length > 0
                          ? 'bg-green-50 dark:bg-green-950/20'
                          : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <span className={`font-mono ${!r.validIp ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                      {r.ip}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {!r.validIp ? (
                        <span className="text-xs text-red-500">{t('invalidIp')}</span>
                      ) : r.matches.length > 0 ? (
                        r.matches.map((m, j) => (
                          <span key={j} className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-mono">
                            {numToIp(m.networkNum)}/{m.cidr}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">{t('noMatch')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('lookupPrompt')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between"
          aria-expanded={showGuide}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          <span className="text-gray-400 text-xl" aria-hidden="true">{showGuide ? '−' : '+'}</span>
        </button>
        {showGuide && (
          <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.basics.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.basics.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.cidr.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.cidr.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.classes.title')}</h3>
              <ul className="list-disc pl-5 space-y-1">
                {(t.raw('guide.classes.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 참고 */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">{t('note')}</p>
      </div>
    </div>
  )
}

// ── 서브컴포넌트 ──

function InfoRow({ label, value, id, onCopy, copiedId }: {
  label: string; value: string; id: string; onCopy: (text: string, id: string) => void; copiedId: string | null
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{value}</span>
        <button
          onClick={() => onCopy(value, id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
          aria-label={`Copy ${label}`}
        >
          {copiedId === id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

function BinaryRow({ label, binary }: { label: string; binary: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-1">
      <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0 text-xs">{label}</span>
      <span className="text-gray-900 dark:text-white tracking-wider">{binary}</span>
    </div>
  )
}
