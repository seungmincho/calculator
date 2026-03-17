'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Download, RotateCcw, BookOpen, ChevronDown, ChevronUp, Server, Zap, FileSearch, Upload, ArrowRight } from 'lucide-react'

// ── 타입 ──

type ServerType = 'nginx' | 'caddy'
type Scenario = 'reverseProxy' | 'staticSite' | 'spa' | 'loadBalancer' | 'redirect' | 'api'
type PresetId = 'nextjs' | 'wordpress' | 'react' | 'django' | 'spring' | 'fileServer'

interface ConfigOptions {
  serverType: ServerType
  scenario: Scenario
  domain: string
  backendHost: string
  staticRoot: string
  enableSsl: boolean
  enableHttp2: boolean
  enableGzip: boolean
  enableWwwRedirect: boolean
  enableSecurityHeaders: boolean
  enableCors: boolean
  corsOrigin: string
  enableRateLimit: boolean
  rateLimitValue: string
  enableWebSocket: boolean
  enableCache: boolean
  cacheDuration: string
  sslCertPath: string
  sslKeyPath: string
  customDirective: string
  // 로드밸런서용
  upstreamServers: string[]
}

const DEFAULT_OPTIONS: ConfigOptions = {
  serverType: 'nginx',
  scenario: 'reverseProxy',
  domain: 'example.com',
  backendHost: '127.0.0.1:3000',
  staticRoot: '/var/www/html',
  enableSsl: true,
  enableHttp2: true,
  enableGzip: true,
  enableWwwRedirect: true,
  enableSecurityHeaders: true,
  enableCors: false,
  corsOrigin: '*',
  enableRateLimit: false,
  rateLimitValue: '10r/s',
  enableWebSocket: false,
  enableCache: true,
  cacheDuration: '30d',
  sslCertPath: '/etc/letsencrypt/live/example.com/fullchain.pem',
  sslKeyPath: '/etc/letsencrypt/live/example.com/privkey.pem',
  customDirective: '',
  upstreamServers: ['127.0.0.1:3001', '127.0.0.1:3002'],
}

// ── 프리셋 정의 ──

const PRESETS: Record<PresetId, Partial<ConfigOptions>> = {
  nextjs: {
    scenario: 'reverseProxy',
    backendHost: '127.0.0.1:3000',
    enableSsl: true,
    enableHttp2: true,
    enableGzip: true,
    enableWwwRedirect: true,
    enableSecurityHeaders: true,
    enableWebSocket: true,
    enableCache: true,
    cacheDuration: '30d',
    enableCors: false,
    enableRateLimit: false,
  },
  wordpress: {
    scenario: 'reverseProxy',
    backendHost: 'unix:/run/php/php-fpm.sock',
    enableSsl: true,
    enableHttp2: true,
    enableGzip: true,
    enableWwwRedirect: true,
    enableSecurityHeaders: true,
    enableWebSocket: false,
    enableCache: true,
    cacheDuration: '7d',
    enableCors: false,
    enableRateLimit: true,
    rateLimitValue: '5r/s',
    staticRoot: '/var/www/wordpress',
  },
  react: {
    scenario: 'spa',
    staticRoot: '/var/www/app/build',
    enableSsl: true,
    enableHttp2: true,
    enableGzip: true,
    enableWwwRedirect: true,
    enableSecurityHeaders: true,
    enableWebSocket: false,
    enableCache: true,
    cacheDuration: '365d',
    enableCors: false,
    enableRateLimit: false,
  },
  django: {
    scenario: 'reverseProxy',
    backendHost: '127.0.0.1:8000',
    enableSsl: true,
    enableHttp2: true,
    enableGzip: true,
    enableWwwRedirect: true,
    enableSecurityHeaders: true,
    enableWebSocket: false,
    enableCache: true,
    cacheDuration: '30d',
    staticRoot: '/var/www/app/static',
    enableCors: false,
    enableRateLimit: false,
  },
  spring: {
    scenario: 'reverseProxy',
    backendHost: '127.0.0.1:8080',
    enableSsl: true,
    enableHttp2: true,
    enableGzip: true,
    enableWwwRedirect: true,
    enableSecurityHeaders: true,
    enableWebSocket: false,
    enableCache: true,
    cacheDuration: '30d',
    enableCors: false,
    enableRateLimit: false,
  },
  fileServer: {
    scenario: 'staticSite',
    staticRoot: '/var/www/files',
    enableSsl: true,
    enableHttp2: true,
    enableGzip: true,
    enableWwwRedirect: false,
    enableSecurityHeaders: false,
    enableWebSocket: false,
    enableCache: true,
    cacheDuration: '7d',
    enableCors: false,
    enableRateLimit: false,
  },
}

// ── Nginx 설정 생성 ──

