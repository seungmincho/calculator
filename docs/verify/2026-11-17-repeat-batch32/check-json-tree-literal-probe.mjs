import assert from 'node:assert/strict'
import { JSONPath } from 'jsonpath-plus'

// Read-only design probe of the installed engine; not a product implementation.
const keys = ['a.b', '', '0', 'a/b', 'a~b', '한글', '*', '..', '$', '`', 'constructor', '__proto__', 'a"b', "a'b", 'a\\b', 'x]y', 'x[y', 'a\nb', 'a;b', '^', '@string()', '%@%', '%%@@%%', 'a,b', '(x)', ':', '😀']
const unsupported = new Set(['x]y', 'x[y', 'a;b', '^', '@string()', '%@%', '%%@@%%'])
const candidate = segments => '$' + segments.map(part => typeof part === 'number' ? `[${part}]` : "['`" + part + "']").join('')
const tokens = segments => ['$', ...segments.map(part => typeof part === 'number' ? String(part) : '`' + part)]
const probe = (json, segments, parent, property, value) => {
  const path = candidate(segments), actualTokens = JSONPath.toPathArray(path)
  const exact = JSON.stringify(actualTokens) === JSON.stringify(tokens(segments))
  if (!exact) return { exact, evaluated: false }
  const result = JSONPath({ path, json, eval: false, wrap: true, resultType: 'all' })
  const matches = Array.isArray(result) && result.length === 1 && result[0].parent === parent && String(result[0].parentProperty) === String(property) && Object.is(result[0].value, value)
  return { exact, evaluated: true, matches }
}

for (const key of keys) {
  // Equal-valued decoy makes plain value equality insufficient.
  const json = JSON.parse(JSON.stringify({ [key]: 7, decoy: 7 }))
  const result = probe(json, [key], json, key, 7)
  assert.equal(result.exact, !unsupported.has(key), JSON.stringify(key))
  if (result.exact) assert.equal(result.matches, true, JSON.stringify(key))
  else assert.equal(result.evaluated, false)
}
console.log('PASS design probe: 27 literal keys with equal-valued decoy, exact public tokens and own parent/property/value')

for (const key of ['*', '..', '0', '', 'a.b', 'a"b', "a'b", 'a\\b', 'a\nb']) {
  const child = JSON.parse(JSON.stringify({ [key]: false, decoy: false }))
  const json = { '0': [child, { decoy: 0 }], decoy: [child] }
  assert.deepEqual(probe(json, ['0', 0, key], child, key, false), { exact: true, evaluated: true, matches: true })
}
for (const key of unsupported) {
  const json = JSON.parse(JSON.stringify({ [key]: { safe: 0 }, decoy: { safe: 0 } }))
  assert.deepEqual(probe(json, [key, 'safe'], json[key], 'safe', 0), { exact: false, evaluated: false })
}
console.log('PASS design probe: numeric object key + array index + literal descendant; unsupported ancestor stops evaluation')

for (const value of [null, false, 0, '']) {
  const observed = JSONPath({ path: '$', json: value, eval: false, wrap: true, resultType: 'all' })
  assert.equal(observed, undefined)
}
console.log('PASS design probe: installed falsy-root limitation confirmed; proposed root uses typed resolver, not engine result')
