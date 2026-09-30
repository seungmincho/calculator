// 타자 연습 순수 로직: 자모 타수 · IME 안전 비교 · 속도/정확도 · 등급 · 오늘의 문장 · 지문
// 회귀 체크: node scripts/check-typing-test.ts
//
// 타수 규칙 (두벌식 기준, 한컴타자 방식): 자판 한 번 = 1타
//  - 닭 = ㄷㅏㄹㄱ 4타, 값 = ㄱㅏㅂㅅ 4타 (겹받침은 홑자음 2타)
//  - 과 = ㄱㅗㅏ 3타, 의 = ㅇㅡㅣ 3타 (겹모음은 2타)
//  - 쌍자음 ㄲㄸㅃㅆㅉ, ㅒㅖ = 1타 (Shift는 조합키라 세지 않음. 영어 대문자와 동일)
//  - 한글 외 문자(공백·문장부호·숫자·영문) = 1타

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
// 키보드에 없는 겹자모 → 실제로 누르는 키 순서
const SPLIT: Record<string, string> = {
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
  ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ',
}

const isSyllable = (ch: string) => ch >= '가' && ch <= '힣'
const isJamo = (ch: string) => ch >= 'ㄱ' && ch <= 'ㅣ'
export const isHangul = (ch: string) => isSyllable(ch) || isJamo(ch)

/** 한 글자를 치기 위해 누르는 키(자모) 순서 */
export function keys(ch: string): string[] {
  if (isSyllable(ch)) {
    const c = ch.charCodeAt(0) - 0xac00
    const parts = [CHO[Math.floor(c / 588)], JUNG[Math.floor((c % 588) / 28)], JONG[c % 28]]
    return parts.flatMap(j => [...(SPLIT[j] ?? j)])
  }
  if (isJamo(ch)) return [...(SPLIT[ch] ?? ch)]
  return [ch]
}
export const textKeystrokes = (s: string) => [...s].reduce((n, ch) => n + keys(ch).length, 0)

const isPrefix = (a: string[], b: string[]) => a.length <= b.length && a.every((k, i) => k === b[i])

// ── IME 안전 비교 ───────────────────────────────────────────────────────────
export type CharStatus = 'correct' | 'wrong' | 'composing' | 'pending'

/**
 * 목표 글자별 상태. 입력의 마지막 한글 글자는 조합 중일 수 있으므로,
 * 목표 글자(+다음 글자 초성: 달→다라 처럼 받침이 넘어가는 경우)의 키 순서 앞부분이면 'composing'.
 * 앞부분이 아니면 이미 틀린 키를 누른 것이므로 'wrong'.
 */
export function diffTyped(target: string, typed: string): CharStatus[] {
  const T = [...target], U = [...typed]
  return T.map((ch, i) => {
    if (i >= U.length) return 'pending'
    if (U[i] === ch) return 'correct'
    if (i === U.length - 1 && isHangul(U[i])) {
      const next = T[i + 1] && isSyllable(T[i + 1]) ? keys(T[i + 1]).slice(0, 1) : []
      if (isPrefix(keys(U[i]), [...keys(ch), ...next])) return 'composing'
    }
    return 'wrong'
  })
}

// ── 속도 · 정확도 ───────────────────────────────────────────────────────────
/** 맞게 친 타수: 맞은 글자 전체 + 조합 중인 글자의 입력된 키 */
export function correctKeystrokes(target: string, typed: string, st = diffTyped(target, typed)) {
  const T = [...target], U = [...typed]
  return st.reduce((n, s, i) => n + (s === 'correct' ? keys(T[i]).length : s === 'composing' ? keys(U[i]).length : 0), 0)
}
export const perMinute = (count: number, ms: number) => (ms > 0 ? Math.round((count * 60_000) / ms) : 0)
/** 영문 WPM: 맞은 글자 5개 = 1단어 */
export const wpm = (correctChars: number, ms: number) => perMinute(correctChars / 5, ms)
/** 정확도: 한 번이라도 틀렸던 글자 위치는 고쳐도 오타로 셈 (백스페이스로 100% 만들기 방지) */
export const accuracy = (reached: number, errors: number) =>
  reached > 0 ? Math.max(0, Math.round(((reached - errors) / reached) * 1000) / 10) : 100

/** 틀린 글자에서 놓친 자모 (목표 키 − 입력 키, 다중집합) */
export function missedKeys(targetCh: string, typedCh: string): string[] {
  const left = keys(typedCh)
  return keys(targetCh).filter(k => {
    const i = left.indexOf(k)
    if (i < 0) return true
    left.splice(i, 1)
    return false
  })
}
export function topMissed(errors: [string, string][], n = 5): [string, number][] {
  const m = new Map<string, number>()
  for (const [t, u] of errors) for (const k of missedKeys(t, u)) {
    const key = /[A-Z]/.test(k) ? k.toLowerCase() : k
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)
}

