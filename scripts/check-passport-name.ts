// node scripts/check-passport-name.ts (Node 24) — 여권 영문 이름 변환·MRZ·URL 회귀 체크
// 기대값은 국어의 로마자 표기법 예시(한복남 Han Boknam, 홍빛나 Hong Bitna)와 손으로 적은 값
import assert from 'node:assert/strict'
import {
  convert, syllables, surnameStd, surnameOptions, mrzLine1, parseState, toQuery, hasLl, isHangul,
  DEFAULT, SURNAME_ALTS, MRZ_LEN, type State,
} from '../src/utils/passportName.ts'

const st = (s: string, n: string, h = false, v = ''): State => ({ s, n, h, v })
const pass = (s: string, n: string, h = false, v = '') => convert(st(s, n, h, v))?.passport

// ── 표기법 인명 예시: 이름의 음운 변화 미반영
assert.equal(convert(st('한', '복남'))?.rr, 'Han Boknam', '복남 → 봉남으로 바꾸지 않는다')
assert.equal(convert(st('한', '복남', true))?.rr, 'Han Bok-nam')
assert.equal(convert(st('홍', '빛나'))?.rr, 'Hong Bitna', '빛 → bit, 빈나로 바꾸지 않는다')
assert.equal(convert(st('민', '용하'))?.rr, 'Min Yongha')
assert.equal(convert(st('송', '나리', true))?.rr, 'Song Na-ri')
// 이어 붙이면 음운 변화가 생기는 이름도 음절별
assert.deepEqual(syllables('신라'), ['sin', 'ra'], '신라 → silla 가 아니다')
assert.deepEqual(syllables('종로'), ['jong', 'ro'])
assert.deepEqual(syllables('해돋이'), ['hae', 'dot', 'i'], '구개음화 미반영')
assert.deepEqual(syllables('좋은'), ['jot', 'eun'])
// ㄹㄹ 은 ll
assert.deepEqual(syllables('설리'), ['seol', 'li'])
assert.equal(pass('김', '별림'), 'GIM BYEOLLIM')
assert.equal(pass('김', '별림', true), 'GIM BYEOL-LIM')
assert.equal(hasLl('별림'), true)
assert.equal(hasLl('길동'), false)
// ㅢ 는 ui, 겹받침
assert.deepEqual(syllables('희'), ['hui'])
assert.deepEqual(syllables('닭'), ['dak'])

// ── 기본값 홍길동
{
  const r = convert(DEFAULT)!
  assert.equal(r.passport, 'HONG GILDONG')
  assert.equal(r.ticket, 'HONG/GILDONG')
  assert.equal(r.mrz, 'PMKORHONG<<GILDONG<<<<<<<<<<<<<<<<<<<<<<<<<<')
  assert.equal(r.mrz.length, MRZ_LEN)
  assert.equal(r.custom, false)
  assert.deepEqual(r.negative, [])
  assert.equal(r.single, false)
}
// 붙임표: 여권 GIL-DONG, MRZ 는 '<', 항공권은 붙여서
{
  const r = convert(st('홍', '길동', true))!
  assert.equal(r.passport, 'HONG GIL-DONG')
  assert.equal(r.ticket, 'HONG/GILDONG')
  assert.ok(r.mrz.startsWith('PMKORHONG<<GIL<DONG<'))
}

