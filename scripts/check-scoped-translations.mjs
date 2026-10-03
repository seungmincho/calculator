import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { createTranslations } from '../src/lib/i18n/translationLookup.ts'
import { generate, sharedNamespaces, toolNamespaces } from './generate-scoped-messages.mjs'

const require = createRequire(import.meta.url), ts = require('typescript')
const root = fileURLToPath(new URL('..', import.meta.url))
const ko = JSON.parse(readFileSync(resolve(root, 'messages/ko.json'), 'utf8'))
assert.equal(generate(true), 12, 'both canonical languages match all generated subsets')
const shared = JSON.parse(readFileSync(resolve(root, 'messages/generated/ko/shared.json'), 'utf8'))
assert.deepEqual(Object.keys(shared), sharedNamespaces)
for (const locale of ['ko', 'en']) {
  const read = name => JSON.parse(readFileSync(resolve(root, `messages/${name}.json`), 'utf8'))
  assert.deepEqual({ ...read(`generated/${locale}/shared`), ...read(`generated/${locale}/legacy`) }, read(locale), 'legacy and shared subsets reconstruct the complete source')
}
assert.ok(Buffer.byteLength(JSON.stringify(shared)) < Buffer.byteLength(JSON.stringify(ko)) * 0.05, 'shared messages stay below 5% of full catalogue')

// The unchanged legacy implementation is the compatibility oracle.
const legacySource = readFileSync(resolve(root, 'src/lib/i18n.ts'), 'utf8')
const compiled = ts.transpileModule(legacySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
const exports = {}
runInNewContext(compiled, { exports, require: spec => {
  assert.ok(['../../messages/generated/ko/shared.json', '../../messages/generated/ko/legacy.json'].includes(spec))
  return JSON.parse(readFileSync(resolve(root, spec.replace('../../', '')), 'utf8'))
} })
let compared = 0
function paths(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key
    return [[name, value], ...(value && typeof value === 'object' && !Array.isArray(value) ? paths(value, name) : [])]
  })
}
for (const scope of ['shared', ...toolNamespaces]) {
  const messages = { ...shared, ...JSON.parse(readFileSync(resolve(root, `messages/generated/ko/${scope}.json`), 'utf8')) }
  const scoped = createTranslations(messages)
  for (const namespace of [undefined, ...Object.keys(messages)]) {
    const old = exports.useTranslations(namespace), current = scoped(namespace)
    for (const [key] of paths(namespace ? messages[namespace] : messages)) {
      assert.equal(current(key), old(key), `${scope}/${namespace || 'root'}/${key}`)
      // VM object prototypes differ; JSON compares raw content across realms.
      assert.equal(JSON.stringify(current.raw(key)), JSON.stringify(old.raw(key)))
      assert.equal(current(key, { count: 0, amount: 123, year: 2026, name: '테스트' }), old(key, { count: 0, amount: 123, year: 2026, name: '테스트' }))
      compared++
    }
    assert.equal(current('missing.key'), 'missing.key')
    assert.equal(current.raw('missing.key'), undefined)
  }
}
const fixture = createTranslations({ sample: { greeting: '{zero}/{no}/{empty}/{missing}', array: ['a'], nested: { text: 'value' } } })('sample')
assert.equal(fixture('greeting', { zero: 0, no: false, empty: '', missing: null }), '0/false//{missing}')
assert.deepEqual(fixture.raw('array'), ['a'])
assert.equal(fixture('array'), 'array')
assert.equal(fixture('nested.text'), 'value')
assert.equal(fixture('nested.text.deep'), 'nested.text.deep')
assert.equal(createTranslations(shared)('missing')('title'), 'title')

// Protect the initial dependency graph: migrating a shared component must not
// silently reintroduce the full catalogue through another static import.
for (const entry of ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/loan-calculator/page.tsx', 'src/app/salary-calculator/page.tsx', 'src/app/fuel-calculator/page.tsx', 'src/app/running-pace/page.tsx']) {
  const visited = new Set()
  function visit(file) {
    if (visited.has(file)) return
    visited.add(file)
    assert.notEqual(file, resolve(root, 'src/lib/i18n.ts'), `${entry} imports legacy full catalogue`)
    assert.notEqual(file, resolve(root, 'messages/ko.json'), `${entry} imports full messages directly`)
    if (file.endsWith('.json')) return
    const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    for (const node of tree.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly || !ts.isStringLiteral(node.moduleSpecifier)) continue
      const spec = node.moduleSpecifier.text
      const base = spec.startsWith('@/') ? resolve(root, 'src', spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(file), spec) : null
      if (!base) continue
      const dependency = [base, ...['.ts', '.tsx', '.json', '.js', '/index.ts', '/index.tsx'].map(ext => base + ext)].find(candidate => existsSync(candidate) && statSync(candidate).isFile())
      assert.ok(dependency, `Unresolved local import ${spec} in ${file}`)
      visit(dependency)
    }
  }
  visit(resolve(root, entry))
}
console.log(`check-scoped-translations OK: 12 generated files, complete legacy reconstruction, ${compared} legacy parity cases, missing/interpolation/raw contract, 6 dependency graphs`)
