// ── Types ─────────────────────────────────────────────────────────────────────

export interface KnapsackItem {
  id: number
  name: string
  weight: number
  value: number
  icon: string
}

export interface KnapsackStep {
  action: 'init' | 'consider' | 'exclude' | 'include' | 'fill' | 'traceback-check' | 'traceback-select' | 'traceback-skip' | 'done'
  row: number       // item index (0 = header row)
  col: number       // capacity
  value: number
  description: string
  includeValue?: number
  excludeValue?: number
}

export interface KnapsackResult {
  steps: KnapsackStep[]
  dp: number[][]
  selectedItems: number[]   // indices of selected items
  maxValue: number
  totalWeight: number
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const KNAPSACK_PRESETS: { name: string; items: KnapsackItem[]; capacity: number }[] = [
  {
    name: 'camping',
    items: [
      { id: 0, name: 'tent', weight: 3, value: 4, icon: '⛺' },
      { id: 1, name: 'sleepingBag', weight: 2, value: 3, icon: '🛏️' },
      { id: 2, name: 'food', weight: 4, value: 5, icon: '🍖' },
      { id: 3, name: 'water', weight: 1, value: 2, icon: '💧' },
      { id: 4, name: 'lantern', weight: 1, value: 3, icon: '🔦' },
    ],
    capacity: 7,
  },
  {
    name: 'treasure',
    items: [
      { id: 0, name: 'gold', weight: 5, value: 10, icon: '🥇' },
      { id: 1, name: 'silver', weight: 3, value: 6, icon: '🥈' },
      { id: 2, name: 'diamond', weight: 1, value: 7, icon: '💎' },
      { id: 3, name: 'ruby', weight: 2, value: 5, icon: '❤️' },
      { id: 4, name: 'pearl', weight: 2, value: 4, icon: '🫧' },
    ],
    capacity: 8,
  },
  {
    name: 'study',
    items: [
      { id: 0, name: 'laptop', weight: 4, value: 8, icon: '💻' },
      { id: 1, name: 'textbook', weight: 3, value: 4, icon: '📚' },
      { id: 2, name: 'notebook', weight: 1, value: 2, icon: '📒' },
      { id: 3, name: 'tablet', weight: 2, value: 5, icon: '📱' },
      { id: 4, name: 'charger', weight: 1, value: 3, icon: '🔌' },
    ],
    capacity: 7,
  },
]

// ── Solver ────────────────────────────────────────────────────────────────────

export function solveKnapsack(items: KnapsackItem[], capacity: number): KnapsackResult {
  const n = items.length
  const steps: KnapsackStep[] = []

  // dp[i][w] = max value using first i items with capacity w
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0))

  // Init step
  steps.push({ action: 'init', row: 0, col: 0, value: 0, description: 'DP init' })

  // Fill table
  for (let i = 1; i <= n; i++) {
    const item = items[i - 1]
    for (let w = 0; w <= capacity; w++) {
      const excludeVal = dp[i - 1][w]

      steps.push({
        action: 'consider',
        row: i, col: w, value: excludeVal,
        description: `item[${i}](w=${item.weight},v=${item.value}), cap=${w}`,
      })

      if (item.weight <= w) {
        const includeVal = dp[i - 1][w - item.weight] + item.value

        if (includeVal > excludeVal) {
          dp[i][w] = includeVal
          steps.push({
            action: 'include', row: i, col: w, value: includeVal,
            includeValue: includeVal, excludeValue: excludeVal,
            description: `${includeVal} > ${excludeVal}`,
          })
        } else {
          dp[i][w] = excludeVal
          steps.push({
            action: 'exclude', row: i, col: w, value: excludeVal,
            includeValue: includeVal, excludeValue: excludeVal,
            description: `${excludeVal} >= ${includeVal}`,
          })
        }
      } else {
        dp[i][w] = excludeVal
        steps.push({
          action: 'exclude', row: i, col: w, value: excludeVal,
          description: `w(${item.weight}) > cap(${w})`,
        })
      }

      steps.push({ action: 'fill', row: i, col: w, value: dp[i][w], description: `dp[${i}][${w}] = ${dp[i][w]}` })
    }
  }

  // Traceback
  const selectedItems: number[] = []
  let w = capacity
  for (let i = n; i >= 1; i--) {
    steps.push({ action: 'traceback-check', row: i, col: w, value: dp[i][w], description: `dp[${i}][${w}]=${dp[i][w]} vs dp[${i - 1}][${w}]=${dp[i - 1][w]}` })

    if (dp[i][w] !== dp[i - 1][w]) {
      selectedItems.push(i - 1)
      steps.push({ action: 'traceback-select', row: i, col: w, value: dp[i][w], description: `item ${items[i - 1].icon} selected` })
      w -= items[i - 1].weight
    } else {
      steps.push({ action: 'traceback-skip', row: i, col: w, value: dp[i][w], description: `item ${items[i - 1].icon} skipped` })
    }
  }

  selectedItems.reverse()

  const maxValue = dp[n][capacity]
  const totalWeight = selectedItems.reduce((sum, idx) => sum + items[idx].weight, 0)

  steps.push({ action: 'done', row: n, col: capacity, value: maxValue, description: `max=${maxValue}` })

  return { steps, dp, selectedItems, maxValue, totalWeight }
}
