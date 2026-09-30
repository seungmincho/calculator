// 메트로놈 순수 로직 (UI/오디오 없음). 검증: node scripts/check-metronome.ts

export const BPM_MIN = 20
export const BPM_MAX = 300
export const clampBpm = (n: number) => Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(Number.isFinite(n) ? n : 120)))

// ── 빠르기말 (대략적 관례 범위, 상한 기준) ──
export const TEMPO_MARKS = [
  { key: 'grave', max: 44, bpm: 40 },
  { key: 'largo', max: 60, bpm: 50 },
  { key: 'adagio', max: 72, bpm: 66 },
  { key: 'andante', max: 92, bpm: 76 },
  { key: 'moderato', max: 116, bpm: 108 },
  { key: 'allegro', max: 156, bpm: 132 },
  { key: 'vivace', max: 176, bpm: 160 },
  { key: 'presto', max: 200, bpm: 184 },
  { key: 'prestissimo', max: Infinity, bpm: 208 },
] as const
export type TempoKey = (typeof TEMPO_MARKS)[number]['key']
export const tempoMark = (bpm: number): TempoKey => TEMPO_MARKS.find((m) => bpm <= m.max)!.key

// ── 탭 템포: 마지막 탭과 gapMs 이상 벌어지면 새로 시작, 최근 keep개 간격 평균 ──
export function pushTap(taps: number[], now: number, gapMs = 2000, keep = 8): number[] {
  const base = taps.length && now - taps[taps.length - 1] > gapMs ? [] : taps
  return [...base, now].slice(-keep)
}
export function tapBpm(taps: number[]): number | null {
  if (taps.length < 2) return null
  const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1) // 간격 평균 = 전체 구간 / 간격 수
  return avg > 0 ? clampBpm(60000 / avg) : null
}

// ── 박자별 강약: a=강박, n=보통, m=음소거 ──
export type Accent = 'a' | 'n' | 'm'
export const cycleAccent = (x: Accent): Accent => (x === 'a' ? 'n' : x === 'n' ? 'm' : 'a')
/** 기본 강약: 첫 박 강박. 8분 계열 복합/불규칙 박자는 그룹 첫 박도 강박(6/8=3+3, 7/8=2+2+3, 9/8·12/8=3씩, 5/8=3+2) */
export function defaultAccents(beats: number, unit: number): Accent[] {
  const out: Accent[] = Array.from({ length: beats }, (_, i) => (i === 0 ? 'a' : 'n'))
  if (unit === 8) {
    const groups = beats === 7 ? [2, 2, 3] : beats === 5 ? [3, 2] : beats % 3 === 0 ? Array(beats / 3).fill(3) : []
    let i = 0
    for (const g of groups) { out[i] = 'a'; i += g }
  }
  return out
}

// ── 세분(서브디비전): 한 박 안의 클릭 위치(박 길이 대비 비율) ──
export type Subdivision = 'none' | 'eighth' | 'triplet' | 'sixteenth' | 'swing'
export const SUBDIVISIONS: Record<Subdivision, number[]> = {
  none: [0],
  eighth: [0, 1 / 2],
  triplet: [0, 1 / 3, 2 / 3],
  sixteenth: [0, 1 / 4, 1 / 2, 3 / 4],
  swing: [0, 2 / 3], // 셋잇단 기반 스윙(2:1)
}

/** 스케줄러 한 스텝: 현재 위치(beat, sub) → 다음 위치와 그 사이 간격(초). 마디가 넘어가면 bar+1 */
export interface Pos { bar: number; beat: number; sub: number }
export function step(p: Pos, beats: number, subdiv: Subdivision, bpm: number): { next: Pos; dt: number } {
  const offs = SUBDIVISIONS[subdiv]
  const beatSec = 60 / bpm
  const sub = p.sub % offs.length // 재생 중 세분 변경 대비
  if (sub + 1 < offs.length) return { next: { ...p, sub: sub + 1 }, dt: (offs[sub + 1] - offs[sub]) * beatSec }
  const dt = (1 - offs[sub]) * beatSec
  const beat = p.beat + 1
  return beat >= beats ? { next: { bar: p.bar + 1, beat: 0, sub: 0 }, dt } : { next: { bar: p.bar, beat, sub: 0 }, dt }
}

// ── 스피드 트레이너: 매 everyBars 마디마다 stepBpm씩 target 쪽으로 (감속도 가능) ──
export function trainerBpm(start: number, target: number, stepBpm: number, everyBars: number, barsDone: number): number {
  const n = Math.floor(Math.max(0, barsDone) / Math.max(1, everyBars))
  const s = Math.abs(stepBpm) || 1
  const v = target >= start ? Math.min(target, start + n * s) : Math.max(target, start - n * s)
  return clampBpm(v)
}

