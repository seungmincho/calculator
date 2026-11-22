// node scripts/check-mandalart.ts [messages 폴더] (Node 24) — 만다라트 좌표 매핑·진행률·직렬화·압축 링크·저장·줄바꿈·템플릿 칸 수 회귀 체크
// 템플릿은 <폴더>/ko.json·en.json 의 mandalart.templates.data 에서 읽는다(기본 messages/). 기대값은 손으로 계산했다
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cellOf, toBlock, toGrid, actIndex, textOf, withCell, clean, isEmpty, progress, pct, serialize, deserialize, sameChart,
  saveText, parseSaved, encode, decode, fromTemplate, wrapText,
  EMPTY, NO_DONE, RING, BLOCK_ORDER, CELL_MAX, M_MAX, TEMPLATE_IDS, EXAMPLE_ID, type Chart,
} from '../src/utils/mandalart.ts'

let n = 0
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); n++ }
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++ }

// ── 9×9 좌표 ↔ 블록·칸
eq(toBlock(0, 0), { b: 0, p: 0 }, '왼쪽 위')
eq(toBlock(4, 4), { b: 4, p: 4 }, '한가운데')
eq(toBlock(8, 8), { b: 8, p: 8 }, '오른쪽 아래')
eq(toBlock(3, 5), { b: 4, p: 2 }, '행3 열5 → 가운데 블록 오른쪽 위 칸')
eq(toBlock(1, 4), { b: 1, p: 4 }, '행1 열4 → 위 가운데 블록의 가운데')
eq(toBlock(5, 3), { b: 4, p: 6 }, '행5 열3 → 가운데 블록 왼쪽 아래 칸')
eq(toGrid(5, 3), { r: 4, c: 6 }, '블록5 칸3 → 행4 열6')
for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
  const { b, p } = toBlock(r, c)
  eq(toGrid(b, p), { r, c }, `왕복 ${r},${c}`)
}
eq(cellOf(4, 4), { kind: 'core' }, '가운데 = 핵심')
eq(cellOf(4, 0), { kind: 'goal', g: 0 }, '가운데 블록 왼쪽 위 = 세부 1')
eq(cellOf(4, 2), { kind: 'goal', g: 2 }, '가운데 블록 오른쪽 위 = 세부 3')
eq(cellOf(4, 5), { kind: 'goal', g: 4 }, '가운데 블록 오른쪽 = 세부 5(4 를 건너뜀)')
eq(cellOf(8, 4), { kind: 'goal', g: 7 }, '오른쪽 아래 블록 가운데 = 세부 8')
eq(cellOf(0, 0), { kind: 'act', g: 0, k: 0 }, '왼쪽 위 칸 = 세부 1 실천 1')
eq(cellOf(5, 3), { kind: 'act', g: 4, k: 3 }, '블록5 칸3 = 세부 5 실천 4')
eq(actIndex(4, 3), 35, '4×8+3')
eq(actIndex(7, 7), 63, '마지막 실천')
eq(BLOCK_ORDER, [4, 0, 1, 2, 3, 5, 6, 7, 8], '이동 순서: 가운데 먼저')
{
  // 81칸 = 핵심 1 + 세부 16(가운데 블록 8 + 바깥 가운데 8) + 실천 64. 실천은 한 번씩, 세부 g 는 두 곳(가운데 블록 RING[g], 블록 RING[g] 의 가운데)
  const acts = new Set<number>(), goals: string[][] = Array.from({ length: 8 }, () => [])
  let core = 0
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const { b, p } = toBlock(r, c), cell = cellOf(b, p)
    if (cell.kind === 'core') core++
    else if (cell.kind === 'goal') goals[cell.g].push(`${b}:${p}`)
    else acts.add(actIndex(cell.g, cell.k))
  }
  eq(core, 1, '핵심 1칸')
  eq(acts.size, 64, '실천 64칸 모두 한 번씩')
  goals.forEach((at, g) => eq(at.sort(), [`4:${RING[g]}`, `${RING[g]}:4`].sort(), `세부 ${g + 1} 두 곳`))
}

