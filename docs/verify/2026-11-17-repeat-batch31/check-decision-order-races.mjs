import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { decisionOrderRaceHarness } from './decision-order-race-harness.mjs'

const expectFixed = process.argv.includes('--expect-fixed')
const observations = []

{
  const f = await decisionOrderRaceHarness()
  f.draw(); await f.fire(f.pending(400)[0]); await f.fire(f.pending(500)[0])
  assert.equal(f.visible(), 1)
  const oldTick = f.pending(500)[0]
  f.revealAll(); const before = f.visible(); assert.equal(before, 4); assert.equal(f.canCopy(), true)
  await f.fire(oldTick)
  const after = f.visible(), canCopy = f.canCopy()
  observations.push({ case: 'revealAllThenOlderTick', before, after, canCopy, expectedFixed: { after: 4, canCopy: true }, shuffleCalls: f.draws() })
  assert.equal(f.draws(), 1)
  if (expectFixed) { assert.equal(after, 4, 'An older tick must not hide already revealed names'); assert.equal(canCopy, true) }
  else { assert.equal(after, 2, 'Expected to reproduce the legacy 4→2 reveal regression'); assert.equal(canCopy, false) }
  f.h.cleanup()
}

{
  const f = await decisionOrderRaceHarness()
  f.draw(); await f.fire(f.pending(400)[0]); await f.fire(f.pending(500)[0]); assert.equal(f.visible(), 1)
  const oldTick = f.pending(500)[0]
  f.reset(); assert.equal(f.visible(), 0)
  f.draw(); const newPrepare = f.pending(400)[0]
  await f.fire(oldTick) // The old run advances while the new draw is still preparing.
  await f.fire(newPrepare)
  const after = f.visible()
  observations.push({ case: 'resetNewDrawThenOlderTickBeforeNewPrepare', after, expectedFixed: { after: 0 }, shuffleCalls: f.draws() })
  assert.equal(f.draws(), 2)
  if (expectFixed) assert.equal(after, 0, 'The new draw must wait for its own first reveal tick')
  else assert.equal(after, 2, 'Expected to reproduce two premature names from the older draw count')
  f.h.cleanup()
}

const result = {
  mode: expectFixed ? 'fixed-expectations' : 'legacy-defect-reproduction',
  parentSha256: crypto.createHash('sha256').update(fs.readFileSync('src/components/DecisionTools.tsx')).digest('hex'),
  observations,
}
if (process.argv.includes('--write-evidence')) fs.writeFileSync(`docs/verify/2026-11-17-repeat-batch31/decision-order-${expectFixed ? 'after' : 'before'}-fix.json`, JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
console.log(expectFixed ? 'PASS 2 actual-parent race regression groups' : 'REPRODUCED 2 legacy actual-parent reveal races; not a product PASS')
