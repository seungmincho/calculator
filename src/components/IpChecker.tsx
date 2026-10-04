'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/ipChecker'
import { Copy, Check, RefreshCw } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import {
  ipVersion, fullIPv6, classifyIp, parseUA, tzMismatch, tzOffsetMinutes, formatOffset,
  parseCandidate, buildReport, type IceAddress,
} from '@/utils/ipInfo'

/** functions/api/ip.ts 응답 */
interface EdgeInfo {
  ip: string
  country: string
  city: string
  region: string
  regionCode: string
  postalCode: string
  latitude: string
  longitude: string
  timezone: string
  asn: number | null
  asOrganization: string
  colo: string
  httpProtocol: string
  tlsVersion: string
  tlsCipher: string
  clientTcpRtt: number | null
}

interface NetInfo { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean; type?: string }

interface ClientInfo {
  ua: string
  screen: string
  viewport: string
  dpr: number
  languages: string
  tz: string
  online: boolean
  cookies: boolean
  dnt: boolean
  cores?: number
  conn?: NetInfo
}

type RtcState = { status: 'idle' | 'running' | 'unsupported' | 'error' } | { status: 'done'; list: IceAddress[] }

const countryName = (code: string) => {
  if (!code) return ''
  try {
    return new Intl.DisplayNames(['ko'], { type: 'region' }).of(code) ?? code
  } catch {
    return code // T1(Tor), XX 등
  }
}

