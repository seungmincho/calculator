// Exercise preserved React hook state when a generated catalogue/factory changes.
import assert from 'node:assert/strict'
import { buildSync } from 'esbuild'
import { chromium } from 'playwright'

const { outputFiles } = buildSync({ bundle: true, write: false, format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
  stdin: { resolveDir: process.cwd(), sourcefile: 'i18n-refresh-fixture.tsx', loader: 'tsx', contents: `
    import React, { useState } from 'react'
    import { createRoot } from 'react-dom/client'
    import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext'
    import { createLazyEnTranslations } from './src/lib/i18n/navigation'
    const factory = (version) => createLazyEnTranslations(
      { demo: { label: '한국어 ' + version } },
      async () => ({ demo: { label: 'English ' + version } }),
    )
    let useMessages = factory(1)
    function Probe() {
      const { changeLanguage } = useLanguage()
      const [version, setVersion] = useState(1)
      const t = useMessages('demo')
      window.replaceCatalogue = next => { useMessages = factory(next); setVersion(next) }
      window.setLanguage = changeLanguage
      return <output data-version={version}>{t('label')}</output>
    }
    createRoot(document.getElementById('root')).render(<LanguageProvider><Probe /></LanguageProvider>)
  ` },
})
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', route => route.fulfill(route.request().url().endsWith('/fixture.js')
    ? { contentType: 'application/javascript', body: outputFiles[0].text }
    : { contentType: 'text/html', body: '<!doctype html><div id="root"></div><script src="/fixture.js"></script>' }))
  await page.goto('http://127.0.0.1:3039/__i18n-refresh')
  const expectText = text => page.getByText(text, { exact: true }).waitFor({ timeout: 5000 })
  await expectText('한국어 1')
  await page.evaluate(() => window.replaceCatalogue(2))
  await expectText('한국어 2')
  await page.evaluate(() => window.setLanguage('en'))
  await expectText('English 2')
  await page.evaluate(() => window.replaceCatalogue(3))
  await expectText('English 3')
  await page.evaluate(() => window.setLanguage('ko'))
  await expectText('한국어 3')
  await page.evaluate(() => window.setLanguage('en'))
  await expectText('English 3')
  assert.deepEqual(errors, [])
  console.log('PASS: Korean catalogue replacement, loaded English replacement, repeated language switching with preserved hook state')
} finally { await browser.close() }
