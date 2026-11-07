// 이달의 제철 음식 — 품목 데이터와 순수 함수. 이름·설명 문구는 messages 의 seasonalFood.items.<id>.
//
// 제철 달(months) 정하는 법 (2026-11 확인):
//  - 농촌진흥청 농사로 '이달의 식재료'(채소·과일)·'이달의 수산물'에 오른 달
//  - 해양수산부 '이달의 수산물'(2017.8~2026.11) 선정 달. 한 번만 동떨어지게 선정된 달은 뺐고, 2026년 선정은 모두 넣었다
//  - 농사로 품목 설명에 적힌 수확·출하·제철 시기(예: 곤드레 5~6월, 김장배추 11월 중순~12월 중순)
//  - 그렇게 모은 달 사이에 빈 달이 2개월 이하면 이어 붙였다
// 해마다 해수부 선정(MOF_PICKS)만 바꾸면 된다. 12월 선정은 2026-11 말 발표 예정이라 아직 2025년 것이다.

export type Category = 'veg' | 'fruit' | 'seafood'
export type SourceKey = 'nongsaro' | 'nongsaroSea' | 'mof'
export type Food = { id: string; category: Category; months: number[]; src: SourceKey[] }

export const CATEGORIES: Category[] = ['veg', 'fruit', 'seafood']

const v = (id: string, months: number[]): Food => ({ id, category: 'veg', months, src: ['nongsaro'] })
const f = (id: string, months: number[]): Food => ({ id, category: 'fruit', months, src: ['nongsaro'] })
const s = (id: string, months: number[], src: SourceKey[] = ['mof', 'nongsaroSea']): Food => ({ id, category: 'seafood', months, src })

export const FOODS: Food[] = [
  // 채소·버섯 (농사로 이달의 식재료)
  v('deodeok', [1]),
  v('minari', [1, 2, 3, 4]),
  v('doraji', [10, 11, 12, 1]),
  v('bomdong', [2, 3]),
  v('naengi', [3]),
  v('cabbage', [11, 12, 1, 2, 3, 4]), // 여름 파종 작형 11월~이듬해 4월 수확(제주 겨울 산지)
  v('dallae', [4]),
  v('mugwort', [3, 4, 5]),
  v('dureup', [5]),
  v('bambooShoot', [5]),
  v('spinach', [12, 1, 2, 3, 4, 5]), // 겨울 시금치 + 이른 봄
  v('tomato', [5]),
  v('gondre', [5, 6]),
  v('onion', [6]),
  v('potato', [6]),
  v('eggplant', [6, 7, 8]),
  v('corn', [7]),
  v('yeolmu', [6, 7, 8]),
  v('zucchini', [7]),
  v('pepper', [8]),
  v('lotusRoot', [8, 9, 10, 11, 12, 1, 2]), // 10월부터 수확, '겨울이 제철'
  v('shiitake', [9, 10]),
  v('taro', [8, 9, 10]), // 조생종 8~9월, 보통종 서리 오기 직전
  v('oldPumpkin', [10, 11]),
  v('napaCabbage', [10, 11, 12]), // 가을배추 10월 말부터, 김장배추 11월 중순~12월 중순
  v('radish', [10, 11]),
  v('broccoli', [12, 1, 2]),
  v('ginger', [9, 10, 11, 12]), // 9월 출하 시작, 11월 말까지 캔 것이 가장 싱싱
  // 과일
  f('tangerine', [12, 1]),
  f('hallabong', [1]),
  f('strawberry', [12, 1, 2, 3, 4, 5]), // 겨울·봄 수확
  f('chamoe', [5, 6, 7]),
  f('raspberry', [6, 7]),
  f('mulberry', [6]),
  f('watermelon', [7]),
  f('peach', [7, 8]),
  f('melon', [8]),
  f('grape', [8, 9]),
  f('blueberry', [6, 7, 8, 9]),
  f('pear', [9, 10]),
  f('fig', [9]),
  f('plum', [6, 7, 8, 9]),
  f('apple', [8, 9, 10]),
  f('kiwi', [10, 11, 12, 1, 2, 3, 4]), // 헤이워드 11월~이듬해 4월 출하
  f('persimmon', [10, 11]),
  f('jujube', [11]),
  f('yuzu', [10, 11, 12]), // 10월 하순~12월 수확
  // 수산물 (해수부 이달의 수산물 + 농사로 이달의 수산물)
  s('oyster', [12, 1]),
  s('maesaengi', [1], ['mof']),
  s('laver', [1, 2]),
  s('yellowtail', [12, 1], ['mof']),
  s('cod', [11, 12, 1, 2]),
  s('snowCrab', [12, 1, 2, 3]),
  s('cockle', [11, 12, 1, 2]),
  s('flounder', [3, 4]),
  s('flatfish', [2, 3, 4, 5, 6]),
  s('seaSquirt', [3, 4, 5], ['mof']),
  s('webfoot', [3, 4]),
  s('clam', [3, 4, 5]),
  s('anchovy', [4, 10]),
  s('skate', [4, 12]),
  s('penShell', [4, 5, 6], ['mof']),
  s('blueCrab', [5, 9, 10]),
  s('butterfish', [5, 6, 7, 8]), // 해수부: 5월부터 8월까지 많이 잡힌다
  s('kelp', [5, 6], ['mof']),
  s('rockfish', [5, 6, 7], ['mof']),
  s('abalone', [5, 6, 7, 8]),
  s('seabass', [5, 6, 7, 8]),
  s('horseMackerel', [6], ['mof']),
  s('croaker', [7, 8]),
  s('eel', [7, 8]),
  s('octopus', [7, 8, 9], ['mof']),
  s('shrimp', [8, 9, 10]),
  s('gizzardShad', [9, 10]),
  s('hairtail', [8, 9, 10]),
  s('mackerel', [10, 11]),
  s('spanishMackerel', [10, 11, 12, 1, 2], ['mof']), // 해수부: 11월부터 겨울철까지 맛이 좋다
  s('scallop', [11, 12, 1, 2], ['mof']), // 해수부: 늦가을부터 겨울철까지 살이 찬다
  s('loach', [8, 9, 10, 11]),
]

