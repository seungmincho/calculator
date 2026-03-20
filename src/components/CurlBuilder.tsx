'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Copy,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Clock,
  BookOpen,
  Terminal,
  Code,
  ArrowRightLeft,
} from 'lucide-react'

// ── Types ──

interface KeyValueRow {
  key: string
  value: string
  enabled: boolean
}

interface FormField {
  key: string
  value: string
  isFile?: boolean
}

interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'apiKey'
  token?: string
  username?: string
  password?: string
  headerName?: string
  apiKeyValue?: string
}

interface BodyConfig {
  type: 'none' | 'raw' | 'formData' | 'urlencoded'
  content?: string
  fields?: FormField[]
}

interface OptionsConfig {
  followRedirects: boolean
  insecure: boolean
  verbose: boolean
  compressed: boolean
  includeHeaders: boolean
  maxTime?: number
}

interface RequestConfig {
  method: string
  url: string
  queryParams: KeyValueRow[]
  headers: KeyValueRow[]
  auth: AuthConfig
  body: BodyConfig
  options: OptionsConfig
}

interface CurlHistoryItem {
  id: string
  timestamp: number
  method: string
  url: string
  curlCommand: string
  config: RequestConfig
}

type ExportFormat = 'curl' | 'fetch' | 'axios' | 'python' | 'go' | 'php'

// ── Constants ──

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PATCH: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  HEAD: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OPTIONS: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

const HEADER_PRESETS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Content-Type', value: 'application/x-www-form-urlencoded' },
  { key: 'Content-Type', value: 'multipart/form-data' },
  { key: 'Accept', value: 'application/json' },
  { key: 'Authorization', value: 'Bearer <token>' },
  { key: 'Cache-Control', value: 'no-cache' },
  { key: 'X-API-Key', value: '<key>' },
]

const EXAMPLE_CURLS = [
  {
    label: 'GET with headers',
    command: `curl -X GET 'https://api.example.com/users' -H 'Accept: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9'`,
  },
  {
    label: 'POST JSON',
    command: `curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -d '{"name":"John","email":"john@example.com"}'`,
  },
  {
    label: 'PUT with Basic Auth',
    command: `curl -X PUT 'https://api.example.com/users/123' -u 'admin:password123' -H 'Content-Type: application/json' -d '{"name":"Updated"}'`,
  },
  {
    label: 'POST Form Data',
    command: `curl -X POST 'https://api.example.com/upload' -F 'file=@photo.jpg' -F 'description=Profile photo'`,
  },
  {
    label: 'DELETE with API Key',
    command: `curl -X DELETE 'https://api.example.com/users/456' -H 'X-API-Key: abc123def456'`,
  },
]

const HISTORY_KEY = 'curl-builder-history'
const MAX_HISTORY = 20

// ── Utility Functions ──

function createEmptyConfig(): RequestConfig {
  return {
    method: 'GET',
    url: '',
    queryParams: [{ key: '', value: '', enabled: true }],
    headers: [{ key: '', value: '', enabled: true }],
    auth: { type: 'none' },
    body: { type: 'none', content: '', fields: [{ key: '', value: '', isFile: false }] },
    options: {
      followRedirects: false,
      insecure: false,
      verbose: false,
      compressed: false,
      includeHeaders: false,
    },
  }
}

function escapeShellSingle(s: string): string {
  // For single-quoted strings: replace ' with '\''
  return s.replace(/'/g, "'\\''")
}

function buildUrlWithParams(baseUrl: string, params: KeyValueRow[]): string {
  const enabledParams = params.filter(p => p.enabled && p.key.trim())
  if (enabledParams.length === 0) return baseUrl

  const separator = baseUrl.includes('?') ? '&' : '?'
  const queryString = enabledParams
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&')
  return `${baseUrl}${separator}${queryString}`
}

function buildCurl(config: RequestConfig, multiline: boolean): string {
  const parts: string[] = ['curl']

  if (config.method !== 'GET') {
    parts.push(`-X ${config.method}`)
  }

  const url = buildUrlWithParams(config.url, config.queryParams)
  parts.push(`'${escapeShellSingle(url)}'`)

  // Headers
  for (const header of config.headers) {
    if (header.enabled && header.key.trim()) {
      parts.push(`-H '${escapeShellSingle(header.key)}: ${escapeShellSingle(header.value)}'`)
    }
  }

  // Auth
  if (config.auth.type === 'bearer' && config.auth.token) {
    parts.push(`-H 'Authorization: Bearer ${escapeShellSingle(config.auth.token)}'`)
  } else if (config.auth.type === 'basic' && config.auth.username) {
    parts.push(`-u '${escapeShellSingle(config.auth.username)}:${escapeShellSingle(config.auth.password || '')}'`)
  } else if (config.auth.type === 'apiKey' && config.auth.apiKeyValue) {
    const headerName = config.auth.headerName || 'X-API-Key'
    parts.push(`-H '${escapeShellSingle(headerName)}: ${escapeShellSingle(config.auth.apiKeyValue)}'`)
  }

  // Body
  if (['POST', 'PUT', 'PATCH'].includes(config.method)) {
    if (config.body.type === 'raw' && config.body.content) {
      parts.push(`-d '${escapeShellSingle(config.body.content)}'`)
    } else if (config.body.type === 'formData' && config.body.fields) {
      for (const field of config.body.fields) {
        if (field.key.trim()) {
          if (field.isFile) {
            parts.push(`-F '${escapeShellSingle(field.key)}=@${escapeShellSingle(field.value)}'`)
          } else {
            parts.push(`-F '${escapeShellSingle(field.key)}=${escapeShellSingle(field.value)}'`)
          }
        }
      }
    } else if (config.body.type === 'urlencoded' && config.body.fields) {
      for (const field of config.body.fields) {
        if (field.key.trim()) {
          parts.push(`--data-urlencode '${escapeShellSingle(field.key)}=${escapeShellSingle(field.value)}'`)
        }
      }
    }
  }

  // Options
  if (config.options.followRedirects) parts.push('-L')
  if (config.options.insecure) parts.push('-k')
  if (config.options.verbose) parts.push('-v')
  if (config.options.compressed) parts.push('--compressed')
  if (config.options.includeHeaders) parts.push('-i')
  if (config.options.maxTime) parts.push(`--max-time ${config.options.maxTime}`)

  if (multiline) {
    return parts.join(' \\\n  ')
  }
  return parts.join(' ')
}

// ── Code Generators ──

function getAllHeaders(config: RequestConfig): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const h of config.headers) {
    if (h.enabled && h.key.trim()) {
      headers[h.key] = h.value
    }
  }
  if (config.auth.type === 'bearer' && config.auth.token) {
    headers['Authorization'] = `Bearer ${config.auth.token}`
  } else if (config.auth.type === 'apiKey' && config.auth.apiKeyValue) {
    headers[config.auth.headerName || 'X-API-Key'] = config.auth.apiKeyValue
  }
  return headers
}