// ── 등급 ───────────────────────────────────────────────────────────────────
export type Lang = 'ko' | 'en'
// 한글 타/분, 영문 WPM 기준. 평균: 성인 한글 약 250타, 영문 약 40WPM
const GRADE_CUTS: Record<Lang, number[]> = { ko: [100, 200, 300, 400, 500, 600], en: [20, 30, 40, 60, 80, 100] }
export const AVERAGE: Record<Lang, number> = { ko: 250, en: 40 }
/** 0(입문) ~ 6(달인) */
export const gradeLevel = (speed: number, lang: Lang) => GRADE_CUTS[lang].filter(c => speed >= c).length
export const vsAverage = (speed: number, lang: Lang) => Math.round((speed / AVERAGE[lang] - 1) * 100)

// ── 오늘의 문장 (KST, hangman.ts 방식) ──────────────────────────────────────
const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000
const EPOCH = Date.UTC(2026, 0, 1) / DAY_MS
export const dayNumber = (now: number) => Math.floor((now + KST_MS) / DAY_MS) - EPOCH + 1

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
function shuffled<T>(arr: readonly T[], seed: number): T[] {
  const a = [...arr], rnd = mulberry32(seed)
  for (let k = a.length - 1; k > 0; k--) {
    const r = Math.floor(rnd() * (k + 1))
    ;[a[k], a[r]] = [a[r], a[k]]
  }
  return a
}
/** 한 주기(= 문장 수)동안 중복 없음, 주기마다 순서 다시 섞음 */
export function dailyIndex(day: number) {
  const n = TEXTS.ko.short.length
  const i = (((day - 1) % n) + n) % n
  return shuffled(TEXTS.ko.short.map((_, k) => k), 0x7e57 + Math.floor((day - 1) / n) * 7919)[i]
}
/** 시간제용 긴 흐름: 짧은 글을 섞어 두 바퀴 이어붙임 (분당 600타도 60초 안에 끝나지 않는 길이) */
export const streamText = (lang: Lang, seed: number) =>
  [...shuffled(TEXTS[lang].short, seed), ...shuffled(TEXTS[lang].short, seed + 1)].join(' ')