/** 해양수산부 '이달의 수산물'. 품목에 없는 선정(민물장어·참돔·향어)은 문구(mofPick.m<달>)에만 적는다. */
export const MOF_PICKS: Record<number, { year: number; ids: string[] }> = {
  1: { year: 2026, ids: ['maesaengi'] },
  2: { year: 2026, ids: ['laver'] },
  3: { year: 2026, ids: ['flounder', 'seaSquirt'] },
  4: { year: 2026, ids: ['flatfish', 'skate'] },
  5: { year: 2026, ids: ['kelp', 'rockfish'] },
  6: { year: 2026, ids: ['penShell', 'horseMackerel'] },
  7: { year: 2026, ids: ['croaker', 'abalone'] },
  8: { year: 2026, ids: ['shrimp', 'eel'] },
  9: { year: 2026, ids: ['gizzardShad'] },
  10: { year: 2026, ids: ['loach', 'anchovy'] },
  11: { year: 2026, ids: ['spanishMackerel', 'scallop'] },
  12: { year: 2025, ids: ['snowCrab', 'cod'] },
}

/** 근거 상자. 앞 세 개는 품목 src 키, 나머지는 가이드(보관·금어기) 근거. 농사로 둘은 월 페이지에서 &month=<달>을 붙인다. */
export const SOURCES = [
  ['nongsaro', 'https://www.nongsaro.go.kr/mfood/kfi/foodMonth/list?menuId=PS03924&tabCode=1&dtlCode=3'],
  ['nongsaroSea', 'https://www.nongsaro.go.kr/mfood/kfi/foodMonth/list?menuId=PS03599&tabCode=3'],
  ['mof', 'https://www.incheon.go.kr/fish/FI020401'],
  ['mofPress', 'https://www.mof.go.kr/doc/ko/selectDocList.do?menuSeq=971&bbsSeq=10'],
  ['seafoodSafety', 'https://www.korea.kr/news/policyNewsView.do?newsId=148902227'],
  ['closedSeason', 'https://www.incheon.go.kr/ocean/OC020701'],
  ['law', 'https://www.law.go.kr/법령/수산자원관리법시행령'],
] as const

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export const isMonth = (m: number) => Number.isInteger(m) && m >= 1 && m <= 12

/** 그 달 품목. 해수부 선정 먼저, 그다음 제철이 짧은(그 달다운) 순. */
export function foodsInMonth(month: number, cat: Category | 'all' = 'all'): Food[] {
  const picks = MOF_PICKS[month]?.ids ?? []
  return FOODS.filter((x) => x.months.includes(month) && (cat === 'all' || x.category === cat))
    .sort((a, b) => Number(picks.includes(b.id)) - Number(picks.includes(a.id)) || a.months.length - b.months.length)
}

export const byCategory = (cat: Category | 'all') => (cat === 'all' ? FOODS : FOODS.filter((x) => x.category === cat))

/**
 * 제철 달을 이어진 구간으로: [11,12,1,2] → [[11,2]], [12,1,2,3,5] → [[12,3],[5,5]], 12개월 → [[1,12]].
 * 해를 넘기는 구간을 먼저, 나머지는 시작 달 순.
 */
export function monthRuns(months: number[]): [number, number][] {
  const set = new Set(months)
  if (set.size === 12) return [[1, 12]]
  const next = (m: number) => (m % 12) + 1
  const prev = (m: number) => ((m + 10) % 12) + 1
  const runs: [number, number][] = []
  for (const start of MONTHS) {
    if (!set.has(start) || set.has(prev(start))) continue
    let end = start
    while (set.has(next(end))) end = next(end)
    runs.push([start, end])
  }
  return runs.sort((a, b) => Number(b[0] > b[1]) - Number(a[0] > a[1]) || a[0] - b[0])
}
