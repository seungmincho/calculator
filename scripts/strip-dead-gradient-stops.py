"""className 안에 bg-gradient 없이 남은 그라데이션 색 지점(from-/via-/to-)을 제거 — 토스 디자인 전환 잔재.
python scripts/strip-dead-gradient-stops.py [--dry]  (재실행 안전)"""
import re, sys, pathlib
STOP = re.compile(r'^(?:[a-z-]+:)*(?:from|via|to)-[a-z]+-\d+(?:/\d+)?$')
CLS = re.compile(r'className=(?:"([^"]*)"|\{`([^`]*)`\})')
dry = '--dry' in sys.argv
total = 0
for p in pathlib.Path('src/components').rglob('*.tsx'):
    s = p.read_text(encoding='utf-8')
    def fix(m):
        global n
        body = m.group(1) if m.group(1) is not None else m.group(2)
        if 'gradient' in body or 'bg-linear' in body or '${' in body:
            return m.group(0)
        toks = body.split(' ')
        keep = [t for t in toks if not STOP.match(t)]
        if len(keep) == len(toks):
            return m.group(0)
        n += len(toks) - len(keep)
        new = ' '.join(keep)
        return f'className="{new}"' if m.group(1) is not None else 'className={`' + new + '`}'
    n = 0
    out = CLS.sub(fix, s)
    if n:
        total += n
        print(f'{n:3} {p}')
        if not dry: p.write_text(out, encoding='utf-8')
print('removed', total)
