"""light/dark 색상 쌍 → 시맨틱 토큰 일괄 치환 (globals.css 토큰 참고). 재실행 안전."""
import re, glob, collections

PAIRS = [
    ('text-gray-900 dark:text-white', 'text-fg'),
    ('text-gray-800 dark:text-gray-200', 'text-body'),
    ('text-gray-800 dark:text-gray-100', 'text-body'),
    ('text-gray-700 dark:text-gray-300', 'text-body'),
    ('text-gray-700 dark:text-gray-200', 'text-body'),
    ('text-gray-600 dark:text-gray-400', 'text-sub'),
    ('text-gray-600 dark:text-gray-300', 'text-sub'),
    ('text-gray-500 dark:text-gray-400', 'text-muted'),
    ('text-gray-500 dark:text-gray-500', 'text-muted'),
    ('text-gray-400 dark:text-gray-500', 'text-faint'),
    ('bg-white dark:bg-gray-800', 'bg-surface'),
    ('bg-white/70 dark:bg-gray-800/70', 'bg-surface'),
    ('bg-white/50 dark:bg-gray-800/50', 'bg-surface'),
    ('bg-white dark:bg-gray-700', 'bg-field'),
    ('bg-gray-100 dark:bg-gray-700', 'bg-soft'),
    ('bg-gray-50 dark:bg-gray-700', 'bg-subtle'),
    ('bg-gray-50 dark:bg-gray-700/50', 'bg-subtle'),
    ('bg-gray-200 dark:bg-gray-700', 'bg-track'),
    ('border-gray-200 dark:border-gray-700', 'border-line'),
    ('border-gray-200 dark:border-gray-600', 'border-line'),
    ('border-gray-100 dark:border-gray-700', 'border-line'),
    ('border-white/20 dark:border-gray-700/30', 'border-line'),
    ('border-gray-200/50 dark:border-gray-700/50', 'border-line'),
    ('border-gray-300 dark:border-gray-600', 'border-line-strong'),
]
B = r'(?<![\w:/\[\]-])'
A = r'(?![\w/\[\]-])'
pairs = [(re.compile(B + re.escape(a) + A), b) for a, b in PAIRS]
# page.tsx 배경 그라데이션 래퍼 → body의 bg-canvas 사용
PAGE_BG = re.compile(r' bg-gradient-to-br from-\w+-50(?: via-\w+-50)? to-\w+-(?:50|100) dark:from-gray-900(?: dark:via-gray-\d+)? dark:to-gray-\d+')
PAGE_BG2 = re.compile(r'(min-h-screen) bg-gray-50 dark:bg-gray-900')

stats = collections.Counter(); files = 0
for f in glob.glob('src/**/*.ts*', recursive=True):
    s = open(f, encoding='utf-8').read(); o = s
    for rx, b in pairs:
        s, n = rx.subn(b, s); stats[b] += n
    if f.replace(chr(92), '/').startswith('src/app/'):
        s, n = PAGE_BG.subn('', s); stats['page-bg'] += n
        s, n = PAGE_BG2.subn(r'\1', s); stats['page-bg'] += n
    if s != o:
        files += 1
        open(f, 'w', encoding='utf-8', newline='').write(s)
print(files, 'files'); print(dict(stats))

# ── 2차: 인라인 글래스 잔재 → solid 토큰 ──
GLASS = [
    (re.compile(B + r'bg-white/[\d.\[\]]+ dark:bg-white/[\d.\[\]]+' + A), 'bg-surface'),
    (re.compile(B + r'border-white/[\d.\[\]]+ dark:border-white/[\d.\[\]]+' + A), 'border-line'),
    (re.compile(r'(?<=[\s"\'`])(?:dark:|hover:|dark:hover:)?backdrop-blur(?:-\w+)?' + A + r' ?'), ''),
    (re.compile(r' (?:dark:|hover:|dark:hover:)?shadow-\[[^\]\s]*(?:inset|255,255,255)[^\]\s]*\]'), ''),
]
BLOB_LINE = re.compile(r'^[ \t]*<div className="[^"]*blur-3xl[^"]*"[^>]*/>\n', re.M)
BLOBS = re.compile(r'[ \t]*(?:\{/\*[^\n]*\*/\}\n[ \t]*)?<div className="fixed inset-0 -z-10[^"]*">.*?blur-3xl.*?\n[ \t]*</div>\n', re.S)
g = collections.Counter(); gf = 0
for f in glob.glob('src/**/*.ts*', recursive=True):
    s = open(f, encoding='utf-8').read(); o = s
    for i, (rx, b) in enumerate(GLASS):
        s, n = rx.subn(b, s); g[i] += n
    s, n = BLOBS.subn('', s); g['blobs'] += n
    s, n = BLOB_LINE.subn('', s); g['blob-lines'] += n
    if s != o:
        gf += 1
        open(f, 'w', encoding='utf-8', newline='').write(s)
print('glass', gf, 'files', dict(g))

# ── 3차: hover/overlay 잔재 ──
EXTRA = [
    (re.compile(B + r'hover:bg-white/[\d.\[\]]+ dark:hover:bg-white/[\d.\[\]]+' + A), 'hover:bg-soft'),
    (re.compile(B + r'bg-black/\[0\.0\d\] dark:bg-white/\[0\.0\d\]' + A), 'bg-subtle'),
    (re.compile(B + r'border-black/\[0\.0\d\] dark:border-white/\[0\.0\d\]' + A), 'border-line'),
    (re.compile(B + r'bg-white/9\d dark:bg-\[#0d1117\](?:/9\d)?' + A), 'bg-surface'),
    (re.compile(B + r'bg-white dark:bg-\[#0d1117\]' + A), 'bg-surface'),
]
e = collections.Counter(); ef = 0
for f in glob.glob('src/**/*.ts*', recursive=True):
    s = open(f, encoding='utf-8').read(); o = s
    for i, (rx, b) in enumerate(EXTRA):
        s, n = rx.subn(b, s); e[i] += n
    if s != o:
        ef += 1
        open(f, 'w', encoding='utf-8', newline='').write(s)
print('extra', ef, 'files', dict(e))
