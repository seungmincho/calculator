// Cloudflare Pages Function — 이미지 프록시 (CORS 우회)
// /api/proxy-image?url=https://example.com/image.jpg → 이미지 바이너리 반환

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return new Response('url parameter required', { status: 400 })
  }

  // URL 유효성 검사
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return new Response('Invalid URL', { status: 400 })
  }

  // 내부 IP 차단 (SSRF 방지)
  const hostname = parsed.hostname
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]'
  ) {
    return new Response('Internal addresses not allowed', { status: 403 })
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ToolHub ImageScraper/1.0)',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    })

    if (!resp.ok) {
      return new Response(`HTTP ${resp.status}`, { status: 502 })
    }

    const contentType = resp.headers.get('content-type') || 'application/octet-stream'

    // 최대 20MB
    const body = await resp.arrayBuffer()
    if (body.byteLength > 20 * 1024 * 1024) {
      return new Response('Image too large (>20MB)', { status: 413 })
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // 1시간 캐시
      },
    })
  } catch {
    return new Response('Failed to fetch image', { status: 502 })
  }
}
