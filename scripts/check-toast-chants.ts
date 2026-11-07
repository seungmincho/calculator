// node scripts/check-toast-chants.ts [i18n.json]  (Node 24) — 건배 구호 데이터·번역 회귀 체크
// 인자 없으면 messages/ko·en.json 의 toastSpeech, 있으면 {"ko": {...}, "en": {...}} 파일(병합 전 초안)을 본다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PLACES, TOAST_CHANTS, chantsFor } from '../src/utils/toastChants.ts'

type Entry = { chant: string; meaning: string; lead: string; reply: string }
type Ns = { list: Record<string, Entry>; places: Record<string, string>; guide: { faq: { items: { q: string; a: string }[] } } }
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const arg = process.argv[2]
const draft = arg ? JSON.parse(readFileSync(arg, 'utf8')) : null
const ns: Record<'ko' | 'en', Ns> = draft ?? { ko: read('../messages/ko.json').toastSpeech, en: read('../messages/en.json').toastSpeech }

// 데이터
const ids = TOAST_CHANTS.map((x) => x.id)
assert.equal(new Set(ids).size, ids.length, 'id 중복')
assert.ok(ids.length >= 25 && ids.length <= 35, `구호 ${ids.length}개 — 30개 안팎이어야`)
const validPlaces = new Set<string>([...PLACES, 'any'])
for (const c of TOAST_CHANTS) {
  assert.ok(c.places.length > 0, `${c.id}: 자리 없음`)
  for (const p of c.places) assert.ok(validPlaces.has(p), `${c.id}: 알 수 없는 자리 ${p}`)
  assert.ok(!c.places.includes('any') || c.places.length === 1, `${c.id}: 'any' 는 혼자 써야`)
}
for (const p of PLACES) assert.ok(chantsFor(p).length >= 8, `${p} 자리 구호가 ${chantsFor(p).length}개뿐`)
assert.equal(chantsFor('all').length, ids.length)

// 번역: 모든 id 의 구호·뜻·선창·후창, 남는 키 없음
for (const lang of ['ko', 'en'] as const) {
  const { list, places, guide } = ns[lang]
  assert.deepEqual(Object.keys(list).sort(), [...ids].sort(), `${lang}: list 키와 데이터 id 불일치`)
  for (const id of ids) {
    for (const k of ['chant', 'meaning', 'lead', 'reply'] as const) {
      assert.ok(typeof list[id]?.[k] === 'string' && list[id][k].trim(), `${lang}.list.${id}.${k} 없음`)
    }
  }
  for (const p of ['all', ...validPlaces]) assert.ok(places[p], `${lang}.places.${p} 없음`)
  assert.ok(Array.isArray(guide.faq.items) && guide.faq.items.every((f) => f.q && f.a), `${lang}.guide.faq.items 형식`)
}

// 선창·후창 형식: split=false 면 다 같이 같은 말을 따라 외친다
for (const c of TOAST_CHANTS) {
  const e = ns.ko.list[c.id]
  assert.equal(e.lead === e.reply, !c.split, `${c.id}: split=${c.split} 인데 선창 '${e.lead}' 후창 '${e.reply}'`)
}

// 인사말 생성기 건배사(greetings.ts toast close)의 구호와 선창·후창이 같아야 한다
const src = readFileSync(new URL('../src/utils/greetings.ts', import.meta.url), 'utf8')
const byChant = new Map(ids.map((id) => [ns.ko.list[id].chant, ns.ko.list[id]]))
const shared = new Set<string>()
for (const [, name, lead, reply] of src.matchAll(/‘([^’]+)’[^'\n]*?\\n선창: ([^/']+?) \/ 후창: ([^']+?)'/g)) {
  const e = byChant.get(name)
  if (!e) continue
  shared.add(name)
  assert.deepEqual([e.lead, e.reply], [lead, reply], `${name}: greetings.ts 와 선창·후창이 다름`)
}
assert.ok(shared.size >= 5, `greetings.ts 와 대조한 구호가 ${[...shared]}뿐 (소화제·마무리·변사또·청바지·오징어)`)

console.log(`check-toast-chants: all passed (${ids.length}개, greetings.ts 대조 ${[...shared].join('·')})`)
