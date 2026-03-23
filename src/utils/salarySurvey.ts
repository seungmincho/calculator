import { getSupabase } from './webrtc/supabaseClient'

// ═══════════════════════════════════════════════════════════════════════════════
// Browser Fingerprint (익명, 중복 방지용)
// ═══════════════════════════════════════════════════════════════════════════════

async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
  ]

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('toolhub.fp', 2, 15)
      components.push(canvas.toDataURL().slice(-50))
    }
  } catch { /* canvas not available */ }

  const text = components.join('|')
  const encoder = new TextEncoder()
  const data = encoder.encode(text)

  if (crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Fallback: simple hash
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SurveySubmission {
  salary: number
  ageGroup: string
  gender: string
  industry: string
}

export interface CommunityStats {
  totalCount: number
  avgSalary: number
  medianSalary: number
  byAge: Record<string, { count: number; avg: number }>
  byGender: Record<string, { count: number; avg: number }>
  byIndustry: Record<string, { count: number; avg: number }>
}

export interface CommunityRank {
  below: number
  total: number
  percentile: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════════════

export async function submitSalarySurvey(
  data: SurveySubmission
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { success: false, error: 'not_configured' }

  try {
    const fingerprint = await generateFingerprint()

    const { error } = await supabase.from('salary_surveys').insert({
      salary: data.salary,
      age_group: data.ageGroup || null,
      gender: data.gender || null,
      industry: data.industry || null,
      fingerprint,
    })

    if (error) {
      // Unique constraint violation = already submitted today
      if (error.code === '23505') {
        return { success: false, error: 'already_submitted' }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'unknown' }
  }
}

export async function getCommunityStats(): Promise<CommunityStats | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.rpc('get_salary_stats')
    if (error || !data) return null
    return data as CommunityStats
  } catch {
    return null
  }
}

export async function getCommunityRank(
  salary: number
): Promise<CommunityRank | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.rpc('get_salary_rank', {
      target_salary: salary,
    })
    if (error || !data) return null
    return data as CommunityRank
  } catch {
    return null
  }
}
