// 도구별 SNS 공유 이미지(1200x630) 생성 + page.tsx 메타데이터에 연결. 재실행 안전.
// node scripts/generate-og.mjs [slug...]   (인자 없으면 전체)
// page.tsx가 openGraph를 따로 지정하면 layout의 og:image가 사라지므로(얕은 병합) 페이지마다 images를 넣는다.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, sep } from 'path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { toolIcons, categoryIcons } from '../src/config/toolIcons.ts'
import { decisionTools } from '../src/config/decisionTools.ts'

const SITE = 'https://toolhub.ai.kr'
const only = process.argv.slice(2)

function pages(dir) {
  const out = []
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { if (!f.startsWith('[') && !f.startsWith('(')) out.push(...pages(p)) }
    else if (f === 'page.tsx') out.push(p)
  }
  return out
}

const str = (block, key) => block.match(new RegExp(`\\b${key}:\\s*(['"\`])((?:(?!\\1).)*)\\1`))?.[2]
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const logo = readFileSync('public/logo.svg', 'utf8').replace('<svg ', '<svg width="52" height="52" ')
const html = ({ title, desc, icon, path }) => `<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></head>
<body style="margin:0;width:1200px;height:630px;word-break:keep-all;background:#fff;font-family:'Pretendard Variable',sans-serif;color:#191f28;position:relative;overflow:hidden">
  <div style="position:absolute;left:88px;top:80px;display:flex;align-items:center;gap:16px">${logo}<span style="font-size:34px;font-weight:800;letter-spacing:-0.5px">툴허브</span></div>
  <div style="position:absolute;left:88px;top:210px;width:700px">
    <div style="font-size:${title.length > 14 ? 64 : 76}px;font-weight:800;letter-spacing:-2px;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(title)}</div>
    <div style="font-size:30px;color:#6b7684;margin-top:24px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(desc)}</div>
  </div>
  <div style="position:absolute;left:88px;bottom:72px;font-size:28px;font-weight:700;color:#3182f6">toolhub.ai.kr${esc(path)}</div>
  <div style="position:absolute;right:88px;top:165px;width:300px;height:300px;border-radius:72px;background:#3182f6;display:flex;align-items:center;justify-content:center">${icon}</div>
</body></html>`

const targets = []
for (const file of pages('src/app')) {
  const rel = relative('src/app', file).split(sep).slice(0, -1).join('/')
  if (!rel || rel.startsWith('admin') || rel === 'offline') continue // 홈은 기본 브랜드 이미지 유지
  if (only.length && !only.includes(rel)) continue
  const src = readFileSync(file, 'utf8')
  const decision = decisionTools.find(d => d.href === `/${rel}`)?.page // decisionMetadata()가 og/<slug>.png를 직접 참조
  const og = src.match(/openGraph:\s*\{[^{}]*\}/)?.[0] ?? src.match(/openGraph:\s*\{[\s\S]*?\n\s{2,4}\}/)?.[0]
  if (!og && !decision) continue
  const konst = k => src.match(new RegExp(`const ${k}\\s*=\\s*(['"\`])((?:(?!\\1).)*)\\1`))?.[2]
  const title = (decision?.title ?? str(og, 'title') ?? str(src, 'title') ?? konst('TITLE'))?.split(/\s[|｜]\s/)[0].split(' - ')[0].trim()
  const desc = decision?.description ?? str(og, 'description') ?? str(src, 'description') ?? konst('DESC') ?? ''
  if (!title) continue
  const Icon = toolIcons[`/${rel}`] ?? toolIcons[`/${rel}/`] ?? categoryIcons.tools
  const icon = renderToStaticMarkup(createElement(Icon, { size: 160, color: '#ffffff', strokeWidth: 1.75 }))
  targets.push({ file, src, name: rel.replace(/\//g, '-'), title, desc, icon, path: `/${rel}` })
}

mkdirSync('public/og', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
let n = 0
for (const t of targets) {
  await page.setContent(html(t), { waitUntil: n === 0 ? 'networkidle' : 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `public/og/${t.name}.png` })

  const url = `${SITE}/og/${t.name}.png`
  let s = t.src.replace(/(https:\/\/toolhub\.ai\.kr)?\/og-image-1200x630\.png/g, url)
  const inject = (key, value) => {
    s = s.replace(new RegExp(`(${key}:\\s*\\{)([^{}]*?)(\\n?(\\s*)\\})`), (m, a, body, end, ind) => {
      if (body.includes('images')) return m
      if (end.startsWith('\n')) return `${a}${body}${/,\s*$/.test(body) ? '' : ','}\n${ind}  images: ${value},${end}`
      return `${a}${body.replace(/,?\s*$/, '')}, images: ${value} }`
    })
  }
  inject('openGraph', `[{ url: '${url}', width: 1200, height: 630, alt: '${t.title.replace(/'/g, "\\'")}' }]`)
  inject('twitter', `['${url}']`)
  if (s !== t.src) writeFileSync(t.file, s)
  if (++n % 25 === 0) console.log(n, '/', targets.length)
}
await browser.close()
console.log(`og: ${n} images`, existsSync('public/og') ? '' : '')
