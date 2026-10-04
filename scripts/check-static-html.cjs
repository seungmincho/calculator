// 빌드 후: node scripts/check-static-html.cjs out — Suspense 본문이 </main> 뒤 숨김 영역으로 빠졌거나 h1이 없는 페이지 목록 (React 19.2는 12.8KB 넘는 경계를 빼냄)
const fs = require('fs'), path = require('path')
const root = process.argv[2] || 'out'
const bad = []
let n = 0
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (e.name !== '_next') walk(p); continue }
    if (e.name !== 'index.html') continue
    n++
    const s = fs.readFileSync(p, 'utf8')
    const mainEnd = s.indexOf('</main>')
    const h1 = s.indexOf('<h1')
    const tpl = s.includes('<template id="B:')
    const flags = []
    if (tpl) flags.push('tpl')
    if (h1 < 0) flags.push('noh1')
    else if (mainEnd > 0 && h1 > mainEnd) flags.push('h1-after-main')
    if (flags.length) bad.push(path.relative(root, path.dirname(p)).split(path.sep).join('/') + ' [' + flags.join(',') + ']')
  }
}
walk(root)
console.log('pages', n, 'bad', bad.length)
console.log(bad.join('\n'))