function CopyBtn({ text, id, copiedId, onCopy, label, onHero }: { text: string; id: string; copiedId: string | null; onCopy: (t: string, id: string) => void; label: string; onHero?: boolean }) {
  const done = copiedId === id
  return (
    <button
      type="button"
      onClick={() => onCopy(text, id)}
      aria-label={label}
      title={label}
      className={onHero
        ? 'shrink-0 rounded-lg p-2 bg-white/15 hover:bg-white/25 text-white transition-colors'
        : 'shrink-0 rounded-lg p-1.5 text-faint hover:text-body hover:bg-soft transition-colors'}
    >
      {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

export default function IpChecker() {
  const t = useTranslations('ipChecker')
  const [edge, setEdge] = useState<EdgeInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [rtc, setRtc] = useState<RtcState>({ status: 'idle' })
  const [query, setQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copy = useCallback(async (text: string, id: string) => {
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
    } catch { /* 무시 — 표시만 */ }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const fetchEdge = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/ip', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as EdgeInfo
      if (!ipVersion(data.ip)) throw new Error('no ip')
      setEdge(data)
      setStatus('ok')
    } catch {
      setEdge(null)
      setStatus('error')
    }
  }, [])

  const readClient = useCallback(() => {
    const n = navigator as Navigator & { connection?: NetInfo }
    setClient({
      ua: n.userAgent,
      screen: `${screen.width} × ${screen.height}`,
      viewport: `${window.innerWidth} × ${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      languages: (n.languages?.length ? n.languages : [n.language]).join(', '),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: n.onLine,
      cookies: n.cookieEnabled,
      dnt: n.doNotTrack === '1',
      cores: n.hardwareConcurrency,
      conn: n.connection ? {
        effectiveType: n.connection.effectiveType,
        downlink: n.connection.downlink,
        rtt: n.connection.rtt,
        saveData: n.connection.saveData,
        type: n.connection.type,
      } : undefined,
    })
  }, [])

  useEffect(() => {
    fetchEdge()
    readClient()
  }, [fetchEdge, readClient])

  const refresh = () => {
    fetchEdge()
    readClient()
    setRtc({ status: 'idle' })
  }

  // WebRTC 후보 수집 — Cloudflare 공개 STUN 한 곳만 사용 (사용자가 버튼을 눌렀을 때만)
  const runRtc = useCallback(async () => {
    if (typeof RTCPeerConnection === 'undefined') { setRtc({ status: 'unsupported' }); return }
    setRtc({ status: 'running' })
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] })
      const found = new Map<string, IceAddress>()
      pc.onicecandidate = e => {
        const c = e.candidate?.candidate ? parseCandidate(e.candidate.candidate) : null
        if (c) found.set(`${c.type}|${c.address}`, c)
      }
      pc.createDataChannel('probe')
      await pc.setLocalDescription(await pc.createOffer())
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 4000)
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve() }
        }
      })
      pc.close()
      setRtc({ status: 'done', list: [...found.values()] })
    } catch {
      setRtc({ status: 'error' })
    }
  }, [])

  const ua = useMemo(() => (client ? parseUA(client.ua) : null), [client])
  const ver = edge ? ipVersion(edge.ip) : null
  const place = edge ? [edge.city, edge.region, countryName(edge.country)].filter(Boolean).join(', ') : ''
  const now = new Date()
  const mismatch = !!(edge && client && tzMismatch(client.tz, edge.timezone, now))
  const offsetOf = (tz: string) => {
    const m = tz ? tzOffsetMinutes(tz, now) : null
    return m === null ? tz : `${tz} (${formatOffset(m)})`
  }

  // 표시·복사 공용 행 정의
  const locRows: [string, string][] = edge ? [
    [t('country'), edge.country ? `${countryName(edge.country)} (${edge.country})` : ''],
    [t('region'), edge.region],
    [t('city'), edge.city],
    [t('loc.postal'), edge.postalCode],
    [t('loc.coords'), edge.latitude && edge.longitude ? `${edge.latitude}, ${edge.longitude}` : ''],
    [t('timezone'), offsetOf(edge.timezone)],
  ] : []
  const netRows: [string, string][] = edge ? [
    [t('isp'), edge.asOrganization],
    [t('asn'), edge.asn ? `AS${edge.asn}` : ''],
    [t('net.colo'), edge.colo],
    [t('net.http'), edge.httpProtocol],
    [t('net.tls'), edge.tlsVersion ? `${edge.tlsVersion}${edge.tlsCipher ? ` · ${edge.tlsCipher}` : ''}` : ''],
    [t('net.rtt'), edge.clientTcpRtt ? `${edge.clientTcpRtt} ms` : ''],
  ] : []
  const conn = client?.conn
  const browserRows: [string, string][] = client && ua ? [
    [t('browser.browser'), `${ua.browser}${ua.browserVersion ? ` ${ua.browserVersion}` : ''}`],
    [t('browser.os'), `${ua.os}${ua.osVersion ? ` ${ua.osVersion}` : ''}`],
    [t('browser.device'), t(`browser.devices.${ua.device}`)],
    [t('browser.screen'), `${client.screen} @${client.dpr}x`],
    [t('browser.viewport'), client.viewport],
    [t('browser.language'), client.languages],
    [t('browser.tz'), offsetOf(client.tz)],
    [t('browser.cores'), client.cores ? String(client.cores) : ''],
    [t('browser.online'), client.online ? t('yes') : t('no')],
    [t('browser.connection'), conn ? [conn.type, conn.effectiveType, conn.downlink ? `${conn.downlink} Mbps` : '', conn.rtt ? `RTT ${conn.rtt} ms` : ''].filter(Boolean).join(' · ') : t('browser.notExposed')],
    [t('browser.cookies'), client.cookies ? t('yes') : t('no')],
    [t('browser.dnt'), client.dnt ? t('yes') : t('no')],
    [t('browser.ua'), client.ua],
  ] : []

  const rtcList = rtc.status === 'done' ? rtc.list : []
  const rtcRows: [string, string][] = rtcList.map(c => [`${t(`webrtc.types.${c.type}`)}`, c.address])

  const reportText = () => buildReport([
    { title: t('myIp'), rows: [[ver === 6 ? 'IPv6' : 'IPv4', edge?.ip]] },
    { title: t('location'), rows: locRows },
    { title: t('network'), rows: netRows },
    { title: t('browser.title'), rows: browserRows },
    { title: t('webrtc.title'), rows: rtcRows },
  ])

  // IP 검사기 (입력 없으면 내 IP)
  const target = query.trim() || edge?.ip || ''
  const tVer = target ? ipVersion(target) : null
  const tCls = target ? classifyIp(target) : null

  const rowsView = (rows: [string, string][], prefix: string) => (
    <dl className="divide-y divide-line">
      {rows.filter(([, v]) => v).map(([k, v], i) => (
        <div key={k} className="flex items-start justify-between gap-3 py-2.5">
          <dt className="text-sm text-muted shrink-0">{k}</dt>
          <dd className="flex items-start gap-1 min-w-0">
            <span className="text-sm text-fg font-medium text-right break-all">{v}</span>
            <CopyBtn text={v} id={`${prefix}${i}`} copiedId={copiedId} onCopy={copy} label={t('copy')} />
          </dd>
        </div>
      ))}
    </dl>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      {/* Hero */}
      <div className="ui-hero p-6 sm:p-8" aria-live="polite">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span>{t('hero.label')}</span>
          {ver && <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">IPv{ver}</span>}
        </div>
        {status === 'loading' && <p className="text-3xl font-bold mt-2">{t('loading')}</p>}
        {status === 'error' && (
          <div className="mt-2">
            <p className="text-2xl font-bold">{t('error')}</p>
            <p className="text-sm text-white/70 mt-1">{t('hero.errorHint')}</p>
          </div>
        )}
        {status === 'ok' && edge && (
          <>
            <div className="mt-2 flex items-center gap-3">
              <p className={`font-bold tabular-nums break-all ${ver === 6 ? 'text-2xl sm:text-3xl font-mono' : 'text-4xl sm:text-5xl'}`}>{edge.ip}</p>
              <CopyBtn text={edge.ip} id="hero" copiedId={copiedId} onCopy={copy} label={t('copy')} onHero />
            </div>
            <p className="text-white/80 mt-3">{[place, edge.asOrganization].filter(Boolean).join(' · ')}</p>
            <p className="text-xs text-white/70 mt-2">{ver === 6 ? t('hero.v6Note') : t('hero.v4Note')}</p>
          </>
        )}
        <div className="flex flex-wrap gap-2 mt-5">
          <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-semibold">
            <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            {status === 'error' ? t('retry') : t('refresh')}
          </button>
          <button type="button" onClick={() => copy(reportText(), 'all')} className="inline-flex items-center gap-2 rounded-xl bg-white text-primary px-4 py-2 text-sm font-semibold">
            {copiedId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedId === 'all' ? t('copied') : t('copyAll')}
          </button>
        </div>
      </div>

      {mismatch && edge && client && (
        <div className="bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm">
          <p className="font-semibold">{t('vpnHint.title')}</p>
          <p className="mt-1">{t('vpnHint.body', { browser: offsetOf(client.tz), ip: offsetOf(edge.timezone) })}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg mb-2">{t('location')}</h2>
          {edge ? rowsView(locRows, "loc") : <p className="text-sm text-muted py-2">{status === 'loading' ? t('loading') : t('error')}</p>}
          <p className="text-xs text-faint mt-3">{t('loc.accuracy')}</p>
        </section>
        <section className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg mb-2">{t('network')}</h2>
          {edge ? rowsView(netRows, "net") : <p className="text-sm text-muted py-2">{status === 'loading' ? t('loading') : t('error')}</p>}
          <p className="text-xs text-faint mt-3">{t('net.note')}</p>
        </section>
        <section className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg mb-2">{t('browser.title')}</h2>
          {client ? rowsView(browserRows, "br") : <p className="text-sm text-muted py-2">{t('loading')}</p>}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* WebRTC */}
        <section className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('webrtc.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('webrtc.desc')}</p>
          <button type="button" onClick={runRtc} disabled={rtc.status === 'running'} className="ui-btn px-4 py-2.5 mt-4 text-sm">
            <RefreshCw className={`w-4 h-4 ${rtc.status === 'running' ? 'animate-spin' : ''}`} />
            {rtc.status === 'running' ? t('webrtc.running') : rtc.status === 'done' ? t('webrtc.rerun') : t('webrtc.run')}
          </button>
          {rtc.status === 'unsupported' && <p className="text-sm text-sub mt-4">{t('webrtc.unsupported')}</p>}
          {rtc.status === 'error' && <p className="text-sm text-sub mt-4">{t('webrtc.blocked')}</p>}
          {rtc.status === 'done' && (
            <div className="mt-4 space-y-3">
              {rtcList.length === 0 ? (
                <p className="text-sm text-sub">{t('webrtc.none')}</p>
              ) : rowsView(rtcRows, 'rtc')}
              {(() => {
                const hosts = rtcList.filter(c => c.type === 'host')
                const rawLocal = hosts.filter(c => !c.mdns)
                const pub = rtcList.filter(c => c.type === 'srflx' || c.type === 'prflx').map(c => c.address)
                const leaked = edge ? pub.filter(a => a !== edge.ip && ipVersion(a) === ver) : []
                const otherVer = edge ? pub.filter(a => ipVersion(a) !== ver) : []
                const msgs: { warn: boolean; text: string }[] = []
                if (hosts.length && !rawLocal.length) msgs.push({ warn: false, text: t('webrtc.mdnsOk') })
                if (rawLocal.length) msgs.push({ warn: true, text: t('webrtc.localExposed', { ips: rawLocal.map(c => c.address).join(', ') }) })
                if (leaked.length) msgs.push({ warn: true, text: t('webrtc.leak', { ips: leaked.join(', ') }) })
                else if (edge && pub.includes(edge.ip)) msgs.push({ warn: false, text: t('webrtc.same') })
                if (otherVer.length) msgs.push({ warn: false, text: t('webrtc.otherVersion', { ips: otherVer.join(', ') }) })
                if (!pub.length) msgs.push({ warn: false, text: t('webrtc.noStun') })
                return msgs.map((m, i) => (
                  <p key={i} className={`rounded-xl p-3 text-sm ${m.warn ? 'bg-amber-50 text-amber-800' : 'bg-subtle text-sub'}`}>{m.text}</p>
                ))
              })()}
            </div>
          )}
          <p className="text-xs text-faint mt-4">{t('webrtc.note')}</p>
        </section>

        {/* IP 검사 */}
        <section className="ui-card p-6">
          <h2 className="text-lg font-semibold text-fg">{t('check.title')}</h2>
          <p className="text-sm text-muted mt-1">{t('check.desc')}</p>
          <label htmlFor="ip-check-input" className="block text-sm text-body mt-4 mb-1.5">{t('check.label')}</label>
          <input
            id="ip-check-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={edge?.ip || '192.168.0.1'}
            spellCheck={false}
            autoComplete="off"
            className="ui-field px-4 py-3 font-mono"
          />
          {target && (
            tVer ? (
              <div className="mt-3">
                {rowsView([
                  [t('check.version'), `IPv${tVer}`],
                  [t('check.class'), tCls ? t(`check.classes.${tCls}`) : ''],
                  [t('check.full'), tVer === 6 ? fullIPv6(target) ?? '' : ''],
                ], 'chk')}
                {tCls && <p className="bg-subtle rounded-xl p-3 text-sm text-sub mt-2">{t(`check.explain.${tCls}`)}</p>}
              </div>
            ) : (
              <p className="text-sm text-red-600 mt-3">{t('check.invalid')}</p>
            )
          )}
          <p className="text-sm text-muted mt-4">
            {t('check.more')}{' '}
            <Link href="/subnet-calculator/" className="text-primary font-medium hover:underline">{t('check.subnetLink')}</Link>
            {' · '}
            <Link href="/dns-lookup/" className="text-primary font-medium hover:underline">{t('check.dnsLink')}</Link>
          </p>
        </section>
      </div>

      <div className="bg-subtle rounded-2xl p-5 text-sm text-sub">
        <p className="font-semibold text-body">{t('privacy.title')}</p>
        <p className="mt-1">{t('privacy.body')}</p>
      </div>

      <GuideSection namespace="ipChecker" />
    </div>
  )
}
