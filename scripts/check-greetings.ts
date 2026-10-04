// 인사말 생성기 회귀 체크: node scripts/check-greetings.ts
import { SITUATIONS, TONES, LENGTHS, recipientsFor, defaultTone, seasonal, kstToday, ganji, zodiac, dateContext, combos, generate, render, vocative, signature, sentences, smsInfo, type Options } from '../src/utils/greetings.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (c: boolean, msg: string) => { if (!c) { fail++; console.log('FAIL', msg) } }

// 간지
eq([ganji(2024), ganji(2025), ganji(2026), ganji(2027)], ['갑진', '을사', '병오', '정미'], '간지')
eq([zodiac(2026), zodiac(2027)], ['붉은 말', '붉은 양'], '띠')
eq([ganji(2028), zodiac(2028)], ['무신', '황금 원숭이'], '2028 무신년')
eq([dateContext(new Date(2026, 11, 28)).newYear, dateContext(new Date(2027, 11, 28)).newYear, dateContext(new Date(2028, 0, 5)).newYear], [2027, 2028, 2028], '다가올 새해: 12월이면 다음 해, 1월이면 올해')

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
// 건배 구호(선창/후창)·삼행시 줄은 말투 검사에서 뺀다
const spoken = (m: string) => m.split('\n').filter((l) => !/^(선창:|[가-힣]! )/.test(l)).join('\n')
const rows: string[] = []
for (const s of SITUATIONS) for (const tone of TONES) {
  const counts: number[] = []
  for (const r of recipientsFor(s)) for (const l of LENGTHS) {
    const all = combos(s, r, tone, l)
    const need = l === 'short' ? 6 : 8
    ok(all.length >= need, `${s}/${r}/${tone}/${l} 조합 ${all.length} < ${need}`)
    if (l === 'medium') counts.push(all.length)
    for (const parts of all) {
      for (const sen of sentences(spoken(render(parts, { situation: s, recipient: r, tone, length: l, seed: 0 }, ctx)))) {
        ok(END[tone].test(sen), `${s}/${r}/${tone} 말투 어긋남: ${sen}`)
      }
    }
    for (const c of [ctx, null]) for (const emoji of [false, true]) {
      const out = generate({ situation: s, recipient: r, tone, length: l, seed: 7, emoji }, c)
      ok(out.length === 6, `${s}/${r}/${tone}/${l} 6개 아님`)
      ok(new Set(out).size === out.length, `${s}/${r}/${tone}/${l} 중복`)
      if (s === 'toast') ok(out.every((m) => /후창: |\n회! /.test(m)), `toast/${r}/${tone}/${l} 건배 구호 없음`)
      ok(out.every((m) => m.trim().length > 0 && !m.includes('undefined') && !/[{}]/.test(m) && !/\s{2,}\S/.test(m.replace(/\n\n/g, '\n'))), `${s}/${r}/${tone}/${l} 빈 문구·토큰 남음: ${out.find((m) => /[{}]/.test(m))}`)
    }
  }
  rows.push(`${s}/${tone}: 보통 길이 조합 ${Math.min(...counts)}~${Math.max(...counts)}개`)
}

// 날짜 토큰이 들어가는지
ok(generate({ situation: 'newYear', recipient: 'client', tone: 'formal', length: 'long', seed: 1 }, ctx).concat(
  combos('newYear', 'client', 'formal', 'short').map((p) => render(p, { situation: 'newYear', recipient: 'client', tone: 'formal', length: 'short', seed: 0 }, ctx))
).some((m) => m.includes('정미년 새해')), '정미년 반영')
ok(combos('seollal', 'boss', 'formal', 'short').map((p) => render(p, { ...base, situation: 'seollal', recipient: 'boss' }, dateContext(new Date(2027, 0, 10)))).some((m) => m.includes('2월 6일부터 시작되는 설 연휴')), '설 연휴 날짜 반영')

// 새해 띠 토큰: 날짜 있으면 '붉은 양의 해', 서버 렌더(날짜 없음)면 '새해'
const zd = (c: typeof ctx | null) => combos('newYear', 'friend', 'casual', 'short').map((p) => render(p, { situation: 'newYear', recipient: 'friend', tone: 'casual', length: 'short', seed: 0 }, c))
ok(zd(ctx).some((m) => m.includes('붉은 양의 해가 밝았다!')), '붉은 양의 해 반영')
ok(zd(null).some((m) => m.includes('새해가 밝았다!')), '날짜 없으면 새해')
ok(zd(dateContext(new Date(2027, 11, 28))).some((m) => m.includes('황금 원숭이의 해')), '2028 원숭이 반영')

// 상황별 받는 사람·기본 말투, 건배사는 이름·서명 안 붙음
eq([recipientsFor('toast'), recipientsFor('csat'), recipientsFor('yearEnd').length], [['colleague', 'client', 'friend', 'family'], ['family', 'friend', 'student'], 6], '상황별 받는 사람')
eq([defaultTone('csat', 'family'), defaultTone('yearEnd', 'family'), vocative('민수', 'student', 'casual')], ['casual', 'polite', '민수야'], '수능 기본 말투·호칭')
ok(generate({ situation: 'toast', recipient: 'colleague', tone: 'formal', length: 'short', seed: 1, name: '김 부장', sender: '홍길동' }, ctx).every((m) => !m.includes('김 부장') && !m.includes('홍길동')), '건배사에 이름 없음')

// 시즌 기본값 (한국 날짜). 2027 수능은 11/18 → 11/19는 시즌 없음
const season = (y: number, m: number, d: number) => { const n = new Date(y, m - 1, d); return seasonal(n, dateContext(n)) }
eq([season(2026, 10, 4), season(2026, 11, 1)[0], season(2026, 11, 19)[0], season(2026, 11, 20), season(2026, 12, 25)[0], season(2026, 12, 26), season(2027, 1, 15)[0], season(2027, 1, 20)[0], season(2027, 11, 19)[0]],
  [[], 'csat', 'csat', ['yearEnd', 'christmas', 'toast'], 'yearEnd', ['newYear', 'yearEnd', 'toast', 'seollal'], 'newYear', 'seollal', undefined], '시즌 기본값 (설 45일 이내면 뒤에 붙음)')
eq(kstToday(Date.UTC(2026, 10, 19, 15, 30)).getDate(), 20, 'KST 날짜: UTC 15:30 = 다음 날')

console.log(rows.join('\n'))
console.log(fail ? `${fail} FAIL` : 'all ok')
if (fail) process.exit(1)
