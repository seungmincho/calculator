// 인사말 생성기 회귀 체크: node scripts/check-greetings.ts
import { SITUATIONS, RECIPIENTS, TONES, LENGTHS, ganji, zodiac, dateContext, combos, generate, render, vocative, signature, sentences, smsInfo, type Options } from '../src/utils/greetings.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (c: boolean, msg: string) => { if (!c) { fail++; console.log('FAIL', msg) } }

// 간지
eq([ganji(2024), ganji(2025), ganji(2026), ganji(2027)], ['갑진', '을사', '병오', '정미'], '간지')
eq([zodiac(2026), zodiac(2027)], ['붉은 말', '붉은 양'], '띠')

// 날짜 문맥 (2027 설 2/7 → 연휴 2/6~, 추석 9/15 → 9/14~)
const ctx = dateContext(new Date(2026, 9, 2))
eq(ctx, { yearEnd: 2026, newYear: 2027, seollal: { year: 2027, from: null }, chuseok: { year: 2027, from: null } }, '2026-10-02 문맥: 명절이 45일 넘게 남으면 날짜 없음')
eq(dateContext(new Date(2027, 0, 10)).seollal, { year: 2027, from: '2월 6일' }, '설 27일 전이면 날짜 표시')
eq(dateContext(new Date(2027, 7, 20)).chuseok, { year: 2027, from: '9월 14일' }, '추석 25일 전이면 날짜 표시')
const jan = dateContext(new Date(2027, 0, 10))
eq([jan.yearEnd, jan.newYear, jan.seollal?.year], [2026, 2027, 2027], '1월이면 막 시작된 해')
eq(dateContext(new Date(2026, 8, 26)).chuseok, { year: 2026, from: '9월 24일' }, '추석 연휴 중이면 올해 추석')

// 이름·서명
eq([vocative('민수', 'friend', 'casual'), vocative('지은', 'friend', 'casual'), vocative('김 부장', 'boss', 'formal'), vocative('김 부장님', 'boss', 'formal'), vocative('엄마', 'family', 'casual')],
  ['민수야', '지은아', '김 부장님', '김 부장님', '엄마'], '부르는 말')
eq([signature('홍길동', 'boss', 'formal'), signature('툴허브 홍길동', 'client', 'formal'), signature('민수', 'friend', 'casual')], ['홍길동 올림', '툴허브 홍길동 드림', '- 민수'], '서명')
const named = generate({ situation: 'birthday', recipient: 'friend', tone: 'casual', length: 'medium', seed: 3, name: '지은', sender: '민수' }, ctx)
ok(named.every((m) => m.startsWith('지은아, ') && m.endsWith('\n\n- 민수')), '이름 치환: ' + named[0])

// 시드 재현성
const base: Options = { situation: 'yearEnd', recipient: 'client', tone: 'formal', length: 'medium', seed: 42 }
eq(generate(base, ctx), generate({ ...base }, ctx), '같은 시드 = 같은 결과')
ok(JSON.stringify(generate(base, ctx)) !== JSON.stringify(generate({ ...base, seed: 43 }, ctx)), '다른 시드 = 다른 결과')

// SMS
eq(smsInfo('새해 복 많이 받으세요.'), { chars: 13, bytes: 22, type: 'SMS' }, 'SMS 바이트')
eq(smsInfo('생일 축하해 🎂').type, 'LMS', '이모지는 LMS')

// 말투 일관성 + 빈 문구·중복 + 개수: 모든 조합
const END = {
  formal: /(니다|니까|시오)[.!?]?$/,
  polite: /(요|니다|니까|죠)[.!?]?$/,
  casual: /^(?!.*(습니다|세요|십시오|니다|요[.!?]?$)).*$/,
}
const rows: string[] = []
for (const s of SITUATIONS) for (const tone of TONES) {
  const counts: number[] = []
  for (const r of RECIPIENTS) for (const l of LENGTHS) {
    const all = combos(s, r, tone, l)
    const need = l === 'short' ? 6 : 8
    ok(all.length >= need, `${s}/${r}/${tone}/${l} 조합 ${all.length} < ${need}`)
    if (l === 'medium') counts.push(all.length)
    for (const parts of all) {
      for (const sen of sentences(render(parts, { situation: s, recipient: r, tone, length: l, seed: 0 }, ctx))) {
        ok(END[tone].test(sen), `${s}/${r}/${tone} 말투 어긋남: ${sen}`)
      }
    }
    for (const c of [ctx, null]) for (const emoji of [false, true]) {
      const out = generate({ situation: s, recipient: r, tone, length: l, seed: 7, emoji }, c)
      ok(out.length === 6, `${s}/${r}/${tone}/${l} 6개 아님`)
      ok(new Set(out).size === out.length, `${s}/${r}/${tone}/${l} 중복`)
      ok(out.every((m) => m.trim().length > 0 && !/[{}]/.test(m) && !/\s{2,}\S/.test(m.replace(/\n\n/g, '\n'))), `${s}/${r}/${tone}/${l} 빈 문구·토큰 남음: ${out.find((m) => /[{}]/.test(m))}`)
    }
  }
  rows.push(`${s}/${tone}: 보통 길이 조합 ${Math.min(...counts)}~${Math.max(...counts)}개`)
}

// 날짜 토큰이 들어가는지
ok(generate({ situation: 'newYear', recipient: 'client', tone: 'formal', length: 'long', seed: 1 }, ctx).concat(
  combos('newYear', 'client', 'formal', 'short').map((p) => render(p, { situation: 'newYear', recipient: 'client', tone: 'formal', length: 'short', seed: 0 }, ctx))
).some((m) => m.includes('정미년 새해')), '정미년 반영')
ok(combos('seollal', 'boss', 'formal', 'short').map((p) => render(p, { ...base, situation: 'seollal', recipient: 'boss' }, dateContext(new Date(2027, 0, 10)))).some((m) => m.includes('2월 6일부터 시작되는 설 연휴')), '설 연휴 날짜 반영')

console.log(rows.join('\n'))
console.log(fail ? `${fail} FAIL` : 'all ok')
if (fail) process.exit(1)
