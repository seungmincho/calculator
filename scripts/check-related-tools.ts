// 관련 도구 큐레이션 맵 검증: node scripts/check-related-tools.ts
import assert from 'node:assert/strict'
import { menuConfig, categoryKeys } from '../src/config/menuConfig.ts'
import { curatedRelated } from '../src/config/relatedTools.ts'

const hrefs = new Set(categoryKeys.flatMap(k => menuConfig[k].items.map(i => i.href)))

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
