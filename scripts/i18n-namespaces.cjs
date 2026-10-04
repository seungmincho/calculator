// 번역 네임스페이스 import 관리 (2026-10-04 레지스트리 분할). 새 도구 추가 후 --apply, 배포 전 --audit.
// Namespace codemod + audit for the i18n registry refactor.
//   node scripts/i18n-namespaces.cjs          → dry run: print planned imports + issues
//   node scripts/i18n-namespaces.cjs --apply  → insert `import '@/lib/i18n/ns/<ns>'` lines
//   node scripts/i18n-namespaces.cjs --audit  → verify every used namespace is shared / provided / imported
const ts = require('typescript')
const fs = require('fs'), path = require('path')
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const ko = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages/ko.json'), 'utf8'))
const shared = new Set(['accessibility', 'common', 'dailyTips', 'favorites', 'footer', 'header',
  'homePage', 'mobileNav', 'navigation', 'pushNotification', 'searchDialog', 'toolsShowcase',
  'subcategory', 'shareResult', 'relatedTools', 'analyticsDashboard', 'feedback', 'pdf'])
// Namespaces each pre-existing scoped module provides (src/lib/i18n/*.ts).
const scoped = {
  '@/lib/i18n/shared': [], '@/lib/i18n/navigation': [], '@/lib/i18n/loan': ['loan'],
  '@/lib/i18n/salary': ['salary'], '@/lib/i18n/fuelCalculator': ['fuelCalculator'],
  '@/lib/i18n/runningPace': ['runningPace'], '@/lib/i18n/subsidies': ['governmentSubsidy', 'youthRentSubsidy'],
}
const mode = process.argv[2] || '--dry'
const NS_PREFIX = '@/lib/i18n/ns/'

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (p !== path.join(SRC, 'lib', 'i18n')) walk(p, out) }
    else if (/\.(tsx?|jsx?)$/.test(e.name) && p !== path.join(SRC, 'lib', 'i18n.ts')) out.push(p)
  }
  return out
}

function specToKind(spec, file) {
  if (spec === '@/lib/i18n') return 'registry'
  if (spec.startsWith('.')) {
    const abs = path.resolve(path.dirname(file), spec)
    if (abs === path.join(SRC, 'lib', 'i18n')) return 'registry'
    if (path.dirname(abs) === path.join(SRC, 'lib', 'i18n')) return '@/lib/i18n/' + path.basename(abs)
  }
  if (spec in scoped) return spec
  return null
}

