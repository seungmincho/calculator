// 메트로놈 로직 회귀 체크: node scripts/check-metronome.ts
import assert from 'node:assert/strict'
import { clampBpm, tempoMark, pushTap, tapBpm, cycleAccent, defaultAccents, step, trainerBpm, decodeSettings, encodeSettings, synth, DEFAULTS, type Pos } from '../src/utils/metronome.ts'

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`)

assert.equal(clampBpm(10), 20); assert.equal(clampBpm(999), 300); assert.equal(clampBpm(NaN), 120); assert.equal(clampBpm(99.6), 100)
assert.equal(tempoMark(40), 'grave'); assert.equal(tempoMark(60), 'largo'); assert.equal(tempoMark(120), 'allegro')
assert.equal(tempoMark(100), 'moderato'); assert.equal(tempoMark(250), 'prestissimo')

// 탭 템포: 500ms 간격 = 120 BPM, 2초 공백 후 리셋, 최근 8개만
let taps: number[] = []
for (const t of [0, 500, 1000, 1500]) taps = pushTap(taps, t)
assert.equal(tapBpm(taps), 120)
taps = pushTap(taps, 5000) // 공백 → 새로 시작
assert.deepEqual(taps, [5000]); assert.equal(tapBpm(taps), null)
taps = []
for (let i = 0; i < 20; i++) taps = pushTap(taps, i * 600)
assert.equal(taps.length, 8); assert.equal(tapBpm(taps), 100)
assert.equal(tapBpm(pushTap(pushTap([], 0), 400)), 150)
const orig = [0, 500]; pushTap(orig, 600); assert.deepEqual(orig, [0, 500]) // 원본 불변

// 강약 순환 · 기본 패턴
assert.equal(cycleAccent('a'), 'n'); assert.equal(cycleAccent('n'), 'm'); assert.equal(cycleAccent('m'), 'a')
assert.equal(defaultAccents(4, 4).join(''), 'annn')
assert.equal(defaultAccents(6, 8).join(''), 'annann')
assert.equal(defaultAccents(7, 8).join(''), 'ananann')
assert.equal(defaultAccents(12, 8).join(''), 'annannannann')
assert.equal(defaultAccents(5, 4).join(''), 'annnn')

// 스케줄러 스텝: 120BPM 4/4 → 0.5초 간격, 마디 넘김
let p: Pos = { bar: 0, beat: 0, sub: 0 }
let total = 0
for (let i = 0; i < 4; i++) { const r = step(p, 4, 'none', 120); total += r.dt; p = r.next }
near(total, 2); assert.deepEqual(p, { bar: 1, beat: 0, sub: 0 })
// 16분: 한 박에 4번, 한 마디(4박) 16스텝 = 2초
p = { bar: 0, beat: 0, sub: 0 }; total = 0
for (let i = 0; i < 16; i++) { const r = step(p, 4, 'sixteenth', 120); near(r.dt, 0.125); total += r.dt; p = r.next }
near(total, 2); assert.equal(p.bar, 1)
// 셋잇단: 박당 합 = 1박
p = { bar: 0, beat: 0, sub: 0 }; total = 0
for (let i = 0; i < 3; i++) { const r = step(p, 3, 'triplet', 60); total += r.dt; p = r.next }
near(total, 1); assert.deepEqual(p, { bar: 0, beat: 1, sub: 0 })
// 스윙: 2/3 + 1/3
const s1 = step({ bar: 0, beat: 0, sub: 0 }, 4, 'swing', 60); near(s1.dt, 2 / 3)
const s2 = step(s1.next, 4, 'swing', 60); near(s2.dt, 1 / 3); assert.equal(s2.next.beat, 1)
// 재생 중 세분이 줄어도 범위 밖 sub에서 안전
const odd = step({ bar: 0, beat: 0, sub: 3 }, 4, 'eighth', 120); assert.ok(odd.dt > 0 && odd.next.sub === 0)

// 스피드 트레이너
assert.equal(trainerBpm(80, 120, 5, 4, 0), 80)
assert.equal(trainerBpm(80, 120, 5, 4, 3), 80)
assert.equal(trainerBpm(80, 120, 5, 4, 4), 85)
assert.equal(trainerBpm(80, 120, 5, 4, 100), 120) // 목표에서 멈춤
assert.equal(trainerBpm(120, 90, 10, 2, 4), 100) // 감속
assert.equal(trainerBpm(120, 90, 10, 2, 99), 90)
assert.equal(trainerBpm(80, 120, 5, 0, 3), 95) // every 0 → 1

// URL 왕복
const s = { ...DEFAULTS, bpm: 96, beats: 7, unit: 8, accents: defaultAccents(7, 8), subdiv: 'triplet' as const, trainer: true, trStart: 60, trTarget: 100, trStep: 4, trEvery: 2, gap: 25, countIn: 1 }
const q = encodeSettings(s)
assert.equal(q.get('acc'), null) // 기본 패턴은 생략
const back = decodeSettings((k) => q.get(k))
for (const k of ['bpm', 'beats', 'unit', 'subdiv', 'trainer', 'trStart', 'trTarget', 'trStep', 'trEvery', 'gap', 'countIn'] as const) assert.equal(back[k], s[k], k)
assert.deepEqual(back.accents, s.accents)
const custom = decodeSettings((k) => new URLSearchParams('ts=3/4&acc=amn').get(k))
assert.deepEqual(custom.accents, ['a', 'm', 'n'])
// 잘못된 값은 무시
const bad = decodeSettings((k) => new URLSearchParams('bpm=9999&ts=0/4&acc=zz&sub=x&snd=y').get(k))
assert.equal(bad.bpm, 120); assert.equal(bad.beats, 4); assert.equal(bad.subdiv, 'none'); assert.equal(bad.sound, 'click')
assert.equal(decodeSettings((k) => new URLSearchParams('ts=3/4&acc=aaaa').get(k)).accents.join(''), 'ann') // 길이 불일치

// 합성음: 길이·클리핑·무음 아님
for (const snd of ['click', 'wood', 'beep'] as const) for (const lv of [0, 1, 2] as const) {
  const b = synth(snd, lv, 48000)
  assert.ok(b.length > 1000)
  let peak = 0; for (const x of b) peak = Math.max(peak, Math.abs(x))
  assert.ok(peak > 0.2 && peak <= 1, `${snd}${lv} peak ${peak}`)
  assert.ok(Math.abs(b[0]) < 0.05 && Math.abs(b[b.length - 1]) < 0.05) // 팝 없음
}
console.log('check-metronome: OK')
