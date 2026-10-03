// ko.json/en.json remain the only editable source of translations.
// Run before dev/build; --check detects stale committed subsets without writing.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const sharedNamespaces = ['accessibility', 'common', 'dailyTips', 'favorites', 'footer', 'header',
  'homePage', 'mobileNav', 'navigation', 'pushNotification', 'searchDialog', 'toolsShowcase',
  'subcategory', 'shareResult', 'relatedTools', 'analyticsDashboard', 'feedback', 'pdf']
export const toolNamespaces = ['loan', 'salary', 'fuelCalculator', 'runningPace']

export function generate(check = false) {
  let files = 0
  for (const locale of ['ko', 'en']) {
    const source = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))
    const legacyKeys = Object.keys(source).filter(key => !sharedNamespaces.includes(key))
    for (const [scope, keys] of [['shared', sharedNamespaces], ...toolNamespaces.map(key => [key, [key]]), ['legacy', legacyKeys]]) {
      const selected = Object.fromEntries(keys.map(key => {
        if (!Object.hasOwn(source, key)) throw new Error(`${locale}: missing namespace ${key}`)
        return [key, source[key]]
      }))
      const target = new URL(`../messages/generated/${locale}/${scope}.json`, import.meta.url)
      const content = JSON.stringify(selected) + '\n'
      if (check) {
        if (readFileSync(target, 'utf8') !== content) throw new Error(`Stale translations: ${locale}/${scope}; run npm run messages:generate`)
      } else {
        mkdirSync(new URL('.', target), { recursive: true })
        writeFileSync(target, content)
      }
      files++
    }
  }
  return files
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`Scoped translations: ${generate(process.argv.includes('--check'))} files ${process.argv.includes('--check') ? 'verified' : 'generated'}`)
}
