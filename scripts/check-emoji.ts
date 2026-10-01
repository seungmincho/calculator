// 이모지 검색·피부색·코드포인트 회귀 체크: node scripts/check-emoji.ts
import {
  EMOJIS, searchAll, applySkinTone, supportsSkinTone, findEmoji, toCodepoints, toHtmlEntity, toJsEscape, SKIN_TONES,
} from '../src/utils/emoji.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const top = (q: string, n = 3) => searchAll(q).emojis.slice(0, n).map((x) => x.e)
const has = (q: string, e: string) => searchAll(q).emojis.some((x) => x.e === e)

// 데이터: 중복 없음, 필드 채워짐
eq(new Set(EMOJIS.map((x) => x.e)).size, EMOJIS.length, '이모지 중복 없음')
eq(EMOJIS.filter((x) => !x.ko || !x.en).map((x) => x.e), [], '한글/영어 키워드 누락 없음')

// 한글 검색 — 이름 일치가 맨 위
eq(top('하트', 1), ['❤️'], '하트 → ❤️ 먼저')
eq(top('감사', 1), ['🙏'], '감사 → 🙏 먼저')
eq(top('박수', 1), ['👏'], '박수')
eq(top('불', 1), ['🔥'], '불 → 🔥')
eq(has('웃음', '😂') && has('눈물', '😭') && has('축하', '🎉'), true, '웃음/눈물/축하')
eq(has('heart', '❤️') && has('THUMBS', '👍'), true, '영어 검색(대소문자 무시)')
eq(has('빨간 하트', '❤️') && !has('빨간 하트', '💙'), true, '여러 단어 AND')
eq(has('ㅎㅌ', '❤️'), true, '초성 검색')
eq(top('👍', 1), ['👍'], '이모지 직접 입력')
eq(top('👍🏽', 1), ['👍'], '피부색 붙은 이모지 입력')
eq(searchAll('  ').emojis.length, 0, '빈 검색')

// 한/영 오타 보정
const typo = searchAll('gkxm')
eq([typo.fixedQuery, typo.emojis[0]?.e], ['하트', '❤️'], 'gkxm → 하트')
eq(searchAll('heart').fixedQuery, undefined, '정상 영어는 보정 안 함')

// 특수문자·이모티콘
eq(searchAll('별').chars.includes('★'), true, '별 → ★')
eq(searchAll('㎡').chars, ['㎡'], '문자 직접 입력은 그 문자만')
eq(searchAll('주식회사').chars.includes('㈜'), true, '주식회사 → ㈜')
eq(searchAll('원화').chars.includes('₩'), true, '원화 → ₩')
eq(searchAll('ㅠㅠ').kaomoji.includes('ㅠㅠ'), true, 'ㅠㅠ 이모티콘')
eq(searchAll('어깨으쓱').kaomoji.includes('¯\\_(ツ)_/¯'), true, '어깨으쓱')

// 피부색
const [, light, , medium, , dark] = SKIN_TONES
eq(applySkinTone('👍', medium), '👍🏽', '엄지')
eq(applySkinTone('✌️', light), '✌🏻', 'VS16 제거 후 수정자')
eq(applySkinTone('🧑‍💻', dark), '🧑🏿‍💻', 'ZWJ 시퀀스: 첫 글자 뒤')
eq(applySkinTone('🐶', medium), '🐶', '미지원 이모지는 그대로')
eq(applySkinTone('👍', ''), '👍', '기본 피부색')
eq([supportsSkinTone('🙏'), supportsSkinTone('❤️'), supportsSkinTone('🇰🇷')], [true, false, false], '지원 여부')
eq(findEmoji('✌🏻')?.e, '✌️', '피부색 적용된 것도 원본 찾기')

// 코드포인트
eq(toCodepoints('😀'), 'U+1F600', '기본 코드포인트')
eq(toCodepoints('❤️'), 'U+2764 U+FE0F', 'VS16 포함')
eq(toCodepoints('★'), 'U+2605', 'BMP 4자리')
eq(toCodepoints('🇰🇷'), 'U+1F1F0 U+1F1F7', '국기 = 지역 표시자 2개')
eq(toHtmlEntity('👍🏽'), '&#x1F44D;&#x1F3FD;', 'HTML 엔티티')
eq(toJsEscape('😀'), '\\u{1F600}', 'JS 이스케이프')

console.log(fail ? `check-emoji: ${fail} FAIL` : 'check-emoji: OK')
if (fail) process.exit(1)
