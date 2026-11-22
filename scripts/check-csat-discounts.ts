// node scripts/check-csat-discounts.ts [번역 폴더] (Node 24) — 수험표 할인 데이터·상태·정렬과 번역 키 회귀 체크
// 번역 폴더를 주면 그 안의 ko.json·en.json({ csatDiscounts: ... })을, 없으면 messages/ko.json·en.json 을 본다.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATS, CHECKED, DISCOUNTS, daysLeft, isCat, sortDiscounts, statusOf, type Discount } from '../src/utils/csatDiscounts.ts'
import { isValidDate } from '../src/utils/dday.ts'

const root = join(import.meta.dirname, '..')
const dir = process.argv[2] ?? join(root, 'messages')
type Tree = Record<string, unknown>
const load = (lang: string) => (JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')) as Tree).csatDiscounts as Tree
const ko = load('ko'), en = load('en')
assert.ok(ko && en, `csatDiscounts 네임스페이스 없음: ${dir}`)

// ── 데이터
const ids = DISCOUNTS.map((d) => d.id)
assert.equal(new Set(ids).size, ids.length, 'id 중복')
assert.ok(DISCOUNTS.length >= 15 && DISCOUNTS.length <= 45, `행사 수 ${DISCOUNTS.length}`)
for (const d of DISCOUNTS) {
  assert.ok(/^[a-z][A-Za-z0-9]*$/.test(d.id), `${d.id} id 형식(camelCase)`)
  assert.ok(isCat(d.cat), `${d.id} 분류 ${d.cat}`)
  assert.ok(d.start || d.end, `${d.id} 시작·끝 둘 다 없음`)
  for (const s of [d.start, d.end]) if (s) {
    assert.ok(isValidDate(s), `${d.id} 날짜 형식 ${s}`)
    assert.ok(s >= '2026-10-01' && s <= '2027-03-31', `${d.id} ${s} 2027학년도 수험생 시즌 밖(지난해 행사?)`)
  }
  if (d.start && d.end) assert.ok(d.start <= d.end, `${d.id} 시작 > 끝`)
  assert.equal(d.checked, CHECKED, `${d.id} 확인일`)
  assert.ok(new URL(d.url).protocol === 'https:', `${d.id} 출처 https`)
  if (d.companions !== undefined) assert.ok(Number.isInteger(d.companions) && d.companions >= 1 && d.companions <= 5, `${d.id} 동반 인원`)
  if (d.internal) assert.ok(existsSync(join(root, 'src/app', d.internal, 'page.tsx')), `${d.id} 내부 링크 ${d.internal} 페이지 없음`)
}

// ── 상태·남은 날
const mk = (o: Partial<Discount>): Discount => ({ id: 'x', cat: 'park', url: 'https://example.com', checked: CHECKED, ...o })
const range = mk({ start: '2026-11-19', end: '2026-11-30' })
assert.equal(statusOf(range, '2026-11-18'), 'upcoming')
assert.equal(statusOf(range, '2026-11-19'), 'ongoing', '시작일 포함')
assert.equal(statusOf(range, '2026-11-30'), 'ongoing', '마지막 날 포함')
assert.equal(statusOf(range, '2026-12-01'), 'ended')
assert.equal(daysLeft(range, '2026-11-18'), 1, '시작까지 1일')
assert.equal(daysLeft(range, '2026-11-20'), 10, '마감까지 10일')
assert.equal(daysLeft(range, '2026-11-30'), 0, '오늘 마감')
assert.equal(daysLeft(range, '2026-12-01'), null, '끝난 행사')
const untilOnly = mk({ end: '2026-11-23' }) // 시작 미기재 = 이미 진행 중
assert.equal(statusOf(untilOnly, '2026-11-01'), 'ongoing')
assert.equal(statusOf(untilOnly, '2026-11-24'), 'ended')
const fromOnly = mk({ start: '2026-11-19' }) // 끝 미기재
assert.equal(statusOf(fromOnly, '2026-11-18'), 'upcoming')
assert.equal(statusOf(fromOnly, '2027-12-31'), 'ongoing')
assert.equal(daysLeft(fromOnly, '2026-11-20'), null, '끝 날짜 없으면 D-day 없음')
assert.equal(daysLeft(mk({ start: '2026-12-30', end: '2027-01-02' }), '2026-12-31'), 2, '해 넘김')

// ── 정렬: 진행 중(마감 임박 → 끝 없음) → 시작 전(먼저 시작) → 끝남(최근 끝)
const L = [
  mk({ id: 'endedOld', end: '2026-11-10' }),
  mk({ id: 'noEnd', start: '2026-11-01' }),
  mk({ id: 'later', start: '2026-12-10', end: '2026-12-20' }),
  mk({ id: 'late', end: '2026-12-31' }),
  mk({ id: 'endedNew', end: '2026-11-19' }),
  mk({ id: 'soon', end: '2026-11-22' }),
  mk({ id: 'next', start: '2026-12-01', end: '2027-01-01' }),
  mk({ id: 'soonTie', start: '2026-11-01', end: '2026-11-22' }),
]
assert.deepEqual(sortDiscounts(L, '2026-11-20').map((d) => d.id),
  ['soon', 'soonTie', 'late', 'noEnd', 'next', 'later', 'endedNew', 'endedOld'], '정렬(같은 마감은 목록 순서)')
assert.equal(L[0].id, 'endedOld', '원본 배열은 그대로')
// 실제 목록: 오늘(확인일) 진행 중인 게 먼저, 끝난 게 없어야 정상
const real = sortDiscounts(DISCOUNTS, CHECKED)
const st = real.map((d) => statusOf(d, CHECKED))
assert.deepEqual(st, [...st].sort((a, b) => ['ongoing', 'upcoming', 'ended'].indexOf(a) - ['ongoing', 'upcoming', 'ended'].indexOf(b)), '상태 묶음 순서')
assert.ok(!st.includes('ended'), '확인일에 이미 끝난 행사가 들어 있음')

// ── 번역: ko·en 구조 동일, 자리표시자 동일
const shape = (a: unknown, b: unknown, path: string) => {
  if (Array.isArray(a)) {
    assert.ok(Array.isArray(b), `${path} en 은 배열이 아님`)
    assert.equal(a.length, (b as unknown[]).length, `${path} 배열 길이`)
    a.forEach((x, i) => shape(x, (b as unknown[])[i], `${path}[${i}]`))
  } else if (a && typeof a === 'object') {
    assert.ok(b && typeof b === 'object' && !Array.isArray(b), `${path} en 은 객체가 아님`)
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b as object).sort(), `${path} 키`)
    for (const k of Object.keys(a)) shape((a as Tree)[k], (b as Tree)[k], `${path}.${k}`)
  } else {
    assert.equal(typeof a, 'string', `${path} 문자열`); assert.equal(typeof b, 'string', `${path} en 문자열`)
    assert.ok((a as string).trim() && (b as string).trim(), `${path} 빈 문자열`)
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    assert.deepEqual(vars(a as string), vars(b as string), `${path} 자리표시자`)
  }
}
shape(ko, en, 'csatDiscounts')