// ── 칸 쓰기·정리
eq(clean('아침\n운동\t하기'), '아침 운동 하기', '줄바꿈·탭 → 공백')
eq(clean('가'.repeat(40)).length, CELL_MAX, '30자에서 자름')
{
  let c = withCell(EMPTY, { kind: 'core' }, '합격')
  c = withCell(c, { kind: 'goal', g: 2 }, '문제 풀이')
  c = withCell(c, { kind: 'act', g: 2, k: 5 }, '하루 50문제')
  eq(textOf(c, cellOf(4, 4)), '합격', '핵심')
  eq(textOf(c, cellOf(4, 2)), '문제 풀이', '세부 3 — 가운데 블록')
  eq(textOf(c, cellOf(2, 4)), '문제 풀이', '세부 3 — 바깥 블록 가운데(같은 데이터)')
  eq(c.acts[21], '하루 50문제', '2×8+5')
  eq(EMPTY.acts[21], '', 'EMPTY 는 바뀌지 않는다')
  ok(isEmpty(EMPTY), '빈 표')
  ok(isEmpty(withCell(EMPTY, { kind: 'act', g: 0, k: 0 }, '   ')), '공백만 있으면 빈 표')
  ok(!isEmpty(c), '채운 표')
}

// ── 진행률: 채운 실천 칸 중 체크한 칸. 빈 칸의 체크는 세지 않는다
{
  let c = EMPTY
  for (const i of [0, 1, 2, 8]) c = { ...c, acts: c.acts.map((x, j) => (j === i ? `실천${i}` : x)) }
  const done = NO_DONE.map((_, i) => [0, 2, 8, 5].includes(i))
  const pr = progress(c, done)
  eq([pr.done, pr.filled], [3, 4], '체크 3 / 채움 4 (5번은 빈 칸)')
  eq(pr.goals[0], { done: 2, filled: 3 }, '세부 1')
  eq(pr.goals[1], { done: 1, filled: 1 }, '세부 2')
  eq(pr.goals[7], { done: 0, filled: 0 }, '세부 8')
  eq(pct(pr), 75, '3/4')
  eq(pct(pr.goals[0]), 67, '2/3 = 66.7 → 67')
  eq(pct({ done: 0, filled: 0 }), 0, '채운 칸 없으면 0')
}

// ── 직렬화 왕복
const tricky: Chart = {
  core: '따옴표 " 역슬래시 \\ 이모지 🎯',
  goals: ['a', '', 'c', '', '', '', '', ''],
  acts: Array.from({ length: 64 }, (_, i) => (i === 63 ? '마지막' : i % 9 === 0 ? `칸${i}` : '')),
}
for (const c of [EMPTY, tricky]) eq(deserialize(serialize(c)), c, `왕복 ${c.core || 'EMPTY'}`)
eq(serialize(EMPTY), '[]', '빈 표는 빈 배열')
eq(serialize(withCell(EMPTY, { kind: 'core' }, '핵심')), '["핵심"]', '끝의 빈 칸은 뺀다')
eq(JSON.parse(serialize(tricky)).length, 73, '마지막 칸이 차 있으면 73개')
eq(deserialize('["' + 'a'.repeat(40) + '"]')?.core.length, CELL_MAX, '받은 값도 30자에서 자름')
for (const bad of ['x', '{}', '[1]', '"a"', JSON.stringify(Array(74).fill('a'))]) eq(deserialize(bad), null, `잘못된 값 ${bad.slice(0, 12)}`)
ok(sameChart(EMPTY, deserialize('[]') as Chart), 'sameChart')

// ── localStorage 형식
{
  const done = NO_DONE.map((_, i) => i === 0 || i === 63)
  eq(parseSaved(saveText(tricky, done)), { chart: tricky, done }, '저장 왕복')
  eq(JSON.parse(saveText(tricky, done)).done, [0, 63], '체크는 번호 목록')
  eq(parseSaved(null), null, '저장 없음')
  eq(parseSaved('깨진 값'), null, '깨진 JSON')
  eq(parseSaved('{"cells":[1]}'), null, '칸이 문자열이 아님')
  eq(parseSaved('{"cells":["a"],"done":[-1,64,1.5,"2",3]}')?.done.filter(Boolean).length, 1, '범위 밖·정수 아닌 체크는 버린다')
}