function getBodyString(config: RequestConfig): string | null {
  if (!['POST', 'PUT', 'PATCH'].includes(config.method)) return null
  if (config.body.type === 'raw' && config.body.content) return config.body.content
  if (config.body.type === 'urlencoded' && config.body.fields) {
    const fields = config.body.fields.filter(f => f.key.trim())
    if (fields.length === 0) return null
    return fields.map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`).join('&')
  }
  return null
}

function generateFetch(config: RequestConfig): string {
  const url = buildUrlWithParams(config.url, config.queryParams)
  const headers = getAllHeaders(config)
  const body = getBodyString(config)
  const hasHeaders = Object.keys(headers).length > 0
  const isJson = headers['Content-Type']?.includes('application/json')

  let code = ''
  if (config.body.type === 'formData' && config.body.fields) {
    const fields = config.body.fields.filter(f => f.key.trim())
    if (fields.length > 0) {
      code += 'const formData = new FormData();\n'
      for (const f of fields) {
        if (f.isFile) {
          code += `formData.append('${f.key}', fileInput.files[0]); // ${f.value}\n`
        } else {
          code += `formData.append('${f.key}', '${f.value}');\n`
        }
      }
      code += '\n'
    }
  }

  code += `const response = await fetch('${url}'`

  const opts: string[] = []
  if (config.method !== 'GET') {
    opts.push(`  method: '${config.method}'`)
  }
  if (hasHeaders && config.body.type !== 'formData') {
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(',\n')
    opts.push(`  headers: {\n${headerLines}\n  }`)
  }
  if (config.body.type === 'formData') {
    // Remove Content-Type for FormData (browser sets it with boundary)
    const filteredHeaders = Object.entries(headers).filter(([k]) => k !== 'Content-Type')
    if (filteredHeaders.length > 0) {
      const headerLines = filteredHeaders.map(([k, v]) => `    '${k}': '${v}'`).join(',\n')
      opts.push(`  headers: {\n${headerLines}\n  }`)
    }
    opts.push('  body: formData')
  } else if (body) {
    if (isJson) {
      try {
        const parsed = JSON.parse(body)
        opts.push(`  body: JSON.stringify(${JSON.stringify(parsed, null, 4).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')})`)
      } catch {
        opts.push(`  body: '${body.replace(/'/g, "\\'")}'`)
      }
    } else {
      opts.push(`  body: '${body.replace(/'/g, "\\'")}'`)
    }
  }

  if (opts.length > 0) {
    code += `, {\n${opts.join(',\n')}\n}`
  }
  code += ');\n\nconst data = await response.json();'

  return code
}

function generateAxios(config: RequestConfig): string {
  const url = buildUrlWithParams(config.url, config.queryParams)
  const headers = getAllHeaders(config)
  const body = getBodyString(config)
  const hasHeaders = Object.keys(headers).length > 0
  const isJson = headers['Content-Type']?.includes('application/json')

  let code = ''
  if (config.body.type === 'formData' && config.body.fields) {
    const fields = config.body.fields.filter(f => f.key.trim())
    if (fields.length > 0) {
      code += 'const formData = new FormData();\n'
      for (const f of fields) {
        if (f.isFile) {
          code += `formData.append('${f.key}', fileInput.files[0]); // ${f.value}\n`
        } else {
          code += `formData.append('${f.key}', '${f.value}');\n`
        }
      }
      code += '\n'
    }
  }

  const axiosOpts: string[] = []
  axiosOpts.push(`  method: '${config.method.toLowerCase()}'`)
  axiosOpts.push(`  url: '${url}'`)

  if (hasHeaders && config.body.type !== 'formData') {
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(',\n')
    axiosOpts.push(`  headers: {\n${headerLines}\n  }`)
  }
  if (config.body.type === 'formData') {
    const filteredHeaders = Object.entries(headers).filter(([k]) => k !== 'Content-Type')
    if (filteredHeaders.length > 0) {
      const headerLines = filteredHeaders.map(([k, v]) => `    '${k}': '${v}'`).join(',\n')
      axiosOpts.push(`  headers: {\n${headerLines}\n  }`)
    }
    axiosOpts.push('  data: formData')
  } else if (body) {
    if (isJson) {
      try {
        const parsed = JSON.parse(body)
        axiosOpts.push(`  data: ${JSON.stringify(parsed, null, 4).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')}`)
      } catch {
        axiosOpts.push(`  data: '${body.replace(/'/g, "\\'")}'`)
      }
    } else {
      axiosOpts.push(`  data: '${body.replace(/'/g, "\\'")}'`)
    }
  }

  if (config.auth.type === 'basic' && config.auth.username) {
    axiosOpts.push(`  auth: {\n    username: '${config.auth.username}',\n    password: '${config.auth.password || ''}'\n  }`)
  }

  code += `const { data } = await axios({\n${axiosOpts.join(',\n')}\n});`
  return code
}

