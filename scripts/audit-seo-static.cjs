// 빌드 후: node scripts/audit-seo-static.cjs out [report.json]
// 운영 사이트를 읽지 않고 빌드본 HTML 만으로 보는 SEO 점검(claude-seo 의 technical·content·schema·geo 항목 중 정적으로 볼 수 있는 것).
// 제목·설명 길이·중복, canonical, h1, JSON-LD, 본문 분량, 출처·기준일, 문맥 내부 링크, sitemap 정합, 본문 유사 페이지.
const fs = require('fs'), path = require('path')
const root = process.argv[2] || 'out'
const outJson = process.argv[3]
const ORIGIN = 'https://toolhub.ai.kr'

const pick = (s, re) => (s.match(re) || [])[1]
const decode = s => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
const text = h => decode(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

// 1) 페이지 읽기
const pages = {}
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (!e.name.startsWith('_')) walk(p); continue }
    if (e.name !== 'index.html') continue
    const rel = path.relative(root, d).split(path.sep).join('/')
    const url = '/' + (rel ? rel + '/' : '')
    const s = fs.readFileSync(p, 'utf8')
    const head = s.slice(0, s.indexOf('</head>'))
    const mi = s.indexOf('<main'), me = s.indexOf('</main>')
    const main = mi >= 0 && me > mi ? s.slice(mi, me) : ''
    const robots = pick(head, /<meta name="robots" content="([^"]*)"/) || ''
    const ld = [...s.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])
    pages[url] = {
      url,
      noindex: /noindex/.test(robots),
      title: decode(pick(head, /<title>([^<]*)<\/title>/)),
      desc: decode(pick(head, /<meta name="description" content="([^"]*)"/)),
      canonical: pick(head, /<link rel="canonical" href="([^"]*)"/),
      ogUrl: pick(head, /<meta property="og:url" content="([^"]*)"/),
      ogImage: pick(head, /<meta property="og:image" content="([^"]*)"/),
      h1: [...s.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(m => text(m[1])),
      ld,
      mainText: text(main),
      imgNoAlt: [...main.matchAll(/<img\b[^>]*>/g)].filter(m => !/\balt="[^"]+"/.test(m[0])).length,
      mainLinks: [...new Set([...main.matchAll(/<a\b[^>]*href="(\/[^"#?]*)/g)].map(m => m[1].endsWith('/') ? m[1] : m[1] + '/'))],
      extLinks: [...main.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/g)].map(m => m[1]).filter(h => !h.startsWith(ORIGIN)),
    }
  }
})(root)

const all = Object.values(pages)
const idx = all.filter(p => !p.noindex && p.url !== '/404/' && !p.url.startsWith('/admin/'))
const issues = {}
const add = (k, v) => (issues[k] = issues[k] || []).push(v)

// 2) 페이지별 점검
const ymyl = new Set()
for (const hub of ['/calculators/', '/health/']) for (const l of pages[hub]?.mainLinks || []) ymyl.add(l)
const byTitle = {}, byDesc = {}
for (const p of idx) {
  const tl = [...p.title].length, dl = [...p.desc].length
  if (!p.title) add('title.missing', p.url)
  else if (tl > 45) add('title.long(>45)', `${p.url} (${tl}) ${p.title}`)
  else if (tl < 15) add('title.short(<15)', `${p.url} (${tl}) ${p.title}`)
  if (!p.desc) add('desc.missing', p.url)
  else if (dl > 160) add('desc.long(>160)', `${p.url} (${dl})`)
  else if (dl < 50) add('desc.short(<50)', `${p.url} (${dl}) ${p.desc}`)
  ;(byTitle[p.title] = byTitle[p.title] || []).push(p.url)
  ;(byDesc[p.desc] = byDesc[p.desc] || []).push(p.url)
  if (p.canonical !== ORIGIN + p.url) add('canonical.mismatch', `${p.url} -> ${p.canonical}`)
  if (p.ogUrl && p.ogUrl !== p.canonical) add('ogUrl.mismatch', `${p.url} -> ${p.ogUrl}`)
  if (!p.ogImage) add('ogImage.missing', p.url)
  else if (p.ogImage.startsWith(ORIGIN + '/og/') && !fs.existsSync(path.join(root, p.ogImage.slice(ORIGIN.length)))) add('ogImage.fileMissing', `${p.url} ${p.ogImage}`)
  if (p.h1.length !== 1) add('h1.count!=1', `${p.url} (${p.h1.length}) ${p.h1.join(' | ')}`)
  if (p.imgNoAlt) add('img.noAlt(main)', `${p.url} (${p.imgNoAlt})`)
  const types = []
  for (const raw of p.ld) {
    let j
    try { j = JSON.parse(raw) } catch (e) { add('jsonld.parseError', `${p.url} ${e.message}`); continue }
    for (const node of [j].flat().flatMap(n => n['@graph'] || [n])) {
      types.push(node['@type'])
      if (!String(j['@context'] || node['@context']).startsWith('https://schema.org')) add('jsonld.context', `${p.url} ${node['@type']}`)
      if (node['@type'] === 'HowTo') add('jsonld.HowTo(rich result 폐지)', p.url)
    }
    for (const m of raw.matchAll(/"(url|@id|image|item|logo)":"(\/[^"]*)"/g)) add('jsonld.relativeUrl', `${p.url} ${m[1]}=${m[2]}`)
  }
  p.types = types.flat()
  if (!p.ld.length) add('jsonld.none', p.url)
  const n = p.mainText.length
  if (n < 600) add('content.thin(<600자)', `${p.url} (${n})`)
  if (ymyl.has(p.url)) {
    const gov = p.extLinks.filter(h => /\.(go|or|re)\.kr|law\.go\.kr|who\.int|\.gov\b/.test(h))
    if (!gov.length) add('ymyl.noOfficialSourceLink', p.url)
    if (!/(20\d\d)\s*(년|\.|-)\s*\d{0,2}[^가-힣]{0,6}(기준|시행|개정|업데이트|갱신|적용)|(기준|시행|개정|업데이트|갱신)[^가-힣]{0,3}20\d\d/.test(p.mainText)) add('ymyl.noBasisDate', p.url)
  }
}
for (const [t, us] of Object.entries(byTitle)) if (t && us.length > 1) add('title.duplicate', `${t} ← ${us.join(', ')}`)
for (const [d, us] of Object.entries(byDesc)) if (d && us.length > 1) add('desc.duplicate', `${d.slice(0, 40)}… ← ${us.join(', ')}`)

