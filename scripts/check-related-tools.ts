// 관련 도구 큐레이션 맵 검증: node scripts/check-related-tools.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { menuConfig, categoryKeys } from '../src/config/menuConfig.ts'
import { curatedRelated } from '../src/config/relatedTools.ts'

const hrefs = new Set(categoryKeys.flatMap(k => menuConfig[k].items.map(i => i.href)))

// 객체 리터럴의 중복 키는 뒤엣것이 조용히 덮어쓰므로 소스에서 직접 센다
const keys = [...readFileSync(new URL('../src/config/relatedTools.ts', import.meta.url), 'utf8').matchAll(/^\s*'(\/[^']*)':/gm)].map(m => m[1])
const dupKeys = keys.filter((k, i) => keys.indexOf(k) !== i)
assert.equal(dupKeys.length, 0, `중복 키: ${dupKeys.join(', ')}`)

for (const [from, list] of Object.entries(curatedRelated)) {
  assert.ok(hrefs.has(from), `menuConfig에 없는 키: ${from}`)
  assert.ok(list.length === 4 || list.length === 6, `${from}: 4개 또는 6개여야 함 (현재 ${list.length})`)
  assert.equal(new Set(list).size, list.length, `${from}: 중복 링크`)
  for (const to of list) {
    assert.notEqual(to, from, `${from}: 자기 자신 링크`)
    assert.ok(hrefs.has(to), `${from} → menuConfig에 없는 href: ${to}`)
  }
}

console.log(`OK related tools: ${Object.keys(curatedRelated).length} tools, ${Object.values(curatedRelated).flat().length} links`)
