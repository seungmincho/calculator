// 한글 자모·로마자·조사 회귀 체크: node scripts/check-korean-syllable.ts
import assert from 'node:assert/strict'
import {
  chosung, jamoString, composeJamo, composeKeys, stats, codePoints, nfdEscaped, romanize, josa, finalConsonant,
} from '../src/utils/koreanSyllable.ts'

assert.equal(chosung('대한민국 2026!'), 'ㄷㅎㅁㄱ 2026!')
assert.equal(chosung('대한민국 2026!', false), 'ㄷㅎㅁㄱ')
assert.equal(jamoString('닭과'), 'ㄷㅏㄺㄱㅘ')
assert.equal(jamoString('닭과', true), 'ㄷㅏㄹㄱㄱㅗㅏ')
// NFD(맥 파일명) 입력도 완성형으로 처리
assert.equal(chosung('한글'.normalize('NFD')), 'ㅎㄱ')

assert.equal(composeJamo('ㅎㅏㄴㄱㅡㄹ'), '한글')
assert.equal(composeJamo('ㄷㅏㄹㄱㄱㅗㅏ ㅇㅏㄴㅈ'), '닭과 앉')
assert.equal(composeJamo('ㅇㅏㄴㄴㅕㅇ abc'), '안녕 abc') // 영문 보존
assert.equal(composeJamo('ㄱㅗㅏㅇ'), '광')
assert.equal(composeKeys('dkssudgktpdy'), '안녕하세요')

assert.deepEqual(stats('닭 a'), { chars: 3, syllables: 1, keystrokes: 4 })
assert.equal(codePoints('한A'), 'U+D55C U+0041')
assert.equal(nfdEscaped('한'), '\\u1112\\u1161\\u11AB')

// 국어의 로마자 표기법 용례
const R: [string, string][] = [
  ['백마', 'baengma'], ['종로', 'jongno'], ['왕십리', 'wangsimni'], ['별내', 'byeollae'],
  ['신라', 'silla'], ['해돋이', 'haedoji'], ['같이', 'gachi'], ['굳히다', 'guchida'], ['좋고', 'joko'], ['놓다', 'nota'],
  ['낳지', 'nachi'], ['묵호', 'mukho'], ['집현전', 'jiphyeonjeon'], ['압구정', 'apgujeong'], ['낙동강', 'nakdonggang'],
  ['죽변', 'jukbyeon'], ['낙성대', 'nakseongdae'], ['합정', 'hapjeong'], ['팔당', 'paldang'], ['샛별', 'saetbyeol'],
  ['울산', 'ulsan'], ['백암', 'baegam'], ['옥천', 'okcheon'], ['합덕', 'hapdeok'], ['호법', 'hobeop'], ['월곶', 'wolgot'],
  ['벚꽃', 'beotkkot'], ['한밭', 'hanbat'], ['설악', 'seorak'], ['칠곡', 'chilgok'], ['울릉', 'ulleung'],
  ['대관령', 'daegwallyeong'], ['광희문', 'gwanghuimun'], ['한국어', 'hangugeo'], ['닭', 'dak'], ['독립', 'dongnip'],
  ['않다', 'anta'], ['않아', 'ana'], ['닭이', 'dalgi'], ['싫어', 'sireo'], ['놓는', 'nonneun'], ['여덟', 'yeodeol'],
  ['협력', 'hyeomnyeok'], ['맑게', 'malge'], ['있어', 'isseo'],
]
for (const [k, r] of R) assert.equal(romanize(k), r, k)
assert.equal(romanize('서울 종로구, 2026'), 'seoul jongnogu, 2026')
assert.equal(romanize('부산 해운대', true), 'Busan Haeundae')

assert.equal(josa('사과', ['을', '를']), '를')
assert.equal(josa('책', ['을', '를']), '을')
assert.equal(josa('서울', ['으로', '로']), '로')
assert.equal(josa('부산', ['으로', '로']), '으로')
assert.equal(josa('학교', ['으로', '로']), '로')
assert.equal(josa('3', ['이', '가']), '이') // 삼
assert.equal(josa('2', ['이', '가']), '가') // 이
assert.equal(josa('7', ['으로', '로']), '로') // 칠
assert.equal(josa('"책"', ['은', '는']), '은')
assert.equal(josa('API', ['을', '를']), '을(를)')
assert.equal(finalConsonant('값'), 'ㅄ')

console.log('check-korean-syllable: OK')
