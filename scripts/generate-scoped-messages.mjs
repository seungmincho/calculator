// ko.json/en.json remain the only editable source of translations.
// Run before dev/build; --check detects stale committed subsets without writing.
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve, sep } from 'node:path'

export const sharedNamespaces = ['accessibility', 'common', 'dailyTips', 'favorites', 'footer', 'header',
  'homePage', 'mobileNav', 'navigation', 'pushNotification', 'searchDialog', 'toolsShowcase',
  'subcategory', 'shareResult', 'relatedTools', 'analyticsDashboard', 'feedback', 'pdf']
export const toolNamespaces = ['loan', 'salary', 'fuelCalculator', 'runningPace', 'governmentSubsidy', 'youthRentSubsidy', 'everlandWaitTimes']

// Every non-shared namespace gets a JSON file per locale. The registration module
// loads KO synchronously and registers a lazy loader for only its matching EN file.
// Registration alone does not fetch English. Components import '@/lib/i18n/ns/<ns>'.
const nsJsonDirs = Object.fromEntries(['ko', 'en'].map(locale => [locale, new URL(`../messages/generated/${locale}/ns/`, import.meta.url)]))
const nsModuleDir = new URL('../src/lib/i18n/ns/', import.meta.url)
const publicEnDir = new URL('../public/i18n/en/', import.meta.url)
const publicEnNsDir = new URL('ns/', publicEnDir)
const publicAsset = (name, content) => `/i18n/en/${name}.${createHash('sha256').update(content).digest('hex').slice(0, 16)}.json`
const nsModule = (ns, retryUrl) => `import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/${ns}.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('${retryUrl}', ['${ns}'])
  : import('../../../../messages/generated/en/ns/${ns}.json').then(module => module.default))
`

function generatedFilesIn(dir) {
  if (!existsSync(dir)) return []
  const workspace = realpathSync(new URL('../', import.meta.url))
  const target = realpathSync(dir)
  if (!target.startsWith(workspace + sep)) throw new Error(`Generated directory outside workspace: ${target}`)
  return readdirSync(dir, { withFileTypes: true }).filter(entry => !entry.isDirectory())
    .map(entry => fileURLToPath(new URL(entry.name, dir)))
}

export function generate(check = false) {
  let files = 0
  const outputs = [] // [URL, content]
  const sources = Object.fromEntries(['ko', 'en'].map(locale => [locale, JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))]))
  const retryCatalogs = {}
  for (const locale of ['ko', 'en']) {
    const source = sources[locale]
    for (const [scope, keys] of [['shared', sharedNamespaces], ...toolNamespaces.map(key => [key, [key]])]) {
      const selected = Object.fromEntries(keys.map(key => {
        if (!Object.hasOwn(source, key)) throw new Error(`${locale}: missing namespace ${key}`)
        return [key, source[key]]
      }))
      const content = JSON.stringify(selected) + '\n'
      outputs.push([new URL(`../messages/generated/${locale}/${scope}.json`, import.meta.url), content])
      if (locale === 'en') {
        const url = publicAsset(scope === 'shared' ? scope : `ns/${scope}`, content)
        retryCatalogs[scope] = { url, namespaces: keys }
        // Direct scopes reuse their identical namespace asset below.
        if (scope === 'shared') outputs.push([new URL(`../public${url}`, import.meta.url), content])
      }
    }
    for (const ns of Object.keys(source).filter(key => !sharedNamespaces.includes(key))) {
      const content = JSON.stringify({ [ns]: source[ns] }) + '\n'
      outputs.push([new URL(`${ns}.json`, nsJsonDirs[locale]), content])
      if (locale === 'en') outputs.push([new URL(`../public${publicAsset(`ns/${ns}`, content)}`, import.meta.url), content])
      if (locale === 'ko') {
        if (!Object.hasOwn(sources.en, ns)) throw new Error(`en: missing namespace ${ns}`)
        const english = JSON.stringify({ [ns]: sources.en[ns] }) + '\n'
        outputs.push([new URL(`${ns}.ts`, nsModuleDir), nsModule(ns, publicAsset(`ns/${ns}`, english))])
      }
    }
  }
  outputs.push([new URL('../src/lib/i18n/generatedRetryCatalogs.ts', import.meta.url),
    '// Generated from messages/ko.json and messages/en.json. Do not edit.\nexport const retryCatalogs = ' + JSON.stringify(retryCatalogs, null, 2) + ' as const\n'])
  // Files left behind by removed namespaces (and the retired legacy catalogue) are stale.
  const expected = new Set(outputs.map(([url]) => fileURLToPath(url)))
  const stale = [...Object.values(nsJsonDirs), nsModuleDir, publicEnDir, publicEnNsDir].flatMap(generatedFilesIn)
    .concat(['ko', 'en'].map(locale => fileURLToPath(new URL(`../messages/generated/${locale}/legacy.json`, import.meta.url))).filter(existsSync))
    .filter(file => !expected.has(file))
  for (const [target, content] of outputs) {
    if (check) {
      if (!existsSync(target) || readFileSync(target, 'utf8') !== content) throw new Error(`Stale translations: ${fileURLToPath(target)}; run npm run messages:generate`)
    } else {
      mkdirSync(new URL('.', target), { recursive: true })
      if (!existsSync(target) || readFileSync(target, 'utf8') !== content) writeFileSync(target, content)
    }
    files++
  }
  if (stale.length) {
    if (check) throw new Error(`Stale translation files: ${stale.join(', ')}; run npm run messages:generate`)
    for (const file of stale) rmSync(file)
  }
  return files
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`Scoped translations: ${generate(process.argv.includes('--check'))} files ${process.argv.includes('--check') ? 'verified' : 'generated'}`)
}
