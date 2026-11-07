// JSON → TypeScript 변환 회귀 체크: node scripts/check-json-to-typescript.ts
import assert from 'node:assert/strict'
import { convert, parseError, singular, pascal, DEFAULT_OPTIONS, type Options } from '../src/utils/jsonToTypescript.ts'

const ts = (json: unknown, o: Partial<Options> = {}) => {
  const r = convert(typeof json === 'string' ? json : JSON.stringify(json), { ...DEFAULT_OPTIONS, ...o })
  assert.ok(r.ok, `convert failed: ${!r.ok && r.message}`)
  return r.ok ? r.code : ''
}

// 중첩 객체 → 별도 선언, 부모 먼저
assert.equal(ts({ id: 1, user: { name: 'a', address: { city: 'Seoul' } } }), `export interface Root {
  id: number;
  user: User;
}

export interface User {
  name: string;
  address: Address;
}

export interface Address {
  city: string;
}
`)

// 배열 원소의 빠진 키 → optional, null 섞임 → 합집합, null 만 → null
assert.equal(ts({ items: [{ id: 1, tag: 'x', note: null }, { id: 2, tag: null, note: null }, { id: 3 }] }), `export interface Root {
  items: Item[];
}

export interface Item {
  id: number;
  tag?: string | null;
  note?: null;
}
`)
// 중첩 배열 안 객체끼리도 합쳐진다
assert.match(ts([{ a: { x: 1 } }, { a: { y: 'z' } }]), /x\?: number;\n {2}y\?: string;/)

// 원소 타입 합집합, 빈 배열, 중첩 배열
assert.equal(ts({ mixed: [1, 'a', null], empty: [], grid: [[1, 2], [3]], deep: [[]], objs: [{ a: 1 }, 2] }), `export interface Root {
  mixed: (string | number | null)[];
  empty: unknown[];
  grid: number[][];
  deep: unknown[][];
  objs: (Obj | number)[];
}

export interface Obj {
  a: number;
}
`)

// 식별자가 아닌 키는 따옴표, 한글 키는 그대로
assert.equal(ts({ 'first-name': 'a', '2fa': true, 'a b': 1, $ok: 1, 이름: 'x', '': 0 }), `export interface Root {
  "first-name": string;
  "2fa": boolean;
  "a b": number;
  $ok: number;
  이름: string;
  "": number;
}
`)

// 최상위 배열·원시값
assert.equal(ts([{ id: 1 }, { id: 2, name: 'b' }]), 'export type Root = Item[];\n\nexport interface Item {\n  id: number;\n  name?: string;\n}\n')
assert.equal(ts([{ id: 1 }], { rootName: 'users' }), 'export type Users = User[];\n\nexport interface User {\n  id: number;\n}\n')
assert.equal(ts('42'), 'export type Root = number;\n')
assert.equal(ts('null'), 'export type Root = null;\n')
assert.equal(ts('[]'), 'export type Root = unknown[];\n')
assert.equal(ts('{}'), 'export type Root = Record<string, unknown>;\n')
assert.equal(ts({ meta: {} }), 'export interface Root {\n  meta: Record<string, unknown>;\n}\n')

// 이름 충돌 → 번호, 전역 타입 이름 피하기, 같은 모양은 한 번만
const clash = ts({ user: { id: 1 }, post: { user: { name: 'x' } }, root: { a: 1 }, date: { y: 1 } })
assert.match(clash, /interface User \{\n {2}id: number;/)
assert.match(clash, /interface User2 \{\n {2}name: string;/)
assert.match(clash, /post: Post;/)
assert.match(clash, /root: Root2;/)
assert.match(clash, /date: Date2;/)
assert.match(ts({ record: { a: 1 }, meta: {} }), /record: Record2;\n {2}meta: Record<string, unknown>;/) // 출력의 Record<…> 를 가리지 않게
assert.match(ts({ comments: [{ a: 1 }] }), /comments: Comment\[\];/) // export 모듈에선 DOM 이름 그대로
assert.match(ts({ comments: [{ a: 1 }] }, { exportKw: false }), /comments: Comment2\[\];/) // 전역 스크립트에선 DOM interface 와 합쳐지지 않게
const dedup = ts({ billing: { street: 'a', zip: '1' }, shipping: { street: 'b', zip: '2' }, list: [{ street: 'c', zip: '3' }] })
assert.equal(dedup.match(/interface /g)?.length, 2)
assert.match(dedup, /shipping: Billing;\n {2}list: Billing\[\];/)

// 옵션: type 스타일·export 끄기·readonly·루트 이름
assert.equal(ts({ a: { b: 1 } }, { style: 'type', exportKw: false, readonly: true, rootName: 'api response' }), `type ApiResponse = {
  readonly a: A;
};

type A = {
  readonly b: number;
};
`)

// 이름 규칙
assert.equal(pascal('user_profile'), 'UserProfile')
assert.equal(pascal('user-profile'), 'UserProfile')
assert.equal(pascal('userProfile'), 'UserProfile')
assert.equal(pascal('2fa'), '_2fa')
assert.equal(pascal('!!!'), '')
for (const [p, s] of [['Items', 'Item'], ['Categories', 'Category'], ['Boxes', 'Box'], ['Addresses', 'Address'], ['Matches', 'Match'], ['Status', 'Status'], ['Data', 'Data'], ['Analysis', 'Analysis'], ['IDS', 'ID']]) assert.equal(singular(p), s)
assert.match(ts({ data: [{ a: 1 }] }), /data: DataItem\[\];/)
assert.match(ts({ '!!!': { a: 1 } }), /"!!!": RootValue;/)

// 잘못된 JSON → 행·열
const bad = convert('{\n  "a": 1,\n  "b": \n}', DEFAULT_OPTIONS)
assert.ok(!bad.ok)
if (!bad.ok) { assert.equal(bad.line, 4); assert.equal(bad.column, 1) }
const trailing = convert('{"a": 1,}', DEFAULT_OPTIONS)
assert.ok(!trailing.ok && trailing.line === 1 && trailing.column === 9, JSON.stringify(trailing))
const at = (src: string) => { const r = convert(src, DEFAULT_OPTIONS); assert.ok(!r.ok); return r.ok ? '' : `${r.line}:${r.column}` }
assert.equal(at('{\n  "name": "aaaaaaaaaaaaaaaaaaaa",\n  "b": ,\n  "c": "cccccccccccccccccccc"\n}'), '3:8') // V8 앞뒤 조각
assert.equal(at('{"b": } , "cccccccccccccccccccccccc": 2}'), '1:7') // V8 앞 조각(처음부터)
assert.equal(at('{\n  "a": [1, 2'), '2:13') // 끝에서 끊김
assert.equal(at('{a: 1}'), '1:2')
assert.ok(!convert('', DEFAULT_OPTIONS).ok)
assert.equal(parseError('', new Error('JSON.parse: unexpected character at line 3 column 7 of the JSON data')).line, 3) // Firefox
assert.equal(parseError('{}', new SyntaxError("JSON Parse error: Expected '}'")).line, undefined) // Safari

// 큰 입력도 빠르게
const big = JSON.stringify({ rows: Array.from({ length: 20000 }, (_, i) => ({ id: i, name: `n${i}`, ...(i % 2 ? { extra: [i] } : {}) })) })
const t0 = performance.now()
assert.match(ts(big), /extra\?: number\[\];/)
assert.ok(performance.now() - t0 < 2000)

console.log('json-to-typescript: ok')
