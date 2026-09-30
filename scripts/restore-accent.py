"""디자인 코드모드가 회색으로 바꾼 '선택 상태'를 파랑 강조로 복원 (1회성, 재실행 안전).

- 대상: 삼항식 참 분기 `? '...'` 중 현재 값이 중립(bg-soft/bg-subtle 계열)인데
  디자인 개편 전 커밋(BASE)의 같은 순번 분기에는 장식 색 틴트가 있던 곳 → bg-primary-soft text-primary
- 세그먼트 컨트롤의 흰 알약(bg-surface … shadow) / 검정 칩(bg-fg text-canvas) → bg-primary text-white
python scripts/restore-accent.py [--apply]
"""
import re, glob, subprocess, sys

BASE = '4e68691'
apply = '--apply' in sys.argv
TERN = re.compile(r"\?\s*'([^'\n]*)'")
NEUTRAL = re.compile(r'^(?:bg-soft|bg-subtle)(?: (?:text-sub|border-line|border|border-2|font-medium|font-semibold|font-bold|ring-1 ring-blue-200 dark:ring-blue-800))*$')
TINT = re.compile(r'bg-(?:blue|indigo|purple|violet|green|emerald|teal|cyan|sky|pink|rose|orange|lime|fuchsia)-(?:50|100|200)\b|bg-(?:blue|indigo|purple|violet|green|emerald|teal|cyan|sky)-500/(?:10|15|20)')
SEG = [
    (re.compile(r"(?<=[\s'\"`])bg-(?:surface|white) (?:dark:bg-(?:gray-600|white/\[0\.\d+\]) )?text-(?:fg|blue-600 dark:text-blue-400|indigo-700 dark:text-white) shadow(?:-sm|-\[[^\]]+\] dark:shadow-\[[^\]]+\])?(?=[\s'\"`])"), 'bg-primary text-white shadow-sm'),
    (re.compile(r"(?<=[\s'\"`])bg-fg text-canvas(?=[\s'\"`])"), 'bg-primary text-white'),
    (re.compile(r"(?<=[\s'\"`])bg-fg border-fg !text-canvas(?=[\s'\"`])"), 'bg-primary border-primary !text-white'),
]


def accent(v: str) -> str:
    extras = [w for w in v.split() if w.startswith('font-') or w in ('border', 'border-2')]
    out = ['bg-primary-soft', 'text-primary'] + extras
    if 'border' in v:
        out.append('border-primary')
    return ' '.join(out)


tern_n = seg_n = 0
skipped = []
for f in glob.glob('src/**/*.tsx', recursive=True):
    ff = f.replace(chr(92), '/')
    s = open(f, encoding='utf-8').read(); o = s
    old = subprocess.run(['git', 'show', f'{BASE}:{ff}'], capture_output=True, text=True, encoding='utf-8').stdout
    new_t = list(TERN.finditer(s)); old_t = list(TERN.finditer(old)) if old else []
    if any(NEUTRAL.match(m.group(1).strip()) for m in new_t):
        if len(new_t) != len(old_t):
            skipped.append(ff)
        else:
            for m, om in reversed(list(zip(new_t, old_t))):
                v = m.group(1).strip()
                if NEUTRAL.match(v) and TINT.search(om.group(1)):
                    s = s[:m.start(1)] + accent(v) + s[m.end(1):]
                    tern_n += 1
    for rx, rep in SEG:
        s, n = rx.subn(rep, s); seg_n += n
    if s != o and apply:
        open(f, 'w', encoding='utf-8', newline='').write(s)
print(f'ternary accents: {tern_n}, segmented/chips: {seg_n}', '(applied)' if apply else '(dry run)')
print('skipped (branch count changed):', len(skipped))
for x in skipped[:40]:
    print('  ', x)
