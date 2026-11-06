/* eslint-disable @typescript-eslint/no-explicit-any -- 검사 스크립트: JSON-RPC 응답을 느슨하게 읽는다 */
// Compile with esbuild, then run (netSalary imports without .ts extensions):
//   node node_modules/esbuild/bin/esbuild scripts/check-mcp.ts --bundle --platform=node --format=cjs --outfile=<tmp>/check-mcp.cjs && node <tmp>/check-mcp.cjs
import assert from 'node:assert/strict'
import { handleMcp, TOOLS } from '../src/lib/mcpServer.ts'
import { searchTools, TOOL_COUNT } from '../src/lib/toolSearch.ts'

const NOW = Date.parse('2026-11-06T03:00:00Z')
const rpc = (method: string, params?: unknown, id: number | string = 1) => handleMcp({ jsonrpc: '2.0', id, method, params }, NOW) as Record<string, any>
const call = (name: string, args: unknown) => rpc('tools/call', { name, arguments: args }).result

// Search: the obvious page comes first for everyday queries (ko·en)
assert.ok(TOOL_COUNT > 250, `${TOOL_COUNT}`)
const top = (q: string) => searchTools(q, 3).map(h => h.url.replace('https://toolhub.ai.kr', ''))
for (const [q, href] of [['연봉 실수령액', '/salary-calculator/'], ['4대보험', '/four-insurance/'], ['김장', '/kimjang-timing/'], ['에버랜드', '/everland/'],
  ['해돋이', '/new-year-sunrise/'], ['스키장', '/ski-resorts/'], ['json formatter', '/json-formatter/'], ['나이 계산기', '/age-calculator/']] as const) {
  const got = top(q); assert.ok(got.includes(href), `${q} → ${got.join(', ')}`)
}
assert.deepEqual(searchTools('   '), []); assert.deepEqual(searchTools('zzzqqq없는말'), [])
assert.ok(searchTools('계산기', 50).length <= 20, 'limit capped at 20')

// Protocol
const init = rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } })
assert.equal(init.result.protocolVersion, '2025-03-26'); assert.equal(init.result.serverInfo.name, 'toolhub'); assert.ok(init.result.capabilities.tools)
assert.equal(rpc('initialize', { protocolVersion: '2099-01-01' }).result.protocolVersion, '2025-06-18', 'unknown version → latest supported')
assert.equal(handleMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }), null, 'notification → no body (202)')
assert.deepEqual(rpc('ping').result, {})
assert.equal(rpc('tools/list').result.tools.length, TOOLS.length)
for (const t of TOOLS) assert.equal(t.inputSchema.type, 'object', t.name)
assert.equal(rpc('nope').error.code, -32601)
assert.equal(handleMcp({ id: 1, method: 'ping' })!.error && (handleMcp({ id: 1, method: 'ping' }) as any).error.code, -32600)
assert.equal(handleMcp('garbage')!.id, null)
assert.equal(rpc('tools/call', { name: 'nope', arguments: {} }).error.code, -32602)
assert.equal(rpc('ping', undefined, 'abc').id, 'abc')

// Tools give the same numbers as /api/calc (check-agent-api.ts)
const s = call('net_salary', { annual: 50_000_000, year: 2027 })
assert.equal(s.structuredContent.monthly.net, 3_560_528); assert.equal(JSON.parse(s.content[0].text).monthly.net, 3_560_528)
assert.equal(call('social_insurance', { pay: 3_000_000 }).structuredContent.employee, 272_080)
assert.equal(call('korean_age', { birth: '1990-05-01', on: '2027-01-01' }).structuredContent.internationalAge, 36)
assert.equal(call('sun_times', { date: '2026-01-01', city: 'seoul' }).structuredContent.sunrise, '07:47')
assert.equal(call('severance_pay', { start: '2021-03-02', end: '2026-03-02', pay: 3_000_000 }).structuredContent.retirementPay, 15_008_219)
assert.equal(call('unemployment_benefit', { pay: 6_000_000, age: 45, years: 4, leave: '2026-10-31' }).structuredContent.total, 68_100 * 180)
assert.equal(call('minimum_wage', { year: 2026, weeklyHours: 20, days: 5, probation: false }).structuredContent.input.probation, false)
assert.equal(call('minimum_wage', { year: 2027, probation: true }).structuredContent.hourly, 10_700 - 1_070)
const found = call('search_tools', { query: '연봉 실수령액', limit: 3 }).structuredContent
assert.equal(found.results.some((h: { url: string }) => h.url.endsWith('/salary-calculator/')), true)

// Bad input → tool error result (isError), not a protocol error
for (const [name, args] of [['net_salary', {}], ['net_salary', { annual: -1 }], ['sun_times', { city: 'tokyo' }], ['search_tools', {}], ['search_tools', { query: ' ' }], ['severance_pay', { pay: 3_000_000 }], ['unemployment_benefit', { pay: 3_000_000 }]] as const) {
  const r = call(name, args); assert.equal(r.isError, true, `${name} ${JSON.stringify(args)}`); assert.ok(r.content[0].text.length > 0)
}
console.log(`check-mcp OK (${TOOL_COUNT} tools, ${TOOLS.length} MCP tools)`)
