// node scripts/measure-shared-bundle.mjs --url https://toolhub.ai.kr
// node scripts/measure-shared-bundle.mjs --dir out
// Reports decoded bytes and locally estimated compression; not field performance metrics.
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'

const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const origin = option('--url') ? new URL(option('--url')).origin : null
const directory = resolve(option('--dir') || 'out')
const messages = JSON.parse(await readFile(new URL('../messages/ko.json', import.meta.url), 'utf8'))
const pages = ['/', '/salary-calculator/', '/loan-calculator/', '/fuel-calculator/', '/json-formatter/', '/bmi-calculator/']
const cache = new Map()

async function resource(route) {
  if (cache.has(route)) return cache.get(route)
  let bytes, encoding = null, encodedContentLength = null
  if (origin) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`)
    bytes = Buffer.from(await response.arrayBuffer())
    encoding = response.headers.get('content-encoding')
    const length = response.headers.get('content-length')
    encodedContentLength = length === null ? null : Number(length)
  } else {
    const file = resolve(directory, '.' + route)
    if (file !== directory && !file.startsWith(directory + sep)) throw new Error('Resource outside export directory')
    bytes = await readFile(file)
  }
  const item = { bytes, encoding, encodedContentLength }
  cache.set(route, item)
  return item
}

const reports = []
for (const page of pages) {
  const htmlResource = await resource(origin ? page : `${page}index.html`)
  const html = htmlResource.bytes.toString('utf8')
  const files = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]).filter(file => file.startsWith('/_next/'))) ]
  const scripts = await Promise.all(files.map(async route => {
    const { bytes, encoding, encodedContentLength } = await resource(route)
    const text = bytes.toString('utf8')
    return { route, decodedBytes: bytes.length, estimatedGzipBytes: gzipSync(bytes).length,
      namespaceMatches: Object.keys(messages).filter(key => text.includes(key)).length, encoding, encodedContentLength }
  }))
  const cssRoutes = [...new Set([...html.matchAll(/<link[^>]+href="([^"]+\.css[^"\s]*)"/g)].map(match => match[1]).filter(file => file.startsWith('/_next/')))]
  const styles = await Promise.all(cssRoutes.map(async route => {
    const { bytes } = await resource(route)
    return { route, decodedBytes: bytes.length, estimatedGzipBytes: gzipSync(bytes).length }
  }))
  const htmlSize = { decodedBytes: htmlResource.bytes.length, estimatedGzipBytes: gzipSync(htmlResource.bytes).length }
  reports.push({ page, html: htmlSize, styles, initialEstimatedGzipBytes: htmlSize.estimatedGzipBytes + styles.reduce((sum, file) => sum + file.estimatedGzipBytes, 0) + scripts.reduce((sum, file) => sum + file.estimatedGzipBytes, 0),
    files: scripts.length, decodedBytes: scripts.reduce((sum, file) => sum + file.decodedBytes, 0),
    estimatedGzipBytes: scripts.reduce((sum, file) => sum + file.estimatedGzipBytes, 0), scripts })
}
const shared = reports[0].scripts.filter(file => reports.every(report => report.scripts.some(item => item.route === file.route)))
// Conservative namespace inventory from the root layout's static source imports.
// Dynamic keys and page-specific shared components still need review before splitting.
const commonKeys = ['accessibility', 'common', 'dailyTips', 'favorites', 'footer', 'header', 'homePage',
  'mobileNav', 'navigation', 'pushNotification', 'searchDialog', 'toolsShowcase']
const candidate = Object.fromEntries(commonKeys.filter(key => messages[key]).map(key => [key, messages[key]]))
const size = data => ({ decodedBytes: Buffer.byteLength(data), estimatedGzipBytes: gzipSync(data).length, estimatedBrotliBytes: brotliCompressSync(data).length })
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), source: origin || directory,
  limitations: ['Decoded JS sizes are not browser transfer sizes.', 'Local gzip/Brotli sizes are estimates.', 'Candidate common namespaces need a complete consumer audit.', 'No LCP/INP/CLS or traffic impact is inferred.'],
  translations: { full: size(JSON.stringify(messages)), namespaceCount: Object.keys(messages).length,
    commonCandidate: { keys: Object.keys(candidate), ...size(JSON.stringify(candidate)) } },
  sharedScripts: shared.sort((a, b) => b.decodedBytes - a.decodedBytes), pages: reports }, null, 2))
