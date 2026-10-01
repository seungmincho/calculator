// 마크다운 렌더러 회귀 체크: node scripts/check-markdown.ts
import { renderMarkdown, safeUrl, slug, textStats, highlight, htmlDocument } from '../src/utils/markdown.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r = (md: string) => renderMarkdown(md).html
const has = (md: string, frag: string, msg: string) => {
  const h = r(md)
  if (!h.includes(frag)) { fail++; console.log('FAIL', msg, JSON.stringify(h), 'missing', JSON.stringify(frag)) }
}

// ── 보안: 어떤 입력에서도 script / on*= / javascript: 가 실행 가능한 형태로 나오면 안 됨 ──
const attacks = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '| a | b |\n|---|---|\n| <img src=x onerror=alert(1)> | <script>x</script> |',
  '[click](javascript:alert(1))',
  '[click](JaVaScRiPt:alert(1))',
  '[click](java\tscript:alert(1))',
  '[click]( javascript:alert(1) "t")',
  '[click](<javascript:alert(1)>)',
  '![x](javascript:alert(1))',
  '![x](data:text/html;base64,PHNjcmlwdD4=)',
  '[x](data:text/html,<script>alert(1)</script>)',
  '[x](vbscript:msgbox(1))',
  '<javascript:alert(1)>',
  '[a"onmouseover="alert(1)](https://x.com/"onmouseover="alert(1))',
  '![a" onerror="alert(1)](https://x.com/a.png "t\\" onerror=\\"alert(1)")',
  '`<script>`',
  '```html\n<script>alert(1)</script>\n```',
  '```"><script>alert(1)</script>\nx\n```',
  '# <svg onload=alert(1)>',
  '> <iframe src="javascript:alert(1)">',
  '- [ ] <b onclick=alert(1)>x</b>',
  'x[^1]\n\n[^1]: <script>alert(1)</script>',
  '<kbd onclick=alert(1)>a</kbd> <br onclick=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  'https://x.com/"onmouseover="alert(1)',
  '\u0000999\u0000 <script>',
]
for (const a of attacks) {
  const h = r(a)
  if (/<script|<iframe|<svg|<b |<a href="javascript|\son\w+\s*=\s*"/i.test(h) || /href="\s*(javascript|vbscript|data):/i.test(h) || /src="\s*(javascript|data:text)/i.test(h)) {
    fail++; console.log('FAIL xss', JSON.stringify(a), '→', JSON.stringify(h))
  }
}
eq(safeUrl('javascript:alert(1)'), null, 'safeUrl js')
eq(safeUrl('  JAVA\nSCRIPT:x'), null, 'safeUrl 제어문자 우회')
eq(safeUrl('https://a.com'), 'https://a.com', 'safeUrl https')
eq(safeUrl('./docs/a.md'), './docs/a.md', 'safeUrl 상대경로')
eq(safeUrl('#install'), '#install', 'safeUrl 앵커')
eq(safeUrl('mailto:a@b.c'), 'mailto:a@b.c', 'safeUrl mailto')
eq(safeUrl('data:image/png;base64,iVBORw0KGgo='), null, '링크엔 data: 불가')
eq(safeUrl('data:image/png;base64,iVBORw0KGgo=', true), 'data:image/png;base64,iVBORw0KGgo=', '이미지엔 data:image 허용')
eq(safeUrl('data:image/svg+xml;base64,PHN2Zz4=', true), null, 'svg data URL 불가')

// ── 기본 문법 ──
eq(r('# 안녕 World'), '<h1 id="안녕-world">안녕 World</h1>', 'ATX 제목 + 한글 slug')
eq(r('#해시태그'), '<p>#해시태그</p>', '# 뒤 공백 없으면 제목 아님')
eq(r('# 제목 #'), '<h1 id="제목">제목</h1>', '닫는 # 제거')
eq(renderMarkdown('# A\n## A\n## A').headings.map((h) => h.id), ['a', 'a-1', 'a-2'], '중복 id')
eq(r('제목\n==='), '<h1 id="제목">제목</h1>', 'setext h1')
eq(r('**굵게** *기울임* ~~취소~~ `co*de*`'), '<p><strong>굵게</strong> <em>기울임</em> <del>취소</del> <code>co*de*</code></p>', '인라인 서식, 코드 안 서식 무시')
eq(r('snake_case_name'), '<p>snake_case_name</p>', '단어 안 _ 는 기울임 아님')
eq(r('2 * 3 * 4'), '<p>2 * 3 * 4</p>', '공백 둘러싼 * 는 기울임 아님')
eq(r('\\*literal\\*'), '<p>*literal*</p>', '역슬래시 이스케이프')
eq(r('a\nb'), '<p>a<br />\nb</p>', '줄바꿈 → br')
eq(r('a | b 는 파이프'), '<p>a | b 는 파이프</p>', '파이프 있는 문장은 표 아님')
eq(r('---'), '<hr />', '구분선')
eq(r('a < b && c'), '<p>a &lt; b &amp;&amp; c</p>', '특수문자 이스케이프')
eq(r('키 <kbd>Ctrl</kbd>+<kbd>C</kbd><br>다음'), '<p>키 <kbd>Ctrl</kbd>+<kbd>C</kbd><br />다음</p>', '허용 인라인 태그')

