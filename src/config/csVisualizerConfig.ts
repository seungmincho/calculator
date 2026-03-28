// CS 개념 시각화 섹션 설정

export type CsCategory = 'cs-basics' | 'network' | 'ml-ai' | 'dev-tools'

export interface CsVisualizerInfo {
  id: string
  href: string
  category: CsCategory
  difficulty: 1 | 2 | 3
  icon: string
  labelKey: string
}

export const csVisualizers: CsVisualizerInfo[] = [
  // CS Basics
  { id: 'git-visualizer', href: '/git-visualizer', category: 'cs-basics', difficulty: 1, icon: '🌿', labelKey: 'gitVisualizer' },
  { id: 'cpu-scheduling', href: '/cpu-scheduling', category: 'cs-basics', difficulty: 2, icon: '⚙️', labelKey: 'cpuScheduling' },
  { id: 'memory-management', href: '/memory-management', category: 'cs-basics', difficulty: 2, icon: '🧠', labelKey: 'memoryManagement' },
  // Network
  { id: 'tcp-handshake', href: '/tcp-handshake', category: 'network', difficulty: 1, icon: '🤝', labelKey: 'tcpHandshake' },
  { id: 'dns-lookup', href: '/dns-lookup', category: 'network', difficulty: 1, icon: '🔎', labelKey: 'dnsLookup' },
  // ML/AI
  { id: 'neural-network', href: '/neural-network', category: 'ml-ai', difficulty: 2, icon: '🤖', labelKey: 'neuralNetwork' },
  { id: 'gradient-descent', href: '/gradient-descent', category: 'ml-ai', difficulty: 2, icon: '📉', labelKey: 'gradientDescent' },
  { id: 'kmeans-clustering', href: '/kmeans-clustering', category: 'ml-ai', difficulty: 1, icon: '🎯', labelKey: 'kmeansClustering' },
  { id: 'decision-tree', href: '/decision-tree', category: 'ml-ai', difficulty: 1, icon: '🌳', labelKey: 'decisionTree' },
  // Dev Tools
  { id: 'regex-engine', href: '/regex-engine', category: 'dev-tools', difficulty: 2, icon: '⚡', labelKey: 'regexEngine' },
]

export const csCategoryColors: Record<CsCategory, string> = {
  'cs-basics': 'emerald',
  'network': 'blue',
  'ml-ai': 'rose',
  'dev-tools': 'amber',
}

export const csCategoryLabels: Record<CsCategory, string> = {
  'cs-basics': 'categories.csBasics',
  'network': 'categories.network',
  'ml-ai': 'categories.mlAi',
  'dev-tools': 'categories.devTools',
}

export const difficultyLabels: Record<number, string> = {
  1: '★☆☆',
  2: '★★☆',
  3: '★★★',
}
