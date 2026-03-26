// 알고리즘 시각화 섹션 설정

export type AlgorithmCategory = 'collision' | 'search' | 'sort' | 'game-ai' | 'data-structure'

export interface AlgorithmInfo {
  id: string
  href: string
  category: AlgorithmCategory
  difficulty: 1 | 2 | 3
  renderMode: '2d' | '3d' | 'both'
  icon: string
  labelKey: string
  status: 'ready' | 'coming-soon'
}

export const algorithms: AlgorithmInfo[] = [
  { id: 'sat', href: '/algorithm/sat', category: 'collision', difficulty: 2, renderMode: 'both', icon: '🔲', labelKey: 'sat', status: 'ready' },
  // 향후 추가 예정:
  // { id: 'aabb', href: '/algorithm/aabb', category: 'collision', difficulty: 1, renderMode: '2d', icon: '📦', labelKey: 'aabb', status: 'coming-soon' },
  // { id: 'bfs-dfs', href: '/algorithm/bfs-dfs', category: 'search', difficulty: 1, renderMode: '2d', icon: '🔍', labelKey: 'bfsDfs', status: 'coming-soon' },
  // { id: 'a-star', href: '/algorithm/a-star', category: 'search', difficulty: 2, renderMode: '2d', icon: '⭐', labelKey: 'aStar', status: 'coming-soon' },
  // { id: 'bubble-sort', href: '/algorithm/bubble-sort', category: 'sort', difficulty: 1, renderMode: '2d', icon: '🫧', labelKey: 'bubbleSort', status: 'coming-soon' },
  // { id: 'quick-sort', href: '/algorithm/quick-sort', category: 'sort', difficulty: 2, renderMode: '2d', icon: '⚡', labelKey: 'quickSort', status: 'coming-soon' },
  // { id: 'minimax', href: '/algorithm/minimax', category: 'game-ai', difficulty: 2, renderMode: '2d', icon: '🎮', labelKey: 'minimax', status: 'coming-soon' },
  // { id: 'quadtree', href: '/algorithm/quadtree', category: 'data-structure', difficulty: 2, renderMode: 'both', icon: '🌳', labelKey: 'quadtree', status: 'coming-soon' },
]

export const categoryColors: Record<AlgorithmCategory, string> = {
  collision: 'red',
  search: 'blue',
  sort: 'purple',
  'game-ai': 'amber',
  'data-structure': 'emerald',
}

export const categoryLabels: Record<AlgorithmCategory, string> = {
  collision: 'categories.collision',
  search: 'categories.search',
  sort: 'categories.sort',
  'game-ai': 'categories.gameAi',
  'data-structure': 'categories.dataStructure',
}

export const difficultyLabels = ['', '★☆☆', '★★☆', '★★★']
