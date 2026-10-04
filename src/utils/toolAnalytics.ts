// supabase-js(전송 ~43KB)를 모든 페이지에 싣지 않도록 PostgREST를 fetch로 직접 호출
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isAnalyticsConfigured = (): boolean => !!(SUPABASE_URL && SUPABASE_KEY)

const rest = (path: string, init?: RequestInit) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...init?.headers },
})

const TOOL_CLICKS_TABLE = 'tool_clicks'
const SESSION_KEY = 'toolhub_tracked_tools'

export interface PopularTool {
  tool_href: string
  click_count: number
}

const getTrackedTools = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

const markToolTracked = (href: string): void => {
  if (typeof window === 'undefined') return
  try {
    const tracked = getTrackedTools()
    tracked.add(href)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...tracked]))
  } catch { /* ignore */ }
}

export const recordToolClick = async (toolHref: string): Promise<void> => {
  const tracked = getTrackedTools()
  if (tracked.has(toolHref)) return

  markToolTracked(toolHref)

  if (!isAnalyticsConfigured()) return
  try {
    await rest(TOOL_CLICKS_TABLE, { method: 'POST', keepalive: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ tool_href: toolHref }) })
  } catch (e) {
    console.error('Failed to record tool click:', e)
  }
}

export const getPopularTools = async (limit: number = 5): Promise<PopularTool[]> => {
  if (!isAnalyticsConfigured()) return []
  try {
    const res = await rest(`popular_tools?select=tool_href,click_count&order=click_count.desc&limit=${limit}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as PopularTool[]
  } catch (e) {
    console.error('Failed to fetch popular tools:', e)
    return []
  }
}

export const getAllPopularTools = (): Promise<PopularTool[]> => getPopularTools(500)
