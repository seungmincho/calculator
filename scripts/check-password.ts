// 비밀번호 생성기 회귀 체크: node scripts/check-password.ts
import {
  randomInt, shuffle, generatePassword, passwordEntropy, validLog2, validate, classSets, cleanSymbols,
  generatePassphrase, passphraseEntropy, analyzePassword, crackTime, gradeOf, AMBIGUOUS, type PwOptions,
} from '../src/utils/password.ts'
import { WORD_LIST } from '../src/utils/wordlist.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (c: boolean, msg: string) => { if (!c) { fail++; console.log('FAIL', msg) } }
const near = (a: number, b: number, tol: number, msg: string) => ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)

// 카이제곱(자유도 k-1). 임계값 ≈ k-1 + 4·sqrt(2(k-1)) (대략 p<1e-4) — 우연 실패는 사실상 없음
const chi = (counts: number[]) => {
  const n = counts.reduce((a, b) => a + b, 0), e = n / counts.length
  const x2 = counts.reduce((s, c) => s + (c - e) ** 2 / e, 0), df = counts.length - 1
  return { x2, limit: df + 4 * Math.sqrt(2 * df) }
}

// 1) randomInt 균등: 2^32에 안 나눠떨어지는 max(편향 확인용) — 상위 몇 개가 더 자주 나오면 안 됨
for (const max of [3, 10, 94, 1000]) {
  const c = new Array(max).fill(0)
  for (let i = 0; i < max * 2000; i++) c[randomInt(max)]++
  const { x2, limit } = chi(c)
  ok(x2 < limit, `randomInt(${max}) 균등 χ²=${x2.toFixed(1)} < ${limit.toFixed(1)}`)
}
// 2) 셔플 위치 균등: [0..4] 첫 원소가 각 자리에 고르게
{
  const c = new Array(5).fill(0)
  for (let i = 0; i < 50000; i++) c[shuffle([0, 1, 2, 3, 4]).indexOf(0)]++
  const { x2, limit } = chi(c); ok(x2 < limit, `shuffle 위치 χ²=${x2.toFixed(1)}`)
}

const base: PwOptions = { length: 16, upper: true, lower: true, digits: true, symbols: true, symbolSet: '!@#$%^&*', excludeAmbiguous: false, noRepeat: false }