function generateNginx(opts: ConfigOptions): string {
  const lines: string[] = []
  const indent = (n: number) => '    '.repeat(n)

  // Rate limit zone
  if (opts.enableRateLimit) {
    lines.push(`limit_req_zone $binary_remote_addr zone=ratelimit:10m rate=${opts.rateLimitValue};`)
    lines.push('')
  }

  // Upstream (로드밸런서)
  if (opts.scenario === 'loadBalancer') {
    lines.push(`upstream backend {`)
    opts.upstreamServers.forEach(s => lines.push(`${indent(1)}server ${s};`))
    lines.push(`}`)
    lines.push('')
  }

  // HTTP → HTTPS redirect
  if (opts.enableSsl) {
    lines.push(`server {`)
    lines.push(`${indent(1)}listen 80;`)
    lines.push(`${indent(1)}listen [::]:80;`)
    lines.push(`${indent(1)}server_name ${opts.domain}${opts.enableWwwRedirect ? ` www.${opts.domain}` : ''};`)
    lines.push(`${indent(1)}return 301 https://${opts.domain}$request_uri;`)
    lines.push(`}`)
    lines.push('')
  }

  // www → non-www redirect
  if (opts.enableWwwRedirect && opts.enableSsl) {
    lines.push(`server {`)
    lines.push(`${indent(1)}listen 443 ssl${opts.enableHttp2 ? '' : ''};`)
    if (opts.enableHttp2) lines.push(`${indent(1)}http2 on;`)
    lines.push(`${indent(1)}server_name www.${opts.domain};`)
    lines.push(`${indent(1)}ssl_certificate ${opts.sslCertPath};`)
    lines.push(`${indent(1)}ssl_certificate_key ${opts.sslKeyPath};`)
    lines.push(`${indent(1)}return 301 https://${opts.domain}$request_uri;`)
    lines.push(`}`)
    lines.push('')
  }

  // Main server block
  lines.push(`server {`)

  if (opts.enableSsl) {
    lines.push(`${indent(1)}listen 443 ssl;`)
    lines.push(`${indent(1)}listen [::]:443 ssl;`)
    if (opts.enableHttp2) lines.push(`${indent(1)}http2 on;`)
  } else {
    lines.push(`${indent(1)}listen 80;`)
    lines.push(`${indent(1)}listen [::]:80;`)
  }

  lines.push(`${indent(1)}server_name ${opts.domain};`)
  lines.push('')

  // SSL
  if (opts.enableSsl) {
    lines.push(`${indent(1)}# SSL`)
    lines.push(`${indent(1)}ssl_certificate ${opts.sslCertPath};`)
    lines.push(`${indent(1)}ssl_certificate_key ${opts.sslKeyPath};`)
    lines.push(`${indent(1)}ssl_protocols TLSv1.2 TLSv1.3;`)
    lines.push(`${indent(1)}ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;`)
    lines.push(`${indent(1)}ssl_prefer_server_ciphers off;`)
    lines.push(`${indent(1)}ssl_session_cache shared:SSL:10m;`)
    lines.push(`${indent(1)}ssl_session_timeout 1d;`)
    lines.push(`${indent(1)}ssl_stapling on;`)
    lines.push(`${indent(1)}ssl_stapling_verify on;`)
    lines.push('')
  }

  // Security headers
  if (opts.enableSecurityHeaders) {
    lines.push(`${indent(1)}# Security headers`)
    lines.push(`${indent(1)}add_header X-Frame-Options "SAMEORIGIN" always;`)
    lines.push(`${indent(1)}add_header X-Content-Type-Options "nosniff" always;`)
    lines.push(`${indent(1)}add_header X-XSS-Protection "1; mode=block" always;`)
    lines.push(`${indent(1)}add_header Referrer-Policy "strict-origin-when-cross-origin" always;`)
    if (opts.enableSsl) {
      lines.push(`${indent(1)}add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`)
    }
    lines.push(`${indent(1)}server_tokens off;`)
    lines.push('')
  }

  // Gzip
  if (opts.enableGzip) {
    lines.push(`${indent(1)}# Gzip compression`)
    lines.push(`${indent(1)}gzip on;`)
    lines.push(`${indent(1)}gzip_vary on;`)
    lines.push(`${indent(1)}gzip_proxied any;`)
    lines.push(`${indent(1)}gzip_comp_level 6;`)
    lines.push(`${indent(1)}gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;`)
    lines.push('')
  }

  // Rate limit
  if (opts.enableRateLimit) {
    lines.push(`${indent(1)}# Rate limiting`)
    lines.push(`${indent(1)}limit_req zone=ratelimit burst=20 nodelay;`)
    lines.push('')
  }

  // Scenario-specific config
  if (opts.scenario === 'reverseProxy' || opts.scenario === 'api') {
    lines.push(`${indent(1)}location / {`)
    lines.push(`${indent(2)}proxy_pass http://${opts.backendHost};`)
    lines.push(`${indent(2)}proxy_http_version 1.1;`)
    lines.push(`${indent(2)}proxy_set_header Host $host;`)
    lines.push(`${indent(2)}proxy_set_header X-Real-IP $remote_addr;`)
    lines.push(`${indent(2)}proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)
    lines.push(`${indent(2)}proxy_set_header X-Forwarded-Proto $scheme;`)
    if (opts.enableWebSocket) {
      lines.push('')
      lines.push(`${indent(2)}# WebSocket`)
      lines.push(`${indent(2)}proxy_set_header Upgrade $http_upgrade;`)
      lines.push(`${indent(2)}proxy_set_header Connection "upgrade";`)
    }
    if (opts.enableCors) {
      lines.push('')
      lines.push(`${indent(2)}# CORS`)
      lines.push(`${indent(2)}add_header Access-Control-Allow-Origin "${opts.corsOrigin}" always;`)
      lines.push(`${indent(2)}add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;`)
      lines.push(`${indent(2)}add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;`)
      lines.push(`${indent(2)}if ($request_method = OPTIONS) {`)
      lines.push(`${indent(3)}return 204;`)
      lines.push(`${indent(2)}}`)
    }
    lines.push(`${indent(1)}}`)
  } else if (opts.scenario === 'staticSite') {
    lines.push(`${indent(1)}root ${opts.staticRoot};`)
    lines.push(`${indent(1)}index index.html index.htm;`)
    lines.push('')
    lines.push(`${indent(1)}location / {`)
    lines.push(`${indent(2)}try_files $uri $uri/ =404;`)
    lines.push(`${indent(1)}}`)
  } else if (opts.scenario === 'spa') {
    lines.push(`${indent(1)}root ${opts.staticRoot};`)
    lines.push(`${indent(1)}index index.html;`)
    lines.push('')
    lines.push(`${indent(1)}location / {`)
    lines.push(`${indent(2)}try_files $uri $uri/ /index.html;`)
    lines.push(`${indent(1)}}`)
  } else if (opts.scenario === 'loadBalancer') {
    lines.push(`${indent(1)}location / {`)
    lines.push(`${indent(2)}proxy_pass http://backend;`)
    lines.push(`${indent(2)}proxy_http_version 1.1;`)
    lines.push(`${indent(2)}proxy_set_header Host $host;`)
    lines.push(`${indent(2)}proxy_set_header X-Real-IP $remote_addr;`)
    lines.push(`${indent(2)}proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)
    lines.push(`${indent(2)}proxy_set_header X-Forwarded-Proto $scheme;`)
    lines.push(`${indent(1)}}`)
  } else if (opts.scenario === 'redirect') {
    lines.push(`${indent(1)}return 301 https://${opts.domain}$request_uri;`)
  }

  // Static file caching
  if (opts.enableCache && opts.scenario !== 'redirect') {
    lines.push('')
    lines.push(`${indent(1)}# Static file caching`)
    lines.push(`${indent(1)}location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {`)
    if (opts.scenario === 'reverseProxy' || opts.scenario === 'api' || opts.scenario === 'loadBalancer') {
      lines.push(`${indent(2)}proxy_pass http://${opts.scenario === 'loadBalancer' ? 'backend' : opts.backendHost};`)
    }
    lines.push(`${indent(2)}expires ${opts.cacheDuration};`)
    lines.push(`${indent(2)}add_header Cache-Control "public, immutable";`)
    lines.push(`${indent(2)}access_log off;`)
    lines.push(`${indent(1)}}`)
  }

  // Custom directive
  if (opts.customDirective.trim()) {
    lines.push('')
    lines.push(`${indent(1)}# Custom`)
    opts.customDirective.trim().split('\n').forEach(line => {
      lines.push(`${indent(1)}${line}`)
    })
  }

  lines.push(`}`)

  return lines.join('\n')
}

