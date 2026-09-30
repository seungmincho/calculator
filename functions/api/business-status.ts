// Cloudflare Pages Function — 국세청 사업자등록 상태조회 프록시
// 공공데이터포털 "국세청_사업자등록정보 진위확인 및 상태조회 서비스" (api.odcloud.kr/api/nts-businessman/v1/status)
// POST /api/business-status  body: { "b_no": ["1248100998", ...] }  (10자리 숫자, 최대 100개)
// 환경변수: NTS_API_KEY (공공데이터포털 일반 인증키 — Decoding 키 권장, Encoding 키도 허용)
// 키가 없으면 503 { error: 'not_configured' } → 프론트는 홈택스 링크로 대체

interface Env {
  NTS_API_KEY?: string
}

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const key = env.NTS_API_KEY
  if (!key) return json({ error: 'not_configured' }, 503)

  let list: unknown
  try {
    list = ((await request.json()) as { b_no?: unknown }).b_no
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!Array.isArray(list) || list.length === 0 || list.length > 100 || !list.every(n => typeof n === 'string' && /^\d{10}$/.test(n))) {
    return json({ error: 'bad_request', detail: 'b_no must be 1-100 strings of 10 digits' }, 400)
  }

  // ponytail: 레이트리밋 없음 — 쿼터(일 100만 건) 남용이 보이면 CF Rate Limiting 규칙을 /api/business-status 에 건다
  const serviceKey = key.includes('%') ? key : encodeURIComponent(key)
  try {
    const res = await fetch(`https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${serviceKey}&returnType=JSON`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ b_no: list }),
    })
    if (!res.ok) return json({ error: 'upstream', status: res.status }, 502)
    const data = (await res.json()) as { data?: Record<string, string>[] }
    // 필요한 필드만 전달
    return json({
      data: (data.data ?? []).map(d => ({
        b_no: d.b_no ?? '',
        b_stt: d.b_stt ?? '',
        b_stt_cd: d.b_stt_cd ?? '',
        tax_type: d.tax_type ?? '',
        tax_type_cd: d.tax_type_cd ?? '',
        end_dt: d.end_dt ?? '',
      })),
    })
  } catch {
    return json({ error: 'upstream' }, 502)
  }
}