// 3) 문맥(본문 <main>) 내부 링크 유입 — 헤더·전체 도구 목록 링크는 모든 페이지에 똑같이 있어서 뺀다
const inbound = {}
for (const p of idx) for (const l of p.mainLinks) if (l !== p.url) (inbound[l] = inbound[l] || new Set()).add(p.url)
for (const p of idx) if (p.url !== '/' && !(inbound[p.url]?.size)) add('links.noContextualInbound', p.url)

// 4) sitemap · _redirects 정합
const locs = new Set([...fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(ORIGIN, '')))
const redirectFrom = new Set(fs.readFileSync(path.join(root, '_redirects'), 'utf8').split('\n').map(l => l.trim().split(/\s+/)[0]).filter(l => l && !l.startsWith('#')))
for (const u of locs) {
  if (!pages[u]) add('sitemap.noPage', u)
  else if (pages[u].noindex) add('sitemap.noindexPage', u)
  if (redirectFrom.has(u)) add('sitemap.redirected', u) // '/x → /x/' 정규화 규칙은 정상이라 슬래시 붙은 원본만 본다
}
for (const p of idx) if (!locs.has(p.url)) add('sitemap.missingIndexable', p.url)

// 5) 본문이 거의 같은 페이지 쌍(MinHash, 5글자 shingle) — 대량 생산 콘텐츠로 보일 위험
const K = 64, seeds = Array.from({ length: K }, (_, i) => (i + 1) * 0x9e3779b1 >>> 0)
const h32 = (str, seed) => { let h = seed; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995) >>> 0; return (h ^ (h >>> 15)) >>> 0 }
const sigs = idx.filter(p => p.mainText.length >= 300).map(p => {
  const t = p.mainText.replace(/[\s\d]+/g, ''), sig = new Array(K).fill(0xffffffff)
  for (let i = 0; i + 5 <= t.length; i++) { const sh = t.slice(i, i + 5); for (let k = 0; k < K; k++) { const v = h32(sh, seeds[k]); if (v < sig[k]) sig[k] = v } }
  return { url: p.url, sig }
})
for (let a = 0; a < sigs.length; a++) for (let b = a + 1; b < sigs.length; b++) {
  let same = 0
  for (let k = 0; k < K; k++) if (sigs[a].sig[k] === sigs[b].sig[k]) same++
  if (same / K >= 0.5) add('content.nearDuplicate(≥50%)', `${(same / K).toFixed(2)} ${sigs[a].url} ~ ${sigs[b].url}`)
}

// 6) 사이트 전체
const exists = f => fs.existsSync(path.join(root, f))
for (const f of ['about/index.html', 'privacy/index.html', 'terms/index.html', 'inquiry/index.html']) if (!exists(f)) add('site.missingTrustPage', f)
if (!exists('llms.txt')) add('site.noLlmsTxt(참고용, Google 무관)', 'llms.txt')
for (const e of fs.readdirSync(root)) if (/^Gemini_|\.(psd|zip|txt)$/i.test(e) && !['robots.txt', 'ads.txt'].includes(e) && !e.startsWith('__next') && e !== 'index.txt') add('site.strayFile', e)

// 출력
const lens = idx.map(p => p.mainText.length).sort((a, b) => a - b)
console.log(`pages ${all.length}, indexable ${idx.length}, noindex ${all.length - idx.length}, ymyl ${ymyl.size}, sitemap ${locs.size}`)
console.log(`main text 글자수 p10 ${lens[Math.floor(lens.length * 0.1)]} · median ${lens[Math.floor(lens.length / 2)]} · p90 ${lens[Math.floor(lens.length * 0.9)]}`)
const typeCount = {}
for (const p of idx) for (const t of new Set(p.types)) typeCount[t] = (typeCount[t] || 0) + 1
console.log('JSON-LD types', JSON.stringify(typeCount))
for (const [k, v] of Object.entries(issues).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n## ${k} — ${v.length}`)
  console.log(v.slice(0, 15).join('\n') + (v.length > 15 ? `\n… +${v.length - 15}` : ''))
}
if (outJson) fs.writeFileSync(outJson, JSON.stringify({ issues, pages: idx.map(({ ld, mainText, ...p }) => ({ ...p, chars: mainText.length })) }, null, 1))