function generatePython(config: RequestConfig): string {
  const url = buildUrlWithParams(config.url, config.queryParams)
  const headers = getAllHeaders(config)
  const body = getBodyString(config)
  const hasHeaders = Object.keys(headers).length > 0
  const isJson = headers['Content-Type']?.includes('application/json')
  const method = config.method.toLowerCase()

  let code = 'import requests\n\n'

  const args: string[] = []
  args.push(`    '${url}'`)

  if (hasHeaders) {
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `        '${k}': '${v}'`)
      .join(',\n')
    args.push(`    headers={\n${headerLines}\n    }`)
  }

  if (config.auth.type === 'basic' && config.auth.username) {
    args.push(`    auth=('${config.auth.username}', '${config.auth.password || ''}')`)
  }

  if (config.body.type === 'formData' && config.body.fields) {
    const fields = config.body.fields.filter(f => f.key.trim())
    if (fields.length > 0) {
      const fileFields = fields.filter(f => f.isFile)
      const dataFields = fields.filter(f => !f.isFile)
      if (dataFields.length > 0) {
        const dataLines = dataFields.map(f => `        '${f.key}': '${f.value}'`).join(',\n')
        args.push(`    data={\n${dataLines}\n    }`)
      }
      if (fileFields.length > 0) {
        const fileLines = fileFields.map(f => `        '${f.key}': open('${f.value}', 'rb')`).join(',\n')
        args.push(`    files={\n${fileLines}\n    }`)
      }
    }
  } else if (body) {
    if (isJson) {
      try {
        const parsed = JSON.parse(body)
        const jsonStr = JSON.stringify(parsed, null, 8)
          .replace(/"/g, "'")
          .split('\n')
          .map((line, i) => (i === 0 ? line : '    ' + line))
          .join('\n')
        args.push(`    json=${jsonStr}`)
      } catch {
        args.push(`    data='${body.replace(/'/g, "\\'")}'`)
      }
    } else {
      args.push(`    data='${body.replace(/'/g, "\\'")}'`)
    }
  }

  code += `response = requests.${method}(\n${args.join(',\n')}\n)\n`

  if (config.options.insecure) {
    // Add verify=False hint
    code = code.replace(')\n', ',\n    verify=False\n)\n')
  }

  code += 'data = response.json()'
  return code
}

function generateGo(config: RequestConfig): string {
  const url = buildUrlWithParams(config.url, config.queryParams)
  const headers = getAllHeaders(config)
  const body = getBodyString(config)

  let code = 'package main\n\nimport (\n'
  const imports: string[] = ['"fmt"', '"io"', '"net/http"']
  if (body) {
    imports.push('"strings"')
  }
  code += imports.map(i => `\t${i}`).join('\n')
  code += '\n)\n\nfunc main() {\n'

  if (body) {
    code += `\tbody := strings.NewReader(\`${body}\`)\n`
    code += `\treq, err := http.NewRequest("${config.method}", "${url}", body)\n`
  } else {
    code += `\treq, err := http.NewRequest("${config.method}", "${url}", nil)\n`
  }
  code += '\tif err != nil {\n\t\tpanic(err)\n\t}\n\n'

  for (const [k, v] of Object.entries(headers)) {
    code += `\treq.Header.Set("${k}", "${v}")\n`
  }

  if (config.auth.type === 'basic' && config.auth.username) {
    code += `\treq.SetBasicAuth("${config.auth.username}", "${config.auth.password || ''}")\n`
  }

  code += '\n\tclient := &http.Client{}\n'
  code += '\tresp, err := client.Do(req)\n'
  code += '\tif err != nil {\n\t\tpanic(err)\n\t}\n'
  code += '\tdefer resp.Body.Close()\n\n'
  code += '\trespBody, _ := io.ReadAll(resp.Body)\n'
  code += '\tfmt.Println(string(respBody))\n'
  code += '}'

  return code
}

function generatePhp(config: RequestConfig): string {
  const url = buildUrlWithParams(config.url, config.queryParams)
  const headers = getAllHeaders(config)
  const body = getBodyString(config)

  let code = '<?php\n$ch = curl_init();\n\n'
  code += `curl_setopt($ch, CURLOPT_URL, '${url}');\n`
  code += 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n'

  if (config.method === 'POST') {
    code += 'curl_setopt($ch, CURLOPT_POST, true);\n'
  } else if (config.method !== 'GET') {
    code += `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${config.method}');\n`
  }

  const headerEntries = Object.entries(headers)
  if (headerEntries.length > 0) {
    const headerLines = headerEntries.map(([k, v]) => `    '${k}: ${v}'`).join(',\n')
    code += `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${headerLines}\n]);\n`
  }

  if (config.auth.type === 'basic' && config.auth.username) {
    code += `curl_setopt($ch, CURLOPT_USERPWD, '${config.auth.username}:${config.auth.password || ''}');\n`
  }

  if (config.body.type === 'formData' && config.body.fields) {
    const fields = config.body.fields.filter(f => f.key.trim())
    if (fields.length > 0) {
      const fieldLines = fields
        .map(f => {
          if (f.isFile) {
            return `    '${f.key}' => new CURLFile('${f.value}')`
          }
          return `    '${f.key}' => '${f.value}'`
        })
        .join(',\n')
      code += `curl_setopt($ch, CURLOPT_POSTFIELDS, [\n${fieldLines}\n]);\n`
    }
  } else if (body) {
    const isJson = headers['Content-Type']?.includes('application/json')
    if (isJson) {
      try {
        const parsed = JSON.parse(body)
        const phpArray = jsonToPhpArray(parsed, 1)
        code += `curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(${phpArray}));\n`
      } catch {
        code += `curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');\n`
      }
    } else {
      code += `curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');\n`
    }
  }

  if (config.options.followRedirects) {
    code += 'curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);\n'
  }
  if (config.options.insecure) {
    code += 'curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);\n'
  }
  if (config.options.maxTime) {
    code += `curl_setopt($ch, CURLOPT_TIMEOUT, ${config.options.maxTime});\n`
  }

  code += '\n$response = curl_exec($ch);\ncurl_close($ch);\n\necho $response;\n?>'
  return code
}

