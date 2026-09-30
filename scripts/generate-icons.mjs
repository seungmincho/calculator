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
