import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

// Keep the shared event harness unchanged; expose its actual effect callbacks for StrictMode replay.
const path = new URL('../2026-11-17-repeat-batch19/component-harness.cjs', import.meta.url)
const source = fs.readFileSync(path, 'utf8')
const anchor = '    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); timers.clear() },'
if (!source.includes(anchor)) throw new Error('Shared harness cleanup anchor changed')
const extended = source.replace(anchor, `    replayEffects() {
      for (const [index] of effects) hooks[index].cleanup?.()
      for (const [index, pending] of effects) hooks[index].cleanup = pending.effect()
      return render()
    },\n` + anchor)
const harnessModule = { exports: {} }
vm.runInThisContext('(function(require, module, exports) {\n' + extended + '\n})', { filename: 'team-parent-harness-wrapper.cjs' })(createRequire(path), harnessModule, harnessModule.exports)
export const componentHarness = harnessModule.exports.componentHarness
