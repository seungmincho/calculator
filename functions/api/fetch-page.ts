// Cloudflare Pages Function — HTML 페이지 프록시 (이미지 스크래퍼용)
// /api/fetch-page?url=https://example.com → HTML 텍스트 반환

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const targetUrl = url.searchParams.get('url')
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'url parameter required' }), {
      status: 400, headers,
    })
  }

  // URL 유효성 검사
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400, headers,
    })
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
    return new Response(JSON.stringify({ error: 'Internal addresses not allowed' }), {
      status: 403, headers,
    })
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ToolHub ImageScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    })

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `HTTP ${resp.status}` }), {
        status: 502, headers,
      })
    }

    const contentType = resp.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return new Response(JSON.stringify({ error: 'Not an HTML page' }), {
        status: 400, headers,
      })
    }

    const html = await resp.text()

    // 최대 2MB
    if (html.length > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Page too large (>2MB)' }), {
        status: 413, headers,
      })
    }

    return new Response(JSON.stringify({ html, url: resp.url }), {
      status: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300', // 5분 캐시
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch page' }), {
      status: 502, headers,
    })
  }
}
