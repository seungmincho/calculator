// 최근 사용 도구 관리 유틸리티

const STORAGE_KEY = 'recent_tools'
const MAX_RECENT_ITEMS = 10 // 카테고리별 최대 저장 수

interface RecentToolEntry {
  href: string
  timestamp: number
}

interface RecentToolsData {
  [category: string]: RecentToolEntry[]
}

// localStorage에서 최근 사용 도구 가져오기
export const getRecentTools = (): RecentToolsData => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// 특정 카테고리의 최근 사용 도구 href 목록 가져오기
export const getRecentToolsByCategory = (category: string): string[] => {
  const data = getRecentTools()
  const categoryData = data[category] || []
  // 최신순 정렬 후 href만 반환
  return categoryData
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(entry => entry.href)
}

// 도구 사용 기록 저장
export const recordToolUsage = (category: string, href: string): void => {
  if (typeof window === 'undefined') return

  try {
    const data = getRecentTools()
    const categoryData = data[category] || []

    // 기존 항목 제거 (중복 방지)
    const filtered = categoryData.filter(entry => entry.href !== href)

    // 새 항목 추가 (맨 앞에)
    filtered.unshift({
      href,
      timestamp: Date.now()
    })

    // 최대 개수 제한
    data[category] = filtered.slice(0, MAX_RECENT_ITEMS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to record tool usage:', e)
  }
}

// 특정 카테고리의 최근 사용 도구가 있는지 확인
export const hasRecentTools = (category: string): boolean => {
  const recentHrefs = getRecentToolsByCategory(category)
  return recentHrefs.length > 0
}

// 모든 최근 사용 기록 삭제
export const clearRecentTools = (): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
