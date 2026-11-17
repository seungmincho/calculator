import { WatermarkError } from './imageWatermark.ts'

/** Acquire once per public browser job. Nested decode/draw helpers must not acquire this same gate. */
export function createWatermarkWorkGate() {
  let tail: Promise<void> = Promise.resolve(), active = false, pending = 0
  return {
    getSnapshot: () => ({ active, pending }),
    run<T>(work: () => Promise<T>, current: () => boolean): Promise<T> {
      pending++
      const job = tail.then(async () => {
        pending--
        if (!current()) throw new WatermarkError('canceled')
        active = true
        try { return await work() } finally { active = false }
      })
      tail = job.then(() => {}, () => {})
      return job
    },
  }
}