// ── 지문 ───────────────────────────────────────────────────────────────────
// ponytail: 오늘의 문장은 ko.short 순서로 결정됨 → 문장 추가/순서 변경 시 이후(당일 포함) 문장이 바뀜. 바꾸려면 자정 직후에.
// 긴 글은 저작권 만료 작품(윤동주 1945 사망, 김소월 1934 사망)·속담·직접 쓴 글만 사용.
export const TEXTS: Record<Lang, { short: readonly string[]; long: readonly string[] }> = {
  ko: {
    short: [
      '가는 말이 고와야 오는 말이 곱다.',
      '낮말은 새가 듣고 밤말은 쥐가 듣는다.',
      '천 리 길도 한 걸음부터 시작된다.',
      '닭 쫓던 개 지붕 쳐다보듯 한다.',
      '티끌 모아 태산이라는 말을 믿어 보자.',
      '원숭이도 나무에서 떨어질 때가 있다.',
      '백지장도 맞들면 낫다고 했습니다.',
      '호랑이에게 물려 가도 정신만 차리면 산다.',
      '세 살 버릇 여든까지 간다는 말이 있다.',
      '없는 게 없는 시장에서 떡볶이를 샀다.',
      '넓은 들판에 핀 꽃을 밟지 않도록 조심하세요.',
      '읽고 싶은 책을 여덟 권이나 빌려 왔다.',
      '맑은 하늘 아래 까치가 짖으면 반가운 손님이 온대요.',
      '값비싼 물건보다 소중한 것은 따뜻한 마음이다.',
      '오늘 저녁에는 된장찌개와 김치볶음밥을 먹자.',
      '외갓집 앞마당에는 오래된 감나무가 있었다.',
      '괜찮아요, 천천히 해도 충분히 잘하고 있어요.',
      '의자에 앉아 창밖의 눈 내리는 풍경을 보았다.',
      '꿈을 꾸는 사람은 쉽게 포기하지 않는다.',
      '빨간 우체통에 할머니께 쓴 편지를 넣었다.',
      '짧은 여행이었지만 잊지 못할 추억을 남겼다.',
      '뛰어난 사람도 처음에는 서툴렀다는 걸 기억하자.',
      '훈민정음은 백성을 가르치는 바른 소리라는 뜻이다.',
      '봄비가 그치자 개나리와 진달래가 활짝 피었다.',
      '회의가 끝나면 결과를 정리해서 공유해 주세요.',
      '월요일 아침마다 커피 한 잔으로 하루를 연다.',
      '흙을 만지며 텃밭을 가꾸는 일은 즐겁다.',
      '작은 습관이 쌓여 큰 변화를 만든다.',
      '실패는 성공으로 가는 길의 한 과정일 뿐이다.',
      '핸드폰을 내려놓고 가족과 이야기를 나눠 보세요.',
      '바다 위로 떠오르는 해가 무척 아름다웠다.',
      '냉장고에 남은 재료로 맛있는 볶음밥을 만들었다.',
      '어려운 문제일수록 차근차근 풀어 나가야 한다.',
      '겨울밤에는 군고구마와 붕어빵이 생각난다.',
      '웃는 얼굴에 침 못 뱉는다는 속담이 있다.',
      '쌍둥이 형제는 똑같은 옷을 입고 학교에 갔다.',
      '가을 운동회에서 우리 반이 줄다리기를 이겼다.',
      '낡은 자전거를 고쳐서 동네 한 바퀴를 돌았다.',
      '밝은 달빛이 조용한 골목길을 비추고 있었다.',
      '매일 조금씩 연습하면 손가락이 먼저 기억한다.',
    ],
    long: [
      '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다. 별을 노래하는 마음으로 모든 죽어 가는 것을 사랑해야지. 그리고 나한테 주어진 길을 걸어가야겠다. 오늘 밤에도 별이 바람에 스치운다.',
      '나 보기가 역겨워 가실 때에는 말없이 고이 보내 드리우리다. 영변에 약산 진달래꽃 아름 따다 가실 길에 뿌리우리다. 가시는 걸음걸음 놓인 그 꽃을 사뿐히 즈려밟고 가시옵소서.',
      '나라의 말이 중국과 달라 한자와는 서로 통하지 아니하므로, 어리석은 백성이 말하고자 하는 바가 있어도 끝내 제 뜻을 펴지 못하는 사람이 많다. 내가 이를 딱하게 여겨 새로 스물여덟 글자를 만드니, 사람마다 쉽게 익혀 날마다 쓰는 데 편하게 하고자 할 따름이다.',
      '가는 날이 장날이라더니 오랜만에 찾은 식당이 문을 닫았다. 소 잃고 외양간 고친다고 미리 전화해 볼 걸 그랬다. 그래도 구르는 돌에는 이끼가 끼지 않는다니, 발길을 돌려 새로운 가게를 찾아가 보기로 했다. 뜻밖에도 그 집 칼국수는 정말 맛있었다.',
      '타자 실력은 하루아침에 늘지 않는다. 처음에는 자판을 보지 않고 치는 것이 답답하게 느껴지지만, 손가락마다 맡은 자리를 지키다 보면 어느새 눈을 감고도 글자를 칠 수 있게 된다. 속도보다 정확도를 먼저 챙기고, 매일 짧게라도 꾸준히 연습하는 것이 가장 빠른 길이다.',
      '아는 길도 물어 가라는 말처럼 익숙한 일일수록 한 번 더 확인하는 습관이 필요하다. 돌다리도 두들겨 보고 건너라는 옛말도 같은 뜻이다. 서두르다 실수하는 것보다 조금 늦더라도 정확하게 해내는 편이 결국 시간을 아끼는 방법이다.',
    ],
  },
  en: {
    short: [
      'The quick brown fox jumps over the lazy dog.',
      'Practice makes perfect in everything you do.',
      'A journey of a thousand miles begins with a single step.',
      'Actions speak louder than words.',
      'Every cloud has a silver lining.',
      'Knowledge is power, and practice is the key.',
      'Small steps every day lead to big results.',
      'The early bird catches the worm.',
      'Keep your eyes on the screen, not the keys.',
      'Good habits are hard to build but easy to keep.',
      'Better late than never, but never late is better.',
      'Reading every day makes a full and curious mind.',
      'Fortune favors the bold and the well prepared.',
      'Honesty is the best policy in work and life.',
      'Slow and steady wins the race.',
      'Where there is a will, there is a way.',
    ],
    long: [
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.',
      'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.',
      'A crow, half dead with thirst, came upon a pitcher which had once been full of water. She dropped pebbles into it one by one until the water rose high enough for her to drink. Little by little does the trick.',
      'Touch typing means typing without looking at the keyboard. Rest your fingers on the home row, keep your wrists relaxed, and let each finger cover its own keys. Accuracy comes first; speed follows naturally with daily practice.',
    ],
  },
}
