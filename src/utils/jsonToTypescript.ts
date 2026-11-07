// JSON → TypeScript 선언 변환(순수 로직). 체크: node scripts/check-json-to-typescript.ts

export type Style = 'interface' | 'type'
export interface Options { rootName: string; style: Style; exportKw: boolean; readonly: boolean }
export const DEFAULT_OPTIONS: Options = { rootName: 'Root', style: 'interface', exportKw: true, readonly: false }

export type Result =
  | { ok: true; code: string; names: string[] }
  | { ok: false; message: string; line?: number; column?: number }

type Prim = 'string' | 'number' | 'boolean' | 'null'
interface Field { type: Shape; optional: boolean }
/** 한 위치에 올 수 있는 값들의 합집합. 아무것도 없으면 unknown(빈 배열의 원소). */
interface Shape { prims: Set<Prim>; obj?: Map<string, Field>; arr?: Shape }

const PRIMS: Prim[] = ['string', 'number', 'boolean', 'null']
const IDENT = /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u
// 내장 타입 이름은 가리면 출력 자체(Record<…>)나 쓰는 쪽이 깨진다 → 번호를 붙인다.
const BUILTIN = new Set(['Array', 'Object', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Function', 'Date', 'Error', 'RegExp', 'Math', 'JSON',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract'])
// export 가 없으면 전역 스크립트라 같은 이름의 DOM interface 와 합쳐진다 → 그때만 피한다.
const DOM = new Set(['Event', 'Node', 'Element', 'Document', 'Window', 'Location', 'Navigator', 'History', 'Storage', 'Response', 'Request', 'Headers',
  'File', 'Blob', 'URL', 'Image', 'Audio', 'Text', 'Comment', 'Range', 'Selection', 'Screen', 'Option', 'Animation', 'Notification'])

function infer(v: unknown): Shape {
  if (v === null) return { prims: new Set(['null']) }
  if (Array.isArray(v)) return { prims: new Set(), arr: v.reduce<Shape>((acc, x) => merge(acc, infer(x)), { prims: new Set() }) }
  if (typeof v === 'object') return { prims: new Set(), obj: new Map(Object.entries(v as object).map(([k, x]) => [k, { type: infer(x), optional: false }])) }
  return { prims: new Set([typeof v as Prim]) }
}

/** 배열 원소끼리 합친다: 한쪽에만 있는 키는 optional, 값 타입은 합집합. */
function merge(a: Shape, b: Shape): Shape {
  let obj = a.obj ?? b.obj
  if (a.obj && b.obj) {
    obj = new Map()
    for (const [k, f] of a.obj) {
      const g = b.obj.get(k)
      obj.set(k, g ? { type: merge(f.type, g.type), optional: f.optional || g.optional } : { ...f, optional: true })
    }
    for (const [k, g] of b.obj) if (!a.obj.has(k)) obj.set(k, { ...g, optional: true })
  }
  return { prims: new Set([...a.prims, ...b.prims]), obj, arr: a.arr && b.arr ? merge(a.arr, b.arr) : a.arr ?? b.arr }
}

/** 키 → PascalCase 타입 이름. snake_case·kebab-case 를 이어 붙이고, 숫자로 시작하면 _ 를 앞에 붙인다. */
export function pascal(s: string): string {
  const name = s.split(/[^\p{ID_Continue}]+|_/u).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('')
  return name && !/^\p{ID_Start}/u.test(name) ? `_${name}` : name
}

/** 단순 영어 복수형만: categories→category, boxes→box, items→item. 아니면 그대로. */
// ponytail: 흔한 API 키만 다루는 단순 규칙 — 불규칙 복수(people·children 등)는 그대로 둔다
const SAME = /(series|species|news|status|bus|gas|alias|canvas)$/i
export function singular(w: string): string {
  if (SAME.test(w)) return w
  if (/(movie|cookie|calorie|selfie|rookie|zombie|tie|pie)s$/i.test(w)) return w.slice(0, -1)
  if (/(us|as)es$/i.test(w)) return w.slice(0, -2)
  if (/[^aeiou]ies$/i.test(w)) return w.slice(0, -3) + (w.endsWith('IES') ? 'Y' : 'y')
  if (/(ss|sh|ch|x|z)es$/i.test(w)) return w.slice(0, -2)
  if (w.length > 2 && /[^siu]s$/i.test(w)) return w.slice(0, -1)
  return w
}
const elemHint = (h: string) => (singular(h) !== h ? singular(h) : `${h}Item`)

