// Read-only reproduction against the current ratio helpers. No product changes.
import { reduceRatio, parseRatio, resolutionLadder } from '../../../src/utils/aspectRatio.ts'
const probes = []
try {
  const value = reduceRatio(Infinity, 1080)
  probes.push({ name: 'non-finite ratio dimensions', value })
} catch (error) {
  probes.push({ name: 'non-finite ratio dimensions', error: error.name })
}
const value = parseRatio(`${'9'.repeat(400)}:1`)
probes.push({ name: '400-digit custom ratio', finite: Number.isFinite(value), value: String(value) })
probes.push({ name: 'non-finite ladder', finite: resolutionLadder(value).every(row => Number.isFinite(row.w) && Number.isFinite(row.h)) })
console.log(JSON.stringify({ reproductionOnly: true, probes }, null, 2))
