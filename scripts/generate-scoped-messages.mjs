// ko.json/en.json remain the only editable source of translations.
// Run before dev/build; --check detects stale committed subsets without writing.
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const sharedNamespaces = ['accessibility', 'common', 'dailyTips', 'favorites', 'footer', 'header',
  'homePage', 'mobileNav', 'navigation', 'pushNotification', 'searchDialog', 'toolsShowcase',
  'subcategory', 'shareResult', 'relatedTools', 'analyticsDashboard', 'feedback', 'pdf']
export const toolNamespaces = ['loan', 'salary', 'fuelCalculator', 'runningPace', 'governmentSubsidy', 'youthRentSubsidy']

// Every non-shared ko namespace also gets messages/generated/ko/ns/<ns>.json plus a
// side-effect module src/lib/i18n/ns/<ns>.ts that registers it with src/lib/i18n.ts.
// Components import '@/lib/i18n/ns/<ns>' for each tool namespace they read.
const nsJsonDir = new URL('../messages/generated/ko/ns/', import.meta.url)
const nsModuleDir = new URL('../src/lib/i18n/ns/', import.meta.url)
const nsModule = ns => `import { registerMessages } from '@/lib/i18n'
import messages from '../../../../messages/generated/ko/ns/${ns}.json'

registerMessages(messages)
`

export function generate(check = false) {
  let files = 0
  const outputs = [] // [URL, content]
  for (const locale of ['ko', 'en']) {
    const source = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))
    for (const [scope, keys] of [['shared', sharedNamespaces], ...toolNamespaces.map(key => [key, [key]])]) {
      const selected = Object.fromEntries(keys.map(key => {
        if (!Object.hasOwn(source, key)) throw new Error(`${locale}: missing namespace ${key}`)
        return [key, source[key]]
      }))
      outputs.push([new URL(`../messages/generated/${locale}/${scope}.json`, import.meta.url), JSON.stringify(selected) + '\n'])
    }
    if (locale !== 'ko') continue
    for (const ns of Object.keys(source).filter(key => !sharedNamespaces.includes(key))) {
      outputs.push([new URL(`${ns}.json`, nsJsonDir), JSON.stringify({ [ns]: source[ns] }) + '\n'])
      outputs.push([new URL(`${ns}.ts`, nsModuleDir), nsModule(ns)])
    }
  }
  // Files left behind by removed namespaces (and the retired legacy catalogue) are stale.
  const expected = new Set(outputs.map(([url]) => fileURLToPath(url)))
  const stale = [nsJsonDir, nsModuleDir].flatMap(dir => existsSync(dir) ? readdirSync(dir).map(name => fileURLToPath(new URL(name, dir))) : [])
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