export function generate(value: unknown, opts: Options): { code: string; names: string[] } {
  const root = pascal(opts.rootName.trim()) || 'Root'
  const used = new Set([root])
  const decls: ({ name: string; body?: string; alias?: string } | null)[] = []
  const byBody = new Map<string, string>()
  const ro = opts.readonly ? 'readonly ' : ''

  const reserve = (base: string) => {
    let n = base
    for (let i = 2; used.has(n) || BUILTIN.has(n) || (!opts.exportKw && DOM.has(n)); i++) n = `${base}${i}`
    used.add(n)
    return n
  }
  // 선언 순서는 처음 나온 순서(부모 먼저). 본문이 같은 객체는 앞 이름을 다시 쓴다.
  const objName = (fields: Map<string, Field>, hint: string, fixed?: string): string => {
    if (fields.size === 0) return 'Record<string, unknown>'
    const slot = decls.push(null) - 1
    const own = fixed ?? reserve(hint)
    const body = [...fields].map(([k, f]) =>
      `  ${ro}${IDENT.test(k) ? k : JSON.stringify(k)}${f.optional ? '?' : ''}: ${typeStr(f.type, pascal(k) || `${own}Value`)};`).join('\n')
    const dup = fixed ? undefined : byBody.get(body)
    if (dup) { used.delete(own); return dup }
    byBody.set(body, own)
    decls[slot] = { name: own, body }
    return own
  }
  const parts = (s: Shape, hint: string): string[] => {
    const out: string[] = []
    if (s.obj) out.push(objName(s.obj, hint))
    if (s.arr) {
      const el = parts(s.arr, elemHint(hint))
      out.push(`${el.length === 0 ? 'unknown' : el.length === 1 ? el[0] : `(${el.join(' | ')})`}[]`)
    }
    return out.concat(PRIMS.filter(p => s.prims.has(p)))
  }
  const typeStr = (s: Shape, hint: string) => parts(s, hint).join(' | ') || 'unknown'

  const shape = infer(value)
  if (shape.obj && shape.obj.size > 0) objName(shape.obj, root, root)
  else {
    const slot = decls.push(null) - 1
    // 최상위 배열 원소: 루트가 복수형이면 단수형(Users → User), 아니면 Item
    decls[slot] = { name: root, alias: typeStr(shape, singular(root) !== root ? root : 'Items') }
  }

  const kw = opts.exportKw ? 'export ' : ''
  const done = decls.filter(d => d !== null)
  const code = done.map(d =>
    d.alias !== undefined ? `${kw}type ${d.name} = ${d.alias};`
      : opts.style === 'interface' ? `${kw}interface ${d.name} {\n${d.body}\n}` : `${kw}type ${d.name} = {\n${d.body}\n};`).join('\n\n')
  return { code: `${code}\n`, names: done.map(d => d.name) }
}

/**
 * JSON.parse 메시지에서 행·열을 꺼낸다. V8 "position N (line L column C)", Firefox "line L column C",
 * V8 "Unexpected token 'x', ...\"<앞 10자 + 토큰부터 10자>\"..." 는 조각 위치로 찾는다. Safari 는 위치가 없다.
 */
export function parseError(src: string, e: unknown): { message: string; line?: number; column?: number } {
  const message = e instanceof Error ? e.message : String(e)
  const lc = /line (\d+) column (\d+)/i.exec(message)
  if (lc) return { message, line: Number(lc[1]), column: Number(lc[2]) }
  const p = /position (\d+)/i.exec(message)
  const ctx = /^Unexpected token .*?, (\.\.\.)?"([\s\S]*)"(\.\.\.)? is not valid JSON$/.exec(message)
  const at = ctx ? src.indexOf(ctx[2]) : -1
  const pos = p ? Number(p[1])
    : at >= 0 && ctx?.[1] ? at + 10
      : at === 0 && ctx?.[3] ? ctx[2].length - 10
        : /end of JSON input/i.test(message) ? src.trimEnd().length
          : -1
  if (pos < 0) return { message }
  const before = src.slice(0, pos)
  return { message, line: before.split('\n').length, column: before.length - before.lastIndexOf('\n') }
}

export function convert(src: string, opts: Options): Result {
  let value: unknown
  try { value = JSON.parse(src) } catch (e) { return { ok: false, ...parseError(src, e) } }
  try { return { ok: true, ...generate(value, opts) } } catch (e) { return { ok: false, message: e instanceof Error ? e.message : String(e) } } // 너무 깊은 중첩 등
}
