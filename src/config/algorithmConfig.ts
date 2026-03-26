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
  { id: 'aabb', href: '/algorithm/aabb', category: 'collision', difficulty: 1, renderMode: '2d', icon: '📦', labelKey: 'aabb', status: 'ready' },
  { id: 'sat', href: '/algorithm/sat', category: 'collision', difficulty: 2, renderMode: 'both', icon: '🔲', labelKey: 'sat', status: 'ready' },
  { id: 'bfs-dfs', href: '/algorithm/bfs-dfs', category: 'search', difficulty: 1, renderMode: '2d', icon: '🔍', labelKey: 'bfsDfs', status: 'ready' },
  { id: 'a-star', href: '/algorithm/a-star', category: 'search', difficulty: 2, renderMode: '2d', icon: '⭐', labelKey: 'aStar', status: 'ready' },
  { id: 'bubble-sort', href: '/algorithm/bubble-sort', category: 'sort', difficulty: 1, renderMode: '2d', icon: '🫧', labelKey: 'bubbleSort', status: 'ready' },
  { id: 'quick-sort', href: '/algorithm/quick-sort', category: 'sort', difficulty: 2, renderMode: '2d', icon: '⚡', labelKey: 'quickSort', status: 'ready' },
  { id: 'insertion-sort', href: '/algorithm/insertion-sort', category: 'sort', difficulty: 1, renderMode: '2d', icon: '📌', labelKey: 'insertionSort', status: 'ready' },
  { id: 'selection-sort', href: '/algorithm/selection-sort', category: 'sort', difficulty: 1, renderMode: '2d', icon: '✋', labelKey: 'selectionSort', status: 'ready' },
  { id: 'heap-sort', href: '/algorithm/heap-sort', category: 'sort', difficulty: 2, renderMode: '2d', icon: '🏔️', labelKey: 'heapSort', status: 'ready' },
  { id: 'binary-search', href: '/algorithm/binary-search', category: 'search', difficulty: 1, renderMode: '2d', icon: '🔎', labelKey: 'binarySearch', status: 'ready' },
  { id: 'minimax', href: '/algorithm/minimax', category: 'game-ai', difficulty: 2, renderMode: '2d', icon: '🎮', labelKey: 'minimax', status: 'ready' },
  { id: 'dijkstra', href: '/algorithm/dijkstra', category: 'search', difficulty: 2, renderMode: '2d', icon: '🗺️', labelKey: 'dijkstra', status: 'ready' },
  { id: 'merge-sort', href: '/algorithm/merge-sort', category: 'sort', difficulty: 2, renderMode: '2d', icon: '🔀', labelKey: 'mergeSort', status: 'ready' },
  { id: 'counting-sort', href: '/algorithm/counting-sort', category: 'sort', difficulty: 1, renderMode: '2d', icon: '📊', labelKey: 'countingSort', status: 'ready' },
  { id: 'radix-sort', href: '/algorithm/radix-sort', category: 'sort', difficulty: 2, renderMode: '2d', icon: '🔢', labelKey: 'radixSort', status: 'ready' },
  { id: 'flood-fill', href: '/algorithm/flood-fill', category: 'search', difficulty: 1, renderMode: '2d', icon: '🎨', labelKey: 'floodFill', status: 'ready' },
  { id: 'stack-queue', href: '/algorithm/stack-queue', category: 'data-structure', difficulty: 1, renderMode: '2d', icon: '📚', labelKey: 'stackQueue', status: 'ready' },
  { id: 'hash-table', href: '/algorithm/hash-table', category: 'data-structure', difficulty: 2, renderMode: '2d', icon: '#️⃣', labelKey: 'hashTable', status: 'ready' },
  { id: 'bst', href: '/algorithm/bst', category: 'data-structure', difficulty: 2, renderMode: '2d', icon: '🌲', labelKey: 'bst', status: 'ready' },
  { id: 'quadtree', href: '/algorithm/quadtree', category: 'data-structure', difficulty: 2, renderMode: '2d', icon: '🌳', labelKey: 'quadtree', status: 'ready' },
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