function jsonToPhpArray(obj: unknown, indent: number): string {
  const pad = '    '.repeat(indent)
  const padInner = '    '.repeat(indent + 1)
  if (obj === null) return 'null'
  if (typeof obj === 'string') return `'${obj}'`
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    const items = obj.map(item => `${padInner}${jsonToPhpArray(item, indent + 1)}`).join(',\n')
    return `[\n${items}\n${pad}]`
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '[]'
    const items = entries
      .map(([k, v]) => `${padInner}'${k}' => ${jsonToPhpArray(v, indent + 1)}`)
      .join(',\n')
    return `[\n${items}\n${pad}]`
  }
  return String(obj)
}

function generateCode(config: RequestConfig, format: ExportFormat, multiline: boolean): string {
  switch (format) {
    case 'curl':
      return buildCurl(config, multiline)
    case 'fetch':
      return generateFetch(config)
    case 'axios':
      return generateAxios(config)
    case 'python':
      return generatePython(config)
    case 'go':
      return generateGo(config)
    case 'php':
      return generatePhp(config)
    default:
      return buildCurl(config, multiline)
  }
}

// ── Parser ──

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let i = 0
  const len = input.length

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(input[i])) i++
    if (i >= len) break

    const ch = input[i]

    if (ch === "'") {
      // Single-quoted string
      let token = ''
      i++ // skip opening quote
      while (i < len && input[i] !== "'") {
        token += input[i]
        i++
      }
      i++ // skip closing quote
      tokens.push(token)
    } else if (ch === '"') {
      // Double-quoted string (supports backslash escapes)
      let token = ''
      i++ // skip opening quote
      while (i < len && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < len) {
          const next = input[i + 1]
          if (next === '"' || next === '\\' || next === 'n' || next === 't') {
            if (next === 'n') token += '\n'
            else if (next === 't') token += '\t'
            else token += next
            i += 2
            continue
          }
        }
        token += input[i]
        i++
      }
      i++ // skip closing quote
      tokens.push(token)
    } else if (ch === '$' && i + 1 < len && input[i + 1] === "'") {
      // ANSI-C quoting $'...'
      let token = ''
      i += 2 // skip $'
      while (i < len && input[i] !== "'") {
        if (input[i] === '\\' && i + 1 < len) {
          const next = input[i + 1]
          if (next === 'n') { token += '\n'; i += 2; continue }
          if (next === 't') { token += '\t'; i += 2; continue }
          if (next === "'") { token += "'"; i += 2; continue }
          if (next === '\\') { token += '\\'; i += 2; continue }
        }
        token += input[i]
        i++
      }
      i++ // skip closing quote
      tokens.push(token)
    } else {
      // Unquoted token
      let token = ''
      while (i < len && !/\s/.test(input[i])) {
        token += input[i]
        i++
      }
      tokens.push(token)
    }
  }

  return tokens
}

