import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

// Keep wave20's independent assertions untouched. Adapt only its idle recorder stub
// to the hook's added synchronous busy/phase API; no real storage or microphone.
const original = new URL('../2026-11-17-repeat-batch20/check-speaking-component.cjs', import.meta.url)
const source = fs.readFileSync(original, 'utf8')
const old = 'recording: false, requesting: false, seconds: 0, level: 0, start() {}'
assert.equal(source.split(old).length, 2)
const adapted = source.replace(old, "recording: false, requesting: false, preparing: false, phase: 'idle', remaining: 0, isBusy: () => false, seconds: 0, level: 0, start() {}")
const target = { exports: {} }
vm.runInThisContext(`(function(require,module,exports){\n${adapted}\n})`, { filename: 'wave50-existing-speaking-regression.cjs' })(createRequire(original), target, target.exports)
