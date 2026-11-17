import assert from 'node:assert/strict'
import { createSpeakingPreparation, isSpeakingPreparationSeconds, type SpeakingPreparationSeconds } from '../src/utils/speakingPreparation.ts'

let groups = 0
const check = (name: string, run: () => void) => { run(); groups++; console.log(`PASS ${name}`) }
check('only explicit preparation choices; malformed start clocks rejected', () => {
  for (const value of [0, 3, 5]) assert.equal(isSpeakingPreparationSeconds(value), true)
  for (const value of ['3', -1, 1, 2, 4, 10, null, undefined, Infinity, NaN]) {
    assert.equal(isSpeakingPreparationSeconds(value), false)
    assert.throws(() => createSpeakingPreparation(value as SpeakingPreparationSeconds, 0))
  }
  assert.throws(() => createSpeakingPreparation(3, NaN))
})
check('default zero starts exactly once', () => {
  const timer = createSpeakingPreparation(0, 1234)
  assert.deepEqual(timer.advance(1234), { remaining: 0, start: true })
  assert.deepEqual(timer.advance(1234), { remaining: 0, start: false })
  assert.deepEqual(timer.advance(90000), { remaining: 0, start: false })
})
check('three and five seconds use an approval-relative deadline with fractional boundaries', () => {
  for (const seconds of [3, 5] as const) {
    const origin = 90123.5, timer = createSpeakingPreparation(seconds, origin)
    for (let ms = 0; ms < seconds * 1000; ms += 125) assert.deepEqual(timer.advance(origin + ms), { remaining: Math.ceil((seconds * 1000 - ms) / 1000), start: false })
    assert.deepEqual(timer.advance(origin + seconds * 1000 - .001), { remaining: 1, start: false })
    assert.deepEqual(timer.advance(origin + seconds * 1000), { remaining: 0, start: true })
  }
})
check('delayed callback, clock rollback and nonfinite samples do not extend or duplicate preparation', () => {
  const timer = createSpeakingPreparation(5, 100)
  assert.equal(timer.advance(2200).remaining, 3)
  for (const now of [2200, 2000, -500, NaN, Infinity]) assert.deepEqual(timer.advance(now), { remaining: 3, start: false })
  assert.deepEqual(timer.advance(300100), { remaining: 0, start: true })
  assert.equal(timer.advance(5100).start, false)
})
check('canceled generation cannot start a replacement countdown', () => {
  const old = createSpeakingPreparation(3, 0); old.cancel()
  const next = createSpeakingPreparation(5, 1000)
  assert.equal(old.advance(99999).start, false)
  assert.deepEqual(next.advance(3999), { remaining: 3, start: false })
  next.cancel(); next.cancel(); assert.equal(next.advance(99999).start, false)
})
console.log(`Speaking preparation: ${groups} groups passed`)