function parseCurl(input: string): { config: RequestConfig; error?: string } {
  // Normalize: join backslash-continued lines
  const normalized = input.replace(/\\\r?\n\s*/g, ' ').trim()

  const tokens = tokenize(normalized)

  if (tokens.length === 0) {
    return { config: createEmptyConfig(), error: 'Empty input' }
  }

  // Skip 'curl' at beginning
  let idx = 0
  if (tokens[0].toLowerCase() === 'curl') {
    idx = 1
  }

  const config = createEmptyConfig()
  config.queryParams = []
  config.headers = []
  const parsedHeaders: { key: string; value: string }[] = []
  let method = ''
  let url = ''
  let bodyContent = ''
  let bodyType: 'none' | 'raw' | 'formData' | 'urlencoded' = 'none'
  const formFields: FormField[] = []

  while (idx < tokens.length) {
    const token = tokens[idx]

    if (token === '-X' || token === '--request') {
      idx++
      if (idx < tokens.length) {
        method = tokens[idx].toUpperCase()
      }
    } else if (token === '-H' || token === '--header') {
      idx++
      if (idx < tokens.length) {
        const headerStr = tokens[idx]
        const colonIdx = headerStr.indexOf(':')
        if (colonIdx > 0) {
          const key = headerStr.substring(0, colonIdx).trim()
          const value = headerStr.substring(colonIdx + 1).trim()
          parsedHeaders.push({ key, value })
        }
      }
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      idx++
      if (idx < tokens.length) {
        bodyContent = tokens[idx]
        bodyType = 'raw'
      }
    } else if (token === '--data-urlencode') {
      idx++
      if (idx < tokens.length) {
        bodyType = 'urlencoded'
        const fieldStr = tokens[idx]
        const eqIdx = fieldStr.indexOf('=')
        if (eqIdx > 0) {
          formFields.push({
            key: decodeURIComponent(fieldStr.substring(0, eqIdx)),
            value: decodeURIComponent(fieldStr.substring(eqIdx + 1)),
          })
        } else {
          bodyContent += (bodyContent ? '&' : '') + fieldStr
        }
      }
    } else if (token === '-F' || token === '--form') {
      idx++
      if (idx < tokens.length) {
        bodyType = 'formData'
        const fieldStr = tokens[idx]
        const eqIdx = fieldStr.indexOf('=')
        if (eqIdx > 0) {
          const key = fieldStr.substring(0, eqIdx)
          const value = fieldStr.substring(eqIdx + 1)
          if (value.startsWith('@')) {
            formFields.push({ key, value: value.substring(1), isFile: true })
          } else {
            formFields.push({ key, value })
          }
        }
      }
    } else if (token === '-u' || token === '--user') {
      idx++
      if (idx < tokens.length) {
        const userStr = tokens[idx]
        const colonIdx = userStr.indexOf(':')
        if (colonIdx > 0) {
          config.auth = {
            type: 'basic',
            username: userStr.substring(0, colonIdx),
            password: userStr.substring(colonIdx + 1),
          }
        } else {
          config.auth = { type: 'basic', username: userStr, password: '' }
        }
      }
    } else if (token === '-L' || token === '--location') {
      config.options.followRedirects = true
    } else if (token === '-k' || token === '--insecure') {
      config.options.insecure = true
    } else if (token === '-v' || token === '--verbose') {
      config.options.verbose = true
    } else if (token === '--compressed') {
      config.options.compressed = true
    } else if (token === '-i' || token === '--include') {
      config.options.includeHeaders = true
    } else if (token === '--max-time') {
      idx++
      if (idx < tokens.length) {
        const val = parseInt(tokens[idx], 10)
        if (!isNaN(val)) config.options.maxTime = val
      }
    } else if (token === '-m') {
      idx++
      if (idx < tokens.length) {
        const val = parseInt(tokens[idx], 10)
        if (!isNaN(val)) config.options.maxTime = val
      }
    } else if (token.startsWith('-') && !token.startsWith('--')) {
      // Combined short flags like -Lkv or -sS, skip unknown
      for (let c = 1; c < token.length; c++) {
        const flag = token[c]
        if (flag === 'L') config.options.followRedirects = true
        else if (flag === 'k') config.options.insecure = true
        else if (flag === 'v') config.options.verbose = true
        else if (flag === 'i') config.options.includeHeaders = true
        // skip unknown flags like s, S, etc.
      }
    } else if (!token.startsWith('-') && !url) {
      // This is likely the URL
      url = token
    }

    idx++
  }

  // Detect auth from headers
  const authHeaderIdx = parsedHeaders.findIndex(
    h => h.key.toLowerCase() === 'authorization'
  )
  if (authHeaderIdx >= 0 && config.auth.type === 'none') {
    const authValue = parsedHeaders[authHeaderIdx].value
    if (authValue.toLowerCase().startsWith('bearer ')) {
      config.auth = { type: 'bearer', token: authValue.substring(7) }
      parsedHeaders.splice(authHeaderIdx, 1)
    } else if (authValue.toLowerCase().startsWith('basic ')) {
      try {
        const decoded = atob(authValue.substring(6))
        const colonIdx = decoded.indexOf(':')
        if (colonIdx > 0) {
          config.auth = {
            type: 'basic',
            username: decoded.substring(0, colonIdx),
            password: decoded.substring(colonIdx + 1),
          }
        }
      } catch {
        // Keep as bearer if base64 decode fails
        config.auth = { type: 'bearer', token: authValue.substring(6) }
      }
      parsedHeaders.splice(authHeaderIdx, 1)
    }
  }

  // Check for API Key pattern in headers
  if (config.auth.type === 'none') {
    const apiKeyIdx = parsedHeaders.findIndex(
      h => h.key.toLowerCase() === 'x-api-key'
    )
    if (apiKeyIdx >= 0) {
      config.auth = {
        type: 'apiKey',
        headerName: parsedHeaders[apiKeyIdx].key,
        apiKeyValue: parsedHeaders[apiKeyIdx].value,
      }
      parsedHeaders.splice(apiKeyIdx, 1)
    }
  }

  // Parse URL query params
  if (url) {
    try {
      const urlObj = new URL(url)
      const params: KeyValueRow[] = []
      urlObj.searchParams.forEach((value, key) => {
        params.push({ key, value, enabled: true })
      })
      if (params.length > 0) {
        config.queryParams = params
        config.url = `${urlObj.origin}${urlObj.pathname}`
      } else {
        config.url = url
      }
    } catch {
      config.url = url
    }
  }

  // Set method (default based on body presence)
  if (method) {
    config.method = method
  } else if (bodyType !== 'none') {
    config.method = 'POST'
  } else {
    config.method = 'GET'
  }

  // Set headers
  config.headers = parsedHeaders.length > 0
    ? parsedHeaders.map(h => ({ key: h.key, value: h.value, enabled: true }))
    : [{ key: '', value: '', enabled: true }]

  // Add empty row for query params if empty
  if (config.queryParams.length === 0) {
    config.queryParams = [{ key: '', value: '', enabled: true }]
  }

  // Set body
  if (bodyType === 'raw') {
    config.body = { type: 'raw', content: bodyContent, fields: [{ key: '', value: '' }] }
  } else if (bodyType === 'formData') {
    config.body = {
      type: 'formData',
      content: '',
      fields: formFields.length > 0 ? formFields : [{ key: '', value: '' }],
    }
  } else if (bodyType === 'urlencoded') {
    if (formFields.length > 0) {
      config.body = { type: 'urlencoded', content: '', fields: formFields }
    } else if (bodyContent) {
      // Parse urlencoded string
      const fields: FormField[] = bodyContent.split('&').map(pair => {
        const eqIdx = pair.indexOf('=')
        if (eqIdx > 0) {
          return {
            key: decodeURIComponent(pair.substring(0, eqIdx)),
            value: decodeURIComponent(pair.substring(eqIdx + 1)),
          }
        }
        return { key: pair, value: '' }
      })
      config.body = { type: 'urlencoded', content: '', fields }
    }
  }

  return { config }
}

// ── History Helpers ──

