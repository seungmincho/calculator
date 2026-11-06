// 툴허브 도구 검색 (에이전트용 /api/tools·MCP search_tools). menuConfig + 공용 번역(ko·en)의 이름·설명에서 찾는다.
import { menuConfig, categoryKeys } from '../config/menuConfig.ts'
import ko from '../../messages/generated/ko/shared.json'
import en from '../../messages/generated/en/shared.json'

const SITE = 'https://toolhub.ai.kr'
const get = (o: unknown, key: string): string => {
  const v = key.split('.').reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined), o)
  return typeof v === 'string' ? v : ''
}
// 거의 모든 도구에 붙는 말은 점수를 조금만 준다.
const WEAK = new Set(['계산기', '계산', '도구', '툴', '무료', '온라인', '확인', '조회', '하기', 'calculator', 'tool', 'tools', 'free', 'online', 'check'])

interface Entry { href: string; name: string; nameEn: string; description: string; category: string; hay: { name: string; desc: string; href: string } }
const ENTRIES: Entry[] = [...new Map(categoryKeys.flatMap(k => menuConfig[k].items.map(i => [i.href, { i, k }] as const))).values()].map(({ i, k }) => {
  const name = get(ko, i.labelKey) || i.href, nameEn = get(en, i.labelKey)
  const description = get(ko, i.descriptionKey), descEn = get(en, i.descriptionKey)
  return { href: i.href, name, nameEn, description, category: get(ko, menuConfig[k].titleKey) || k,
    hay: { name: `${name} ${nameEn}`.toLowerCase(), desc: `${description} ${descEn}`.toLowerCase(), href: i.href.toLowerCase() } }
})

export interface ToolHit { name: string; nameEn: string; description: string; category: string; url: string; score: number }
export const TOOL_COUNT = ENTRIES.length

export function searchTools(query: string, limit = 8): ToolHit[] {
  const q = query.trim().toLowerCase().slice(0, 200)
  if (!q) return []
  // 한 글자 낱말('가', '좀')은 거의 모든 이름에 걸려서 뺀다. 전체 구절 일치(+5)는 그대로.
  const terms = [...new Set(q.split(/[\s,·/?!.]+/).filter(t => t.length > 1))].slice(0, 10)
  return ENTRIES.map(e => {
    let score = e.hay.name.includes(q) ? 5 : 0
    for (const t of terms) {
      const w = WEAK.has(t) ? 0.2 : 1
      if (e.hay.name.includes(t)) score += 3 * w
      else if (e.hay.href.includes(t)) score += 2 * w
      else if (e.hay.desc.includes(t)) score += 1 * w
    }
    return { e, score }
  }).filter(x => x.score >= 1).sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name)).slice(0, Math.max(1, Math.min(20, limit)))
    .map(({ e, score }) => ({ name: e.name, nameEn: e.nameEn, description: e.description, category: e.category, url: `${SITE}${e.href}/`, score: Math.round(score * 10) / 10 }))
}
