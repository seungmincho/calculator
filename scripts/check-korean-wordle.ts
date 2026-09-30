// 한글 워들 로직 회귀 체크: node scripts/check-korean-wordle.ts
import {
  syllableKeys, wordKeys, compose, score, keyStatuses, hardModeError, statusOf,
  ANSWERS, VALID, KEYS, KEY_ROWS, dayNumber, msToNextDay, dayFromDate, dailyAnswer,
  computeStats, shareText, shareGrid, keyToJamo, type WordLen,
} from '../src/utils/koreanWordle.ts'

let fail = 0
const eq = (name: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const C = 'correct', P = 'present', A = 'absent'

// ── 자모 분해 (키 입력 단위) ──
eq('keys 과', syllableKeys('과'), ['ㄱ', 'ㅗ', 'ㅏ'])
eq('keys 닭', syllableKeys('닭'), ['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ'])
eq('keys 까', syllableKeys('까'), ['ㄲ', 'ㅏ'])
eq('keys 의', syllableKeys('의'), ['ㅇ', 'ㅡ', 'ㅣ'])

// ── 두벌식 조합 ──
const typed = (s: string) => compose([...s])
eq('compose 사랑', typed('ㅅㅏㄹㅏㅇ'), '사랑')
eq('compose 과자', typed('ㄱㅗㅏㅈㅏ'), '과자')
eq('compose 닭', typed('ㄷㅏㄹㄱ'), '닭')
eq('compose 닭+ㅏ → 달가', typed('ㄷㅏㄹㄱㅏ'), '달가')
eq('compose 갑+ㅏ → 가바', typed('ㄱㅏㅂㅏ'), '가바')
eq('compose ㄸ 받침 불가', typed('ㄱㅏㄸ'), '가ㄸ')
eq('compose 자음만', typed('ㄱㄴ'), 'ㄱㄴ')
eq('compose 모음만', typed('ㅏ'), 'ㅏ')
eq('compose 의사', typed('ㅇㅡㅣㅅㅏ'), '의사')

// ── 채점: 초록 먼저, 노랑은 남은 개수만큼 ──
eq('score exact', score('사랑', '사랑'), [[C, C], [C, C, C]])
// 정답 사과(ㅅㅏ ㄱㅗㅏ), 추측 가사(ㄱㅏ ㅅㅏ): ㄱ노랑, 첫 ㅏ 초록, ㅅ노랑, 둘째 ㅏ: 정답에 ㅏ 2개(사·과) 중 1개 남음 → 노랑
eq('score 가사/사과', score('가사', '사과'), [[P, C], [P, P]])
// 정답 기차(ㄱㅣ ㅊㅏ) 추측 가가(ㄱㅏ ㄱㅏ): 첫 ㄱ 초록 → 둘째 ㄱ은 남은 ㄱ 없음 → 회색, ㅏ: 둘째 초록, 첫째는 남은 ㅏ 없음 → 회색
eq('score dup green first', score('가가', '기차'), [[C, A], [A, C]])
// 정답 나라 추측 라라: 둘째 ㄹ 초록이 먼저 가져감 → 첫 ㄹ 회색 (노랑 아님)
eq('score dup no extra yellow', score('라라', '나라'), [[A, C], [C, C]])
// 정답 사랑 추측 랑사: 음절 안 자리까지 다름 → 전부 노랑/회색
eq('score 랑사/사랑', score('랑사', '사랑'), [[P, C, P], [P, C]])
// 받침 유무가 달라 음절 길이 다름
eq('score 과일/가을', score('과일', '가을'), [[C, A, P], [C, A, C]])

eq('statusOf won', statusOf(['나무', '사랑'], '사랑'), 'won')
eq('statusOf lost', statusOf(Array(6).fill('나무'), '사랑'), 'lost')
eq('statusOf playing', statusOf(['나무'], '사랑'), 'playing')

// 키 색: 초록 > 노랑 > 회색
const ks = keyStatuses(['라라', '나무'], '나라')
eq('key ㄹ correct', ks['ㄹ'], C)
eq('key ㄴ correct', ks['ㄴ'], C)
eq('key ㅜ absent', ks['ㅜ'], A)

// ── 하드 모드 ──
eq('hard ok', hardModeError('가사', '사과', '사가'), null)
eq('hard missing green', hardModeError('가사', '사과', '소과'), { kind: 'correct', jamo: 'ㅏ' })
eq('hard missing yellow', hardModeError('나무', '누나', '나비'), { kind: 'present', jamo: 'ㅜ' })

// ── 단어장 무결성 ──
for (const len of [2, 3] as WordLen[]) {
  const ans = ANSWERS[len]
  eq(`answers ${len} no dup`, ans.length, new Set(ans).size)
  for (const a of ans) {
    if (!VALID[len].has(a)) { fail++; console.log('answer not valid', a) }
  }
  for (const v of VALID[len]) {
    if ([...v].length !== len || ![...v].every(ch => /^[가-힣]$/.test(ch))) { fail++; console.log('bad word', len, v) }
    // 화면 키보드만으로 입력 가능한지: 키 분해 → 모든 키가 키보드에 있고, 두벌식 조합이 원래 단어를 만든다
    const keys = wordKeys(v).flat()
    if (!keys.every(k => KEYS.has(k))) { fail++; console.log('key not on keyboard', v) }
    if (compose(keys) !== v) { fail++; console.log('not typeable', v, compose(keys)) }
  }
}
if (ANSWERS[2].length < 365) { fail++; console.log('daily answers < 1 year', ANSWERS[2].length) }
eq('keyboard rows cover KEYS', new Set(KEY_ROWS.flat()).size, KEYS.size)
console.log(`words: answers2=${ANSWERS[2].length} valid2=${VALID[2].size} answers3=${ANSWERS[3].length} valid3=${VALID[3].size}`)

// ── 회차 (KST 자정) ──
const kstMidnight = Date.UTC(2025, 11, 31, 15) // 2026-01-01 00:00 KST
eq('day #1', dayNumber(kstMidnight), 1)
eq('day #0 1ms before', dayNumber(kstMidnight - 1), 0)
eq('day 2026-10-01 23:59 KST', dayNumber(Date.UTC(2026, 9, 1, 14, 59)), 274)
eq('day 2026-10-02 00:00 KST', dayNumber(Date.UTC(2026, 9, 1, 15)), 275)
eq('dayFromDate', dayFromDate('2026-10-01'), 274)
eq('countdown at midnight', msToNextDay(kstMidnight), 86_400_000)
eq('countdown 1ms before', msToNextDay(kstMidnight - 1), 1)
// 한 주기 동안 중복 없음, 결정적
const n = ANSWERS[2].length
eq('daily unique over cycle', new Set(Array.from({ length: n }, (_, i) => dailyAnswer(i + 1))).size, n)
eq('daily deterministic', dailyAnswer(274), dailyAnswer(274))

// ── 통계 ──
const ans = (d: number) => dailyAnswer(d)
const wrong = (d: number) => [...VALID[2]].find(x => x !== ans(d))!
const win = (d: number, k: number) => ({ guesses: [...Array(k - 1).fill(wrong(d)), ans(d)] })
const lose = (d: number) => ({ guesses: Array(6).fill(wrong(d)) })
const recs = { 10: win(10, 3), 11: win(11, 4), 12: lose(12), 13: win(13, 1), 14: win(14, 2), 15: { guesses: [wrong(15)] } }
const st = computeStats(recs, 15)
eq('played (in-progress 제외)', st.played, 5)
eq('winRate', st.winRate, 80)
eq('dist', st.dist, [1, 1, 1, 1, 0, 0])
eq('maxStreak', st.maxStreak, 2)
eq('current (오늘 미완료 → 어제까지)', st.current, 2)
eq('current 끊김', computeStats(recs, 17).current, 0)
eq('current 오늘 패배', computeStats({ ...recs, 15: lose(15) }, 15).current, 0)
// 구버전 통계 연결
const legacy = { played: 10, wins: 8, dist: [0, 2, 3, 3, 0, 0], maxStreak: 5, streak: 4, lastDay: 9 }
const sl = computeStats(recs, 15, legacy)
eq('legacy played', sl.played, 15)
eq('legacy dist', sl.dist, [1, 3, 4, 4, 0, 0])
eq('legacy maxStreak (4 + 10,11)', sl.maxStreak, 6)
eq('legacy current only', computeStats({}, 10, legacy).current, 4)
eq('legacy current links', computeStats({ 10: win(10, 2) }, 10, legacy).current, 5)
eq('legacy current broken', computeStats({}, 12, legacy).current, 0)

// ── 공유 ──
eq('grid', shareGrid(['가사', '사과'], '사과'), '🟨🟩 🟨🟨\n🟩🟩 🟩🟩🟩')
eq('grid contrast', shareGrid(['사과'], '사과', true), '🟧🟧 🟧🟧🟧')
eq('share won hard', shareText('툴허브 한글 워들', 274, ['가사', '사과'], '사과', { hard: true, url: 'https://x' }),
  '툴허브 한글 워들 #274 2/6*\n\n🟨🟩 🟨🟨\n🟩🟩 🟩🟩🟩\n\nhttps://x')
eq('share lost', shareText('T', 1, Array(6).fill('가사'), '사과').split('\n')[0], 'T #1 X/6')
if (shareText('T', 1, ['가사', '사과'], '사과').includes('사과')) { fail++; console.log('share spoils answer') }

// ── 물리 키보드 ──
eq('IME on', keyToJamo('ㄱ', 'KeyR', false), 'ㄱ')
eq('IME off', keyToJamo('r', 'KeyR', false), 'ㄱ')
eq('IME off shift', keyToJamo('R', 'KeyR', true), 'ㄲ')
eq('IME Process', keyToJamo('Process', 'KeyK', false), 'ㅏ')
eq('shift no double', keyToJamo('K', 'KeyK', true), 'ㅏ')
eq('digit', keyToJamo('1', 'Digit1', false), null)

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('korean-wordle: all checks passed')