// ── 링크·이미지·자동 링크 ──
eq(r('[툴허브](https://toolhub.ai.kr "홈")'), '<p><a href="https://toolhub.ai.kr" title="홈" target="_blank" rel="noopener noreferrer">툴허브</a></p>', '링크 + 제목')
eq(r('[설치](#install)'), '<p><a href="#install">설치</a></p>', '앵커 링크는 새 창 아님')
eq(r('[위키](https://en.wikipedia.org/wiki/Foo_(bar))'), '<p><a href="https://en.wikipedia.org/wiki/Foo_(bar)" target="_blank" rel="noopener noreferrer">위키</a></p>', '괄호 있는 URL')
eq(r('[x](https://a.com?a=1&b=2)'), '<p><a href="https://a.com?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">x</a></p>', 'URL & 이스케이프')
eq(r('![로고](./logo.png)'), '<p><img src="./logo.png" alt="로고" loading="lazy" /></p>', '이미지')
has('[![badge](https://img.shields.io/x.svg)](https://ci)', '<a href="https://ci" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/x.svg"', '배지(이미지 링크)')
eq(r('https://toolhub.ai.kr에서 확인.'), '<p><a href="https://toolhub.ai.kr" target="_blank" rel="noopener noreferrer">https://toolhub.ai.kr</a>에서 확인.</p>', '맨 URL 자동 링크(한글 앞에서 끊기)')
eq(r('see https://a.com/x.'), '<p>see <a href="https://a.com/x" target="_blank" rel="noopener noreferrer">https://a.com/x</a>.</p>', '끝 마침표 제외')
eq(r('(www.a.com)'), '<p>(<a href="http://www.a.com" target="_blank" rel="noopener noreferrer">www.a.com</a>)</p>', 'www 자동 링크 + 닫는 괄호 제외')
eq(r('<a@b.co>'), '<p><a href="mailto:a@b.co">a@b.co</a></p>', '이메일 자동 링크')
eq(r('`https://a.com`'), '<p><code>https://a.com</code></p>', '코드 안 URL은 링크 아님')

