// 홈 SNS 공유 이미지(og-image-1200x630.png, og-image-600x315.png) — 도구별 OG(generate-og.mjs)와 같은 토스 스타일.
// node scripts/generate-home-og.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Calculator, Code, Image, HeartPulse, Gamepad2, FileText } from 'lucide-react'

const logo = readFileSync('public/logo.svg', 'utf8').replace('<svg ', '<svg width="52" height="52" ')
const tiles = [
  [Calculator, '계산기'], [FileText, '문서 양식'], [Code, '개발 도구'],
  [Image, '이미지'], [HeartPulse, '건강'], [Gamepad2, '게임'],
].map(([Icon, label], i) => {
  const solid = i === 0 || i === 4
  const icon = renderToStaticMarkup(createElement(Icon, { size: 64, color: solid ? '#ffffff' : '#3182f6', strokeWidth: 1.75 }))
  return `<div style="width:150px;height:150px;border-radius:36px;background:${solid ? '#3182f6' : '#e8f3ff'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
    ${icon}<span style="font-size:22px;font-weight:700;color:${solid ? '#fff' : '#1b64da'}">${label}</span></div>`
}).join('')

const html = `<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"></head>
<body style="margin:0;width:1200px;height:630px;word-break:keep-all;background:#fff;font-family:'Pretendard Variable',sans-serif;color:#191f28;position:relative;overflow:hidden">
  <div style="position:absolute;left:88px;top:80px;display:flex;align-items:center;gap:16px">${logo}<span style="font-size:34px;font-weight:800;letter-spacing:-0.5px">툴허브</span></div>
  <div style="position:absolute;left:88px;top:200px;width:560px">
    <div style="font-size:72px;font-weight:800;letter-spacing:-2px;line-height:1.18">필요한 도구,<br>여기 다 있어요</div>
    <div style="font-size:30px;color:#6b7684;margin-top:26px;line-height:1.45">연봉·대출·세금 계산기부터<br>문서 양식·이미지·개발 도구까지 무료</div>
  </div>
  <div style="position:absolute;left:88px;bottom:72px;font-size:28px;font-weight:700;color:#3182f6">toolhub.ai.kr</div>
  <div style="position:absolute;right:88px;top:120px;display:grid;grid-template-columns:repeat(3,150px);gap:20px">${tiles}</div>
</body></html>`

const browser = await chromium.launch()
for (const [scale, out] of [[1, 'public/og-image-1200x630.png'], [0.5, 'public/og-image-600x315.png']]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: scale })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out })
  await page.close()
}
await browser.close()
console.log('home og: done')
