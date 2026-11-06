// Cloudflare Pages Function — /api/calc/<salary|four-insurance|age|sun|retirement|unemployment|minimum-wage> (읽기 전용 JSON, CORS 허용)
// 계산은 src/lib/agentApi.ts. 같은 입력은 같은 결과라 엣지·브라우저 캐시 1시간(1/1 요율 전환 고려).
import { handleCalc } from '../../../src/lib/agentApi.ts'

interface Context { request: Request; params: { name?: string | string[] } }

export function onRequestGet({ request, params }: Context) {
  const name = Array.isArray(params.name) ? params.name[0] : params.name ?? ''
  const { status, body } = handleCalc(name, new URL(request.url).searchParams)
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=3600' : 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