// ── 목록 ──
eq(r('- a\n- b'), '<ul><li>a</li><li>b</li></ul>', '글머리 목록')
eq(r('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>', '번호 목록')
eq(r('3. a\n4. b'), '<ol start="3"><li>a</li><li>b</li></ol>', '시작 번호')
eq(r('- a\n  - b\n  - c\n- d'), '<ul><li>a\n<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>', '중첩 목록')
eq(r('1. a\n  - b'), '<ol><li>a\n<ul><li>b</li></ul></li></ol>', '번호 아래 2칸 중첩')
eq(r('- [x] 완료\n- [ ] 할 일'), '<ul class="md-tasks"><li class="md-task"><input type="checkbox" disabled checked /> 완료</li><li class="md-task"><input type="checkbox" disabled /> 할 일</li></ul>', '체크리스트')
eq(r('- a\n\n- b'), '<ul><li><p>a</p></li><li><p>b</p></li></ul>', 'loose 목록')
eq(r('- a\n- b\n\n문단'), '<ul><li>a</li><li>b</li></ul>\n<p>문단</p>', '목록 뒤 문단')
eq(r('- a\n* b'), '<ul><li>a</li></ul>\n<ul><li>b</li></ul>', '다른 기호는 새 목록')
eq(r('* * *'), '<hr />', '* * * 는 구분선')

// ── 인용·알림 ──
eq(r('> 인용\n> 두 줄'), '<blockquote><p>인용<br />\n두 줄</p></blockquote>', '인용')
eq(r('> a\n>> b'), '<blockquote><p>a</p>\n<blockquote><p>b</p></blockquote></blockquote>', '중첩 인용')
eq(r('> [!WARNING]\n> 주의'), '<div class="md-alert md-alert-warning"><p class="md-alert-title">Warning</p><p>주의</p></div>', 'GitHub 알림')

// ── 표 ──
eq(
  r('| 이름 | 값 |\n|:--|--:|\n| `a|b` | **1** |\n| c \\| d |'),
  '<div class="md-table-wrap"><table><thead><tr><th style="text-align:left">이름</th><th style="text-align:right">값</th></tr></thead><tbody><tr><td style="text-align:left"><code>a|b</code></td><td style="text-align:right"><strong>1</strong></td></tr><tr><td style="text-align:left">c | d</td><td style="text-align:right"></td></tr></tbody></table></div>',
  '표: 정렬·코드 안 파이프·이스케이프 파이프·빈 칸 채움'
)
eq(r('a|b\n-|-'), '<div class="md-table-wrap"><table><thead><tr><th>a</th><th>b</th></tr></thead></table></div>', '바깥 파이프 없는 표')
eq(r('a | b\n---'), '<h2 id="a--b">a | b</h2>', '열 수 불일치면 표 아님(setext)')

// ── 코드 블록 ──
eq(r('```\n<b>\n```'), '<pre><code>&lt;b&gt;</code></pre>', '언어 없는 코드 블록')
eq(r('~~~py\nx = 1 # c\n~~~'), '<pre><code class="language-py">x = <span class="md-tok-n">1</span> <span class="md-tok-c"># c</span></code></pre>', '~~~ 펜스 + 파이썬 주석')
eq(r('```js\n# 제목 아님\n```').includes('<h1'), false, '코드 안 # 은 제목 아님')
eq(renderMarkdown('```\n# x\n```\n# 진짜').headings.map((h) => h.text), ['진짜'], '목차는 코드 블록 제외')
eq(r('    ```js\n    a\n    ```').includes('<pre>'), false, '4칸 들여쓴 펜스는 펜스 아님')
eq(highlight('const s = "a//b" // c', 'js'), '<span class="md-tok-k">const</span> s = <span class="md-tok-s">&quot;a//b&quot;</span> <span class="md-tok-c">// c</span>', '문자열 안 // 는 주석 아님')
eq(highlight('SELECT 1', 'sql'), '<span class="md-tok-k">SELECT</span> <span class="md-tok-n">1</span>', 'SQL 대소문자 무시')
eq(highlight('<a>', 'text'), '&lt;a&gt;', 'text 는 강조 없음')
eq(r('```js\nunclosed'), '<pre><code class="language-js">unclosed</code></pre>', '닫히지 않은 펜스')

// ── 각주 ──
eq(
  r('본문[^n].\n\n[^n]: 출처 *강조*'),
  '<p>본문<sup class="md-fnref"><a href="#fn-1" id="fnref-1">1</a></sup>.</p>\n<section class="md-footnotes"><hr /><ol><li id="fn-1">출처 <em>강조</em> <a href="#fnref-1" class="md-fnback" aria-label="back">↩</a></li></ol></section>',
  '각주'
)
eq(r('정의 없는 [^x]'), '<p>정의 없는 [^x]</p>', '정의 없는 각주는 그대로')

// ── 기타 ──
eq(slug('Hello, World! 2026'), 'hello-world-2026', 'slug')
eq(r(''), '', '빈 입력')
eq(r('a\r\nb'), '<p>a<br />\nb</p>', 'CRLF')
const st = textStats('# 안녕하세요\n\nhello world ![x](data:image/png;base64,AAAA)')
eq([st.lines, st.words, st.readMin], [3, 5, 1], '통계')
eq(textStats('').readMin, 0, '빈 문서 0분')
eq(textStats('가'.repeat(1500)).readMin, 3, '한글 500자/분')
eq(textStats('![a](data:image/png;base64,' + 'A'.repeat(5000) + ')').chars, 6, 'base64 이미지는 글자 수 제외')
eq(htmlDocument('<t>', '<p>x</p>').includes('<title>&lt;t&gt;</title>'), true, '내보내기 제목 이스케이프')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-markdown: all passed')
