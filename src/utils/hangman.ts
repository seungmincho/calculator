// 한글 단어 맞추기(행맨) 순수 로직: 자모 분해 · 단어장 · 오늘의 단어 · 통계 · 공유 문구 · 두벌식 키 매핑
// 회귀 체크: node scripts/check-hangman.ts

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
// 겹받침은 키보드에 없으므로 홑자음으로 분해 (닭 → ㄷㅏㄹㄱ)
const JONG = ['','ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

export const ALL_JAMO = new Set([...CHO, ...JUNG])

export function decompose(ch: string): string[] {
  const c = ch.charCodeAt(0) - 0xac00
  if (c < 0 || c > 11171) return [ch]
  return [CHO[Math.floor(c / 588)], JUNG[Math.floor((c % 588) / 28)], ...JONG[c % 28]]
}

export const wordJamos = (w: string) => new Set([...w].flatMap(decompose))
export const isRevealed = (ch: string, guessed: Set<string>) => decompose(ch).every(j => guessed.has(j))
export const countWrong = (word: string, guesses: string[]) => {
  const js = wordJamos(word)
  return guesses.filter(g => !js.has(g)).length
}
export function gameStatus(word: string, guesses: string[], max: number): 'playing' | 'won' | 'lost' {
  const g = new Set(guesses)
  if ([...word].every(ch => isRevealed(ch, g))) return 'won'
  return countWrong(word, guesses) >= max ? 'lost' : 'playing'
}

// ── 단어장 ─────────────────────────────────────────────────────────────────
// ponytail: 오늘의 단어는 이 배열 순서에서 결정됨 → 단어 추가/순서 변경 시 이후 날짜의 단어가 바뀜(당일 단어도). 바꾸려면 자정 직후에.
export const WORD_BANK = {
  animals: ['코끼리','사자','호랑이','기린','펭귄','고양이','강아지','다람쥐','햄스터','앵무새','돌고래','코뿔소','하마','치타','독수리','거북이','토끼','여우','늑대','부엉이','오리','고슴도치','캥거루','판다','원숭이','낙타','얼룩말','고래','문어','까치'],
  food: ['김치찌개','비빔밥','된장찌개','떡볶이','김밥','냉면','삼겹살','불고기','잡채','라면','만두','칼국수','순두부','갈비탕','팥빙수','떡국','짜장면','짬뽕','부대찌개','삼계탕','순대','호떡','붕어빵','떡갈비','잔치국수','닭갈비','제육볶음','곱창'],
  countries: ['대한민국','일본','중국','미국','영국','프랑스','독일','브라질','호주','캐나다','이탈리아','스페인','인도','멕시코','태국','베트남','필리핀','러시아','이집트','스위스','네덜란드','뉴질랜드','아르헨티나','튀르키예','그리스','몽골','칠레','노르웨이','포르투갈'],
  fruits: ['사과','바나나','포도','딸기','수박','참외','복숭아','블루베리','키위','망고','자두','체리','레몬','파인애플','귤','오렌지','멜론','석류','무화과','아보카도','코코넛','라임','한라봉','산딸기','청포도','자몽'],
  jobs: ['선생님','의사','간호사','경찰관','소방관','요리사','변호사','약사','기자','가수','배우','화가','작가','군인','농부','어부','미용사','목수','판사','조종사','승무원','과학자','운동선수','사진작가','프로그래머'],
  sports: ['축구','야구','농구','배구','탁구','테니스','골프','수영','스키','태권도','유도','씨름','양궁','마라톤','볼링','당구','펜싱','복싱','배드민턴','스케이트','체조','역도','요가','등산'],
  things: ['우산','시계','안경','냉장고','세탁기','텔레비전','컴퓨터','자전거','비행기','기차','연필','지우개','가방','의자','책상','휴대폰','선풍기','에어컨','칫솔','거울','베개','이불','달력','신발','모자'],
} as const
export type Category = keyof typeof WORD_BANK
export const CATEGORIES = Object.keys(WORD_BANK) as Category[]

const ALL_WORDS: { word: string; category: Category }[] =
  CATEGORIES.flatMap(category => WORD_BANK[category].map(word => ({ word, category })))

// ── 오늘의 단어 (KST 기준) ──────────────────────────────────────────────────
const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000
const EPOCH = Date.UTC(2026, 0, 1) / DAY_MS // 2026-01-01(KST) = #1

/** KST 날짜 기준 회차 번호 (2026-01-01 = 1) */
export const dayNumber = (now: number) => Math.floor((now + KST_MS) / DAY_MS) - EPOCH + 1
/** 다음 KST 자정까지 남은 ms */
export const msToNextDay = (now: number) => DAY_MS - ((now + KST_MS) % DAY_MS)

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** 단어장 전체를 한 바퀴 돌 때까지 중복 없음(주기마다 다른 순서로 섞음) */
export function dailyWord(day: number) {
  const n = ALL_WORDS.length
  const i = (((day - 1) % n) + n) % n
  const cycle = Math.floor((day - 1) / n)
  const order = ALL_WORDS.map((_, k) => k)
  const rnd = mulberry32(0x70a1 + cycle * 7919)
  for (let k = n - 1; k > 0; k--) {
    const r = Math.floor(rnd() * (k + 1))
    ;[order[k], order[r]] = [order[r], order[k]]
  }
  return ALL_WORDS[order[i]]
}

export const randomWord = (cat: Category | 'all', rnd = Math.random) => {
  const pool = cat === 'all' ? ALL_WORDS : ALL_WORDS.filter(w => w.category === cat)
  return pool[Math.floor(rnd() * pool.length)]
}

// ── 통계 ───────────────────────────────────────────────────────────────────
export interface DayRecord { guesses: string[]; wrong: number; status: 'playing' | 'won' | 'lost' }
export type DailyRecords = Record<number, DayRecord>

export function computeStats(records: DailyRecords, today: number, max: number) {
  const done = Object.entries(records)
    .map(([d, r]) => ({ day: Number(d), ...r }))
    .filter(r => r.status !== 'playing')
    .sort((a, b) => a.day - b.day)
  const wins = done.filter(r => r.status === 'won')
  const dist = Array.from({ length: max }, (_, k) => wins.filter(r => r.wrong === k).length)

  let maxStreak = 0, run = 0, prev = -Infinity
  for (const r of done) {
    run = r.status === 'won' ? (r.day === prev + 1 ? run + 1 : 1) : 0
    prev = r.day
    maxStreak = Math.max(maxStreak, run)
  }
  // 오늘 아직 안 풀었으면 어제까지의 연속 기록 유지
  let current = 0
  let d = records[today]?.status === 'won' || records[today]?.status === 'lost' ? today : today - 1
  while (records[d]?.status === 'won') { current++; d-- }

  return {
    played: done.length,
    winRate: done.length ? Math.round((wins.length / done.length) * 100) : 0,
    current,
    maxStreak,
    dist,
    losses: done.length - wins.length,
  }
}

/** 워들식 공유 문구: 맞힘 🟦 / 틀림 ⬛ */
export function shareText(title: string, word: string, guesses: string[], won: boolean, max: number, url: string) {
  const js = wordJamos(word)
  const cells = guesses.map(g => (js.has(g) ? '🟦' : '⬛'))
  const rows: string[] = []
  for (let k = 0; k < cells.length; k += 8) rows.push(cells.slice(k, k + 8).join(''))
  const score = won ? `${countWrong(word, guesses)}/${max}` : `X/${max}`
  return `${title} ${score}\n${rows.join('\n')}\n${url}`
}

// ── 물리 키보드 (두벌식) ────────────────────────────────────────────────────
const QWERTY = 'qwertyuiopasdfghjklzxcvbnm'
const DUBEOL = 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ'
const SHIFTED: Record<string, string> = { q: 'ㅃ', w: 'ㅉ', e: 'ㄸ', r: 'ㄲ', t: 'ㅆ', o: 'ㅒ', p: 'ㅖ' }

/** KeyboardEvent → 자모. 한글 IME가 켜져 있으면 key가 자모, 꺼져 있으면 code(KeyR 등)로 두벌식 매핑 */
export function keyToJamo(key: string, code: string, shift: boolean): string | null {
  if (ALL_JAMO.has(key)) return key
  const m = /^Key([A-Z])$/.exec(code)
  if (!m) return null
  const l = m[1].toLowerCase()
  if (shift && SHIFTED[l]) return SHIFTED[l]
  const i = QWERTY.indexOf(l)
  return i < 0 ? null : DUBEOL[i]
}

/** 화면 키보드 배열: 두벌식 3줄 + 쌍자음/이중모음 */
export const KEY_ROWS = [
  [...'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ'],
  [...'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ'],
  [...'ㅋㅌㅊㅍㅠㅜㅡ'],
  [...'ㅃㅉㄸㄲㅆㅒㅖ'],
  [...'ㅘㅙㅚㅝㅞㅟㅢ'],
]
