// 메모장 회귀 체크: node scripts/check-notepad.ts
import { analyze } from '../src/utils/charCount.ts'
import {
  parseNotes, backupJson, mergeNotes, sortNotes, searchNotes, displayTitle, safeFileName,
  findAll, nextMatch, replaceAll, parseSettings, DEFAULT_SETTINGS,
} from '../src/utils/notepad.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}

// ── 예전 저장 형식(v1: Note[] 배열) 그대로 읽힘 ──
const v1 = JSON.stringify([
  { id: '1700-abc', title: '장보기', content: '우유\n계란', createdAt: 1, updatedAt: 5 },
  { id: '1701-def', title: '새 메모', content: '', createdAt: 2, updatedAt: 3 },
])
eq(parseNotes(v1), [
  { id: '1700-abc', title: '장보기', content: '우유\n계란', createdAt: 1, updatedAt: 5 },
  { id: '1701-def', title: '새 메모', content: '', createdAt: 2, updatedAt: 3 },
], 'v1 배열 그대로')
eq(parseNotes(null), [], '저장값 없음 = 빈 목록')
eq(parseNotes('{broken'), null, '깨진 JSON = null (덮어쓰기 방지)')
eq(parseNotes('"str"'), null, '배열 아님 = null')

// 필드 누락·타입 오류 보정, 쓰레기 항목 제거, 중복 id 재발급
const messy = parseNotes(JSON.stringify([
  { id: 'a', content: '본문만', createdAt: 10 },
  { id: 'a', title: '중복', content: 'x', createdAt: 1, updatedAt: 2, pinned: true },
  null, 42, { foo: 1 },
  { title: '제목만', updatedAt: 'x' },
]), 999)!
eq(messy.length, 3, '쓰레기 항목 제거')
eq(messy[0], { id: 'a', title: '', content: '본문만', createdAt: 10, updatedAt: 10 }, '누락 필드 보정')
eq(messy[1].id !== 'a' && messy[1].pinned === true, true, '중복 id 재발급 + pinned 유지')
eq([messy[2].title, messy[2].content, messy[2].createdAt, messy[2].updatedAt, !!messy[2].id], ['제목만', '', 999, 999, true], 'id·시간 누락 보정')

// ── 백업 왕복 ──
const notes = parseNotes(v1)!
eq(parseNotes(backupJson(notes, 0)), notes, '백업 → 복원 왕복')

// ── 가져오기 병합 ──
const m = mergeNotes(notes, [
  { id: '1700-abc', title: '장보기', content: '우유\n계란\n빵', createdAt: 1, updatedAt: 9 },
  { id: '1701-def', title: '옛것', content: '', createdAt: 2, updatedAt: 1 },
  { id: 'new', title: '새', content: 'n', createdAt: 4, updatedAt: 4 },
])
eq([m.added, m.updated, m.notes.length], [1, 1, 3], '병합 개수')
eq(m.notes.find(n => n.id === '1700-abc')!.content, '우유\n계란\n빵', '더 최근 것으로 갱신')
eq(m.notes.find(n => n.id === '1701-def')!.title, '새 메모', '오래된 것은 무시')

// ── 정렬·검색·표시 ──
eq(sortNotes([
  { id: 'x', title: '', content: '', createdAt: 0, updatedAt: 1 },
  { id: 'y', title: '', content: '', createdAt: 0, updatedAt: 9 },
  { id: 'z', title: '', content: '', createdAt: 0, updatedAt: 0, pinned: true },
]).map(n => n.id), ['z', 'y', 'x'], '고정 먼저, 최근순')
eq(searchNotes(notes, '계란').map(n => n.id), ['1700-abc'], '본문 검색')
eq(searchNotes(notes, '  ').length, 2, '빈 검색 = 전체')
eq(searchNotes([{ id: 'e', title: 'Hello', content: '', createdAt: 0, updatedAt: 0 }], 'hello').length, 1, '대소문자 무시')
eq(displayTitle({ title: '', content: '\n  첫 줄입니다\n둘째' }), '첫 줄입니다', '제목 없으면 첫 줄')
eq(safeFileName('a/b:c*?'), 'a b c', '파일명 금지문자')
eq(safeFileName('  '), 'memo', '빈 파일명')

// ── 찾기·바꾸기 ──
eq(findAll('Aa aA aa', 'aa'), [0, 3, 6], '대소문자 무시 찾기')
eq(findAll('Aa aA aa', 'aa', true), [6], '대소문자 구분')
eq(findAll('aaaa', 'aa'), [0, 2], '겹치지 않게')
eq(findAll('abc', ''), [], '빈 검색어')
eq(nextMatch('가나 가나 가나', '가나', 1), 3, '커서 뒤 다음')
eq(nextMatch('가나 가나 가나', '가나', 7), 0, '끝이면 처음으로')
eq(nextMatch('abc', 'z', 0), -1, '없음')
eq(replaceAll('사과 배 사과', '사과', '감'), { text: '감 배 감', count: 2 }, '모두 바꾸기')
eq(replaceAll('a.b.c', '.', '$&'), { text: 'a$&b$&c', count: 2 }, '특수문자 그대로(정규식 아님)')
eq(replaceAll('abc', 'z', 'y'), { text: 'abc', count: 0 }, '바꿀 것 없음')
eq(replaceAll('AbAB', 'ab', 'x'), { text: 'xx', count: 2 }, '대소문자 무시 바꾸기')

// ── 설정 ──
eq(parseSettings(null), DEFAULT_SETTINGS, '설정 없음')
eq(parseSettings('{"fontSize":99,"mono":true,"wrap":"no"}'), { fontSize: 16, mono: true, wrap: true }, '설정 보정')
eq(parseSettings('{bad'), DEFAULT_SETTINGS, '깨진 설정')

// ── 글자수 (charCount.analyze 재사용) ──
const st = analyze('안녕 하세요\r\nab 12')
eq([st.chars, st.charsNoSpace, st.words, st.lines, st.bytesUtf8], [12, 9, 4, 2, 22], '글자·공백제외·단어·줄·바이트')
eq(analyze('가'.repeat(19)).manuscript.rows, 1, '원고지: 들여쓰기 1칸 + 19자 = 1줄')
eq(analyze('가'.repeat(20)).manuscript.rows, 2, '원고지: 21칸 = 2줄')
eq(analyze('').manuscript.sheets, 0, '빈 글 원고지 0매')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('notepad ok')
