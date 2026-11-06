// 툴허브 원격 MCP 서버 (Streamable HTTP, 상태 없음, 읽기 전용). JSON-RPC 처리만 여기서 하고 functions/mcp.ts 가 HTTP 를 맡는다.
// 도구: search_tools + /api/calc 4종(agentApi.ts 와 같은 계산). 검증: scripts/check-mcp.ts
import { handleCalc } from './agentApi.ts'
import { searchTools, TOOL_COUNT } from './toolSearch.ts'

export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const
const SERVER_INFO = { name: 'toolhub', title: 'ToolHub (툴허브)', version: '1.0.0' }
const INSTRUCTIONS = `ToolHub (toolhub.ai.kr) is a Korean web tool site with ${TOOL_COUNT} free tools. Use search_tools to find the right page for a user's need (Korean or English keywords), and the calculator tools for exact Korean take-home pay, social insurance (2026/2027 rates), age/zodiac and sunrise/sunset. Amounts are KRW; times are KST. Each result links to the page so users can check it.`

const str = (description: string) => ({ type: 'string', description })
const numb = (description: string) => ({ type: 'number', description })
const yearProp = { type: 'integer', enum: [2026, 2027], description: 'Social insurance rate year (default: year in force)' }
export const TOOLS = [
  { name: 'search_tools', title: 'Search ToolHub tools', description: 'Find ToolHub pages (calculators, converters, planners, games) matching a need, e.g. "연봉 실수령액", "김장 시기", "json formatter". Returns names, descriptions and URLs.',
    inputSchema: { type: 'object', properties: { query: str('Keywords in Korean or English'), limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Max results (default 8)' } }, required: ['query'] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'net_salary', title: 'Korean take-home pay', description: 'Korean monthly/annual take-home pay after national pension, health, long-term care, employment insurance and income tax (NTS withholding table).',
    inputSchema: { type: 'object', properties: { annual: numb('Gross annual salary in KRW'), monthly: numb('Gross monthly salary in KRW (instead of annual)'), nonTaxable: numb('Monthly non-taxable pay, default 200000'), dependents: { type: 'integer', description: 'Dependents incl. the employee, default 1' }, children: { type: 'integer', description: 'Children aged 8–20 among dependents, default 0' }, year: yearProp } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'social_insurance', title: 'Korean social insurance (4대보험)', description: 'Monthly employee and employer premiums for national pension, health, long-term care, employment and industrial accident insurance.',
    inputSchema: { type: 'object', properties: { pay: numb('Gross monthly pay in KRW'), annual: numb('Gross annual pay in KRW (instead of pay)'), nonTaxable: numb('Monthly non-taxable pay, default 200000'), size: { type: 'string', enum: ['under150', 'priority', 'mid', 'large'], description: 'Company size, default under150' }, accident: numb('Industrial accident rate in %, default 1.47'), year: yearProp } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'korean_age', title: 'Korean age and zodiac', description: 'International age (만 나이), year age, Korean zodiac by Lunar New Year and elementary school entry year.',
    inputSchema: { type: 'object', properties: { birth: str('Birth date YYYY-MM-DD'), year: { type: 'integer', description: 'Birth year if the date is unknown' }, on: str('Reference date YYYY-MM-DD, default today KST') } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'sun_times', title: 'Sunrise and sunset in Korea', description: 'Sunrise, sunset, solar noon, day length, civil twilight and golden hour (KST) for a Korean city or coordinates.',
    inputSchema: { type: 'object', properties: { date: str('Date YYYY-MM-DD, default today KST'), city: str('seoul, busan, incheon, daegu, gwangju, daejeon, ulsan, jeju, gangneung, …'), lat: numb('Latitude 33–39 (with lon)'), lon: numb('Longitude 124–132') } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
] as const
const CALC: Record<string, string> = { net_salary: 'salary', social_insurance: 'four-insurance', korean_age: 'age', sun_times: 'sun' }

type Id = string | number | null
const ok = (id: Id, result: unknown) => ({ jsonrpc: '2.0', id, result })
const err = (id: Id, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })
const text = (body: unknown, isError = false) => ({ content: [{ type: 'text', text: typeof body === 'string' ? body : JSON.stringify(body) }], ...(isError ? { isError: true } : { structuredContent: body }) })

function callTool(name: string, args: Record<string, unknown>, now: number) {
  if (name === 'search_tools') {
    if (typeof args.query !== 'string' || !args.query.trim()) return text('query is required', true)
    const results = searchTools(args.query, typeof args.limit === 'number' ? args.limit : 8)
    return text({ query: args.query, count: results.length, results })
  }
  const calc = CALC[name]
  if (!calc) return null
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(args)) if (v != null && (typeof v === 'string' || typeof v === 'number')) q.set(k, String(v))
  const r = handleCalc(calc, q, now)
  return r.status === 200 ? text(r.body) : text(String(r.body.error ?? 'invalid input'), true)
}

/** One JSON-RPC message → response object, or null for notifications (HTTP 202). */
export function handleMcp(raw: unknown, now = Date.now()): Record<string, unknown> | null {
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown } : null
  const id: Id = m && (typeof m.id === 'string' || typeof m.id === 'number') ? m.id : null
  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return err(id, -32600, 'Invalid Request')
  if (!('id' in m)) return null // notification (e.g. notifications/initialized)
  const params = m.params && typeof m.params === 'object' ? m.params as Record<string, unknown> : {}
  switch (m.method) {
    case 'initialize': {
      const asked = params.protocolVersion
      const protocolVersion = PROTOCOL_VERSIONS.find(v => v === asked) ?? PROTOCOL_VERSIONS[0]
      return ok(id, { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS })
    }
    case 'ping': return ok(id, {})
    case 'tools/list': return ok(id, { tools: TOOLS })
    case 'tools/call': {
      const name = typeof params.name === 'string' ? params.name : ''
      const args = params.arguments && typeof params.arguments === 'object' ? params.arguments as Record<string, unknown> : {}
      const result = callTool(name, args, now)
      return result ? ok(id, result) : err(id, -32602, `Unknown tool: ${name}`)
    }
    default: return err(id, -32601, `Method not found: ${m.method}`)
  }
}
