'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Globe, Copy, Check, BookOpen, AlertCircle } from 'lucide-react'

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
  // Valid mask must be contiguous 1s followed by 0s
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
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
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

// ── CIDR 참고 테이블 ──
const CIDR_TABLE = [
  { cidr: 32, mask: '255.255.255.255', hosts: 1 },
  { cidr: 31, mask: '255.255.255.254', hosts: 2 },
  { cidr: 30, mask: '255.255.255.252', hosts: 2 },
  { cidr: 29, mask: '255.255.255.248', hosts: 6 },
  { cidr: 28, mask: '255.255.255.240', hosts: 14 },
  { cidr: 27, mask: '255.255.255.224', hosts: 30 },
  { cidr: 26, mask: '255.255.255.192', hosts: 62 },
  { cidr: 25, mask: '255.255.255.128', hosts: 126 },
  { cidr: 24, mask: '255.255.255.0', hosts: 254 },
  { cidr: 23, mask: '255.255.254.0', hosts: 510 },
  { cidr: 22, mask: '255.255.252.0', hosts: 1022 },
  { cidr: 21, mask: '255.255.248.0', hosts: 2046 },
  { cidr: 20, mask: '255.255.240.0', hosts: 4094 },
  { cidr: 16, mask: '255.255.0.0', hosts: 65534 },
  { cidr: 12, mask: '255.240.0.0', hosts: 1048574 },
  { cidr: 8, mask: '255.0.0.0', hosts: 16777214 },
  { cidr: 0, mask: '0.0.0.0', hosts: 4294967294 },
]

export default function SubnetCalculator() {
  const t = useTranslations('subnetCalculator')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showBinary, setShowBinary] = useState(false)

  // ── 입력 상태 ──
  const [ipInput, setIpInput] = useState('192.168.1.100')
  const [cidrInput, setCidrInput] = useState('24')
  const [maskInput, setMaskInput] = useState('255.255.255.0')
  const [inputMode, setInputMode] = useState<'cidr' | 'mask'>('cidr')

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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 입력 패널 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('inputTitle')}</h2>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('ipAddress')}</label>
              <input
                type="text"
                value={ipInput}
                onChange={e => setIpInput(e.target.value)}
                placeholder="192.168.1.100"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono ${
                  ipError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {ipError && <p className="text-xs text-red-500 mt-1">{ipError}</p>}
            </div>

            {/* CIDR or Mask mode toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setInputMode('cidr')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'cidr' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
              >
                CIDR (/24)
              </button>
              <button
                onClick={() => setInputMode('mask')}
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
                    <tr key={row.cidr} className={cidr === row.cidr ? 'bg-blue-50 dark:bg-blue-950/30' : ''}>
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
              {/* 핵심 결과 */}
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

                {/* 요약 카드 */}
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

                {/* 상세 정보 테이블 */}
                <div className="space-y-2">
                  <InfoRow label={t('networkAddress')} value={result.networkAddress} id="net" onCopy={copyToClipboard} copiedId={copiedId} />
                  <InfoRow label={t('broadcastAddress')} value={result.broadcastAddress} id="bcast" onCopy={copyToClipboard} copiedId={copiedId} />
                  <InfoRow label={t('hostRange')} value={`${result.firstHost} - ${result.lastHost}`} id="range" onCopy={copyToClipboard} copiedId={copiedId} />
                  <InfoRow label={t('subnetMask')} value={result.subnetMask} id="mask" onCopy={copyToClipboard} copiedId={copiedId} />
                  <InfoRow label={t('wildcardMask')} value={result.wildcardMask} id="wild" onCopy={copyToClipboard} copiedId={copiedId} />
                  <InfoRow label={t('totalAddresses')} value={result.totalAddresses.toLocaleString()} id="total" onCopy={copyToClipboard} copiedId={copiedId} />
                </div>
              </div>

              {/* 바이너리 표현 */}
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