// ── 성씨
assert.equal(surnameStd('이'), 'I')
assert.equal(surnameStd('박'), 'Bak')
assert.equal(surnameStd('최'), 'Choe')
assert.equal(surnameStd('남궁'), 'Namgung')
assert.equal(surnameStd('선우'), 'Seonu')
assert.equal(surnameStd('제갈'), 'Jegal')
assert.equal(surnameStd('황보'), 'Hwangbo')
assert.deepEqual(surnameOptions('이'), ['I', 'Lee', 'Yi', 'Rhee'])
assert.deepEqual(surnameOptions('홍'), ['Hong'])
assert.deepEqual(surnameOptions('남궁'), ['Namgung'], '자료에 없는 성은 표기법 표기만')
for (const [k, alts] of Object.entries(SURNAME_ALTS)) {
  assert.ok(isHangul(k, 1), k)
  for (const a of alts) assert.match(a, /^[A-Z][a-z]+$/, `${k} ${a}`)
  assert.equal(new Set(surnameOptions(k).map((x) => x.toUpperCase())).size, surnameOptions(k).length, `${k} 중복 없음`)
}
assert.ok(Object.keys(SURNAME_ALTS).length >= 30)
// 관용 표기 선택
{
  const r = convert(st('이', '서연', false, 'Lee'))!
  assert.equal(r.passport, 'LEE SEOYEON')
  assert.equal(r.custom, true)
  assert.equal(r.std, 'I')
  // 후보에 없는 철자는 표기법 표기로
  assert.equal(convert(st('이', '서연', false, 'Leee'))!.passport, 'I SEOYEON')
  assert.equal(convert(st('홍', '길동', false, 'Lee'))!.passport, 'HONG GILDONG', '다른 성의 후보는 무시')
}
// 두 글자 성
assert.equal(pass('남궁', '민수'), 'NAMGUNG MINSU')
assert.equal(convert(st('남궁', '민수'))!.mrz.slice(0, 20), 'PMKORNAMGUNG<<MINSU<')
// 외자(I·O) 와 부정적 뜻 철자
assert.equal(convert(st('이', '서연'))!.single, true, '이 → I')
assert.equal(convert(st('김', '아'))!.single, true, '이름 아 → A')
assert.deepEqual(convert(st('강', '민'))!.negative, ['GANG'])
assert.deepEqual(convert(st('노', '빈'))!.negative, ['NO', 'BIN'])
assert.deepEqual(convert(st('김', '빈나', true))!.negative, ['BIN'], '붙임표면 음절도 본다')
assert.deepEqual(convert(st('김', '빈나'))!.negative, [])

// ── MRZ 길이: 39자 넘으면 자른다
{
  const m = mrzLine1('NAMGUNG', 'SEONGHYEOK-SEUNGHWAN-ABCDEFGHIJKL')
  assert.equal(m.line.length, MRZ_LEN)
  assert.equal(m.cut, true)
  assert.equal(mrzLine1('HONG', 'GILDONG').cut, false)
  // 딱 44자
  const exact = mrzLine1('ABCDEFGHIJ', 'ABCDEFGHIJKLMNOPQRSTUVWXYZA')
  assert.equal(exact.line.length, 44)
  assert.equal(exact.cut, false)
}

// ── 입력 검사
assert.equal(convert(st('', '길동')), null)
assert.equal(convert(st('홍', '')), null)
assert.equal(convert(st('Hong', '길동')), null)
assert.equal(convert(st('홍', '길동이에요')), null, '이름 5자')
assert.equal(convert(st('독고다', '길동')), null, '성 3자')
assert.equal(convert(st(' 홍 ', ' 길동 '))!.passport, 'HONG GILDONG', '앞뒤 공백')
assert.equal(convert(st('홍', '길 동')), null, '이름 가운데 공백')
// NFD(조합형) 입력도 완성형으로
assert.equal(convert(st('홍'.normalize('NFD'), '길동'.normalize('NFD')))!.passport, 'HONG GILDONG')

// ── URL
{
  const back = (s: State) => { const p = new URLSearchParams(toQuery(s)); return parseState((k) => p.get(k)) }
  assert.equal(toQuery(DEFAULT), '', '기본값이면 쿼리 없음')
  assert.deepEqual(parseState(() => null), DEFAULT)
  const a = st('이', '서연', true, 'Lee')
  assert.equal(toQuery(a), `s=${encodeURIComponent('이')}&n=${encodeURIComponent('서연')}&h=1&v=Lee`)
  assert.deepEqual(back(a), a)
  const b = st('남궁', '민수')
  assert.deepEqual(back(b), b)
  assert.deepEqual(back(st('홍', '길동', true)), st('홍', '길동', true))
  // 표기법 표기를 v 로 고르면 v 는 비운다
  assert.equal(toQuery(st('이', '길동', false, 'I')), `s=${encodeURIComponent('이')}`)
  assert.deepEqual(parseState((k) => ({ s: '이', v: 'I' })[k] ?? null), st('이', '길동'))
  // 틀린 값은 기본값
  const bad = new URLSearchParams('s=Kim&n=abc&h=yes&v=Zzz')
  assert.deepEqual(parseState((k) => bad.get(k)), DEFAULT)
  // 다른 성의 v 는 버린다
  assert.deepEqual(parseState((k) => ({ s: '박', v: 'Lee' })[k] ?? null), st('박', '길동'))
  // 경계: 이름 4자·1자, 성 2자
  assert.deepEqual(back(st('선우', '가나다라')), st('선우', '가나다라'))
  assert.deepEqual(back(st('김', '솔')), st('김', '솔'))
}

console.log('check-passport-name: all passed')
