// Run the unchanged 13th regression assertions with only the new host hook/module ports.
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import path from 'node:path'
const original = path.resolve('docs/verify/2026-11-16-repeat-batch13/check-tts-recovery-component.cjs')
let source = fs.readFileSync(original, 'utf8')
const changes = [
  ["external: ['react',", "external: ['@/contexts/LanguageContext', '@/components/TtsReadingList', 'react',"],
  ['react.useCallback = (fn, deps) => react.useMemo(() => fn, deps)', 'react.useCallback = (fn, deps) => react.useMemo(() => fn, deps); react.useLayoutEffect = react.useEffect'],
  ["require(name) { if (name === 'react')", "require(name) { if (name === '@/contexts/LanguageContext') return { useOptionalLanguage: () => ({ language: 'ko' }) }; if (name === '@/components/TtsReadingList') return { __esModule: true, default: 'ReadingListBoundary' }; if (name === 'react')"],
]
for (const [before, after] of changes) { if (!source.includes(before)) throw Error('Legacy host anchor changed'); source = source.replace(before, after) }
vm.runInThisContext('(function(require, module, exports) {\n' + source + '\n})', { filename: 'tts-legacy-host-bridge.cjs' })(createRequire(original), { exports: {} }, {})
