// Cloudflare Pages Function — 문의/건의 관리 API
// 관리자 비밀번호 SHA-256 해시로 인증
// GET    /api/admin-inquiry?filter=all|unread|read&category=all|bug|feature|suggestion|other&offset=0&limit=20
// PATCH  /api/admin-inquiry  { id, is_read }
// DELETE /api/admin-inquiry  { id }

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  ADMIN_PASSWORD_HASH: string
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyAuth(request: Request, env: Env): Promise<boolean> {
  const password = request.headers.get('X-Admin-Password')
  if (!password || !env.ADMIN_PASSWORD_HASH) return false
  const hash = await hashPassword(password)
  return hash === env.ADMIN_PASSWORD_HASH
}

function supabaseFetch(env: Env, path: string, options: RequestInit = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
      ...(options.headers || {}),
    },
  })
}

// CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// GET — list inquiries
export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!(await verifyAuth(context.request, context.env))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders,
    })
  }

  const url = new URL(context.request.url)
  const filter = url.searchParams.get('filter') || 'all'
  const category = url.searchParams.get('category') || 'all'
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)

  // Build query string for Supabase REST
  const params = new URLSearchParams()
  params.set('select', '*')
  params.set('order', 'created_at.desc')
  params.set('offset', String(offset))
  params.set('limit', String(limit))

  if (filter === 'unread') params.set('is_read', 'eq.false')
  else if (filter === 'read') params.set('is_read', 'eq.true')

  if (category !== 'all') params.set('category', `eq.${category}`)

  try {
    const res = await supabaseFetch(context.env, `inquiries?${params.toString()}`, {
      headers: { 'Prefer': 'count=exact' },
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), {
        status: res.status, headers: corsHeaders,
      })
    }

    const data = await res.json()
    const totalCount = res.headers.get('content-range')?.split('/')[1] || '0'

    return new Response(JSON.stringify({ data, total: parseInt(totalCount, 10) }), {
      status: 200, headers: corsHeaders,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
      status: 500, headers: corsHeaders,
    })
  }
}

// PATCH — update is_read
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  if (!(await verifyAuth(context.request, context.env))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders,
    })
  }

  try {
    const body = await context.request.json() as { id: string; is_read: boolean }
    if (!body.id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const res = await supabaseFetch(
      context.env,
      `inquiries?id=eq.${body.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_read: body.is_read }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), {
        status: res.status, headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: corsHeaders,
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: corsHeaders,
    })
  }
}

// DELETE — remove inquiry
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!(await verifyAuth(context.request, context.env))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders,
    })
  }

  try {
    const body = await context.request.json() as { id: string }
    if (!body.id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), {
        status: 400, headers: corsHeaders,
      })
    }

    const res = await supabaseFetch(
      context.env,
      `inquiries?id=eq.${body.id}`,
      { method: 'DELETE' }
    )

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), {
        status: res.status, headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: corsHeaders,
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: corsHeaders,
    })
  }
}
