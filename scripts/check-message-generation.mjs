// Exercise generation/check recovery in an isolated workspace fixture.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, join, resolve, sep, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sharedNamespaces, toolNamespaces } from './generate-scoped-messages.mjs'

const workspace = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
const fixture = mkdtempSync(join(workspace, '.tmp-message-generation-'))
const generator = join(fixture, 'scripts/generate-scoped-messages.mjs')
const namespaces = [...new Set([...sharedNamespaces, ...toolNamespaces, 'generationFixture'])]
const sources = Object.fromEntries(['ko', 'en'].map(locale => [locale, Object.fromEntries(namespaces.map(namespace => [namespace, {
  title: `${locale}:${namespace}`, nested: { count: '{count}', items: ['first', '한글', '🙂'] },
}]))]))
const run = (check = false, expected = 0) => {
  const result = spawnSync(process.execPath, [generator, ...(check ? ['--check'] : [])], { cwd: fixture, encoding: 'utf8' })
  assert.equal(result.status, expected, result.stderr || result.stdout)
  return result.stdout
}
const readJson = file => JSON.parse(readFileSync(file, 'utf8'))

try {
  mkdirSync(join(fixture, 'scripts'))
  mkdirSync(join(fixture, 'messages'))
  writeFileSync(generator, readFileSync(new URL('./generate-scoped-messages.mjs', import.meta.url)))
  for (const locale of ['ko', 'en']) writeFileSync(join(fixture, `messages/${locale}.json`), JSON.stringify(sources[locale]))

  assert.match(run(), /50 files generated/)
  for (const locale of ['ko', 'en']) {
    const generated = join(fixture, `messages/generated/${locale}`)
    const rebuilt = readJson(join(generated, 'shared.json'))
    for (const filename of readdirSync(join(generated, 'ns'))) Object.assign(rebuilt, readJson(join(generated, 'ns', filename)))
    assert.deepEqual(rebuilt, sources[locale], `${locale}: complete source reconstruction`)
    for (const scope of toolNamespaces) assert.deepEqual(readJson(join(generated, `${scope}.json`)), { [scope]: sources[locale][scope] })
  }

  const modules = join(fixture, 'src/lib/i18n/ns')
  for (const filename of readdirSync(modules)) {
    const namespace = basename(filename, '.ts')
    const text = readFileSync(join(modules, filename), 'utf8')
    const imports = [...text.matchAll(/import\('([^']+)'\)/g)].map(match => match[1])
    assert.deepEqual(imports, [`../../../../messages/generated/en/ns/${namespace}.json`])
    assert.match(text, /registerMessages\(messages, context => context\?\.retry/)
    assert.ok(!text.includes('messages/en.json') && !text.includes('messages/ko.json'))
    const content = readFileSync(join(fixture, `messages/generated/en/ns/${namespace}.json`), 'utf8')
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16)
    const publicUrl = `/i18n/en/ns/${namespace}.${hash}.json`
    assert.ok(text.includes(`loadTranslationFallback('${publicUrl}', ['${namespace}'])`))
    assert.equal(readFileSync(join(fixture, 'public', publicUrl), 'utf8'), content)
  }
  const manifestText = readFileSync(join(fixture, 'src/lib/i18n/generatedRetryCatalogs.ts'), 'utf8')
  const manifest = JSON.parse(manifestText.split('export const retryCatalogs = ')[1].replace(/ as const\s*$/, ''))
  assert.deepEqual(Object.keys(manifest), ['shared', ...toolNamespaces], 'only the eight existing scopes belong in the manifest')
  for (const [scope, asset] of Object.entries(manifest)) {
    const expected = readJson(join(fixture, `messages/generated/en/${scope}.json`))
    assert.deepEqual(readJson(join(fixture, 'public', asset.url)), expected)
    assert.deepEqual(asset.namespaces, Object.keys(expected))
  }
  assert.match(run(true), /50 files verified/)

  const english = join(fixture, 'messages/generated/en/ns/generationFixture.json')
  writeFileSync(english, '{"wrong":"stale"}\n')
  run(true, 1)
  assert.equal(readFileSync(english, 'utf8'), '{"wrong":"stale"}\n', 'check must not repair files')
  run()
  assert.deepEqual(readJson(english), { generationFixture: sources.en.generationFixture })
  rmSync(english)
  run(true, 1)
  assert.equal(existsSync(english), false, 'check must not create missing files')
  run()
  const publicEnglish = join(fixture, 'public', readFileSync(join(modules, 'generationFixture.ts'), 'utf8').match(/loadTranslationFallback\('([^']+)'/)[1])
  rmSync(publicEnglish)
  run(true, 1)
  assert.equal(existsSync(publicEnglish), false, 'check must not create missing public assets')
  run()

  const stale = [
    'messages/generated/en/ns/removedNamespace.json',
    'messages/generated/ko/ns/removedNamespace.json',
    'src/lib/i18n/ns/removedNamespace.ts',
    'messages/generated/en/legacy.json',
    'public/i18n/en/ns/removedNamespace.0123456789abcdef.json',
    'public/i18n/en/shared.0123456789abcdef.json',
  ].map(file => join(fixture, file))
  for (const file of stale) writeFileSync(file, '{}\n')
  run(true, 1)
  for (const file of stale) assert.ok(existsSync(file), 'check must not delete stale files')
  run()
  for (const file of stale) assert.equal(existsSync(file), false)
  run(true)

  sources.en.generationFixture.title = 'Changed English content'
  writeFileSync(join(fixture, 'messages/en.json'), JSON.stringify(sources.en))
  run(true, 1)
  assert.ok(existsSync(publicEnglish), 'check must preserve the old hash asset')
  run()
  assert.equal(existsSync(publicEnglish), false, 'generation must remove the previous content hash')
  const newPublicUrl = readFileSync(join(modules, 'generationFixture.ts'), 'utf8').match(/loadTranslationFallback\('([^']+)'/)[1]
  assert.deepEqual(readJson(join(fixture, 'public', newPublicUrl)), { generationFixture: sources.en.generationFixture })
  run(true)

  for (const locale of ['ko', 'en']) assert.deepEqual(readJson(join(fixture, `messages/${locale}.json`)), sources[locale], 'source must remain unchanged')
  console.log('Message generation: 6 groups passed (reconstruction, literal/hash loaders, drift, missing files, stale cleanup, content-hash replacement)')
} finally {
  // Validate the resolved target before a recursive Windows cleanup.
  const target = realpathSync(fixture)
  assert.ok(target.startsWith(workspace + sep) && basename(target).startsWith('.tmp-message-generation-'), 'unsafe fixture cleanup target')
  rmSync(target, { recursive: true, force: true })
}
