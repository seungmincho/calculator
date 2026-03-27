// 알고리즘 시각화 섹션 설정

export type AlgorithmCategory = 'collision' | 'search' | 'sort' | 'game-ai' | 'data-structure' | 'graph' | 'dp' | 'string' | 'geometry' | 'backtracking'

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
  // Graph
  { id: 'kruskal', href: '/algorithm/kruskal', category: 'graph', difficulty: 2, renderMode: '2d', icon: '🌿', labelKey: 'kruskal', status: 'ready' },
  { id: 'topological-sort', href: '/algorithm/topological-sort', category: 'graph', difficulty: 2, renderMode: '2d', icon: '📋', labelKey: 'topologicalSort', status: 'ready' },
  { id: 'union-find', href: '/algorithm/union-find', category: 'graph', difficulty: 1, renderMode: '2d', icon: '🔗', labelKey: 'unionFind', status: 'ready' },
  { id: 'bellman-ford', href: '/algorithm/bellman-ford', category: 'graph', difficulty: 2, renderMode: '2d', icon: '⚖️', labelKey: 'bellmanFord', status: 'ready' },
  // DP
  { id: 'fibonacci-dp', href: '/algorithm/fibonacci-dp', category: 'dp', difficulty: 1, renderMode: '2d', icon: '🌀', labelKey: 'fibonacciDp', status: 'ready' },
  { id: 'knapsack', href: '/algorithm/knapsack', category: 'dp', difficulty: 2, renderMode: '2d', icon: '🎒', labelKey: 'knapsack', status: 'ready' },
  { id: 'lcs', href: '/algorithm/lcs', category: 'dp', difficulty: 2, renderMode: '2d', icon: '📏', labelKey: 'lcs', status: 'ready' },
  // String
  { id: 'kmp', href: '/algorithm/kmp', category: 'string', difficulty: 2, renderMode: '2d', icon: '🎯', labelKey: 'kmp', status: 'ready' },
  { id: 'trie', href: '/algorithm/trie', category: 'string', difficulty: 2, renderMode: '2d', icon: '🔤', labelKey: 'trie', status: 'ready' },
  // Geometry
  { id: 'convex-hull', href: '/algorithm/convex-hull', category: 'geometry', difficulty: 2, renderMode: '2d', icon: '⬡', labelKey: 'convexHull', status: 'ready' },
  { id: 'voronoi', href: '/algorithm/voronoi', category: 'geometry', difficulty: 3, renderMode: '2d', icon: '🔷', labelKey: 'voronoi', status: 'ready' },
  { id: 'raycasting', href: '/algorithm/raycasting', category: 'geometry', difficulty: 3, renderMode: '2d', icon: '💡', labelKey: 'raycasting', status: 'ready' },
  // Data Structure (additional)
  { id: 'avl-tree', href: '/algorithm/avl-tree', category: 'data-structure', difficulty: 3, renderMode: '2d', icon: '🔄', labelKey: 'avlTree', status: 'ready' },
  { id: 'heap', href: '/algorithm/heap', category: 'data-structure', difficulty: 2, renderMode: '2d', icon: '🏗️', labelKey: 'heap', status: 'ready' },
  { id: 'linked-list', href: '/algorithm/linked-list', category: 'data-structure', difficulty: 1, renderMode: '2d', icon: '⛓️', labelKey: 'linkedList', status: 'ready' },
  { id: 'graph-repr', href: '/algorithm/graph-repr', category: 'data-structure', difficulty: 1, renderMode: '2d', icon: '🕸️', labelKey: 'graphRepr', status: 'ready' },
  // Backtracking
  { id: 'n-queens', href: '/algorithm/n-queens', category: 'backtracking', difficulty: 2, renderMode: '2d', icon: '♛', labelKey: 'nQueens', status: 'ready' },
  // Sort (additional)
  { id: 'shell-sort', href: '/algorithm/shell-sort', category: 'sort', difficulty: 1, renderMode: '2d', icon: '🐚', labelKey: 'shellSort', status: 'ready' },
  // Search (comparison)
  { id: 'pathfinding-compare', href: '/algorithm/pathfinding-compare', category: 'search', difficulty: 1, renderMode: '2d', icon: '🏁', labelKey: 'pathfindingCompare', status: 'ready' },
]

export const categoryColors: Record<AlgorithmCategory, string> = {
  collision: 'red',
  search: 'blue',
  sort: 'purple',
  'game-ai': 'amber',
  'data-structure': 'emerald',
  graph: 'teal',
  dp: 'cyan',
  string: 'pink',
  geometry: 'indigo',
  backtracking: 'rose',
}

export const categoryLabels: Record<AlgorithmCategory, string> = {
  collision: 'categories.collision',
  search: 'categories.search',
  sort: 'categories.sort',
  'game-ai': 'categories.gameAi',
  'data-structure': 'categories.dataStructure',
  graph: 'categories.graph',
  dp: 'categories.dp',
  string: 'categories.string',
  geometry: 'categories.geometry',
  backtracking: 'categories.backtracking',
}

export const difficultyLabels = ['', '★☆☆', '★★☆', '★★★']