const get = (tree: Tree, key: string) => key.split('.').reduce<unknown>((o, k) => (o as Tree | undefined)?.[k], tree)
const str = (key: string) => { for (const [l, tr] of [['ko', ko], ['en', en]] as const) assert.equal(typeof get(tr, key), 'string', `${l} ${key} 없음`) }
const arr = (key: string, len?: number) => {
  for (const [l, tr] of [['ko', ko], ['en', en]] as const) {
    const v = get(tr, key)
    assert.ok(Array.isArray(v), `${l} ${key} 배열 아님`)
    if (len) assert.equal(v.length, len, `${l} ${key} 길이`)
  }
}

// 컴포넌트가 문자열 그대로 쓰는 키 전부
const src = readFileSync(join(root, 'src/components/CsatDiscounts.tsx'), 'utf8')
for (const [, raw, key] of src.matchAll(/\bt(\.raw)?\('([^']+)'/g)) (raw ? arr : str)(key)
// 동적 키
for (const c of ['all', ...CATS]) str(`cats.${c}`)
for (const d of DISCOUNTS) {
  for (const k of ['brand', 'benefit', 'condition']) str(`items.${d.id}.${k}`)
  if (d.internal) str(`items.${d.id}.internal`)
}
for (const id of Object.keys(ko.items as Tree)) assert.ok(ids.includes(id), `번역에만 있는 행사 ${id}`)
for (const s of ['prep', 'who', 'lost', 'rules']) { str(`guide.${s}.title`); arr(`guide.${s}.items`) }
arr('weekdays', 7); arr('months', 12); str('date'); str('dateYear')
for (const l of [ko, en]) for (const x of get(l, 'guide.faq.items') as { q: string; a: string }[]) assert.ok(x.q && x.a, 'FAQ q·a')

console.log(`check-csat-discounts: all passed (${DISCOUNTS.length} events, ${dir})`)
