// node scripts/check-winter-festivals.ts [i18n.json] (Node 24) — 겨울 축제 데이터·상태 판정·번역 회귀 체크
// 번역: 인자로 {"ko":{…},"en":{…}} 파일을 주면 그걸, 없으면 messages/ko.json·en.json 의 winterFestivals 를 본다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FESTIVALS, SOURCES, SEASON, LAST_SEASON, FESTIVAL_TYPES, FESTIVAL_REGIONS, SORTS,
  periodOf, statusOf, partOfMonth, listFestivals, type Festival,
} from '../src/lib/festivals.ts'
import { isValidDate } from '../src/utils/dday.ts'

const all: readonly Festival[] = FESTIVALS
const byId = (id: string) => all.find((f) => f.id === id)!

// 데이터: 날짜 형식·순서·시즌 범위, id 중복, 출처 키
assert.equal(new Set(all.map((f) => f.id)).size, all.length, 'id 중복')
const used = new Set<string>(['cancel2026']) // 가이드 문구(취소·연기 사례) 출처
for (const f of all) {
  const { last, dates } = f
  for (const p of dates ? [last, dates] : [last]) {
    assert.ok(isValidDate(p.start) && isValidDate(p.end), `${f.id}: 날짜 형식`)
    assert.ok(p.start <= p.end, `${f.id}: start ≤ end`)
    assert.ok(p.source in SOURCES, `${f.id}: 출처 키 ${p.source} 가 SOURCES 에 없음`)
    used.add(p.source)
  }
  assert.ok(last.start >= LAST_SEASON.from && last.end <= LAST_SEASON.to, `${f.id}: last 는 ${LAST_SEASON.label} 시즌`)
  if (dates) assert.ok(dates.start >= SEASON.from && dates.end <= SEASON.to, `${f.id}: dates 는 ${SEASON.label} 시즌`)
  assert.ok(FESTIVAL_TYPES.includes(f.type) && FESTIVAL_REGIONS.includes(f.region), `${f.id}: 종류·지역`)
  if (f.url) assert.match(f.url, /^https:\/\//, `${f.id}: 공식 누리집은 https`)
}
assert.deepEqual(Object.keys(SOURCES).filter((k) => !used.has(k)), [], '쓰지 않는 출처')
for (const url of Object.values(SOURCES)) assert.match(url, /^https:\/\//)

// 확인된 날짜(2026-11-07)
assert.deepEqual(byId('hwacheon').dates, { start: '2027-01-09', end: '2027-01-31', source: 'hwacheon2027' })
assert.deepEqual([byId('pyeongchang').last.start, byId('pyeongchang').last.end], ['2026-01-09', '2026-02-09'], '평창 2026 연기된 실제 기간')
assert.equal(byId('pyeongchang').dates, null, '평창 2027 은 여행사 잠정치라 공지 전')

// 상태 판정 경계: 정적 렌더(null) → 날짜와 무관, 개막 전날 D-1, 개막·폐막일은 진행 중, 다음 날 끝남
const hw = byId('hwacheon')
assert.deepEqual(statusOf(hw, null), { kind: 'confirmed' })
assert.deepEqual(statusOf(hw, '2026-11-07'), { kind: 'upcoming', days: 63 }, '공식 누리집 D-63 과 같음')
assert.deepEqual(statusOf(hw, '2027-01-08'), { kind: 'upcoming', days: 1 })
assert.deepEqual(statusOf(hw, '2027-01-09'), { kind: 'ongoing' })
assert.deepEqual(statusOf(hw, '2027-01-31'), { kind: 'ongoing' })
assert.deepEqual(statusOf(hw, '2027-02-01'), { kind: 'ended' })
assert.deepEqual(statusOf(byId('taebaek'), '2027-02-05'), { kind: 'tba' }, '공지 전은 날짜와 무관')
assert.deepEqual(statusOf(byId('morningcalm'), '2027-01-01'), { kind: 'ongoing' }, '해를 넘기는 기간')

// 예상 시기 = 지난 시즌 + 1년, 초·중·하순 경계
assert.deepEqual(periodOf(byId('taebaek')), { start: '2027-01-31', end: '2027-02-08', confirmed: false })
assert.deepEqual(periodOf(hw), { start: '2027-01-09', end: '2027-01-31', confirmed: true })
assert.deepEqual(['2026-01-10', '2026-01-11', '2026-01-20', '2026-01-21', '2026-01-31'].map(partOfMonth), ['early', 'mid', 'mid', 'late', 'late'])

// 필터·정렬
const ids = (fs: readonly Festival[]) => fs.map((f) => f.id)
assert.equal(listFestivals('all', 'all', 'date').length, all.length)
assert.deepEqual(ids(listFestivals('all', 'capital', 'date')), ['morningcalm', 'seoulLantern', 'pocheon'])
assert.ok(listFestivals('ice', 'all', 'date').every((f) => f.type === 'ice'))
assert.deepEqual(listFestivals('snow', 'other', 'date'), [])
const byDate = listFestivals('all', 'all', 'date').map((f) => periodOf(f).start)
assert.deepEqual(byDate, [...byDate].sort(), '개막일 순')
const byRegion = listFestivals('all', 'all', 'region').map((f) => FESTIVAL_REGIONS.indexOf(f.region))
assert.deepEqual(byRegion, [...byRegion].sort((a, b) => a - b), '지역 순')
assert.deepEqual(ids(listFestivals('all', 'all', 'region').slice(0, 3)), ['hwacheon', 'pyeongchang', 'hongcheon'], '강원 안에서는 개막일 순, 같은 날이면 배열 순')
assert.equal(listFestivals('all', 'all', 'date')[0].id, 'hampyeong', '예상 시기 포함 가장 이른 개막')

// 번역: 모든 축제·출처·칩 문구가 ko·en 둘 다
type Msg = Record<string, unknown>
const file = process.argv[2]
const i18n: Record<'ko' | 'en', Msg> = file
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { ko: JSON.parse(readFileSync('messages/ko.json', 'utf8')).winterFestivals, en: JSON.parse(readFileSync('messages/en.json', 'utf8')).winterFestivals }
const get = (o: unknown, path: string) => path.split('.').reduce<unknown>((v, k) => (v as Msg | undefined)?.[k], o)
for (const lang of ['ko', 'en'] as const) {
  const m = i18n[lang]
  assert.ok(m, `${lang}: winterFestivals 네임스페이스 없음`)
  const str = (path: string) => assert.ok(typeof get(m, path) === 'string' && (get(m, path) as string).length > 0, `${lang}: ${path}`)
  for (const f of all) for (const k of ['name', 'place', 'program']) str(`festivals.${f.id}.${k}`)
  assert.deepEqual(Object.keys(get(m, 'festivals') as Msg).sort(), all.map((f) => f.id).sort(), `${lang}: festivals 키 = 데이터 id`)
  for (const k of Object.keys(SOURCES)) str(`guide.sources.items.${k}`)
  for (const v of ['all', ...FESTIVAL_TYPES]) str(`types.${v}`)
  for (const v of ['all', ...FESTIVAL_REGIONS]) str(`regions.${v}`)
  for (const v of SORTS) str(`sort.${v}`)
  for (const v of ['confirmed', 'tba', 'ongoing', 'ended']) str(`status.${v}`)
  for (const v of ['early', 'mid', 'late']) str(`parts.${v}`)
  assert.equal((get(m, 'weekdays') as string[]).length, 7); assert.equal((get(m, 'months') as string[]).length, 12)
  for (const sec of ['prep', 'tickets', 'safety', 'kids']) { str(`guide.${sec}.title`); assert.ok(Array.isArray(get(m, `guide.${sec}.items`)), `${lang}: guide.${sec}.items 배열`) }
  const faq = get(m, 'guide.faq.items') as { q: string; a: string }[]
  assert.ok(Array.isArray(faq) && faq.length > 0 && faq.every((x) => x.q && x.a), `${lang}: guide.faq.items [{q,a}]`)
}
assert.equal((get(i18n.ko, 'guide.faq.items') as unknown[]).length, (get(i18n.en, 'guide.faq.items') as unknown[]).length, 'FAQ 개수 ko = en')

console.log(`check-winter-festivals: all passed (${all.length}곳, 확정 ${all.filter((f) => f.dates).length})`)
