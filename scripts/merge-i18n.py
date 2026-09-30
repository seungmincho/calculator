"""python scripts/merge-i18n.py <namespace> <keys.json> [--overwrite]
keys.json = {"ko": {...}, "en": {...}} — 원본 서식을 유지하며 top-level namespace 안에 재귀 병합.
기본: 기존 키는 유지(충돌 출력). --overwrite: 충돌 값(문자열/배열/객체)을 새 값으로 교체.
"""
import json, sys

ns, path = sys.argv[1], sys.argv[2]
overwrite = '--overwrite' in sys.argv
data = json.load(open(path, encoding='utf-8'))


def value_end(lines, i):
    """lines[i] = '<indent>"key": <value>' 의 값이 끝나는 줄 index"""
    depth = 0
    in_str = False
    esc = False
    started = False
    for n in range(i, len(lines)):
        line = lines[n]
        start_col = line.index(':') + 1 if n == i else 0
        for ch in line[start_col:]:
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


def block_end(lines, start):
    return value_end(lines, start)


def find_child(lines, start, end, key, indent):
    pre = ' ' * indent + json.dumps(key, ensure_ascii=False) + ': '
    for i in range(start + 1, end):
        if lines[i].startswith(pre):
            return i
    return None


def dump_value(v, indent):
    dumped = json.dumps(v, ensure_ascii=False, indent=2).split('\n')
    return [dumped[0]] + [' ' * indent + x for x in dumped[1:]]


def merge(lines, start, obj, new, indent):
    inserts = []
    for k, v in new.items():
        if k in obj:
            if isinstance(obj[k], dict) and isinstance(v, dict):
                end = block_end(lines, start)
                ci = find_child(lines, start, end, k, indent)
                merge(lines, ci, obj[k], v, indent + 2)
            elif obj[k] != v:
                if overwrite:
                    end = block_end(lines, start)
                    ci = find_child(lines, start, end, k, indent)
                    ve = value_end(lines, ci)
                    comma = lines[ve].rstrip().endswith(',')
                    body = dump_value(v, indent)
                    body[0] = ' ' * indent + json.dumps(k, ensure_ascii=False) + ': ' + body[0]
                    if comma:
                        body[-1] += ','
                    lines[ci:ve + 1] = body
                    print('  overwrote:', k)
                else:
                    print('  CONFLICT (kept existing):', k)
            continue
        body = dump_value(v, indent)
        inserts.append(' ' * indent + json.dumps(k, ensure_ascii=False) + ': ' + '\n'.join(body) + ',')
    if inserts:
        body = '\n'.join(inserts).split('\n')
        end = block_end(lines, start)
        if end == start + 1:
            body[-1] = body[-1].rstrip(',')
        lines[start + 1:start + 1] = body


for lang, new in data.items():
    p = f'messages/{lang}.json'
    lines = open(p, encoding='utf-8').read().split('\n')
    d = json.loads('\n'.join(lines))
    start = next(i for i, l in enumerate(lines) if l.startswith('  ' + json.dumps(ns) + ': {'))
    merge(lines, start, d[ns], new, 4)
    out = '\n'.join(lines)
    json.loads(out)
    open(p, 'w', encoding='utf-8', newline='').write(out)
    print(lang, 'merged')
