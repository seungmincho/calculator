export type JsonTreeSegment = { readonly kind: 'key'; readonly key: string } | { readonly kind: 'index'; readonly index: number }
export type JsonTreePath = readonly JsonTreeSegment[]
export type JsonTreeResolved =
  | { ok: true; value: unknown; parent: object | null; property: string | number | null }
  | { ok: false; reason: 'invalidPath' | 'wrongContainer' | 'missing' }
export type JsonTreeValueResult = { ok: true; text: string } | { ok: false; reason: 'nonFinite' | 'notJsonValue' | 'serializationFailed' }
export type JsonTreePathResult = { ok: true; expression: string } | { ok: false; reason: 'unsupported' | 'unavailable' }
export type JsonTreePathStatus = JsonTreePathResult | { checking: true }
type JsonTreeRoot = null | boolean | number | string | object
export interface JsonTreePathEngine {
  toPathArray: (expression: string) => unknown
  evaluate: (options: { path: string; json: JsonTreeRoot; eval: false; wrap: true; resultType: 'all' }) => unknown
}

function validPath(path: JsonTreePath): boolean {
  return Array.isArray(path) && path.every(part => part && (part.kind === 'key' ? typeof part.key === 'string' : part.kind === 'index' && Number.isSafeInteger(part.index) && part.index >= 0))
}

/** Root, empty keys, numeric object keys and array indices have different identities. */
export function jsonTreeNodeId(path: JsonTreePath): string {
  if (!validPath(path)) throw new Error('invalidPath')
  return JSON.stringify(path.map(part => part.kind === 'key' ? ['key', part.key] : ['index', part.index]))
}

/** Resolve only own data properties. No truthiness checks or inherited key traversal. */
export function resolveJsonTreeNode(root: unknown, path: JsonTreePath): JsonTreeResolved {
  if (!validPath(path)) return { ok: false, reason: 'invalidPath' }
  let value = root, parent: object | null = null, property: string | number | null = null
  for (const part of path) {
    if (value === null || typeof value !== 'object' || (part.kind === 'index' ? !Array.isArray(value) : Array.isArray(value))) return { ok: false, reason: 'wrongContainer' }
    const key = part.kind === 'key' ? part.key : part.index
    if (part.kind === 'index' && part.index >= (value as unknown[]).length) return { ok: false, reason: 'missing' }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return { ok: false, reason: 'missing' }
    parent = value; property = key; value = descriptor.value
  }
  return { ok: true, value, parent, property }
}

/** RFC 6901 string form: the root is '', while an empty object key is '/'. */
export function jsonTreePointer(path: JsonTreePath): string {
  if (!validPath(path)) throw new Error('invalidPath')
  return path.map(part => '/' + (part.kind === 'key' ? part.key.replaceAll('~', '~0').replaceAll('/', '~1') : String(part.index))).join('')
}

/** Replacer helper preserves __proto__ as a data key and leaves array order intact. */
export function sortJsonTreeObject(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const object = value as Record<string, unknown>
  return Object.fromEntries(Object.keys(object).sort().map(key => [key, object[key]]))
}

/** Parsed JSON/JSON5 subtree -> JSON. Never quietly replace a nonfinite value with null. */
export function serializeJsonTreeValue(value: unknown, indent = 2, sort = false): JsonTreeValueResult {
  let reason: 'nonFinite' | 'notJsonValue' | 'serializationFailed' = 'serializationFailed'
  try {
    const text = JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'number' && !Number.isFinite(item)) { reason = 'nonFinite'; throw new Error(reason) }
      if (item === undefined || typeof item === 'bigint' || typeof item === 'function' || typeof item === 'symbol') { reason = 'notJsonValue'; throw new Error(reason) }
      return sort ? sortJsonTreeObject(item) : item
    }, indent)
    return typeof text === 'string' ? { ok: true, text } : { ok: false, reason: 'notJsonValue' }
  } catch { return { ok: false, reason } }
}

/** Frequencies for parser-created data; Map treats every JSON object key equally. */
export function jsonTreeKeyFrequencies(root: unknown): Map<string, number> {
  const frequencies = new Map<string, number>(), pending: unknown[] = [root]
  while (pending.length) {
    const value = pending.pop()
    if (Array.isArray(value)) { for (const child of value) pending.push(child) }
    else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) { frequencies.set(key, (frequencies.get(key) ?? 0) + 1); pending.push(child) }
    }
  }
  return frequencies
}

export function jsonTreeLiteralCandidate(path: JsonTreePath): { expression: string; tokens: string[] } {
  if (!validPath(path)) throw new Error('invalidPath')
  return {
    expression: '$' + path.map(part => part.kind === 'key' ? "['`" + part.key + "']" : `[${part.index}]`).join(''),
    tokens: ['$', ...path.map(part => part.kind === 'key' ? '`' + part.key : String(part.index))],
  }
}

/** Public token normalization + exact own target metadata, never just matching values. */
export function verifyJsonTreeLiteral(root: unknown, path: JsonTreePath, engine: JsonTreePathEngine): JsonTreePathResult {
  const target = resolveJsonTreeNode(root, path)
  if (!target.ok) return { ok: false, reason: 'unsupported' }
  // The installed engine omits falsy roots. '$' is the exact typed root by definition.
  if (!path.length) return { ok: true, expression: '$' }
  if (root === null || (typeof root !== 'boolean' && typeof root !== 'number' && typeof root !== 'string' && typeof root !== 'object')) return { ok: false, reason: 'unsupported' }
  try {
    const candidate = jsonTreeLiteralCandidate(path), actualTokens = engine.toPathArray(candidate.expression)
    if (!Array.isArray(actualTokens) || actualTokens.length !== candidate.tokens.length || actualTokens.some((token, index) => token !== candidate.tokens[index])) return { ok: false, reason: 'unsupported' }
    const matches: unknown = engine.evaluate({ path: candidate.expression, json: root, eval: false, wrap: true, resultType: 'all' })
    if (!Array.isArray(matches) || matches.length !== 1) return { ok: false, reason: 'unsupported' }
    const match: unknown = matches[0]
    if (!match || typeof match !== 'object') return { ok: false, reason: 'unsupported' }
    const result = match as Record<string, unknown>
    const propertyMatches = typeof target.property === 'number'
      ? result.parentProperty === target.property || result.parentProperty === String(target.property)
      : result.parentProperty === target.property
    return result.parent === target.parent && propertyMatches && Object.is(result.value, target.value)
      ? { ok: true, expression: candidate.expression } : { ok: false, reason: 'unsupported' }
  } catch { return { ok: false, reason: 'unavailable' } }
}

export const JSON_TREE_PREVIEW_UNITS = 50_000
function previewBoundary(text: string, offset: number): number {
  const point = Math.min(text.length, Math.max(0, offset))
  if (point > 0 && point < text.length) {
    const before = text.charCodeAt(point - 1), after = text.charCodeAt(point)
    if ((before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff) || (before === 13 && after === 10)) return point - 1
  }
  return point
}
export function jsonTreeTextPage(text: string, requestedPage: number) {
  const pages = Math.max(1, Math.ceil(text.length / JSON_TREE_PREVIEW_UNITS))
  const page = Math.min(pages - 1, Math.max(0, Number.isSafeInteger(requestedPage) ? requestedPage : 0))
  const start = previewBoundary(text, page * JSON_TREE_PREVIEW_UNITS), end = previewBoundary(text, (page + 1) * JSON_TREE_PREVIEW_UNITS)
  return { text: text.slice(start, end), start, end, total: text.length, page, pages }
}