// 3) 필수 종류 포함·제외 문자 미포함·허용 특수문자만
{
  const o = { ...base, length: 8, symbolSet: '!@#$', excludeAmbiguous: true }
  let allOk = true
  for (let i = 0; i < 3000; i++) {
    const p = generatePassword(o)
    if (p.length !== 8 || !/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/\d/.test(p) || !/[!@#$]/.test(p)) allOk = false
    if ([...p].some((c) => AMBIGUOUS.includes(c) || !/[A-Za-z0-9!@#$]/.test(c))) allOk = false
  }
  ok(allOk, '필수 종류 포함 / 헷갈리는 문자·비허용 특수문자 없음')
}
// 4) 연속 금지
{
  let bad = 0
  for (let i = 0; i < 2000; i++) if (/(.)\1/.test(generatePassword({ ...base, length: 40, upper: false, symbols: false, digits: false, noRepeat: true }))) bad++
  eq(bad, 0, '같은 문자 연속 없음')
}
// 5) 위치 편향 없음: 숫자 1종만 필수인 짧은 비밀번호에서 숫자가 각 자리에 고르게
{
  const o = { ...base, length: 6, upper: false, symbols: false }
  const c = new Array(6).fill(0)
  for (let i = 0; i < 30000; i++) [...generatePassword(o)].forEach((ch, k) => { if (/\d/.test(ch)) c[k]++ })
  const { x2, limit } = chi(c); ok(x2 < limit, `숫자 위치 χ²=${x2.toFixed(1)}`)
}
// 6) 문자 균등: 소문자만, 각 글자 빈도
{
  const c = new Array(26).fill(0)
  for (let i = 0; i < 4000; i++) for (const ch of generatePassword({ ...base, upper: false, digits: false, symbols: false, length: 13 })) c[ch.charCodeAt(0) - 97]++
  const { x2, limit } = chi(c); ok(x2 < limit, `소문자 빈도 χ²=${x2.toFixed(1)}`)
}

// 7) 엔트로피 = 실제 유효 문자열 수 (작은 알파벳 전수 열거)
const brute = (sizes: number[], L: number, noRepeat: boolean) => {
  const owner = sizes.flatMap((s, k) => new Array(s).fill(k)), N = owner.length
  let n = 0
  for (let x = 0; x < N ** L; x++) {
    const d: number[] = []; let v = x
    for (let i = 0; i < L; i++) { d.push(v % N); v = Math.floor(v / N) }
    if (noRepeat && d.some((c, i) => i && c === d[i - 1])) continue
    if (sizes.every((_, k) => d.some((c) => owner[c] === k))) n++
  }
  return Math.log2(n)
}
for (const [sizes, L, nr] of [[[2, 1, 2], 4, false], [[2, 1, 2], 4, true], [[3, 2], 5, false], [[1, 1, 3], 5, true], [[4], 3, true]] as const)
  near(validLog2([...sizes], L, nr), brute([...sizes], L, nr), 1e-9, `엔트로피 열거 ${sizes} L=${L} noRepeat=${nr}`)
// 전체 94자(대26+소26+숫10+특32)·16자 = 16·log2(94) − 필수 포함 손실(작음)
{
  const o = { ...base, symbolSet: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' }
  eq(classSets(o).flat().length, 94, '풀 94자')
  const e = passwordEntropy(o)
  ok(e < 16 * Math.log2(94) && e > 16 * Math.log2(94) - 1, `16자 전체 ≈104.9비트 (필수 포함 반영 ${e.toFixed(2)})`)
}
// 헷갈리는 문자 제외 반영: 대24+소25+숫8 = 57
eq(classSets({ ...base, symbols: false, excludeAmbiguous: true }).flat().length, 57, '0O1lI 제외 후 57자')
eq(cleanSymbols('!!@a1 #한'), '!@#', '특수문자 정리')
eq(validate({ ...base, symbolSet: 'abc' }), 'symbolEmpty', '특수문자 비면 오류')
eq(validate({ ...base, length: 3 }), 'tooShort', '길이 < 종류 수')
eq(validate({ ...base, upper: false, lower: false, digits: false, symbols: false }), 'noCharType', '종류 없음')
// PIN 6자리 = log2(10^6)
near(passwordEntropy({ ...base, length: 6, upper: false, lower: false, symbols: false }), Math.log2(1e6), 1e-9, 'PIN 6')
near(passwordEntropy({ ...base, length: 6, upper: false, lower: false, symbols: false, noRepeat: true }), Math.log2(10 * 9 ** 5), 1e-9, 'PIN 6 연속 금지')

// 8) 패스프레이즈: 단어 목록 중복 없음, 구분자는 엔트로피에 안 들어감
eq(new Set(WORD_LIST).size, WORD_LIST.length, '단어 목록 중복 없음')
ok(WORD_LIST.every((w) => /^[a-z]+$/.test(w)), '단어는 소문자만')
near(passphraseEntropy({ words: 6, separator: '-', capitalize: true, addNumber: false }, WORD_LIST.length), 6 * Math.log2(WORD_LIST.length), 1e-9, '6단어')
near(passphraseEntropy({ words: 6, separator: '-', capitalize: true, addNumber: true }, WORD_LIST.length), 6 * Math.log2(WORD_LIST.length) + Math.log2(60), 1e-9, '6단어+숫자')
{
  const p = generatePassphrase({ words: 5, separator: '.', capitalize: true, addNumber: true }, WORD_LIST)
  const parts = p.split('.')
  ok(parts.length === 5 && parts.every((w) => /^[A-Z][a-z]+\d?$/.test(w)) && (p.match(/\d/g) || []).length === 1, `패스프레이즈 형식 ${p}`)
}

// 9) 등급·크랙 시간
eq([30, 50, 60, 80, 110].map(gradeOf), ['veryWeak', 'weak', 'medium', 'strong', 'veryStrong'], '등급')
eq(crackTime(20).unit, 'instant', '20비트 즉시')
eq(crackTime(50), { unit: 'hours', value: 16 }, '50비트 ≈ 15.6시간')
eq(crackTime(105).unit, 'overBillionYears', '105비트')

// 10) 패턴 감지
const types = (pw: string) => analyzePassword(pw).patterns.map((p) => p.type)
eq(types('password'), ['common'], '흔한 비밀번호')
eq(types('P@ssw0rd!'), ['common'], 'leet+기호')
eq(types('qwer1234'), ['common'], 'qwer1234')
eq(types('qwer1234!kim950312'), ['common', 'date'], '흔한 비밀번호 포함 + 날짜')
eq(types('mypassword99'), ['common'], '흔한 단어 포함')
ok(types('Kasdfg9').includes('keyboard'), '키보드 연속')
ok(types('xyzabc').includes('sequence'), 'abc 연속')
ok(types('Kq!aaaa9').includes('repeat'), '같은 문자 반복')
ok(types('tigertiger').includes('repeat'), '덩어리 반복')
ok(types('Kim1995!').includes('year'), '연도')
ok(types('kim950312').includes('date'), '생년월일')
ok(types('01012345678x').includes('phone') && !types('01012345678x').includes('date'), '휴대폰(날짜 중복 제외)')
eq(types('Vq7#mT2!pZ9@'), [], '랜덤은 패턴 없음')
ok(analyzePassword('password').bits < 10, '흔한 비밀번호는 매우 낮은 비트')
ok(analyzePassword('Vq7#mT2!pZ9@xR4$').bits > 100, '16자 랜덤은 높음')
ok(analyzePassword('qwerty123!').suggestions.includes('common'), '제안: 흔한 비밀번호')
eq(analyzePassword('').bits, 0, '빈 입력')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-password: all passed')