function loadHistory(): CurlHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveHistory(items: CurlHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch { /* quota exceeded */ }
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '방금'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return `${Math.floor(days / 30)}개월 전`
}

// ── Component ──

export default function CurlBuilder() {
  const t = useTranslations('curlBuilder')

  // State
  const [activeTab, setActiveTab] = useState<'build' | 'parse'>('build')
  const [config, setConfig] = useState<RequestConfig>(createEmptyConfig)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('curl')
  const [multiline, setMultiline] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [parseInput, setParseInput] = useState('')
  const [parseError, setParseError] = useState('')
  const [parseSuccess, setParseSuccess] = useState(false)
  const [history, setHistory] = useState<CurlHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // Copy to clipboard
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

  // Generated code
  const generatedCode = useMemo(() => {
    if (!config.url.trim()) return ''
    return generateCode(config, exportFormat, multiline)
  }, [config, exportFormat, multiline])

  // Save to history
  const saveToHistory = useCallback((cfg: RequestConfig) => {
    if (!cfg.url.trim()) return
    const item: CurlHistoryItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      method: cfg.method,
      url: cfg.url,
      curlCommand: buildCurl(cfg, false),
      config: cfg,
    }
    const updated = [item, ...history.filter(h => h.url !== cfg.url || h.method !== cfg.method)].slice(0, MAX_HISTORY)
    setHistory(updated)
    saveHistory(updated)
  }, [history])

  // Parse handler
  const handleParse = useCallback(() => {
    setParseError('')
    setParseSuccess(false)
    if (!parseInput.trim()) {
      setParseError(t('errors.parseFailedAt', { detail: 'Empty input' }))
      return
    }
    const { config: parsed, error } = parseCurl(parseInput)
    if (error) {
      setParseError(t('errors.parseFailedAt', { detail: error }))
      return
    }
    setConfig(parsed)
    setActiveTab('build')
    setParseSuccess(true)
    setTimeout(() => setParseSuccess(false), 3000)
  }, [parseInput, t])

  // Load from history
  const loadFromHistory = useCallback((item: CurlHistoryItem) => {
    setConfig(item.config)
    setActiveTab('build')
    setShowHistory(false)
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }, [])

  // Reset form
  const resetForm = useCallback(() => {
    setConfig(createEmptyConfig())
    setExportFormat('curl')
  }, [])

  // Keyboard shortcut: Ctrl+Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activeTab === 'parse') {
          handleParse()
        } else if (config.url.trim()) {
          saveToHistory(config)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, handleParse, config, saveToHistory])

  // ── Row helpers ──

  const updateQueryParam = (index: number, field: keyof KeyValueRow, value: string | boolean) => {
    setConfig(prev => {
      const params = [...prev.queryParams]
      params[index] = { ...params[index], [field]: value }
      return { ...prev, queryParams: params }
    })
  }

  const addQueryParam = () => {
    setConfig(prev => ({
      ...prev,
      queryParams: [...prev.queryParams, { key: '', value: '', enabled: true }],
    }))
  }

  const removeQueryParam = (index: number) => {
    setConfig(prev => ({
      ...prev,
      queryParams: prev.queryParams.length > 1
        ? prev.queryParams.filter((_, i) => i !== index)
        : [{ key: '', value: '', enabled: true }],
    }))
  }

  const updateHeader = (index: number, field: keyof KeyValueRow, value: string | boolean) => {
    setConfig(prev => {
      const headers = [...prev.headers]
      headers[index] = { ...headers[index], [field]: value }
      return { ...prev, headers }
    })
  }

  const addHeader = () => {
    setConfig(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '', enabled: true }],
    }))
  }

  const removeHeader = (index: number) => {
    setConfig(prev => ({
      ...prev,
      headers: prev.headers.length > 1
        ? prev.headers.filter((_, i) => i !== index)
        : [{ key: '', value: '', enabled: true }],
    }))
  }

  const addHeaderPreset = (preset: { key: string; value: string }) => {
    setConfig(prev => {
      const existing = prev.headers.findIndex(h => h.key === preset.key)
      if (existing >= 0) {
        const headers = [...prev.headers]
        headers[existing] = { ...headers[existing], value: preset.value }
        return { ...prev, headers }
      }
      // Replace first empty row or add new
      const emptyIdx = prev.headers.findIndex(h => !h.key.trim())
      if (emptyIdx >= 0) {
        const headers = [...prev.headers]
        headers[emptyIdx] = { key: preset.key, value: preset.value, enabled: true }
        return { ...prev, headers }
      }
      return {
        ...prev,
        headers: [...prev.headers, { key: preset.key, value: preset.value, enabled: true }],
      }
    })
  }

  const updateBodyField = (index: number, field: keyof FormField, value: string | boolean) => {
    setConfig(prev => {
      const fields = [...(prev.body.fields || [{ key: '', value: '' }])]
      fields[index] = { ...fields[index], [field]: value }
      return { ...prev, body: { ...prev.body, fields } }
    })
  }

  const addBodyField = () => {
    setConfig(prev => ({
      ...prev,
      body: {
        ...prev.body,
        fields: [...(prev.body.fields || []), { key: '', value: '', isFile: false }],
      },
    }))
  }

  const removeBodyField = (index: number) => {
    setConfig(prev => {
      const fields = prev.body.fields || []
      return {
        ...prev,
        body: {
          ...prev.body,
          fields: fields.length > 1
            ? fields.filter((_, i) => i !== index)
            : [{ key: '', value: '', isFile: false }],
        },
      }
    })
  }

  // URL validation
  const isValidUrl = useMemo(() => {
    if (!config.url.trim()) return true // Don't show error for empty
    try {
      new URL(config.url)
      return true
    } catch {
      return false
    }
  }, [config.url])

  const showBodySection = ['POST', 'PUT', 'PATCH'].includes(config.method)

  // ── Render helpers ──

  const renderKeyValueRows = (
    rows: KeyValueRow[],
    updateFn: (i: number, field: keyof KeyValueRow, value: string | boolean) => void,
    addFn: () => void,
    removeFn: (i: number) => void,
    keyPlaceholder: string,
    valuePlaceholder: string
  ) => (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={e => updateFn(i, 'enabled', e.target.checked)}
            className="accent-blue-600 flex-shrink-0"
          />
          <input
            type="text"
            value={row.key}
            onChange={e => updateFn(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={row.value}
            onChange={e => updateFn(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => removeFn(i)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex-shrink-0"
            aria-label={t('params.remove')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addFn}
        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        aria-label={t('params.add')}
      >
        <Plus className="w-4 h-4" />
        {t('params.add')}
      </button>
    </div>
  )

  const renderMethodBadge = (method: string, small?: boolean) => (
    <span className={`inline-block ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} font-bold rounded ${METHOD_COLORS[method] || METHOD_COLORS.GET}`}>
      {method}
    </span>
  )

  // ── Format tabs ──

  const exportFormats: { key: ExportFormat; label: string }[] = [
    { key: 'curl', label: t('export.curl') },
    { key: 'fetch', label: t('export.fetch') },
    { key: 'axios', label: t('export.axios') },
    { key: 'python', label: t('export.python') },
    { key: 'go', label: t('export.go') },
    { key: 'php', label: t('export.php') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-7 h-7 text-blue-600" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('build')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'build'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Code className="w-4 h-4" />
          {t('tabs.build')}
        </button>
        <button
          onClick={() => setActiveTab('parse')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'parse'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          {t('tabs.parse')}
        </button>
      </div>

      {/* Parse Success Toast */}
      {parseSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {t('parse.parseSuccess')}
        </div>
      )}

      {/* Main content */}
      {activeTab === 'parse' ? (
        /* ── Parse Mode ── */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('parse.title')}</h2>

          {/* Example dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('parse.examples')}
            </label>
            <select
              onChange={e => {
                if (e.target.value) {
                  setParseInput(e.target.value)
                  setParseError('')
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="" disabled>-- {t('parse.examples')} --</option>
              {EXAMPLE_CURLS.map((ex, i) => (
                <option key={i} value={ex.command}>{ex.label}</option>
              ))}
            </select>
          </div>

          <textarea
            value={parseInput}
            onChange={e => { setParseInput(e.target.value); setParseError('') }}
            placeholder={t('parse.placeholder')}
            className="w-full h-48 px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
          />

          {parseError && (
            <div className="text-red-600 dark:text-red-400 text-sm">{parseError}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleParse}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              {t('parse.parseButton')}
            </button>
            <button
              onClick={() => { setParseInput(''); setParseError('') }}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t('params.remove')}
            </button>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Ctrl+Enter to parse
          </p>
        </div>
      ) : (
        /* ── Build Mode ── */
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-4">
            {/* Method & URL */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {t('request.method')} & {t('request.url')}
              </h3>
              <div className="flex gap-2">
                <select
                  value={config.method}
                  onChange={e => setConfig(prev => ({ ...prev, method: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {HTTP_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={config.url}
                  onChange={e => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder={t('request.urlPlaceholder')}
                  className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 ${
                    !isValidUrl
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {!isValidUrl && (
                <p className="text-red-500 text-xs">{t('errors.invalidUrl')}</p>
              )}
              {showBodySection && config.method === 'GET' && (
                <p className="text-yellow-600 dark:text-yellow-400 text-xs">{t('errors.bodyWithGet')}</p>
              )}
            </div>

            {/* Query Params */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {t('request.queryParams')}
              </h3>
              {renderKeyValueRows(
                config.queryParams, updateQueryParam, addQueryParam, removeQueryParam,
                t('params.key'), t('params.value')
              )}
            </div>

            {/* Headers */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {t('request.headers')}
                </h3>
                <div className="relative">
                  <select
                    onChange={e => {
                      const idx = parseInt(e.target.value)
                      if (!isNaN(idx)) addHeaderPreset(HEADER_PRESETS[idx])
                      e.target.value = ''
                    }}
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    defaultValue=""
                  >
                    <option value="" disabled>{t('request.headerPresets')}</option>
                    {HEADER_PRESETS.map((p, i) => (
                      <option key={i} value={i}>{p.key}: {p.value}</option>
                    ))}
                  </select>
                </div>
              </div>
              {renderKeyValueRows(
                config.headers, updateHeader, addHeader, removeHeader,
                t('params.key'), t('params.value')
              )}
            </div>

            {/* Authentication (accordion) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => setShowAuth(!showAuth)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {t('request.auth')}
                  {config.auth.type !== 'none' && (
                    <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                      ({config.auth.type})
                    </span>
                  )}
                </h3>
                {showAuth ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showAuth && (
                <div className="px-6 pb-6 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {(['none', 'bearer', 'basic', 'apiKey'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setConfig(prev => ({ ...prev, auth: { ...prev.auth, type } }))}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          config.auth.type === type
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {t(`auth.${type}`)}
                      </button>
                    ))}
                  </div>

                  {config.auth.type === 'bearer' && (
                    <input
                      type="text"
                      value={config.auth.token || ''}
                      onChange={e => setConfig(prev => ({ ...prev, auth: { ...prev.auth, token: e.target.value } }))}
                      placeholder={t('auth.token')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {config.auth.type === 'basic' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={config.auth.username || ''}
                        onChange={e => setConfig(prev => ({ ...prev, auth: { ...prev.auth, username: e.target.value } }))}
                        placeholder={t('auth.username')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        value={config.auth.password || ''}
                        onChange={e => setConfig(prev => ({ ...prev, auth: { ...prev.auth, password: e.target.value } }))}
                        placeholder={t('auth.password')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {config.auth.type === 'apiKey' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={config.auth.headerName || 'X-API-Key'}
                        onChange={e => setConfig(prev => ({ ...prev, auth: { ...prev.auth, headerName: e.target.value } }))}
                        placeholder={t('auth.headerName')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={config.auth.apiKeyValue || ''}
                        onChange={e => setConfig(prev => ({ ...prev, auth: { ...prev.auth, apiKeyValue: e.target.value } }))}
                        placeholder={t('auth.apiKeyValue')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body (for POST/PUT/PATCH) */}
            {showBodySection && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {t('request.body')}
                </h3>

                <div className="flex gap-2 flex-wrap">
                  {(['none', 'raw', 'formData', 'urlencoded'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setConfig(prev => ({ ...prev, body: { ...prev.body, type } }))}
                      className={`px-3 py-1.5 text-sm rounded-lg ${
                        config.body.type === type
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t(`body.${type}`)}
                    </button>
                  ))}
                </div>

                {config.body.type === 'raw' && (
                  <textarea
                    value={config.body.content || ''}
                    onChange={e => setConfig(prev => ({ ...prev, body: { ...prev.body, content: e.target.value } }))}
                    placeholder='{"key": "value"}'
                    className="w-full h-40 px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                )}

                {config.body.type === 'formData' && (
                  <div className="space-y-2">
                    {(config.body.fields || []).map((field, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={field.key}
                          onChange={e => updateBodyField(i, 'key', e.target.value)}
                          placeholder={t('params.key')}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => updateBodyField(i, 'value', e.target.value)}
                          placeholder={t('params.value')}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={field.isFile || false}
                            onChange={e => updateBodyField(i, 'isFile', e.target.checked)}
                            className="accent-blue-600"
                          />
                          {t('body.isFile')}
                        </label>
                        <button
                          onClick={() => removeBodyField(i)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addBodyField}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <Plus className="w-4 h-4" />
                      {t('params.add')}
                    </button>
                  </div>
                )}

                {config.body.type === 'urlencoded' && (
                  <div className="space-y-2">
                    {(config.body.fields || []).map((field, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={field.key}
                          onChange={e => updateBodyField(i, 'key', e.target.value)}
                          placeholder={t('params.key')}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => updateBodyField(i, 'value', e.target.value)}
                          placeholder={t('params.value')}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeBodyField(i)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addBodyField}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <Plus className="w-4 h-4" />
                      {t('params.add')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Options (accordion) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {t('request.options')}
                </h3>
                {showOptions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showOptions && (
                <div className="px-6 pb-6 space-y-3">
                  {([
                    { key: 'followRedirects', label: t('options.followRedirects') },
                    { key: 'insecure', label: t('options.insecure') },
                    { key: 'verbose', label: t('options.verbose') },
                    { key: 'compressed', label: t('options.compressed') },
                    { key: 'includeHeaders', label: t('options.includeHeaders') },
                  ] as const).map(opt => (
                    <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.options[opt.key]}
                        onChange={e => setConfig(prev => ({
                          ...prev,
                          options: { ...prev.options, [opt.key]: e.target.checked },
                        }))}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 dark:text-gray-300 flex-shrink-0">
                      {t('options.maxTime')}
                    </label>
                    <input
                      type="number"
                      value={config.options.maxTime || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        options: { ...prev.options, maxTime: e.target.value ? parseInt(e.target.value) : undefined },
                      }))}
                      placeholder="30"
                      min={1}
                      className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => config.url.trim() && saveToHistory(config)}
                disabled={!config.url.trim() || !isValidUrl}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clock className="w-4 h-4" />
                {t('history.title')}
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Right: Output */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4 lg:sticky lg:top-4">
              {/* Export format pills */}
              <div className="flex gap-1 flex-wrap">
                {exportFormats.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setExportFormat(f.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      exportFormat === f.key
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Multiline toggle (only for cURL) */}
              {exportFormat === 'curl' && (
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiline}
                    onChange={e => setMultiline(e.target.checked)}
                    className="accent-blue-600"
                  />
                  Multiline (backslash)
                </label>
              )}

              {/* Code output */}
              <div className="relative">
                <pre
                  className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all min-h-[200px] max-h-[600px] overflow-y-auto"
                  role="code"
                  aria-label="Generated code"
                >
                  <code>{generatedCode || '// Enter a URL to generate code'}</code>
                </pre>
                {generatedCode && (
                  <button
                    onClick={() => copyToClipboard(generatedCode, 'output')}
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-xs transition-colors"
                  >
                    {copiedId === 'output' ? (
                      <><Check className="w-3.5 h-3.5" />{t('export.copied')}</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" />{t('export.copy')}</>
                    )}
                  </button>
                )}
              </div>

              {/* Preview URL with method badge */}
              {config.url.trim() && (
                <div className="flex items-center gap-2 text-sm">
                  {renderMethodBadge(config.method)}
                  <span className="text-gray-600 dark:text-gray-400 truncate font-mono text-xs">
                    {buildUrlWithParams(config.url, config.queryParams)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            {t('history.title')}
            {history.length > 0 && (
              <span className="text-sm font-normal text-gray-400">({history.length})</span>
            )}
          </h3>
          {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showHistory && (
          <div className="px-6 pb-6">
            {history.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('history.empty')}</p>
            ) : (
              <div className="space-y-2">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
                  >
                    {renderMethodBadge(item.method, true)}
                    <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 truncate font-mono">
                      {item.url}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </button>
                ))}
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 mt-2"
                >
                  {t('history.clearAll')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            {t('guide.title')}
          </h3>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* DevTools guide */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.devtools.title')}</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guide.devtools.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('guide.tips.title')}</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(t.raw('guide.tips.items') as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
