// Cloudflare Pages Function — 내 IP 확인
// GET /api/ip → 요청자 IP(CF-Connecting-IP) + Cloudflare 엣지가 붙인 request.cf 메타데이터
// 외부 API·키 없음. 아무것도 저장/로깅하지 않음.
// IPv4/IPv6 중 무엇이 보일지는 브라우저가 이 도메인에 어떤 경로로 붙었는지에 달림(Happy Eyeballs) — 한 요청으로 둘 다 알 수는 없음.

interface CfProps {
  country?: string
  city?: string
  region?: string
  regionCode?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  timezone?: string
  asn?: number
  asOrganization?: string
  colo?: string
  httpProtocol?: string
  tlsVersion?: string
  tlsCipher?: string
  clientTcpRtt?: number
  isEUCountry?: string
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const cf = ((request as unknown as { cf?: CfProps }).cf ?? {}) as CfProps
  const body = {
    ip: request.headers.get('CF-Connecting-IP') ?? '',
    country: cf.country ?? '',
    city: cf.city ?? '',
    region: cf.region ?? '',
    regionCode: cf.regionCode ?? '',
    postalCode: cf.postalCode ?? '',
    latitude: cf.latitude ?? '',
    longitude: cf.longitude ?? '',
    timezone: cf.timezone ?? '',
    asn: cf.asn ?? null,
    asOrganization: cf.asOrganization ?? '',
    colo: cf.colo ?? '',
    httpProtocol: cf.httpProtocol ?? '',
    tlsVersion: cf.tlsVersion ?? '',
    tlsCipher: cf.tlsCipher ?? '',
    clientTcpRtt: cf.clientTcpRtt ?? null,
  }
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      // 사람마다 다른 응답 — 엣지/브라우저 캐시 금지
      'Cache-Control': 'no-store, private',
    },
  })
}
