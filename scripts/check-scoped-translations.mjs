import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTranslations } from '../src/lib/i18n/translationLookup.ts'
import { retryCatalogs } from '../src/lib/i18n/generatedRetryCatalogs.ts'
import { generate, sharedNamespaces, toolNamespaces } from './generate-scoped-messages.mjs'

const require = createRequire(import.meta.url), ts = require('typescript')
const root = fileURLToPath(new URL('..', import.meta.url))
const ko = JSON.parse(readFileSync(resolve(root, 'messages/ko.json'), 'utf8'))
const toolNs = Object.keys(ko).filter(key => !sharedNamespaces.includes(key))
const generatedFiles = 2 * (1 + toolNamespaces.length) + 3 * toolNs.length + toolNs.length + 2
assert.equal(generate(true), generatedFiles, 'both canonical languages match all generated subsets and per-namespace modules')
const shared = JSON.parse(readFileSync(resolve(root, 'messages/generated/ko/shared.json'), 'utf8'))
assert.deepEqual(Object.keys(shared), sharedNamespaces)
for (const locale of ['ko', 'en']) {
  const source = JSON.parse(readFileSync(resolve(root, `messages/${locale}.json`), 'utf8'))
  const base = JSON.parse(readFileSync(resolve(root, `messages/generated/${locale}/shared.json`), 'utf8'))
  const subsets = toolNs.map(ns => JSON.parse(readFileSync(resolve(root, `messages/generated/${locale}/ns/${ns}.json`), 'utf8')))
  assert.deepEqual(Object.assign({}, base, ...subsets), source, `${locale}: shared and per-namespace subsets reconstruct the complete source`)
}
assert.ok(Buffer.byteLength(JSON.stringify(shared)) < Buffer.byteLength(JSON.stringify(ko)) * 0.05, 'shared messages stay below 5% of full catalogue')

// Freeze the pre-hook synchronous lookup contract as an independent oracle.
// The registry now uses React hooks and is exercised by check-i18n-react.cjs;
// calling its hook as a plain VM function would bypass React's rules.
function legacyTranslations(namespace) {
  const scope = namespace ? ko[namespace] ?? {} : ko
  const lookup = key => key.split('.').reduce((value, part) => value != null && typeof value === 'object' ? value[part] : undefined, scope)
  const t = (key, vars) => {
    const value = lookup(key)
    if (typeof value !== 'string') return key
    return vars ? value.replace(/\{(\w+)\}/g, (_, name) => vars[name] != null ? String(vars[name]) : `{${name}}`) : value
  }
  t.raw = lookup
  return t
}
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
    const old = legacyTranslations(namespace), current = scoped(namespace)
    for (const [key] of paths(namespace ? messages[namespace] : messages)) {
      assert.equal(current(key), old(key), `${scope}/${namespace || 'root'}/${key}`)
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

// Every generated registration owns exactly one literal EN import. Registration
// itself only supplies the thunk; it cannot pull the complete catalogue.
for (const ns of toolNs) {
  const file = resolve(root, `src/lib/i18n/ns/${ns}.ts`)
  const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const dynamicImports = [], staticImports = [], fallbacks = []
  function inspect(node) {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      assert.equal(node.arguments.length, 1)
      assert.ok(ts.isStringLiteral(node.arguments[0]), `${ns}: dynamic import must be literal`)
      dynamicImports.push(node.arguments[0].text)
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) staticImports.push(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'loadTranslationFallback') {
      assert.equal(node.arguments.length, 2)
      assert.ok(ts.isStringLiteral(node.arguments[0]))
      assert.ok(ts.isArrayLiteralExpression(node.arguments[1]))
      assert.equal(node.arguments[1].elements.length, 1)
      assert.ok(ts.isStringLiteral(node.arguments[1].elements[0]))
      assert.equal(node.arguments[1].elements[0].text, ns)
      fallbacks.push(node.arguments[0].text)
    }
    ts.forEachChild(node, inspect)
  }
  inspect(tree)
  assert.deepEqual(dynamicImports, [`../../../../messages/generated/en/ns/${ns}.json`], `${ns}: load only its own English namespace`)
  assert.deepEqual(staticImports.sort(), ['@/lib/i18n', '@/lib/i18n/translationFetch', `../../../../messages/generated/ko/ns/${ns}.json`].sort())
  const english = readFileSync(resolve(root, `messages/generated/en/ns/${ns}.json`), 'utf8')
  const hash = createHash('sha256').update(english).digest('hex').slice(0, 16)
  assert.deepEqual(fallbacks, [`/i18n/en/ns/${ns}.${hash}.json`], `${ns}: retry URL is scoped and content-addressed`)
  assert.equal(readFileSync(resolve(root, 'public', fallbacks[0].slice(1)), 'utf8'), english)
}
assert.deepEqual(Object.keys(retryCatalogs), ['shared', ...toolNamespaces], 'initial manifest contains only eight lightweight scopes')
for (const [scope, catalog] of Object.entries(retryCatalogs)) {
  assert.deepEqual([...catalog.namespaces], scope === 'shared' ? sharedNamespaces : [scope])
  const content = readFileSync(resolve(root, `messages/generated/en/${scope}.json`), 'utf8')
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16)
  assert.equal(catalog.url, `/i18n/en/${scope === 'shared' ? 'shared' : `ns/${scope}`}.${hash}.json`)
  assert.equal(readFileSync(resolve(root, 'public', catalog.url.slice(1)), 'utf8'), content)
}

// Protect the initial dependency graph: migrating a shared component must not
// silently reintroduce the full catalogue through another static import.
for (const entry of ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/loan-calculator/page.tsx', 'src/app/salary-calculator/page.tsx', 'src/app/fuel-calculator/page.tsx', 'src/app/running-pace/page.tsx']) {
  const visited = new Set()
  function visit(file) {
    if (visited.has(file)) return
    visited.add(file)
    assert.notEqual(file, resolve(root, 'src/lib/i18n.ts'), `${entry} imports the namespace registry instead of a scoped module`)
    assert.notEqual(file, resolve(root, 'messages/ko.json'), `${entry} imports full messages directly`)
    assert.notEqual(file, resolve(root, 'messages/en.json'), `${entry} imports full English messages directly`)
    assert.ok(!file.startsWith(resolve(root, 'messages/generated/en') + sep), `${entry} imports English messages statically`)
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
console.log(`check-scoped-translations OK: ${generatedFiles} generated files, KO/EN complete reconstruction, ${compared} pure legacy parity cases, missing/interpolation/raw contract, ${toolNs.length} scoped EN thunks, 6 dependency graphs; React registry parity is checked separately`)
