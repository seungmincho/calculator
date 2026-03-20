'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Copy, Check, Shield, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

// ── Port Data (hardcoded, not from translations) ──────────────────────────────

type Protocol = 'TCP' | 'UDP' | 'TCP/UDP'
type Category = 'well-known' | 'registered' | 'dynamic'

interface PortEntry {
  port: number
  service: string
  protocol: Protocol
  description: string
  securityNote?: string
  category: Category
}

const PORT_DATA: PortEntry[] = [
  // ── System / Well-Known Ports (0-1023) ────────────────────────────────────
  { port: 20, service: 'FTP-DATA', protocol: 'TCP', description: 'FTP 데이터 전송', securityNote: '비암호화 — SFTP(22) 또는 FTPS(990) 사용 권장', category: 'well-known' },
  { port: 21, service: 'FTP', protocol: 'TCP', description: 'FTP 제어 (파일 전송 프로토콜)', securityNote: '비암호화 — SFTP(22) 또는 FTPS(990) 사용 권장', category: 'well-known' },
  { port: 22, service: 'SSH', protocol: 'TCP', description: '보안 쉘 — 원격 접속, SFTP, 터널링', category: 'well-known' },
  { port: 23, service: 'Telnet', protocol: 'TCP', description: '텔넷 원격 접속', securityNote: '비암호화 — SSH(22) 사용 권장, 사용 금지 강력 권고', category: 'well-known' },
  { port: 25, service: 'SMTP', protocol: 'TCP', description: '이메일 전송 (Simple Mail Transfer Protocol)', securityNote: '비암호화 — SMTPS(465) 또는 STARTTLS(587) 사용 권장', category: 'well-known' },
  { port: 53, service: 'DNS', protocol: 'TCP/UDP', description: '도메인 이름 시스템 — 도메인→IP 변환', category: 'well-known' },
  { port: 67, service: 'DHCP', protocol: 'UDP', description: 'DHCP 서버 — IP 주소 자동 할당', category: 'well-known' },
  { port: 68, service: 'DHCP', protocol: 'UDP', description: 'DHCP 클라이언트 — IP 주소 자동 수신', category: 'well-known' },
  { port: 80, service: 'HTTP', protocol: 'TCP', description: '웹 서버 (Hypertext Transfer Protocol)', securityNote: '비암호화 — HTTPS(443) 사용 권장', category: 'well-known' },
  { port: 110, service: 'POP3', protocol: 'TCP', description: '이메일 수신 (Post Office Protocol 3)', securityNote: '비암호화 — POP3S(995) 사용 권장', category: 'well-known' },
  { port: 123, service: 'NTP', protocol: 'UDP', description: '네트워크 시간 프로토콜 — 시간 동기화', category: 'well-known' },
  { port: 143, service: 'IMAP', protocol: 'TCP', description: '이메일 수신/관리 (Internet Message Access Protocol)', securityNote: '비암호화 — IMAPS(993) 사용 권장', category: 'well-known' },
  { port: 161, service: 'SNMP', protocol: 'UDP', description: '네트워크 장비 모니터링 (Simple Network Management Protocol)', securityNote: 'SNMPv1/v2는 비암호화 — SNMPv3 사용 권장', category: 'well-known' },
  { port: 443, service: 'HTTPS', protocol: 'TCP', description: '보안 웹 서버 (HTTP over TLS/SSL)', category: 'well-known' },
  { port: 465, service: 'SMTPS', protocol: 'TCP', description: '이메일 전송 (SMTP over TLS)', category: 'well-known' },
  { port: 587, service: 'SMTP', protocol: 'TCP', description: '이메일 전송 (SMTP STARTTLS — 권장 방식)', category: 'well-known' },
  { port: 636, service: 'LDAPS', protocol: 'TCP', description: '보안 LDAP (디렉토리 서비스 over TLS)', category: 'well-known' },
  { port: 993, service: 'IMAPS', protocol: 'TCP', description: '보안 이메일 수신 (IMAP over TLS)', category: 'well-known' },
  { port: 995, service: 'POP3S', protocol: 'TCP', description: '보안 이메일 수신 (POP3 over TLS)', category: 'well-known' },

  // ── Registered Ports (1024-49151) ─────────────────────────────────────────
  { port: 1194, service: 'OpenVPN', protocol: 'TCP/UDP', description: 'OpenVPN — 오픈소스 VPN 솔루션', category: 'registered' },
  { port: 1433, service: 'MSSQL', protocol: 'TCP', description: 'Microsoft SQL Server 데이터베이스', securityNote: '외부 직접 노출 금지 — VPN/SSH 터널 사용 권장', category: 'registered' },
  { port: 1521, service: 'Oracle DB', protocol: 'TCP', description: 'Oracle Database TNS Listener', securityNote: '외부 직접 노출 금지 — 방화벽으로 내부망 제한 권장', category: 'registered' },
  { port: 1883, service: 'MQTT', protocol: 'TCP', description: 'MQTT 메시지 브로커 — IoT 디바이스 통신', securityNote: '비암호화 — MQTTS(8883) 사용 권장', category: 'registered' },
  { port: 2181, service: 'Zookeeper', protocol: 'TCP', description: 'Apache ZooKeeper — 분산 코디네이션', securityNote: '외부 노출 금지 — 내부 서비스 전용', category: 'registered' },
  { port: 2375, service: 'Docker', protocol: 'TCP', description: 'Docker 데몬 API (비암호화)', securityNote: '외부 노출 절대 금지 — 원격 접근 시 TLS(2376) 사용', category: 'registered' },
  { port: 2376, service: 'Docker TLS', protocol: 'TCP', description: 'Docker 데몬 API (TLS 암호화)', category: 'registered' },
  { port: 2379, service: 'etcd', protocol: 'TCP', description: 'etcd 클라이언트 통신 — 분산 키-값 스토어', securityNote: '외부 노출 금지 — 쿠버네티스 핵심 컴포넌트', category: 'registered' },
  { port: 2380, service: 'etcd', protocol: 'TCP', description: 'etcd 피어 통신 — 클러스터 내부용', category: 'registered' },
  { port: 3000, service: 'Node.js Dev', protocol: 'TCP', description: 'Node.js/Express/React 개발 서버 (관례적)', category: 'registered' },
  { port: 3306, service: 'MySQL', protocol: 'TCP', description: 'MySQL / MariaDB 데이터베이스', securityNote: '외부 직접 노출 금지 — VPN/SSH 터널 사용 권장', category: 'registered' },
  { port: 3389, service: 'RDP', protocol: 'TCP', description: '원격 데스크톱 프로토콜 (Windows)', securityNote: '무차별 대입 공격 대상 — VPN 뒤에 배치 권장, 기본 포트 변경 고려', category: 'registered' },
  { port: 4222, service: 'NATS', protocol: 'TCP', description: 'NATS 메시지 브로커 — 클라이언트 연결', category: 'registered' },
  { port: 4443, service: 'HTTPS Alt', protocol: 'TCP', description: 'HTTPS 대체 포트 — WebRTC TURN 서버 등', category: 'registered' },
  { port: 5000, service: 'Flask Dev', protocol: 'TCP', description: 'Python Flask 개발 서버 (관례적)', category: 'registered' },
  { port: 5173, service: 'Vite', protocol: 'TCP', description: 'Vite 개발 서버 (기본 포트)', category: 'registered' },
  { port: 5432, service: 'PostgreSQL', protocol: 'TCP', description: 'PostgreSQL 데이터베이스', securityNote: '외부 직접 노출 금지 — VPN/SSH 터널 사용 권장', category: 'registered' },
  { port: 5601, service: 'Kibana', protocol: 'TCP', description: 'Kibana 웹 UI — Elasticsearch 시각화', category: 'registered' },
  { port: 5672, service: 'RabbitMQ', protocol: 'TCP', description: 'RabbitMQ AMQP 메시지 브로커', category: 'registered' },
  { port: 5900, service: 'VNC', protocol: 'TCP', description: 'VNC 원격 데스크톱', securityNote: '비암호화 — SSH 터널 통해 사용 권장', category: 'registered' },
  { port: 6379, service: 'Redis', protocol: 'TCP', description: 'Redis 인메모리 캐시/데이터베이스', securityNote: '기본값 인증 없음 — requirepass 설정 필수, 외부 노출 금지', category: 'registered' },
  { port: 6443, service: 'K8s API', protocol: 'TCP', description: 'Kubernetes API 서버 (HTTPS)', category: 'registered' },
  { port: 8080, service: 'HTTP Alt', protocol: 'TCP', description: 'HTTP 대체 포트 — 개발 서버, 프록시, Tomcat', category: 'registered' },
  { port: 8443, service: 'HTTPS Alt', protocol: 'TCP', description: 'HTTPS 대체 포트 — 개발/관리 인터페이스', category: 'registered' },
  { port: 8500, service: 'Consul', protocol: 'TCP', description: 'HashiCorp Consul 웹 UI 및 API', category: 'registered' },
  { port: 8883, service: 'MQTTS', protocol: 'TCP', description: 'MQTT over TLS — 보안 IoT 통신', category: 'registered' },
  { port: 8888, service: 'Jupyter', protocol: 'TCP', description: 'Jupyter Notebook/Lab 웹 UI', securityNote: '토큰 인증 기본 활성화 — 외부 노출 시 비밀번호 설정 필수', category: 'registered' },
  { port: 9090, service: 'Prometheus', protocol: 'TCP', description: 'Prometheus 모니터링 시스템 웹 UI', category: 'registered' },
  { port: 9092, service: 'Kafka', protocol: 'TCP', description: 'Apache Kafka 브로커 — 클라이언트 연결', category: 'registered' },
  { port: 9200, service: 'Elasticsearch', protocol: 'TCP', description: 'Elasticsearch REST API (HTTP)', securityNote: '기본값 인증 없음 — X-Pack Security 활성화 권장, 외부 노출 금지', category: 'registered' },
  { port: 9300, service: 'Elasticsearch', protocol: 'TCP', description: 'Elasticsearch 클러스터 내부 통신', category: 'registered' },
  { port: 10250, service: 'Kubelet', protocol: 'TCP', description: 'Kubernetes Kubelet API', category: 'registered' },
  { port: 11211, service: 'Memcached', protocol: 'TCP/UDP', description: 'Memcached 인메모리 캐시', securityNote: '기본값 인증 없음 — 외부 노출 금지 필수, DDoS 증폭 공격 악용 사례 있음', category: 'registered' },
  { port: 15672, service: 'RabbitMQ UI', protocol: 'TCP', description: 'RabbitMQ 관리 웹 UI', securityNote: '기본 계정(guest/guest) 변경 필수', category: 'registered' },
  { port: 27017, service: 'MongoDB', protocol: 'TCP', description: 'MongoDB 데이터베이스', securityNote: '기본값 인증 없음 — --auth 옵션 필수, 외부 노출 금지', category: 'registered' },

  // ── Dynamic / Ephemeral Ports (49152+) ───────────────────────────────────
  { port: 51820, service: 'WireGuard', protocol: 'UDP', description: 'WireGuard VPN (기본 포트)', category: 'dynamic' },
]