// ── Caddy 설정 생성 ──

function generateCaddy(opts: ConfigOptions): string {
  const lines: string[] = []
  const indent = (n: number) => '\t'.repeat(n)

  // www redirect
  if (opts.enableWwwRedirect) {
    lines.push(`www.${opts.domain} {`)
    lines.push(`${indent(1)}redir https://${opts.domain}{uri} permanent`)
    lines.push(`}`)
    lines.push('')
  }

  lines.push(`${opts.domain} {`)

  // TLS
  if (opts.enableSsl && opts.sslCertPath !== DEFAULT_OPTIONS.sslCertPath) {
    lines.push(`${indent(1)}tls ${opts.sslCertPath} ${opts.sslKeyPath}`)
  }
  // Caddy auto-HTTPS by default, no explicit TLS needed with Let's Encrypt

  // Gzip/Encode
  if (opts.enableGzip) {
    lines.push(`${indent(1)}encode gzip zstd`)
  }

  // Security headers
  if (opts.enableSecurityHeaders) {
    lines.push('')
    lines.push(`${indent(1)}header {`)
    lines.push(`${indent(2)}X-Frame-Options "SAMEORIGIN"`)
    lines.push(`${indent(2)}X-Content-Type-Options "nosniff"`)
    lines.push(`${indent(2)}X-XSS-Protection "1; mode=block"`)
    lines.push(`${indent(2)}Referrer-Policy "strict-origin-when-cross-origin"`)
    if (opts.enableSsl) {
      lines.push(`${indent(2)}Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"`)
    }
    lines.push(`${indent(2)}-Server`)
    lines.push(`${indent(1)}}`)
  }

  // Rate limit
  if (opts.enableRateLimit) {
    lines.push('')
    lines.push(`${indent(1)}rate_limit {`)
    lines.push(`${indent(2)}zone dynamic_zone {`)
    lines.push(`${indent(3)}key {remote_host}`)
    lines.push(`${indent(3)}events ${opts.rateLimitValue.replace('r/s', '')}`)
    lines.push(`${indent(3)}window 1s`)
    lines.push(`${indent(2)}}`)
    lines.push(`${indent(1)}}`)
  }

  // CORS
  if (opts.enableCors && (opts.scenario === 'api' || opts.scenario === 'reverseProxy')) {
    lines.push('')
    lines.push(`${indent(1)}@cors {`)
    lines.push(`${indent(2)}method OPTIONS`)
    lines.push(`${indent(1)}}`)
    lines.push(`${indent(1)}header Access-Control-Allow-Origin "${opts.corsOrigin}"`)
    lines.push(`${indent(1)}header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"`)
    lines.push(`${indent(1)}header Access-Control-Allow-Headers "Authorization, Content-Type"`)
    lines.push(`${indent(1)}respond @cors 204`)
  }

  // Scenario-specific
  lines.push('')
  if (opts.scenario === 'reverseProxy' || opts.scenario === 'api') {
    lines.push(`${indent(1)}reverse_proxy ${opts.backendHost} {`)
    lines.push(`${indent(2)}header_up Host {host}`)
    lines.push(`${indent(2)}header_up X-Real-IP {remote_host}`)
    lines.push(`${indent(2)}header_up X-Forwarded-For {remote_host}`)
    lines.push(`${indent(2)}header_up X-Forwarded-Proto {scheme}`)
    lines.push(`${indent(1)}}`)
  } else if (opts.scenario === 'staticSite') {
    lines.push(`${indent(1)}root * ${opts.staticRoot}`)
    lines.push(`${indent(1)}file_server`)
  } else if (opts.scenario === 'spa') {
    lines.push(`${indent(1)}root * ${opts.staticRoot}`)
    lines.push(`${indent(1)}try_files {path} /index.html`)
    lines.push(`${indent(1)}file_server`)
  } else if (opts.scenario === 'loadBalancer') {
    lines.push(`${indent(1)}reverse_proxy ${opts.upstreamServers.join(' ')} {`)
    lines.push(`${indent(2)}lb_policy round_robin`)
    lines.push(`${indent(2)}health_uri /health`)
    lines.push(`${indent(2)}health_interval 10s`)
    lines.push(`${indent(1)}}`)
  } else if (opts.scenario === 'redirect') {
    lines.push(`${indent(1)}redir https://${opts.domain}{uri} permanent`)
  }

  // Static caching
  if (opts.enableCache && opts.scenario !== 'redirect') {
    lines.push('')
    lines.push(`${indent(1)}@static path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2`)
    lines.push(`${indent(1)}header @static Cache-Control "public, max-age=${cacheDurationToSeconds(opts.cacheDuration)}, immutable"`)
  }

  // Custom
  if (opts.customDirective.trim()) {
    lines.push('')
    lines.push(`${indent(1)}# Custom`)
    opts.customDirective.trim().split('\n').forEach(line => {
      lines.push(`${indent(1)}${line}`)
    })
  }

  // Log
  lines.push('')
  lines.push(`${indent(1)}log {`)
  lines.push(`${indent(2)}output file /var/log/caddy/${opts.domain}.log`)
  lines.push(`${indent(1)}}`)

  lines.push(`}`)

  return lines.join('\n')
}

function cacheDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/)
  if (!match) return 2592000
  const val = parseInt(match[1], 10)
  switch (match[2]) {
    case 'd': return val * 86400
    case 'h': return val * 3600
    case 'm': return val * 60
    case 's': return val
    default: return 2592000
  }
}

// ── 설정 파싱 (역분석) ──

interface AnalysisItem {
  label: string
  value: string
  status: 'good' | 'warn' | 'info'
}

function detectServerType(config: string): ServerType {
  if (config.includes('server {') || config.includes('server{') || config.includes('proxy_pass') || config.includes('nginx')) return 'nginx'
  if (config.includes('reverse_proxy') || config.includes('file_server') || config.includes('encode gzip')) return 'caddy'
  // heuristic: Caddy uses tabs, Nginx uses spaces with braces
  if (config.includes('{\n\t')) return 'caddy'
  return 'nginx'
}

function parseConfigToOptions(config: string): { options: Partial<ConfigOptions>; analysis: AnalysisItem[] } {
  const analysis: AnalysisItem[] = []
  const opts: Partial<ConfigOptions> = {}
  const serverType = detectServerType(config)
  opts.serverType = serverType

  // Domain
  if (serverType === 'nginx') {
    const serverNameMatch = config.match(/server_name\s+([^\s;]+)/)
    if (serverNameMatch) {
      const domain = serverNameMatch[1].replace('www.', '')
      opts.domain = domain
      analysis.push({ label: 'domain', value: domain, status: 'info' })
    }
  } else {
    // Caddy: first line is usually domain
    const domainMatch = config.match(/^([a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*\{/m)
    if (domainMatch) {
      opts.domain = domainMatch[1].replace('www.', '')
      analysis.push({ label: 'domain', value: opts.domain, status: 'info' })
    }
  }

  // SSL
  const hasSsl = config.includes('ssl_certificate') || config.includes('listen 443') || config.includes('tls ')
  opts.enableSsl = hasSsl
  analysis.push({ label: 'ssl', value: hasSsl ? 'enabled' : 'disabled', status: hasSsl ? 'good' : 'warn' })

  // HTTP/2
  const hasHttp2 = config.includes('http2 on') || config.includes('http2')
  opts.enableHttp2 = hasHttp2
  if (hasSsl && !hasHttp2) {
    analysis.push({ label: 'http2', value: 'disabled', status: 'warn' })
  }

  // SSL cert paths
  if (serverType === 'nginx') {
    const certMatch = config.match(/ssl_certificate\s+([^\s;]+)/)
    const keyMatch = config.match(/ssl_certificate_key\s+([^\s;]+)/)
    if (certMatch) opts.sslCertPath = certMatch[1]
    if (keyMatch) opts.sslKeyPath = keyMatch[1]
  }

  // Gzip
  const hasGzip = config.includes('gzip on') || config.includes('encode gzip') || config.includes('encode zstd')
  opts.enableGzip = hasGzip
  if (!hasGzip) {
    analysis.push({ label: 'gzip', value: 'disabled', status: 'warn' })
  } else {
    analysis.push({ label: 'gzip', value: 'enabled', status: 'good' })
  }

  // Security headers
  const hasSecHeaders = config.includes('X-Frame-Options') || config.includes('X-Content-Type-Options')
  opts.enableSecurityHeaders = hasSecHeaders
  analysis.push({ label: 'securityHeaders', value: hasSecHeaders ? 'enabled' : 'disabled', status: hasSecHeaders ? 'good' : 'warn' })

  // HSTS
  const hasHsts = config.includes('Strict-Transport-Security')
  if (hasSsl && !hasHsts) {
    analysis.push({ label: 'hsts', value: 'missing', status: 'warn' })
  } else if (hasHsts) {
    analysis.push({ label: 'hsts', value: 'enabled', status: 'good' })
  }

  // server_tokens
  const hasTokensOff = config.includes('server_tokens off') || config.includes('-Server')
  if (serverType === 'nginx' && !hasTokensOff) {
    analysis.push({ label: 'serverTokens', value: 'exposed', status: 'warn' })
  } else if (hasTokensOff) {
    analysis.push({ label: 'serverTokens', value: 'hidden', status: 'good' })
  }

  // SSL protocols
  if (hasSsl && serverType === 'nginx') {
    const protocolMatch = config.match(/ssl_protocols\s+([^;]+)/)
    if (protocolMatch) {
      const protocols = protocolMatch[1]
      if (protocols.includes('TLSv1 ') || protocols.includes('TLSv1.0') || protocols.includes('SSLv3')) {
        analysis.push({ label: 'sslProtocols', value: protocols.trim(), status: 'warn' })
      } else {
        analysis.push({ label: 'sslProtocols', value: protocols.trim(), status: 'good' })
      }
    } else if (hasSsl) {
      analysis.push({ label: 'sslProtocols', value: 'default (may include old)', status: 'warn' })
    }
  }

  // CORS
  const hasCors = config.includes('Access-Control-Allow-Origin')
  opts.enableCors = hasCors
  if (hasCors) {
    const originMatch = config.match(/Access-Control-Allow-Origin\s+"([^"]+)"/)
    if (originMatch) {
      opts.corsOrigin = originMatch[1]
      if (originMatch[1] === '*') {
        analysis.push({ label: 'cors', value: 'open (*)', status: 'warn' })
      } else {
        analysis.push({ label: 'cors', value: originMatch[1], status: 'info' })
      }
    }
  }

  // Rate limiting
  const hasRateLimit = config.includes('limit_req') || config.includes('rate_limit')
  opts.enableRateLimit = hasRateLimit
  if (hasRateLimit) {
    const rateMatch = config.match(/rate=(\S+)/)
    if (rateMatch) opts.rateLimitValue = rateMatch[1]
    analysis.push({ label: 'rateLimit', value: 'enabled', status: 'good' })
  }

  // WebSocket
  const hasWs = config.includes('Upgrade') && config.includes('Connection') && (config.includes('upgrade') || config.includes('$http_upgrade'))
  opts.enableWebSocket = hasWs

  // Proxy / scenario detection
  const hasProxy = config.includes('proxy_pass') || config.includes('reverse_proxy')
  const hasRoot = config.includes('root ') || config.includes('root\t')
  const hasTryFiles = config.includes('try_files') && config.includes('/index.html')
  const hasUpstream = config.includes('upstream ')

  if (hasUpstream) {
    opts.scenario = 'loadBalancer'
    const upstreamServers: string[] = []
    const serverMatches = config.matchAll(/upstream[^{]*\{([^}]+)\}/g)
    for (const match of serverMatches) {
      const block = match[1]
      const servers = block.matchAll(/server\s+([^\s;]+)/g)
      for (const s of servers) upstreamServers.push(s[1])
    }
    if (upstreamServers.length > 0) opts.upstreamServers = upstreamServers
  } else if (hasProxy) {
    opts.scenario = hasCors ? 'api' : 'reverseProxy'
    if (serverType === 'nginx') {
      const proxyMatch = config.match(/proxy_pass\s+https?:\/\/([^\s;]+)/)
      if (proxyMatch) opts.backendHost = proxyMatch[1]
    } else {
      const rpMatch = config.match(/reverse_proxy\s+([^\s{]+)/)
      if (rpMatch) opts.backendHost = rpMatch[1]
    }
    analysis.push({ label: 'backend', value: opts.backendHost || 'unknown', status: 'info' })
  } else if (hasTryFiles) {
    opts.scenario = 'spa'
  } else if (hasRoot) {
    opts.scenario = 'staticSite'
  } else if (config.includes('return 301') || config.includes('redir ')) {
    opts.scenario = 'redirect'
  }

  // Static root
  if (serverType === 'nginx') {
    const rootMatch = config.match(/root\s+([^\s;]+)/)
    if (rootMatch) opts.staticRoot = rootMatch[1]
  } else {
    const rootMatch = config.match(/root\s+\*\s+(\S+)/)
    if (rootMatch) opts.staticRoot = rootMatch[1]
  }

  // Caching
  const hasCache = config.includes('expires ') || config.includes('Cache-Control')
  opts.enableCache = hasCache
  if (hasCache) {
    const expiresMatch = config.match(/expires\s+(\S+)/)
    if (expiresMatch) opts.cacheDuration = expiresMatch[1].replace(';', '')
  }

  // www redirect
  const hasWwwRedir = config.includes('www.') && (config.includes('return 301') || config.includes('redir '))
  opts.enableWwwRedirect = hasWwwRedir

  return { options: opts, analysis }
}

// ── 메인 컴포넌트 ──

type ViewMode = 'generate' | 'analyze'

export default function WebserverConfig() {
  const t = useTranslations('webserverConfig')
  const [options, setOptions] = useState<ConfigOptions>({ ...DEFAULT_OPTIONS })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('generate')
  const [analyzeInput, setAnalyzeInput] = useState('')
  const [analysisResult, setAnalysisResult] = useState<{ options: Partial<ConfigOptions>; analysis: AnalysisItem[] } | null>(null)

  const updateOption = useCallback(<K extends keyof ConfigOptions>(key: K, value: ConfigOptions[K]) => {
    setOptions(prev => {
      const next = { ...prev, [key]: value }
      // SSL 인증서 경로 자동 업데이트
      if (key === 'domain') {
        next.sslCertPath = `/etc/letsencrypt/live/${value}/fullchain.pem`
        next.sslKeyPath = `/etc/letsencrypt/live/${value}/privkey.pem`
      }
      return next
    })
  }, [])

  const generatedConfig = useMemo(() => {
    return options.serverType === 'nginx' ? generateNginx(options) : generateCaddy(options)
  }, [options])

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

  const downloadConfig = useCallback(() => {
    const filename = options.serverType === 'nginx'
      ? `${options.domain}.conf`
      : 'Caddyfile'
    const blob = new Blob([generatedConfig], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [generatedConfig, options.serverType, options.domain])

  const applyPreset = useCallback((presetId: PresetId) => {
    const preset = PRESETS[presetId]
    setOptions(prev => ({ ...prev, ...preset }))
  }, [])

  const scenarios: { id: Scenario; labelKey: string; descKey: string }[] = [
    { id: 'reverseProxy', labelKey: 'scenarios.reverseProxy', descKey: 'scenarios.reverseProxyDesc' },
    { id: 'staticSite', labelKey: 'scenarios.staticSite', descKey: 'scenarios.staticSiteDesc' },
    { id: 'spa', labelKey: 'scenarios.spa', descKey: 'scenarios.spaDesc' },
    { id: 'loadBalancer', labelKey: 'scenarios.loadBalancer', descKey: 'scenarios.loadBalancerDesc' },
    { id: 'redirect', labelKey: 'scenarios.redirect', descKey: 'scenarios.redirectDesc' },
    { id: 'api', labelKey: 'scenarios.api', descKey: 'scenarios.apiDesc' },
  ]

  const presetList: { id: PresetId; labelKey: string; descKey: string }[] = [
    { id: 'nextjs', labelKey: 'presets.nextjs', descKey: 'presets.nextjsDesc' },
    { id: 'wordpress', labelKey: 'presets.wordpress', descKey: 'presets.wordpressDesc' },
    { id: 'react', labelKey: 'presets.react', descKey: 'presets.reactDesc' },
    { id: 'django', labelKey: 'presets.django', descKey: 'presets.djangoDesc' },
    { id: 'spring', labelKey: 'presets.spring', descKey: 'presets.springDesc' },
    { id: 'fileServer', labelKey: 'presets.fileServer', descKey: 'presets.fileServerDesc' },
  ]

  const needsBackend = options.scenario === 'reverseProxy' || options.scenario === 'api'
  const needsStaticRoot = options.scenario === 'staticSite' || options.scenario === 'spa'
  const needsUpstream = options.scenario === 'loadBalancer'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* 모드 토글: 생성 / 분석 */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setViewMode('generate')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'generate'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Server className="w-4 h-4" />
          {t('tabGenerate')}
        </button>
        <button
          onClick={() => setViewMode('analyze')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'analyze'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          {t('tabAnalyze')}
        </button>
      </div>

      {/* ═══ 분석 모드 ═══ */}
      {viewMode === 'analyze' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 입력 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('analyzeTitle')}</h2>
              {analysisResult && (
                <button
                  onClick={() => {
                    const merged = { ...DEFAULT_OPTIONS, ...analysisResult.options }
                    setOptions(merged)
                    setViewMode('generate')
                  }}
                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  {t('applyToGenerator')}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('analyzeDesc')}</p>
            <textarea
              value={analyzeInput}
              onChange={e => {
                setAnalyzeInput(e.target.value)
                if (e.target.value.trim().length > 10) {
                  setAnalysisResult(parseConfigToOptions(e.target.value))
                } else {
                  setAnalysisResult(null)
                }
              }}
              placeholder={t('analyzePlaceholder')}
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
            />
          </div>

          {/* 분석 결과 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('analyzeResult')}</h2>

            {analysisResult ? (
              <div className="space-y-4">
                {/* 감지된 정보 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('serverType')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {analysisResult.options.serverType === 'nginx' ? 'Nginx' : 'Caddy'}
                    </span>
                  </div>
                  {analysisResult.options.domain && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('domain')}</span>
                      <span className="font-mono text-gray-900 dark:text-white">{analysisResult.options.domain}</span>
                    </div>
                  )}
                  {analysisResult.options.scenario && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('scenario')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{t(`scenarios.${analysisResult.options.scenario}`)}</span>
                    </div>
                  )}
                  {analysisResult.options.backendHost && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('backendHost')}</span>
                      <span className="font-mono text-gray-900 dark:text-white">{analysisResult.options.backendHost}</span>
                    </div>
                  )}
                </div>

                {/* 보안/성능 분석 */}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('analyzeChecklist')}</h3>
                <div className="space-y-1">
                  {analysisResult.analysis.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        item.status === 'good'
                          ? 'bg-green-50 dark:bg-green-950/20'
                          : item.status === 'warn'
                            ? 'bg-yellow-50 dark:bg-yellow-950/20'
                            : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          item.status === 'good' ? 'bg-green-500' : item.status === 'warn' ? 'bg-yellow-500' : 'bg-blue-400'
                        }`} />
                        <span className="text-gray-700 dark:text-gray-300">{t(`analysis.${item.label}`)}</span>
                      </span>
                      <span className={`font-mono text-xs ${
                        item.status === 'good'
                          ? 'text-green-700 dark:text-green-400'
                          : item.status === 'warn'
                            ? 'text-yellow-700 dark:text-yellow-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 경고 요약 */}
                {analysisResult.analysis.filter(a => a.status === 'warn').length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">{t('analyzeWarnings')}</p>
                    <ul className="space-y-1">
                      {analysisResult.analysis.filter(a => a.status === 'warn').map((item, i) => (
                        <li key={i} className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-1">
                          <span className="shrink-0">⚠</span>
                          {t(`analysisAdvice.${item.label}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 py-12">
                <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('analyzePrompt')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 생성 모드 ═══ */}
      {viewMode === 'generate' && <div className="grid lg:grid-cols-5 gap-6">
        {/* 왼쪽: 설정 패널 (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          {/* 서버 타입 + 시나리오 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
            {/* 서버 타입 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('serverType')}</label>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => updateOption('serverType', 'nginx')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${options.serverType === 'nginx' ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  Nginx
                </button>
                <button
                  onClick={() => updateOption('serverType', 'caddy')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${options.serverType === 'caddy' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                  Caddy
                </button>
              </div>
            </div>

            {/* 시나리오 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('scenario')}</label>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map(s => (
                  <button
                    key={s.id}
                    onClick={() => updateOption('scenario', s.id)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                      options.scenario === s.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{t(s.labelKey)}</div>
                    <div className="text-gray-500 dark:text-gray-400 mt-0.5">{t(s.descKey)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 도메인 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('domain')}</label>
              <input
                type="text"
                value={options.domain}
                onChange={e => updateOption('domain', e.target.value)}
                placeholder={t('domainPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
            </div>

            {/* 백엔드 호스트 */}
            {needsBackend && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('backendHost')}</label>
                <input
                  type="text"
                  value={options.backendHost}
                  onChange={e => updateOption('backendHost', e.target.value)}
                  placeholder={t('backendHostPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
            )}

            {/* 정적 파일 경로 */}
            {needsStaticRoot && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staticRoot')}</label>
                <input
                  type="text"
                  value={options.staticRoot}
                  onChange={e => updateOption('staticRoot', e.target.value)}
                  placeholder={t('staticRootPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
            )}

            {/* 로드밸런서 업스트림 */}
            {needsUpstream && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upstream Servers</label>
                {options.upstreamServers.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input
                      type="text"
                      value={s}
                      onChange={e => {
                        const next = [...options.upstreamServers]
                        next[i] = e.target.value
                        updateOption('upstreamServers', next)
                      }}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                    />
                    {options.upstreamServers.length > 2 && (
                      <button
                        onClick={() => updateOption('upstreamServers', options.upstreamServers.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >✕</button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => updateOption('upstreamServers', [...options.upstreamServers, '127.0.0.1:300' + (options.upstreamServers.length + 1)])}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                >+ Add server</button>
              </div>
            )}
          </div>

          {/* 옵션 토글 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
            <ToggleRow label={t('enableSsl')} checked={options.enableSsl} onChange={v => updateOption('enableSsl', v)} />
            {options.enableSsl && <ToggleRow label={t('enableHttp2')} checked={options.enableHttp2} onChange={v => updateOption('enableHttp2', v)} />}
            <ToggleRow label={t('enableGzip')} checked={options.enableGzip} onChange={v => updateOption('enableGzip', v)} />
            <ToggleRow label={t('enableWwwRedirect')} checked={options.enableWwwRedirect} onChange={v => updateOption('enableWwwRedirect', v)} />
            <ToggleRow label={t('enableSecurityHeaders')} checked={options.enableSecurityHeaders} onChange={v => updateOption('enableSecurityHeaders', v)} />
            <ToggleRow label={t('enableWebSocket')} checked={options.enableWebSocket} onChange={v => updateOption('enableWebSocket', v)} />
            <ToggleRow label={t('enableCache')} checked={options.enableCache} onChange={v => updateOption('enableCache', v)} />
            {options.enableCache && (
              <div className="pl-8">
                <input
                  type="text"
                  value={options.cacheDuration}
                  onChange={e => updateOption('cacheDuration', e.target.value)}
                  placeholder={t('cacheDurationPlaceholder')}
                  className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                />
              </div>
            )}
            <ToggleRow label={t('enableCors')} checked={options.enableCors} onChange={v => updateOption('enableCors', v)} />
            {options.enableCors && (
              <div className="pl-8">
                <input
                  type="text"
                  value={options.corsOrigin}
                  onChange={e => updateOption('corsOrigin', e.target.value)}
                  placeholder={t('corsOriginPlaceholder')}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                />
              </div>
            )}
            <ToggleRow label={t('enableRateLimit')} checked={options.enableRateLimit} onChange={v => updateOption('enableRateLimit', v)} />
            {options.enableRateLimit && (
              <div className="pl-8">
                <input
                  type="text"
                  value={options.rateLimitValue}
                  onChange={e => updateOption('rateLimitValue', e.target.value)}
                  placeholder={t('rateLimitPlaceholder')}
                  className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                />
              </div>
            )}

            {/* 커스텀 설정 */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customDirective')}</label>
              <textarea
                value={options.customDirective}
                onChange={e => updateOption('customDirective', e.target.value)}
                placeholder={t('customDirectivePlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono resize-y"
              />
            </div>
          </div>

          {/* 베스트 프리셋 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              {t('presetLabel')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {presetList.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-colors"
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-white">{t(p.labelKey)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(p.descKey)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 생성된 설정 (3/5) */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('generatedConfig')} — {options.serverType === 'nginx' ? 'Nginx' : 'Caddy'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOptions({ ...DEFAULT_OPTIONS })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('reset')}
                </button>
                <button
                  onClick={downloadConfig}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3" />
                  {t('download')}
                </button>
                <button
                  onClick={() => copyToClipboard(generatedConfig, 'config')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {copiedId === 'config' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedId === 'config' ? t('copied') : t('copy')}
                </button>
              </div>
            </div>

            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
              {generatedConfig}
            </pre>
          </div>
        </div>
      </div>}

      {/* 가이드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t('guide.title')}
          </h2>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>

        {showGuide && (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            {(['nginx', 'caddy', 'security'] as const).map(section => (
              <div key={section} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {t(`guide.${section}.title`)}
                </h3>
                <ul className="space-y-2">
                  {(t.raw(`guide.${section}.items`) as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 토글 서브컴포넌트 ──

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-blue-600 transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
      </div>
    </label>
  )
}
