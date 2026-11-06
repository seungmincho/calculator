// Cloudflare Pages Function — /api/tools?q=<keywords>&limit=8 : 툴허브 도구 검색(읽기 전용 JSON, CORS 허용)
import { searchTools, TOOL_COUNT } from '../../src/lib/toolSearch.ts'

export function onRequestGet({ request }: { request: Request }) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const limit = Number(url.searchParams.get('limit') ?? 8)
  const body = q.trim()
    ? { query: q, results: searchTools(q, Number.isFinite(limit) ? limit : 8), total: TOOL_COUNT, source: 'ToolHub (toolhub.ai.kr)' }
    : { error: 'q is required', example: 'https://toolhub.ai.kr/api/tools?q=연봉 실수령액', docs: 'https://toolhub.ai.kr/openapi.json' }
  return new Response(JSON.stringify(body, null, 2), {
    status: q.trim() ? 200 : 400,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': q.trim() ? 'public, max-age=3600' : 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