// ── Component ─────────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | 'well-known' | 'registered' | 'dynamic'
type ProtocolFilter = 'all' | 'TCP' | 'UDP'

export default function PortReference() {
  const t = useTranslations('portReference')

  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>('all')
  const [copiedPort, setCopiedPort] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PORT_DATA.filter((entry) => {
      // Category filter
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false

      // Protocol filter
      if (protocolFilter !== 'all') {
        if (!entry.protocol.includes(protocolFilter)) return false
      }

      // Search filter
      if (q) {
        const portStr = String(entry.port)
        if (
          portStr.includes(q) ||
          entry.service.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q)
        ) {
          return true
        }
        return false
      }

      return true
    }).sort((a, b) => a.port - b.port)
  }, [query, categoryFilter, protocolFilter])

  // ── Copy ───────────────────────────────────────────────────────────────────
  const copyPort = useCallback(async (port: number) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(port))
      } else {
        const ta = document.createElement('textarea')
        ta.value = String(port)
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // silent
    }
    setCopiedPort(port)
    setTimeout(() => setCopiedPort(null), 2000)
  }, [])

  // ── Protocol badge color ───────────────────────────────────────────────────
  const protocolColor = (protocol: Protocol) => {
    if (protocol === 'TCP') return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    if (protocol === 'UDP') return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    return 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
  }

  // ── Category badge ─────────────────────────────────────────────────────────
  const categoryLabel = (cat: Category) => {
    if (cat === 'well-known') return t('catWellKnown')
    if (cat === 'registered') return t('catRegistered')
    return t('catDynamic')
  }

  const categoryColor = (cat: Category) => {
    if (cat === 'well-known') return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    if (cat === 'registered') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  }

  const CATEGORY_BUTTONS: { value: CategoryFilter; label: string; range: string }[] = [
    { value: 'all', label: t('filterAll'), range: '' },
    { value: 'well-known', label: t('catWellKnown'), range: '0–1023' },
    { value: 'registered', label: t('catRegistered'), range: '1024–49151' },
    { value: 'dynamic', label: t('catDynamic'), range: '49152+' },
  ]

  const PROTOCOL_BUTTONS: { value: ProtocolFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'TCP', label: 'TCP' },
    { value: 'UDP', label: 'UDP' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">{t('categoryLabel')}</span>
          {CATEGORY_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setCategoryFilter(btn.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {btn.label}
              {btn.range && (
                <span className="ml-1 text-xs opacity-70">({btn.range})</span>
              )}
            </button>
          ))}
        </div>

        {/* Protocol filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">{t('protocolLabel')}</span>
          {PROTOCOL_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setProtocolFilter(btn.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                protocolFilter === btn.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('resultCount', { count: filtered.length, total: PORT_DATA.length })}
      </p>

      {/* Port list */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {filtered.map((entry) => (
            <div
              key={`${entry.port}-${entry.service}`}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start gap-3">
                {/* Port number */}
                <div className="flex-shrink-0 w-20 text-center">
                  <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                    {entry.port}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {entry.service}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${protocolColor(entry.protocol)}`}>
                      {entry.protocol}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${categoryColor(entry.category)}`}>
                      {categoryLabel(entry.category)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
                    {entry.description}
                  </p>
                  {entry.securityNote && (
                    <div className="flex items-start gap-1 mt-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-snug">
                        {entry.securityNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* Copy button */}
                <button
                  onClick={() => copyPort(entry.port)}
                  title={t('copyPort')}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 dark:hover:text-blue-400 transition-colors"
                >
                  {copiedPort === entry.port ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('guide.title')}
            </h2>
          </div>
          {guideOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {guideOpen && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-100 dark:border-gray-700 pt-4">
            {/* Ranges */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.ranges.title')}</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t('catWellKnown')} (0–1023)</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">{t('guide.ranges.wellKnownDesc')}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{t('catRegistered')} (1024–49151)</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">{t('guide.ranges.registeredDesc')}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('catDynamic')} (49152–65535)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('guide.ranges.dynamicDesc')}</p>
                </div>
              </div>
            </div>

            {/* Security tips */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.security.title')}</h3>
              <ul className="space-y-1.5">
                {(t.raw('guide.security.items') as string[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* TCP vs UDP */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('guide.tcpUdp.title')}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">TCP</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{t('guide.tcpUdp.tcpDesc')}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-1">UDP</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">{t('guide.tcpUdp.udpDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
