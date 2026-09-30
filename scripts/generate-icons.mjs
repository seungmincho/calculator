// public/logo.svg → 파비콘/앱 아이콘 PNG 전 사이즈. 로고 변경 시: node scripts/generate-icons.mjs && python scripts/make-ico.py
import { chromium } from 'playwright'
import { readFileSync } from 'fs'

const svg = readFileSync('public/logo.svg', 'utf8')
// iOS/Windows 타일은 OS가 모서리를 깎으므로 꽉 찬 사각형 버전
const fullBleed = svg.replace(/rx="232"/, 'rx="0"')

const targets = [
  ...[16, 32, 48, 64, 96].map(s => [`favicon-${s}x${s}.png`, s, svg]),
  ['android-chrome-192x192.png', 192, svg],
  ['android-chrome-512x512.png', 512, svg],
  ['logo.png', 512, svg],
  ['apple-touch-icon.png', 180, fullBleed],
  ...[57, 60, 72, 76, 114, 120, 144, 152, 180].map(s => [`apple-touch-icon-${s}x${s}.png`, s, fullBleed]),
  ...[70, 144, 150, 310].map(s => [`mstile-${s}x${s}.png`, s, fullBleed]),
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, size, src] of targets) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: `public/${file}`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  console.log(file)
}
await browser.close()

// OG 공유 이미지 (1200x630, 600x315)
const mark = svg.replace('<svg ', '<svg width="120" height="120" ')
const og = `<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></head>
<body style="margin:0;width:1200px;height:630px;background:#fff;font-family:'Pretendard Variable',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 96px;box-sizing:border-box;color:#191f28">
  <div style="display:flex;align-items:center;gap:28px">${mark}<div style="font-size:84px;font-weight:800;letter-spacing:-2px">툴허브</div></div>
  <div style="font-size:44px;font-weight:700;margin-top:48px;letter-spacing:-1px">필요한 도구를 한 곳에서, 무료로</div>
  <div style="font-size:30px;color:#6b7684;margin-top:18px">연봉·대출·세금 계산기 · 개발 도구 · 이미지 편집 · 건강 · 게임 240+</div>
  <div style="position:absolute;right:96px;bottom:64px;font-size:28px;font-weight:600;color:#3182f6">toolhub.ai.kr</div>
</body></html>`
const b2 = await chromium.launch()
const p2 = await b2.newPage({ viewport: { width: 1200, height: 630 } })
await p2.setContent(og, { waitUntil: 'networkidle' })
await p2.screenshot({ path: 'public/og-image-1200x630.png' })
const small = await b2.newPage({ viewport: { width: 600, height: 315 }, deviceScaleFactor: 1 })
await small.setContent(og.replace('<body style="', '<body style="zoom:0.5;'), { waitUntil: 'networkidle' })
await small.screenshot({ path: 'public/og-image-600x315.png' })
await b2.close()
console.log('og images')
