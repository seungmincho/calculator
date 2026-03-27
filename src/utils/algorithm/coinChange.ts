// ── Types ─────────────────────────────────────────────────────────────────────

export interface CoinChangeStep {
  action: 'init' | 'try-coin' | 'update' | 'skip' | 'fill' | 'backtrack-pick' | 'backtrack-skip' | 'greedy-pick' | 'done'
  amount: number       // current amount being processed
  coin?: number        // coin being considered
  dpValue: number      // dp[amount] at this point
  prevDpValue?: number // dp[amount - coin] value
  description: string
}

export interface CoinChangeResult {
  steps: CoinChangeStep[]
  dp: number[]             // dp[i] = min coins for amount i
  coinUsed: number[]       // coinUsed[i] = which coin was used to reach dp[i]
  selectedCoins: number[]  // coins in the optimal solution
  minCoins: number
  impossible: boolean
  // Greedy comparison
  greedyCoins: number[]
  greedyCount: number
  greedyPossible: boolean
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const COIN_PRESETS: { name: string; coins: number[]; amount: number }[] = [
  { name: 'classic', coins: [1, 3, 4], amount: 6 },
  { name: 'standard', coins: [1, 5, 10, 25], amount: 30 },
  { name: 'tricky', coins: [3, 7, 11], amount: 15 },
  { name: 'korean', coins: [10, 50, 100, 500], amount: 760 },
]

const INF = 1e9

// ── Greedy solver ────────────────────────────────────────────────────────────

function solveGreedy(coins: number[], amount: number): { coins: number[]; count: number; possible: boolean } {
  const sorted = [...coins].sort((a, b) => b - a)
  const result: number[] = []
  let remaining = amount

  for (const coin of sorted) {
    while (remaining >= coin) {
      result.push(coin)
      remaining -= coin
    }
  }

  return {
    coins: result,
    count: result.length,
    possible: remaining === 0,
  }
}

// ── DP Solver ────────────────────────────────────────────────────────────────

export function solveCoinChange(coins: number[], amount: number): CoinChangeResult {
  const steps: CoinChangeStep[] = []
  const dp = new Array(amount + 1).fill(INF)
  const coinUsed = new Array(amount + 1).fill(-1)

  dp[0] = 0
  steps.push({ action: 'init', amount: 0, dpValue: 0, description: 'dp[0] = 0' })

  // Bottom-up: for each amount 1..amount
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin > i) {
        steps.push({
          action: 'skip', amount: i, coin, dpValue: dp[i],
          description: `coin ${coin} > amount ${i}`,
        })
        continue
      }

      const prev = dp[i - coin]
      steps.push({
        action: 'try-coin', amount: i, coin, dpValue: dp[i], prevDpValue: prev,
        description: `dp[${i - coin}] + 1 = ${prev === INF ? 'INF' : prev + 1}`,
      })

      if (prev + 1 < dp[i]) {
        dp[i] = prev + 1
        coinUsed[i] = coin
        steps.push({
          action: 'update', amount: i, coin, dpValue: dp[i], prevDpValue: prev,
          description: `dp[${i}] = ${dp[i]} (use coin ${coin})`,
        })
      }
    }

    steps.push({
      action: 'fill', amount: i, dpValue: dp[i],
      description: `dp[${i}] = ${dp[i] >= INF ? 'INF' : dp[i]}`,
    })
  }

  // Backtrack to find selected coins
  const selectedCoins: number[] = []
  const impossible = dp[amount] >= INF

  if (!impossible) {
    let rem = amount
    while (rem > 0) {
      const coin = coinUsed[rem]
      if (coin === -1) break
      steps.push({
        action: 'backtrack-pick', amount: rem, coin, dpValue: dp[rem],
        description: `pick coin ${coin} at amount ${rem}`,
      })
      selectedCoins.push(coin)
      rem -= coin
    }
  }

  // Greedy comparison
  const greedy = solveGreedy(coins, amount)
  if (greedy.possible) {
    for (const coin of greedy.coins) {
      steps.push({
        action: 'greedy-pick', amount: 0, coin, dpValue: 0,
        description: `greedy: pick ${coin}`,
      })
    }
  }

  steps.push({
    action: 'done', amount, dpValue: impossible ? -1 : dp[amount],
    description: impossible ? 'impossible' : `min coins = ${dp[amount]}`,
  })

  return {
    steps, dp, coinUsed, selectedCoins,
    minCoins: impossible ? -1 : dp[amount],
    impossible,
    greedyCoins: greedy.coins,
    greedyCount: greedy.count,
    greedyPossible: greedy.possible,
  }
}
