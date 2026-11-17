/** Grade-only aggregation. Callers validate inputs and preserve their own subject metadata. */
export function evaluateCsatGradeAreas<T extends { id: string; grade: number }>(
  available: readonly T[], condition: { areas: number; maxSum: number },
) {
  const valid = [2, 3, 4].includes(condition.areas) && Number.isInteger(condition.maxSum)
    && condition.maxSum >= condition.areas && condition.maxSum <= condition.areas * 9
  const used = valid ? [...available].sort((a, b) => a.grade - b.grade).slice(0, condition.areas) : []
  const sum = valid && available.length >= condition.areas ? used.reduce((total, area) => total + area.grade, 0) : null
  const status: 'invalidCondition' | 'needsInput' | 'within' | 'over' = !valid ? 'invalidCondition' : sum === null ? 'needsInput' : sum <= condition.maxSum ? 'within' : 'over'
  return { status, areas: condition.areas, maxSum: condition.maxSum, sum, over: sum === null ? null : Math.max(0, sum - condition.maxSum), used }
}
