// Cloudflare Pages Function — https://toolhub.ai.kr/mcp : 원격 MCP 서버(Streamable HTTP, 상태 없음, 읽기 전용, 인증 없음)
// POST 로 JSON-RPC 를 받아 JSON 으로 답한다(SSE 스트림은 쓰지 않아 GET 은 405). 처리는 src/lib/mcpServer.ts
import { handleMcp } from '../src/lib/mcpServer.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

export async function onRequest({ request }: { request: Request }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST') return new Response('ToolHub MCP endpoint: send JSON-RPC with POST. Docs: https://toolhub.ai.kr/llms.txt', { status: 405, headers: { ...CORS, Allow: 'POST, OPTIONS' } })
  const raw = await request.text()
  if (raw.length > 65536) return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request too large' } }, 413)
  let body: unknown
  try { body = JSON.parse(raw) } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400) }
  if (Array.isArray(body)) {
    const out = body.slice(0, 20).map(m => handleMcp(m)).filter(Boolean)
    return out.length ? json(out) : new Response(null, { status: 202, headers: CORS })
  }
  const res = handleMcp(body)
  return res ? json(res) : new Response(null, { status: 202, headers: CORS })
}
