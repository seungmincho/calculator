"""python scripts/delete-i18n-keys.py <ns.path.to.key> [...] [--dry-run]
messages/ko.json·en.json 에서 키를 원본 서식 그대로 지운다(json.dumps 재작성 금지 — 수만 줄 diff 방지).
각 언어에서 없는 키는 건너뛰고, 결과가 '원본 dict 에서 그 키만 뺀 것'과 같은지 확인한 뒤 저장한다.
"""
import json, sys

paths = [a for a in sys.argv[1:] if not a.startswith('--')]
dry = '--dry-run' in sys.argv


def value_end(lines, i):
    """lines[i] = '<indent>"key": <value>' 의 값이 끝나는 줄 index (merge-i18n.py 와 같은 방식)"""
    depth, in_str, esc, started = 0, False, False, False
    for n in range(i, len(lines)):
        line = lines[n]
        for ch in line[(line.index(':') + 1 if n == i else 0):]:
            if in_str:
                if esc: esc = False
                elif ch == '\\': esc = True
                elif ch == '"': in_str = False
                continue
            if ch == '"': in_str = True; started = True
            elif ch in '[{': depth += 1; started = True
            elif ch in ']}': depth -= 1
            elif not ch.isspace() and ch != ',': started = True
        if started and depth == 0 and not in_str:
            return n
    raise ValueError('value end not found')


def locate(lines, keys):
    """키 경로의 시작 줄 — 들여쓰기 2칸씩(최상위 = 2)"""
    start, end = 0, len(lines) - 1
    for depth, k in enumerate(keys):
        pre = ' ' * (2 * depth + 2) + json.dumps(k, ensure_ascii=False) + ': '
        i = next((n for n in range(start + 1, end + 1) if lines[n].startswith(pre)), None)
        if i is None:
            return None
        start, end = i, value_end(lines, i)
    return start


for lang in ('ko', 'en'):
    p = f'messages/{lang}.json'
    lines = open(p, encoding='utf-8').read().split('\n')
    expected = json.loads('\n'.join(lines))
    removed = 0
    for path in paths:
        keys = path.split('.')
        i = locate(lines, keys)
        if i is None:
            print(f'{lang}: skip (없음) {path}')
            continue
        e = value_end(lines, i)
        last = not lines[e].rstrip().endswith(',')
        del lines[i:e + 1]
        if last:  # 마지막 항목을 지웠으면 앞 항목의 쉼표를 뗀다 (앞 항목이 없으면 빈 객체)
            prev = i - 1
            if lines[prev].rstrip().endswith(','):
                lines[prev] = lines[prev].rstrip()[:-1]
        obj = expected
        for k in keys[:-1]:
            obj = obj[k]
        del obj[keys[-1]]
        removed += 1
    out = '\n'.join(lines)
    assert json.loads(out) == expected, f'{lang}: 결과가 예상 dict 와 다름'
    if not dry:
        open(p, 'w', encoding='utf-8', newline='').write(out)
    print(f'{lang}: {removed}개 삭제' + (' (dry-run)' if dry else ''))
