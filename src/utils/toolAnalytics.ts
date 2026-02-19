import { getSupabase, isSupabaseConfigured } from '@/utils/webrtc/supabaseClient'

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

  if (!isSupabaseConfigured()) return
  const supabase = getSupabase()
  if (!supabase) return

  try {
    await supabase.from(TOOL_CLICKS_TABLE).insert({ tool_href: toolHref })
  } catch (e) {
    console.error('Failed to record tool click:', e)
  }
}

export const getPopularTools = async (limit: number = 5): Promise<PopularTool[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = getSupabase()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('popular_tools')
      .select('tool_href, click_count')
      .order('click_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data as PopularTool[]) || []
  } catch (e) {
    console.error('Failed to fetch popular tools:', e)
    return []
  }
}