// ── 공유 링크(deflate-raw + base64url)
eq(await encode(EMPTY), '', '빈 표는 쿼리 없음')
eq(await encode(withCell(EMPTY, { kind: 'act', g: 0, k: 0 }, '  ')), '', '공백만 있어도 쿼리 없음')
{
  const m = await encode(tricky)
  ok(/^[A-Za-z0-9_-]+$/.test(m), 'base64url 문자만')
  eq(await decode(m), tricky, '압축 왕복')
}
for (const bad of ['', '!!!', 'AAAA', 'a'.repeat(M_MAX + 1)]) eq(await decode(bad), null, `잘못된 링크 ${bad.slice(0, 8) || '(빈 값)'}`)

// ── 줄바꿈(PNG): 글자 하나 = 폭 1
const len = (s: string) => s.length
eq(wrapText('새해 아침 운동하기', 5, 3, len), ['새해 아침', '운동하기'], '띄어쓰기에서 먼저 끊는다')
eq(wrapText('가나다라마바사아자차', 4, 3, len), ['가나다라', '마바사아', '자차'], '긴 단어는 글자 단위')
eq(wrapText('가나다라마바사아자차', 4, 2, len), ['가나다라', '마바사…'], '넘치면 마지막 줄 …')
eq(wrapText('   ', 5, 3, len), [], '빈 칸')
eq(wrapText('ab cdefgh', 4, 3, len), ['ab', 'cdef', 'gh'], '영문 긴 단어')

// ── 템플릿: ko·en 모두 핵심 1·세부 8·실천 8×8, 빈 칸 없이 30자 이내
const dir = process.argv[2] ?? fileURLToPath(new URL('../messages', import.meta.url))
const load = (lang: string) => {
  const ns = JSON.parse(readFileSync(join(dir, `${lang}.json`), 'utf8')).mandalart
  assert.ok(ns, `${dir}/${lang}.json 에 mandalart 네임스페이스가 없음 — 병합 전이면 스크래치패드 폴더를 인자로`)
  return ns
}
const ko = load('ko'), en = load('en')
const cellOk = (s: unknown) => typeof s === 'string' && s.trim() !== '' && s.length <= CELL_MAX && clean(s) === s
for (const [lang, ns] of [['ko', ko], ['en', en]] as const) {
  for (const id of TEMPLATE_IDS) ok(typeof ns.templates.names[id] === 'string', `${lang} 템플릿 이름 ${id}`)
  for (const id of TEMPLATE_IDS.filter((x) => x !== 'blank')) {
    const raw = ns.templates.data[id]
    const tag = `${lang} ${id}`
    ok(cellOk(raw.core), `${tag} 핵심 "${raw.core}"`)
    eq(raw.goals.length, 8, `${tag} 세부 8개`)
    raw.goals.forEach((s: unknown) => ok(cellOk(s), `${tag} 세부 "${s}"`))
    eq(raw.acts.length, 8, `${tag} 실천 8묶음`)
    raw.acts.forEach((row: unknown[], g: number) => {
      eq(row.length, 8, `${tag} 세부 ${g + 1} 실천 8개`)
      row.forEach((s) => ok(cellOk(s), `${tag} 실천 "${s}" (${String(s).length}자)`))
    })
    const c = fromTemplate(raw)
    ok([c.core, ...c.goals, ...c.acts].every((s) => s !== ''), `${tag} 73칸 모두 채움`)
    eq(deserialize(serialize(c)), c, `${tag} 직렬화 왕복`)
    eq(await decode(await encode(c)), c, `${tag} 압축 왕복`)
    if (lang === 'ko' && id === EXAMPLE_ID) console.log(`  예시(${id}) 링크 m 길이: ${(await encode(c)).length}자`)
  }
}
ok(isEmpty(fromTemplate(null)) && isEmpty(fromTemplate({ goals: 'x', acts: [1] })), '모양이 어긋난 템플릿은 빈 칸')

// ── ko·en 키 구조가 같은지(배열은 길이까지)
const shape = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(shape) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)]).sort()) : typeof v
eq(shape(en), shape(ko), 'ko·en 키 구조')

console.log(`check-mandalart: ${n} checks passed`)
