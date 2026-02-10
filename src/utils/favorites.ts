const FAVORITES_KEY = 'toolhub_favorites'

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(FAVORITES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function toggleFavorite(href: string): boolean {
  const favorites = getFavorites()
  const index = favorites.indexOf(href)
  if (index >= 0) {
    favorites.splice(index, 1)
  } else {
    favorites.push(href)
  }
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  } catch {
    // localStorage full or unavailable
  }
  return index < 0 // returns true if added, false if removed
}

export function isFavorite(href: string): boolean {
  return getFavorites().includes(href)
}
