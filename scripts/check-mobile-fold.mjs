// 빌드 후: out/ 을 로컬로 띄워 모바일(375x812) 첫 화면에 결과·주 버튼이 있는지 잰다. 분석 스크립트·광고 요청은 막는다.
// 사용: node scripts/check-mobile-fold.mjs  → 결과(aria-live·ui-hero·큰 숫자)가 첫 화면(748px) 밖인 페이지 목록. "-" 는 결과 요소를 못 찾음(개발 도구 등은 정상일 수 있음)
import http from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const ROOT = fileURLToPath(new URL('../out', import.meta.url))
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.ico': 'image/x-icon' }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  let f = join(ROOT, p)
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html')
  else if (!existsSync(f) && existsSync(f + '.html')) f += '.html'
  if (!existsSync(f)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' })
  res.end(readFileSync(f))
}).listen(4173)

const FOLD = 812 - 64 // 하단 내비 높이
const urls = [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/toolhub\.ai\.kr([^<]*)<\/loc>/g)]
  .map(m => m[1]).filter(p => p !== '/' && !p.startsWith('/algorithm/') && !p.startsWith('/salary-table/') && !/^\/(calculators|tools|media|health|games)\/$/.test(p))

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
await ctx.route(/cloudflareinsights|googlesyndication|googletagmanager|axept|doubleclick|google-analytics/, r => r.abort())
const out = []
async function scan(path) {
  const page = await ctx.newPage()
  try {
    await page.goto('http://localhost:4173' + path, { waitUntil: 'load', timeout: 30000 })
    await page.waitForTimeout(1200)
    const r = await page.evaluate((FOLD) => {
      const main = document.querySelector('main') || document.body
      const y = el => Math.round(el.getBoundingClientRect().top + scrollY)
      const visible = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
      const h1 = main.querySelector('h1')
      const start = h1 ? y(h1) : 0
      const controls = [...main.querySelectorAll('input:not([type=hidden]), textarea, select, button')].filter(visible).filter(el => y(el) > start)
      const big = [...main.querySelectorAll('[aria-live], .ui-hero, .text-3xl, .text-4xl, .text-5xl, canvas')].filter(visible).filter(el => y(el) > start && (el.tagName === 'CANVAS' || el.textContent.trim()))
      return { wide: document.scrollingElement.scrollWidth, h1: h1?.textContent.trim().slice(0, 30) || '', firstControl: controls[0] ? y(controls[0]) : null, firstResult: big[0] ? y(big[0]) : null, resultText: big[0]?.textContent.trim().slice(0, 30) || big[0]?.tagName || '' }
    }, FOLD)
    out.push({ path, ...r })
  } catch (e) { out.push({ path, error: String(e).slice(0, 80) }) }
  await page.close()
}
const queue = [...urls]
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await scan(queue.shift()) }))
await browser.close(); server.close()

const below = out.filter(r => !r.error && (r.firstResult == null || r.firstResult > FOLD)).sort((a, b) => (b.firstResult ?? 9999) - (a.firstResult ?? 9999))
console.log(`scanned ${out.length}, errors ${out.filter(r => r.error).length}, result below fold or none: ${below.length}`)
for (const r of below) console.log(`${String(r.firstResult ?? '-').padStart(5)}  ctl ${String(r.firstControl ?? '-').padStart(4)}  ${r.path}  ${r.h1} | ${r.resultText}`)
const wide = out.filter(r => r.wide > 376)
console.log(`
horizontal overflow (scrollWidth > 375): ${wide.length}`)
for (const r of wide) console.log(`${String(r.wide).padStart(5)}  ${r.path}  ${r.h1}`)
for (const r of out.filter(r => r.error)) console.log('ERR', r.path, r.error)