// ── 설정 직렬화 (URL 공유 · localStorage 공용) ──
export type Sound = 'click' | 'wood' | 'beep'
export interface Settings {
  bpm: number; beats: number; unit: number; accents: Accent[]
  subdiv: Subdivision; sound: Sound; volume: number
  countIn: number; flash: boolean; vibrate: boolean
  trainer: boolean; trStart: number; trTarget: number; trStep: number; trEvery: number
  gap: number; stopMin: number
}
export const DEFAULTS: Settings = {
  bpm: 120, beats: 4, unit: 4, accents: defaultAccents(4, 4),
  subdiv: 'none', sound: 'click', volume: 0.8,
  countIn: 0, flash: false, vibrate: false,
  trainer: false, trStart: 80, trTarget: 120, trStep: 5, trEvery: 4,
  gap: 0, stopMin: 0,
}
const int = (v: string | null, lo: number, hi: number) => {
  const n = v == null || v === '' ? NaN : Math.round(Number(v))
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined
}
const oneOf = <T extends string>(v: string | null, xs: readonly T[]) => (xs as readonly string[]).includes(v ?? '') ? (v as T) : undefined

/** URL 쿼리 → 설정(유효한 값만 덮어씀). 공유 링크용 짧은 키 */
export function decodeSettings(get: (k: string) => string | null, base: Settings = DEFAULTS): Settings {
  const s = { ...base }
  s.bpm = int(get('bpm'), BPM_MIN, BPM_MAX) ?? s.bpm
  const ts = /^(\d{1,2})\/(2|4|8|16)$/.exec(get('ts') ?? '')
  if (ts && +ts[1] >= 1 && +ts[1] <= 16) {
    s.beats = +ts[1]; s.unit = +ts[2]
    s.accents = defaultAccents(s.beats, s.unit)
  }
  const acc = get('acc')
  if (acc && acc.length === s.beats && /^[anm]+$/.test(acc)) s.accents = acc.split('') as Accent[]
  if (s.accents.length !== s.beats) s.accents = defaultAccents(s.beats, s.unit)
  s.subdiv = oneOf(get('sub'), Object.keys(SUBDIVISIONS) as Subdivision[]) ?? s.subdiv
  s.sound = oneOf(get('snd'), ['click', 'wood', 'beep'] as const) ?? s.sound
  const vol = int(get('vol'), 0, 100); if (vol != null) s.volume = vol / 100
  s.countIn = int(get('ci'), 0, 2) ?? s.countIn
  const tr = /^(\d+)-(\d+)-(\d+)-(\d+)$/.exec(get('tr') ?? '')
  if (tr) {
    s.trainer = true
    s.trStart = clampBpm(+tr[1]); s.trTarget = clampBpm(+tr[2])
    s.trStep = Math.max(1, Math.min(50, +tr[3])); s.trEvery = Math.max(1, Math.min(64, +tr[4]))
  }
  s.gap = int(get('gap'), 0, 90) ?? s.gap
  return s
}
export function encodeSettings(s: Settings): URLSearchParams {
  const q = new URLSearchParams()
  q.set('bpm', String(s.bpm))
  q.set('ts', `${s.beats}/${s.unit}`)
  const acc = s.accents.join('')
  if (acc !== defaultAccents(s.beats, s.unit).join('')) q.set('acc', acc)
  if (s.subdiv !== 'none') q.set('sub', s.subdiv)
  if (s.sound !== 'click') q.set('snd', s.sound)
  if (s.countIn) q.set('ci', String(s.countIn))
  if (s.trainer) q.set('tr', `${s.trStart}-${s.trTarget}-${s.trStep}-${s.trEvery}`)
  if (s.gap) q.set('gap', String(s.gap))
  return q
}

// ── 합성 클릭음 (파일 없음). level: 0=강박 1=보통 2=세분 ──
export function synth(sound: Sound, level: 0 | 1 | 2, sampleRate: number): Float32Array<ArrayBuffer> {
  const spec = {
    click: { f: [2800, 2000, 1500], dur: 0.03, decay: 0.006, h: 0, noise: 0.25 },
    wood: { f: [1100, 820, 700], dur: 0.06, decay: 0.012, h: 2.7, noise: 0.05 },
    beep: { f: [1760, 880, 660], dur: 0.07, decay: 0.05, h: 0, noise: 0 },
  }[sound]
  const n = Math.round(spec.dur * sampleRate)
  const out = new Float32Array(n)
  const f = spec.f[level]
  let seed = 1
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const ramp = Math.min(1, i / 16) * Math.min(1, (n - i) / 32) // 어택/릴리스 램프로 팝 제거
    const env = Math.exp(-t / spec.decay)
    seed = (seed * 16807) % 2147483647
    const nz = spec.noise * (seed / 1073741823.5 - 1) * Math.exp(-t / 0.003)
    const tone = Math.sin(2 * Math.PI * f * t) + (spec.h ? 0.4 * Math.sin(2 * Math.PI * f * spec.h * t) : 0)
    out[i] = Math.max(-1, Math.min(1, 0.7 * ramp * (tone * env + nz)))
  }
  return out
}
