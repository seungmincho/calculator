// 마크다운 → 안전한 HTML (GFM 부분집합). 회귀 체크: node scripts/check-markdown.ts
// 보안 원칙: 사용자 HTML은 전부 이스케이프한다(속성 없는 인라인 태그 몇 개만 고정 문자열로 복원).
// URL은 스킴 화이트리스트(safeUrl). 그래서 별도 DOM sanitizer 없이도 script/on*/javascript: 가 나올 수 없다.

export interface Heading { level: number; text: string; id: string }
export interface RenderResult { html: string; headings: Heading[] }

interface Ctx {
  ph: string[]
  fnDefs: Map<string, string>
  fnOrder: string[]
  headings: Heading[]
  ids: Map<string, number>
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** 링크/이미지 URL 검사. 안전하면 원문(트림) 반환, 아니면 null. 상대경로·#앵커는 허용 */
export function safeUrl(raw: string, img = false): string | null {
  const u = raw.trim()
  // 브라우저는 URL의 탭·개행·제어문자를 무시하므로(java\tscript:) 제거한 뒤 스킴을 본다
  const probe = u.replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase()
  const m = probe.match(/^([a-z][a-z0-9+.-]*):/)
  if (!m) return u
  if (img) {
    if (m[1] === 'http' || m[1] === 'https') return u
    return /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[a-z0-9+/=]+$/.test(probe) ? u : null
  }
  return ['http', 'https', 'mailto', 'tel'].includes(m[1]) ? u : null
}

/** 서식 기호를 걷어낸 평문 (목차·alt·파일명용) */
export function plain(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/(\*\*|__|~~|[*`])/g, '')
    .replace(/\\(.)/g, '$1')
    .trim()
}

/** GitHub 방식 앵커 id: 소문자, 문자·숫자·공백·-·_ 외 제거, 공백 → - */
export const slug = (s: string) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')

// ── 코드 블록 구문 강조 (경량 토크나이저) ─────────────────────────────────────
const KW = new Set(
  ('abstract and as async await break case catch class const continue def default del delete do elif else enum export extends ' +
    'false final finally fn for from func function go if impl import in instanceof interface is lambda let match mod new nil none ' +
    'not null or package pass private protected public raise return self static struct super switch this throw throws true try ' +
    'type typeof undefined use var void while with yield select insert update where join order group by limit values into create table')
    .split(' ')
)
const HASH_COMMENT = /^(py|python|sh|bash|shell|zsh|console|yaml|yml|toml|ruby|rb|r|dockerfile|ps1|powershell|perl|makefile|conf|nginx)$/
const SQL = /^(sql|mysql|postgres|postgresql|sqlite|plsql)$/

export function highlight(code: string, lang: string): string {
  const l = lang.toLowerCase()
  if (!l || /^(text|plain|plaintext|txt|md|markdown|diff)$/.test(l)) return esc(code)
  const comment = HASH_COMMENT.test(l) ? '#.*' : SQL.test(l) ? '--.*|\\/\\*[\\s\\S]*?\\*\\/' : '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/'
  const re = new RegExp(
    `(${comment}|<!--[\\s\\S]*?-->)|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b\\d[\\w.]*)|([A-Za-z_$][\\w$]*)`,
    'g'
  )
  const ci = SQL.test(l)
  let out = ''
  let last = 0
  for (const m of code.matchAll(re)) {
    const i = m.index ?? 0
    out += esc(code.slice(last, i))
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : KW.has(ci ? m[4].toLowerCase() : m[4]) ? 'k' : ''
    out += cls ? `<span class="md-tok-${cls}">${esc(m[0])}</span>` : esc(m[0])
    last = i + m[0].length
  }
  return out + esc(code.slice(last))
}

// ── 인라인 ─────────────────────────────────────────────────────────────────
const CODE = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g
const AUTOLINK = /<((?:https?|mailto):[^\s<>]+|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>/g
const RAWTAG = /<(\/?)(br|kbd|sub|sup|mark|u|ins|del|s)\s*\/?>/gi
const BSLASH = /\\([!-/:-@[-`{-~])/g
const URLPART = '(<[^>\\n]*>|(?:[^\\s()]|\\([^\\s()]*\\))*)(?:\\s+"([^"]*)")?\\s*\\)'
const IMG = new RegExp(`!\\[([^\\]]*)\\]\\(\\s*${URLPART}`, 'g')
const LINK = new RegExp(`\\[([^\\]]+)\\]\\(\\s*${URLPART}`, 'g')
const FNREF = /\[\^([^\]\s]+)\]/g
// ponytail: 맨 URL은 ASCII까지만 링크(“https://a.kr에서” 오인 방지). 한글 경로 URL은 <...>로 감싸면 됨
const BARE = /(^|[\s(])((?:https?:\/\/|www\.)[\x21-\x3b\x3d\x3f-\x7e]+)/g

const unangle = (u: string) => (u.startsWith('<') && u.endsWith('>') ? u.slice(1, -1) : u)
const linkAttrs = (u: string) => (/^https?:/i.test(u) ? ' target="_blank" rel="noopener noreferrer"' : '')

function emphasis(s: string): string {
  return s
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/\*(?=[^\s*])([\s\S]*?[^\s*])\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
}

function inline(src: string, c: Ctx): string {
  const P = (html: string) => `\u0000${c.ph.push(html) - 1}\u0000`
  let s = src
    .replace(CODE, (_, _t, body: string) => P(`<code>${esc(/^ .* $/.test(body) && body.trim() ? body.slice(1, -1) : body)}</code>`))
    .replace(AUTOLINK, (_, u: string) => {
      const href = u.includes(':') ? safeUrl(u) : `mailto:${u}`
      return href === null ? P(esc(`<${u}>`)) : P(`<a href="${esc(href)}"${linkAttrs(href)}>${esc(u)}</a>`)
    })
    .replace(RAWTAG, (_, slash: string, tag: string) => {
      const t = tag.toLowerCase()
      return P(t === 'br' ? '<br />' : `<${slash}${t}>`)
    })
    .replace(BSLASH, (_, ch: string) => P(esc(ch)))
    .replace(IMG, (_, alt: string, url: string, title?: string) => {
      const u = safeUrl(unangle(url), true)
      const a = esc(plain(alt))
      return P(u === null ? a : `<img src="${esc(u)}" alt="${a}"${title ? ` title="${esc(title)}"` : ''} loading="lazy" />`)
    })
    .replace(FNREF, (m, id: string) => {
      if (!c.fnDefs.has(id)) return m
      let n = c.fnOrder.indexOf(id) + 1
      const first = n === 0
      if (first) n = c.fnOrder.push(id)
      return P(`<sup class="md-fnref"><a href="#fn-${n}"${first ? ` id="fnref-${n}"` : ''}>${n}</a></sup>`)
    })
    .replace(LINK, (_, label: string, url: string, title?: string) => {
      const u = safeUrl(unangle(url))
      const inner = emphasis(esc(label))
      return P(u === null ? inner : `<a href="${esc(u)}"${title ? ` title="${esc(title)}"` : ''}${linkAttrs(u)}>${inner}</a>`)
    })
    .replace(BARE, (_, pre: string, url: string) => {
      let u = url.replace(/[.,:;!?'"*_~]+$/, '')
      while (u.endsWith(')') && (u.match(/\(/g) || []).length < (u.match(/\)/g) || []).length) u = u.slice(0, -1)
      const href = u.startsWith('www.') ? `http://${u}` : u
      return pre + P(`<a href="${esc(href)}"${linkAttrs(href)}>${esc(u)}</a>`) + url.slice(u.length)
    })
  s = emphasis(esc(s))
  for (let k = 0; k < 8 && s.includes('\u0000'); k++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n: string) => c.ph[+n] ?? '')
  return s
}

// ── 블록 ──────────────────────────────────────────────────────────────────
const FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*([\w#+.-]*)[^`]*$/
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const QUOTE = /^ {0,3}>/
const LIST = /^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+|$)/
const DELIM = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/
const ALERTS: Record<string, string> = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' }

const indentOf = (l: string) => l.length - l.trimStart().length

function cells(row: string): string[] {
  let s = row.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const out: string[] = []
  let cur = ''
  let code = false
  for (let k = 0; k < s.length; k++) {
    const ch = s[k]
    if (ch === '\\' && s[k + 1] === '|') { cur += '|'; k++; continue }
    if (ch === '`') code = !code
    if (ch === '|' && !code) { out.push(cur.trim()); cur = '' } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const isTable = (lines: string[], i: number) =>
  lines[i].includes('|') && i + 1 < lines.length && DELIM.test(lines[i + 1]) && cells(lines[i]).length === cells(lines[i + 1]).length

const interrupts = (lines: string[], i: number) => {
  const l = lines[i]
  const lm = l.match(LIST)
  return FENCE.test(l) || ATX.test(l) || HR.test(l) || QUOTE.test(l) || isTable(lines, i) ||
    (!!lm && lm[3] !== '' && (!/\d/.test(lm[2]) || /^1[.)]/.test(lm[2])))
}

function heading(level: number, raw: string, c: Ctx): string {
  const text = plain(raw)
  let id = slug(text) || 'section'
  const n = c.ids.get(id) ?? 0
  c.ids.set(id, n + 1)
  if (n) id += `-${n}`
  c.headings.push({ level, text, id })
  return `<h${level} id="${esc(id)}">${inline(raw, c)}</h${level}>`
}

const markerKey = (m: RegExpMatchArray) => (/\d/.test(m[2]) ? m[2].slice(-1) : m[2])

function list(lines: string[], i: number, c: Ctx): [string, number] {
  const first = lines[i].match(LIST)!
  const ordered = /\d/.test(first[2])
  const key = markerKey(first)
  const items: string[][] = []
  let loose = false
  while (i < lines.length) {
    const m = lines[i].match(LIST)
    if (!m || HR.test(lines[i]) || markerKey(m) !== key) break
    const content = m[1].length + m[2].length + (m[3] ? Math.min(m[3].length, 4) : 1)
    const need = Math.min(content, m[1].length + 2) // ponytail: 2칸 들여쓰기 중첩도 허용(“1. ” 아래 “  - ”)
    const body = [lines[i].slice(m[0].length)]
    let blanks = 0
    i++
    while (i < lines.length) {
      const l = lines[i]
      if (!l.trim()) { blanks++; i++; continue }
      const ind = indentOf(l)
      if (ind >= need) {
        if (blanks) { loose = true; body.push(...Array(blanks).fill('')) }
        blanks = 0
        body.push(l.slice(Math.min(ind, content)))
        i++
        continue
      }
      if (blanks || LIST.test(l) || interrupts(lines, i)) break
      body.push(l) // lazy continuation
      i++
    }
    items.push(body)
    if (blanks) {
      const nx = i < lines.length ? lines[i].match(LIST) : null
      if (nx && markerKey(nx) === key && !HR.test(lines[i])) loose = true
      else break
    }
  }
  let task = false
  const lis = items.map((body) => {
    const tm = body[0].match(/^\[([ xX])\](?:[ \t]+|$)/)
    if (tm) { task = true; body[0] = body[0].slice(tm[0].length) }
    let inner = blocks(body, c)
    if (!loose) inner = inner.replace(/^<p>([\s\S]*?)<\/p>/, '$1')
    return tm
      ? `<li class="md-task"><input type="checkbox" disabled${tm[1] === ' ' ? '' : ' checked'} /> ${inner}</li>`
      : `<li>${inner}</li>`
  })
  const start = ordered ? parseInt(first[2], 10) : 1
  const tag = ordered ? 'ol' : 'ul'
  return [`<${tag}${ordered && start !== 1 ? ` start="${start}"` : ''}${task ? ' class="md-tasks"' : ''}>${lis.join('')}</${tag}>`, i]
}

function blocks(lines: string[], c: Ctx): string {
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    let m: RegExpMatchArray | null

    if ((m = line.match(FENCE))) {
      const indent = m[1].length
      const close = new RegExp(`^ {0,3}${m[2][0] === '`' ? '`' : '~'}{${m[2].length},}[ \\t]*$`)
      const body: string[] = []
      i++
      while (i < lines.length && !close.test(lines[i])) {
        body.push(lines[i].slice(Math.min(indent, indentOf(lines[i]))))
        i++
      }
      i++
      const lang = m[3]
      out.push(`<pre><code${lang ? ` class="language-${esc(lang)}"` : ''}>${highlight(body.join('\n'), lang)}</code></pre>`)
      continue
    }
    if ((m = line.match(ATX))) { out.push(heading(m[1].length, m[2] || '', c)); i++; continue }
    if (HR.test(line)) { out.push('<hr />'); i++; continue }

    if (QUOTE.test(line)) {
      const q: string[] = []
      while (i < lines.length && lines[i].trim() && QUOTE.test(lines[i])) { q.push(lines[i].replace(/^ {0,3}> ?/, '')); i++ }
      const a = q[0].match(/^\s*\[!(note|tip|important|warning|caution)\]\s*$/i)
      if (a) {
        const k = a[1].toLowerCase()
        out.push(`<div class="md-alert md-alert-${k}"><p class="md-alert-title">${ALERTS[k]}</p>${blocks(q.slice(1), c)}</div>`)
      } else out.push(`<blockquote>${blocks(q, c)}</blockquote>`)
      continue
    }

    if (isTable(lines, i)) {
      const head = cells(line)
      const aligns = cells(lines[i + 1]).map((s) => (s.startsWith(':') && s.endsWith(':') ? 'center' : s.endsWith(':') ? 'right' : s.startsWith(':') ? 'left' : ''))
      const td = (tag: string, cell: string, k: number) => `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(cell, c)}</${tag}>`
      i += 2
      const rows: string[] = []
      while (i < lines.length && lines[i].trim() && !interrupts(lines, i)) {
        const r = cells(lines[i])
        rows.push(`<tr>${head.map((_, k) => td('td', r[k] ?? '', k)).join('')}</tr>`)
        i++
      }
      out.push(`<div class="md-table-wrap"><table><thead><tr>${head.map((h, k) => td('th', h, k)).join('')}</tr></thead>${rows.length ? `<tbody>${rows.join('')}</tbody>` : ''}</table></div>`)
      continue
    }

    if (LIST.test(line)) {
      const [html, next] = list(lines, i, c)
      out.push(html)
      i = next
      continue
    }

    // 문단 (+ setext 제목)
    const para = [line.trim()]
    i++
    let setext = 0
    while (i < lines.length && lines[i].trim()) {
      if (/^ {0,3}=+[ \t]*$/.test(lines[i])) { setext = 1; i++; break }
      if (/^ {0,3}-+[ \t]*$/.test(lines[i])) { setext = 2; i++; break }
      if (interrupts(lines, i)) break
      para.push(lines[i].trim())
      i++
    }
    if (setext) { out.push(heading(setext, para.join(' '), c)); continue }
    // 줄바꿈은 그대로 <br>로(블로그·메모 습관). 줄 끝 공백 2칸·역슬래시 하드브레이크 기호는 제거
    const text = para.join('\n').replace(/\\\n/g, '\n').replace(/\\$/, '')
    out.push(`<p>${inline(text, c).replace(/\n/g, '<br />\n')}</p>`)
  }
  return out.join('\n')
}

/** 마크다운 → { 안전한 HTML, 목차용 제목 목록 } */
export function renderMarkdown(md: string): RenderResult {
  const c: Ctx = { ph: [], fnDefs: new Map(), fnOrder: [], headings: [], ids: new Map() }
  const src = md.replace(/\u0000/g, '�').replace(/\r\n?/g, '\n').replace(/^\t+/gm, (t) => '    '.repeat(t.length))
  // 각주 정의([^id]: ...)는 최상위에서 미리 수집(코드 블록 안은 제외)
  const lines: string[] = []
  let fence: string | null = null
  const all = src.split('\n')
  for (let i = 0; i < all.length; i++) {
    const l = all[i]
    const f = l.match(FENCE)
    if (fence) { if (new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`).test(l)) fence = null }
    else if (f) fence = f[2]
    else {
      const d = l.match(/^ {0,3}\[\^([^\]\s]+)\]:[ \t]?(.*)$/)
      if (d) {
        const body = [d[2]]
        while (i + 1 < all.length && /^ {2,}\S/.test(all[i + 1])) body.push(all[++i].trim())
        if (!c.fnDefs.has(d[1])) c.fnDefs.set(d[1], body.join(' '))
        continue
      }
    }
    lines.push(l)
  }
  let html = blocks(lines, c)
  if (c.fnOrder.length) {
    const items: string[] = []
    for (let k = 0; k < c.fnOrder.length; k++) { // 각주 안의 각주 참조로 fnOrder가 늘어날 수 있음
      items.push(`<li id="fn-${k + 1}">${inline(c.fnDefs.get(c.fnOrder[k]) ?? '', c)} <a href="#fnref-${k + 1}" class="md-fnback" aria-label="back">↩</a></li>`)
    }
    html += `\n<section class="md-footnotes"><hr /><ol>${items.join('')}</ol></section>`
  }
  return { html, headings: c.headings }
}

// ── 통계 ──────────────────────────────────────────────────────────────────
export interface TextStats { chars: number; charsNoSpace: number; words: number; lines: number; readMin: number }

export function textStats(md: string): TextStats {
  const s = md.replace(/\((data:image\/[^)]*)\)/g, '()') // 붙여넣은 이미지(base64)는 글자 수에서 제외
  const prose = s.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\]\([^)]*\)/g, ']')
  const cjk = (prose.match(/[ㄱ-ㆎ가-힣一-鿿぀-ヿ]/g) || []).length
  const latin = (prose.replace(/[ㄱ-ㆎ가-힣一-鿿぀-ヿ]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  return {
    chars: Array.from(s).length,
    charsNoSpace: Array.from(s.replace(/\s/g, '')).length,
    words: (s.match(/\S+/g) || []).length,
    lines: s ? s.split('\n').length : 0,
    // 한국어 약 500자/분, 영어 약 220단어/분
    readMin: s.trim() ? Math.max(1, Math.round(cjk / 500 + latin / 220)) : 0,
  }
}

// ── 미리보기·내보내기 공용 스타일 (색은 CSS 변수 → 사이트에선 테마 토큰, 내보낸 파일에선 아래 기본값) ──
export const MD_CSS = `
.md-body{color:var(--body);line-height:1.75;overflow-wrap:anywhere;font-size:15px}
.md-body>:first-child{margin-top:0}
.md-body h1,.md-body h2,.md-body h3,.md-body h4,.md-body h5,.md-body h6{color:var(--fg);font-weight:700;line-height:1.35;margin:1.6em 0 .6em;scroll-margin-top:12px}
.md-body h1{font-size:1.75em;padding-bottom:.3em;border-bottom:1px solid var(--line)}
.md-body h2{font-size:1.4em;padding-bottom:.3em;border-bottom:1px solid var(--line)}
.md-body h3{font-size:1.2em}.md-body h4{font-size:1.05em}.md-body h5{font-size:1em}.md-body h6{font-size:.9em;color:var(--muted)}
.md-body p,.md-body ul,.md-body ol,.md-body blockquote,.md-body pre,.md-body .md-table-wrap,.md-body .md-alert{margin:0 0 1em}
.md-body ul{list-style:disc;padding-left:1.6em}.md-body ol{list-style:decimal;padding-left:1.6em}
.md-body ul ul{list-style:circle}.md-body li+li{margin-top:.25em}
.md-body li>ul,.md-body li>ol,.md-body li>p{margin:.25em 0}
.md-body .md-tasks{padding-left:.4em}.md-body .md-task{list-style:none}
.md-body .md-task input{margin:0 .45em 0 0;vertical-align:-.1em;accent-color:var(--primary)}
.md-body a{color:var(--primary);text-decoration:underline;text-underline-offset:2px}
.md-body strong{color:var(--fg);font-weight:700}
.md-body del{color:var(--muted)}
.md-body code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.875em;background:var(--soft);padding:.15em .4em;border-radius:6px}
.md-body pre{background:var(--subtle);border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow-x:auto;line-height:1.6;max-width:100%}
.md-body pre code{background:none;padding:0;font-size:.85em;white-space:pre;color:var(--fg);overflow-wrap:normal}
.md-body blockquote{border-left:3px solid var(--line-strong);padding:.1em 1em;color:var(--sub)}
.md-body blockquote>:last-child,.md-body .md-alert>:last-child{margin-bottom:0}
.md-body hr{border:0;border-top:1px solid var(--line);margin:1.5em 0}
.md-body .md-table-wrap{overflow-x:auto;max-width:100%}
.md-body table{border-collapse:collapse}
.md-body th,.md-body td{border:1px solid var(--line);padding:6px 12px;text-align:left}
.md-body th{background:var(--subtle);font-weight:600;color:var(--fg)}
.md-body img{max-width:100%;height:auto;border-radius:8px}
.md-body kbd{font-family:ui-monospace,monospace;font-size:.85em;border:1px solid var(--line-strong);border-bottom-width:2px;border-radius:6px;padding:.1em .4em;background:var(--surface)}
.md-body mark{background:var(--primary-soft);color:inherit;padding:0 .15em}
.md-body .md-alert{border-left:3px solid var(--primary);background:var(--subtle);padding:.6em 1em;border-radius:0 10px 10px 0}
.md-body .md-alert-title{font-weight:700;color:var(--primary);margin:0 0 .25em}
.md-body .md-alert-warning{border-left-color:#d97706}.md-body .md-alert-warning .md-alert-title{color:#d97706}
.md-body .md-alert-caution{border-left-color:#e03131}.md-body .md-alert-caution .md-alert-title{color:#e03131}
.md-body .md-fnref a{text-decoration:none;font-size:.8em}
.md-body .md-footnotes{font-size:.875em;color:var(--sub);margin-top:2em}
.md-body .md-fnback{text-decoration:none}
.md-body .md-tok-k{color:var(--primary);font-weight:600}
.md-body .md-tok-s{color:#2f9e44}
.md-body .md-tok-n{color:#e8590c}
.md-body .md-tok-c{color:var(--muted);font-style:italic}
`

const DOC_VARS = `
:root{color-scheme:light dark;--fg:#191f28;--body:#333d4b;--sub:#4e5968;--muted:#6b7684;--line:#e5e8eb;--line-strong:#d1d6db;--surface:#fff;--subtle:#f9fafb;--soft:#f2f4f6;--primary:#3182f6;--primary-soft:#e8f3ff}
@media (prefers-color-scheme:dark){:root{--fg:#f9fafb;--body:#d1d6db;--sub:#b0b8c1;--muted:#a3acb7;--line:#2a2c32;--line-strong:#4e5968;--surface:#16171b;--subtle:#1c1e22;--soft:#26282e;--primary-soft:rgb(49 130 246 / .16)}}
body{margin:0;background:var(--surface);font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif}
.md-body{max-width:760px;margin:0 auto;padding:40px 20px}
`

/** 단독으로 열리는 .html 문서 (스타일 내장, 라이트/다크 자동) */
export function htmlDocument(title: string, bodyHtml: string, lang = 'ko'): string {
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${DOC_VARS}${MD_CSS}</style>
</head>
<body>
<article class="md-body">
${bodyHtml}
</article>
</body>
</html>
`
}