function analyze(file) {
  const src = fs.readFileSync(file, 'utf8')
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  const res = { file, rel, src, sf, client: false, hookNames: new Map(), nsImports: new Set(), used: new Map(), issues: [], imports: [] }
  // directive
  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) { if (st.expression.text === 'use client') res.client = true }
    else break
  }
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue
    res.imports.push(st)
    const spec = st.moduleSpecifier.text
    if (spec.startsWith(NS_PREFIX)) { res.nsImports.add(spec.slice(NS_PREFIX.length)); continue }
    const kind = specToKind(spec, file)
    if (!kind) continue
    const nb = st.importClause?.namedBindings
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) {
      const imported = (el.propertyName || el.name).text
      if (imported === 'useTranslations' || imported === 'runningTranslations') res.hookNames.set(el.name.text, kind)
    }
  }
  // const NAME = 'literal'
  const consts = new Map()
  ts.forEachChild(sf, function v(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isStringLiteralLike(n.initializer)) {
      const prev = consts.get(n.name.text)
      consts.set(n.name.text, prev !== undefined && prev !== n.initializer.text ? null : n.initializer.text)
    }
    ts.forEachChild(n, v)
  })
  const line = n => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1
  const use = (ns, provider, where, how) => {
    if (!res.used.has(ns)) res.used.set(ns, [])
    res.used.get(ns).push({ provider, where, how })
  }
  const keyNs = (arg) => {
    if (ts.isStringLiteralLike(arg)) return arg.text.split('.')[0]
    if (ts.isTemplateExpression(arg) && arg.head.text.includes('.')) return arg.head.text.split('.')[0]
    return null
  }
  const rootVars = [] // [name, provider, decl]
  ts.forEachChild(sf, function v(n) {
    if (ts.isCallExpression(n)) {
      let callee = n.expression, provider = null
      if (ts.isIdentifier(callee) && res.hookNames.has(callee.text)) provider = res.hookNames.get(callee.text)
      // runningTranslations[lang](ns) / runningTranslations.ko(ns)
      if ((ts.isElementAccessExpression(callee) || ts.isPropertyAccessExpression(callee)) && ts.isIdentifier(callee.expression) && res.hookNames.has(callee.expression.text)) provider = res.hookNames.get(callee.expression.text)
      if (provider) {
        const a = n.arguments[0]
        if (!a) {
          const p = n.parent
          if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) rootVars.push([p.name.text, provider, p])
          else res.issues.push(`L${line(n)} root useTranslations() not bound to a variable`)
        } else if (ts.isStringLiteralLike(a)) use(a.text, provider, line(n), 'literal')
        else if (ts.isIdentifier(a) && consts.get(a.text)) use(consts.get(a.text), provider, line(n), `const ${a.text}`)
        else res.issues.push(`L${line(n)} dynamic namespace useTranslations(${a.getText()}) [${provider}]`)
      }
    }
    if (ts.isJsxAttribute(n) && n.name.getText() === 'namespace') {
      const init = n.initializer
      let val = null
      if (init && ts.isStringLiteral(init)) val = init.text
      else if (init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteralLike(init.expression)) val = init.expression.text
      const tag = n.parent.parent.tagName?.getText()
      if (val) use(val, 'registry', line(n), `<${tag} namespace>`)
      else res.issues.push(`L${line(n)} non-literal namespace prop on <${tag}>: ${n.getText()}`)
    }
    if (ts.isPropertyAssignment(n) && ['ns', 'namespace'].includes(n.name.getText()) && ts.isStringLiteralLike(n.initializer)) {
      res.issues.push(`L${line(n)} object property ${n.name.getText()}: '${n.initializer.text}'${Object.hasOwn(ko, n.initializer.text) ? '' : ' (not a ko namespace)'}`)
      if (Object.hasOwn(ko, n.initializer.text)) use(n.initializer.text, 'registry', line(n), 'object property ns')
    }
    ts.forEachChild(n, v)
  })
  // Calls on root translators: t('ns.key'), t.raw('ns.key')
  for (const [name, provider, decl] of rootVars) {
    ts.forEachChild(sf, function v(n) {
      if (ts.isCallExpression(n)) {
        const c = n.expression
        const isT = (ts.isIdentifier(c) && c.text === name) || (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === name && c.name.text === 'raw')
        if (isT && n.arguments[0]) {
          const ns = keyNs(n.arguments[0])
          if (ns) use(ns, provider, line(n), `root ${name}()`)
          else res.issues.push(`L${line(n)} root ${name}(${n.arguments[0].getText()}) key namespace not static [${provider}]`)
        }
      }
      // root translator escaping (passed as value, not called)
      if (ts.isIdentifier(n) && n.text === name && n !== decl.name && !(ts.isCallExpression(n.parent) && n.parent.expression === n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n)) {
        res.issues.push(`L${line(n)} root translator ${name} passed around: ${n.parent.getText().slice(0, 80)}`)
      }
      ts.forEachChild(n, v)
    })
  }
  return res
}

const files = walk(SRC).map(analyze)
const needs = new Map() // file -> Set(ns)
let totalIssues = 0, unknownNs = []
for (const r of files) {
  const need = new Set()
  for (const [ns, uses] of r.used) {
    if (!Object.hasOwn(ko, ns)) { unknownNs.push(`${r.rel}: '${ns}' (${uses.map(u => 'L' + u.where + ' ' + u.how).join(', ')})`); continue }
    if (shared.has(ns)) continue
    for (const u of uses) {
      if (u.provider === 'registry') need.add(ns)
      else if (!scoped[u.provider].includes(ns)) r.issues.push(`L${u.where} namespace '${ns}' not provided by scoped module ${u.provider}`)
    }
  }
  if (need.size) needs.set(r, need)
}

