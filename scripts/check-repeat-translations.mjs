// Check a repeat-use batch's translation patches and the static keys used by its components.
// Usage: node scripts/check-repeat-translations.mjs docs/verify/<batch> ComponentName ...
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import ts from 'typescript'

const [folder, ...components] = process.argv.slice(2)
if (!folder || !components.length) throw new Error('Provide a batch folder and component names')
const messages = Object.fromEntries(['ko', 'en'].map(lang => [lang, JSON.parse(fs.readFileSync(`messages/${lang}.json`, 'utf8'))]))
const lookup = (root, key) => key.split('.').reduce((value, part) => value?.[part], root)
const variables = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
function leaves(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) leaves(child, fullKey, output)
    else output[fullKey] = child
  }
  return output
}

const patches = []
for (const filename of fs.readdirSync(folder).filter(name => /^translations-.+\.json$/.test(name)).sort()) {
  const patch = JSON.parse(fs.readFileSync(path.join(folder, filename), 'utf8'))
  const ko = leaves(patch.ko), en = leaves(patch.en)
  assert.deepEqual(Object.keys(ko).sort(), Object.keys(en).sort(), `${filename}: language keys`)
  for (const [key, value] of Object.entries(ko)) {
    assert.equal(Array.isArray(value), Array.isArray(en[key]), `${key}: array type`)
    assert.equal(typeof value, typeof en[key], `${key}: value type`)
    assert.deepEqual(variables(value), variables(en[key]), `${key}: interpolation variables`)
    for (const lang of ['ko', 'en']) assert.deepEqual(lookup(messages[lang], key), lookup(patch[lang], key), `${lang}.${key}: merged value`)
  }
  patches.push({ name: filename.slice(13, -5), leafKeysPerLanguage: Object.keys(ko).length })
}

const errors = [], componentChecks = []
for (const component of components) {
  const file = `src/components/${component}.tsx`
  const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const namespaces = new Map(), dynamicPrefixes = new Set()
  let checked = 0
  function discover(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(tree) === 'useTranslations') {
      const arg = node.initializer.arguments[0]
      if (arg && ts.isStringLiteral(arg)) namespaces.set(node.name.text, arg.text)
    }
    ts.forEachChild(node, discover)
  }
  discover(tree)
  function checkKey(namespace, key) {
    for (const lang of ['ko', 'en']) if (lookup(messages[lang], `${namespace}.${key}`) === undefined) errors.push(`${file}: ${lang}.${namespace}.${key}`)
  }
  function inspectArgument(namespace, node) {
    if (!node) return
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      checkKey(namespace, node.text)
      checked++
    } else if (ts.isConditionalExpression(node)) {
      inspectArgument(namespace, node.whenTrue)
      inspectArgument(namespace, node.whenFalse)
    } else if (ts.isTemplateExpression(node)) {
      // A head such as result.png${size} names result.png512, not a result.png object.
      const prefix = node.head.text.endsWith('.')
        ? node.head.text.slice(0, -1)
        : node.head.text.slice(0, Math.max(0, node.head.text.lastIndexOf('.')))
      if (prefix) { checkKey(namespace, prefix); dynamicPrefixes.add(prefix) }
    }
  }
  function inspect(node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression
      const translator = ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) ? expression.expression.text : ''
      if (namespaces.has(translator)) inspectArgument(namespaces.get(translator), node.arguments[0])
    }
    ts.forEachChild(node, inspect)
  }
  inspect(tree)
  componentChecks.push({ component, staticKeysChecked: checked, dynamicPrefixesChecked: [...dynamicPrefixes] })
}
const result = { checkedAt: new Date().toISOString(), patches, componentChecks, errors, note: 'Static ko/en key, interpolation and merged-value validation; dynamic keys are checked only by prefix. Not English runtime UI verification.' }
fs.writeFileSync(path.join(folder, 'i18n-static.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ folder, patchKeysPerLanguage: patches.reduce((count, patch) => count + patch.leafKeysPerLanguage, 0), staticUses: componentChecks.reduce((count, component) => count + component.staticKeysChecked, 0), errors }, null, 2))
if (errors.length) process.exitCode = 1