if (mode === '--dry' || mode === '--apply') {
  let added = 0, touched = 0
  for (const [r, need] of needs) {
    const missing = [...need].filter(ns => !r.nsImports.has(ns)).sort()
    if (!missing.length) continue
    if (!r.client && r.rel.startsWith('src/app/')) { console.log(`SERVER (skipped, needs manual check): ${r.rel} -> ${missing.join(', ')}`); continue }
    const eol = r.src.includes('\r\n') ? '\r\n' : '\n'
    const anchor = r.imports.find(st => specToKind(st.moduleSpecifier.text, r.file) === 'registry') || r.imports[r.imports.length - 1]
    let insertAt, prefix = eol
    if (anchor) insertAt = anchor.getEnd()
    else { console.log(`NO IMPORT ANCHOR: ${r.rel}`); continue }
    const semi = anchor.getText().trimEnd().endsWith(';') ? ';' : ''
    const text = missing.map(ns => `${prefix}import '${NS_PREFIX}${ns}'${semi}`).join('')
    added += missing.length; touched++
    if (mode === '--dry') console.log(`${r.rel}${r.client ? '' : ' [no use client]'}: + ${missing.join(', ')}`)
    else fs.writeFileSync(r.file, r.src.slice(0, insertAt) + text + r.src.slice(insertAt))
  }
  console.log(`${mode}: ${added} imports in ${touched} files`)
}

// Issues (always printed)
console.log('\n=== issues ===')
for (const r of files) if (r.issues.length) { totalIssues += r.issues.length; console.log(r.rel + (r.client ? '' : ' [no use client]')); for (const i of r.issues) console.log('   ' + i) }
console.log('\n=== namespaces not in ko.json ===\n' + unknownNs.join('\n'))

if (mode === '--audit') {
  // Every registry-provided namespace a file uses must be shared or imported in that file;
  // server pages may rely on a client child that imports it (reported with the covering file).
  const byFile = new Map(files.map(r => [r.file, r]))
  const resolveLocal = (spec, from) => {
    const base = spec.startsWith('@/') ? path.join(SRC, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null
    if (!base) return null
    return [base + '.tsx', base + '.ts', path.join(base, 'index.tsx'), path.join(base, 'index.ts'), base].find(p => byFile.has(p)) || null
  }
  let unresolved = 0, viaChild = 0, ok = 0
  for (const [r, need] of needs) {
    for (const ns of need) {
      if (r.nsImports.has(ns)) { ok++; continue }
      const covering = r.imports.map(st => resolveLocal(st.moduleSpecifier.text, r.file)).filter(Boolean).map(f => byFile.get(f)).find(c => c.nsImports.has(ns))
      if (covering) { viaChild++; console.log(`VIA CHILD: ${r.rel} '${ns}' <- ${covering.rel} (rendered earlier in tree? check order)`) }
      else { unresolved++; console.log(`UNRESOLVED: ${r.rel} '${ns}'`) }
    }
  }
  // Stray ns imports that the file does not appear to use (payload waste, not a bug)
  for (const r of files) for (const ns of r.nsImports) if (!needs.get(r)?.has(ns)) console.log(`EXTRA IMPORT (unused by static analysis): ${r.rel} '${ns}'`)
  // ns imports must never sit in a server module
  for (const r of files) if (r.nsImports.size && !r.client && r.rel.startsWith('src/app/')) console.log(`NS IMPORT IN SERVER FILE: ${r.rel}`)
  console.log(`\naudit: ${ok} satisfied by own import, ${viaChild} via child component, ${unresolved} unresolved; ${totalIssues} issues listed above`)
}
