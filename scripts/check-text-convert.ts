// 텍스트 변환 회귀 체크: node scripts/check-text-convert.ts
import { splitWords, toCase, toList, toHalf, toFull, runPipeline, encodeSteps, decodeSteps, REGEX_MAX, type Step } from '../src/utils/textConvert.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const run = (input: string, steps: Step[]) => runPipeline(input, steps).text

// 단어 분리: 약어·숫자 경계
eq(splitWords('XMLHttpRequest2Parser'), ['XML', 'Http', 'Request2', 'Parser'], '약어+숫자')
eq(splitWords('HTML5Parser'), ['HTML5', 'Parser'], '약어 뒤 숫자')
eq(splitWords('getHTTPResponseCode'), ['get', 'HTTP', 'Response', 'Code'], '중간 약어')
eq(splitWords('userID'), ['user', 'ID'], '끝 약어')
eq(splitWords('user_id-name.v2'), ['user', 'id', 'name', 'v2'], '구분자 혼합')
eq(splitWords("don't stop"), ['dont', 'stop'], '아포스트로피')
eq(splitWords('사용자 이름'), ['사용자', '이름'], '한글 공백')
eq(splitWords('주문Id2'), ['주문', 'Id2'], '한글↔라틴 경계')
eq(splitWords('  --  '), [], '단어 없음')

// 식별자 케이스
const src = 'XMLHttpRequest2Parser'
eq(toCase(src, 'snake'), 'xml_http_request2_parser', 'snake')
eq(toCase(src, 'camel'), 'xmlHttpRequest2Parser', 'camel')
eq(toCase(src, 'pascal'), 'XmlHttpRequest2Parser', 'pascal')
eq(toCase(src, 'screaming'), 'XML_HTTP_REQUEST2_PARSER', 'screaming')
eq(toCase(src, 'kebab'), 'xml-http-request2-parser', 'kebab')
eq(toCase(src, 'train'), 'Xml-Http-Request2-Parser', 'train')
eq(toCase(src, 'dot'), 'xml.http.request2.parser', 'dot')
eq(toCase(src, 'path'), 'xml/http/request2/parser', 'path')
eq(toCase('user_name\n\nORDER_ID', 'camel'), 'userName\n\norderId', '줄마다 변환·빈 줄 유지')
eq(toCase('hello world\r\nfoo bar', 'kebab'), 'hello-world\nfoo-bar', 'CRLF')
eq(toCase('사용자 이름', 'snake'), '사용자_이름', '한글 snake')
eq(toCase('사용자 이름', 'camel'), '사용자이름', '한글 camel')

// Title / Sentence
eq(toCase('the lord of the rings', 'title'), 'The Lord of the Rings', 'title small words')
eq(toCase('a tale of two cities', 'title'), 'A Tale of Two Cities', 'title 첫 단어 a')
eq(toCase('what are you looking at', 'title'), 'What Are You Looking At', 'title 끝 단어 at')
eq(toCase('how NASA built the iPhone app', 'title'), 'How NASA Built the iPhone App', 'title 약어 보존')
eq(toCase('THE END OF THE WORLD', 'title'), 'The End of the World', 'title 전부 대문자')
eq(toCase("it's a dog's life", 'title'), "It's a Dog's Life", 'title 아포스트로피')
eq(toCase('HELLO WORLD. HOW ARE YOU? i am fine', 'sentence'), 'Hello world. How are you? I am fine', 'sentence')
eq(toCase('i love NASA. it is great', 'sentence'), 'I love NASA. It is great', 'sentence 약어 보존')
eq(toCase('한글 Text', 'upper'), '한글 TEXT', 'upper 한글 유지')

// 전각/반각
eq(toHalf('ＡＢＣ１２３！　ｘ'), 'ABC123! x', '전각→반각')
eq(toFull('AB 1!'), 'ＡＢ　１！', '반각→전각')
eq(toHalf(toFull('Hello, 한글 123')), 'Hello, 한글 123', '왕복')

// 줄 도구
eq(run('item10\nitem2\nitem1', [{ op: 'sortAsc' }]), 'item1\nitem2\nitem10', '자연 정렬')
eq(run('가\n다\n나', [{ op: 'sortDesc' }]), '다\n나\n가', '가나다 역순')
eq(run('ccc\na\nbb', [{ op: 'sortLength' }]), 'a\nbb\nccc', '길이순')
eq(run('a\nb\na\n\nb', [{ op: 'dedupe' }]), 'a\nb\n', '중복 제거(첫 등장 유지)')
eq(run(' a \n\n  \nb', [{ op: 'removeEmpty' }, { op: 'trimLines' }]), 'a\nb', '빈 줄 제거 + trim')
eq(run('a\nb', [{ op: 'numberLines' }]), '1. a\n2. b', '줄 번호')
eq(run('a\nb\nc', [{ op: 'reverseLines' }]), 'c\nb\na', '줄 뒤집기')
const sh = run('1\n2\n3\n4\n5\n6', [{ op: 'shuffle', seed: 7 }])
eq(sh, run('1\n2\n3\n4\n5\n6', [{ op: 'shuffle', seed: 7 }]), '섞기: 같은 seed 같은 결과')
eq(sh.split('\n').sort().join(), '1,2,3,4,5,6', '섞기: 원소 보존')
eq(run('한글👍🏽é', [{ op: 'reverseText' }]), 'é👍🏽글한', '뒤집기 grapheme 단위')

// 공백 도구
eq(run('a   b\t\tc\nd', [{ op: 'collapseSpaces' }]), 'a b c\nd', '연속 공백(줄바꿈 유지)')
eq(run('a \n b\n\nc', [{ op: 'joinLines' }]), 'a b c', '줄바꿈→공백')
eq(run(' a  b\nc ', [{ op: 'spaceToLines' }]), 'a\nb\nc', '공백→줄바꿈')
eq(run('a, b,c,,d', [{ op: 'commaToLines' }]), 'a\nb\nc\nd', '쉼표→줄바꿈')
eq(run('\tx\t', [{ op: 'tabsToSpaces' }]), '    x    ', '탭→스페이스')
eq(run('        x', [{ op: 'spacesToTabs' }]), '\t\tx', '스페이스→탭')
eq(run('a b\nc  d', [{ op: 'removeSpaces' }]), 'ab\ncd', '공백 제거(줄바꿈 유지)')

// 찾아 바꾸기
eq(run('a.b.c', [{ op: 'replace', find: '.', repl: '-', regex: false, flags: '' }]), 'a-b-c', '일반: 특수문자 그대로')
eq(run('cost $5', [{ op: 'replace', find: '5', repl: '$1', regex: false, flags: '' }]), 'cost $$1', '일반: $ 치환 안 함')
eq(run('Foo foo', [{ op: 'replace', find: 'foo', repl: 'x', regex: false, flags: 'i' }]), 'x x', '일반: 대소문자 무시')
eq(run('2026-10-01', [{ op: 'replace', find: '(\\d+)-(\\d+)-(\\d+)', repl: '$3/$2/$1', regex: true, flags: '' }]), '01/10/2026', '정규식 그룹')
eq(run('a\nb', [{ op: 'replace', find: '^', repl: '- ', regex: true, flags: 'm' }]), '- a\n- b', '정규식 m 플래그')
eq(run('a,b', [{ op: 'replace', find: ',', repl: '\\n', regex: true, flags: '' }]), 'a\nb', '정규식 \\n 치환')
const bad = runPipeline('abc', [{ op: 'replace', find: '(', repl: '', regex: true, flags: '' }, { op: 'upper' }])
eq(bad, { text: 'ABC', errors: ['badRegex', null] }, '잘못된 정규식은 건너뜀')
const big = runPipeline('a'.repeat(REGEX_MAX + 1), [{ op: 'replace', find: 'a', repl: 'b', regex: true, flags: '' }])
eq(big.errors, ['tooLong'], '정규식 입력 상한')
eq(run('abc', [{ op: 'replace', find: '', repl: 'x', regex: true, flags: '' }]), 'abc', '빈 찾기 = 무시')

// 앞뒤 붙이기·목록
eq(run('a\n\nb', [{ op: 'affix', prefix: '<li>', suffix: '</li>' }]), '<li>a</li>\n\n<li>b</li>', '앞뒤 붙이기(빈 줄 제외)')
eq(toList(' apple \nO\'Neil\n\n', 'sqlIn'), "('apple', 'O''Neil')", 'SQL IN 이스케이프')
eq(toList('1\n2\n30', 'sqlIn'), '(1, 2, 30)', 'SQL IN 숫자')
eq(toList('01234\n2', 'sqlIn'), "('01234', '2')", '0으로 시작하면 문자열')
eq(toList("it's\na\\b", 'jsArray'), "['it\\'s', 'a\\\\b']", 'JS 배열 이스케이프')
eq(toList('a"b\nc', 'json'), '["a\\"b", "c"]', 'JSON')
eq(JSON.parse(toList('a"b\nc', 'json')), ['a"b', 'c'], 'JSON 파싱 가능')
eq(toList('a\nb', 'comma'), 'a, b', '쉼표 목록')
eq(toList('', 'sqlIn'), '()', '빈 목록')

// 체이닝: 정리 → 중복 제거 → SQL IN
eq(run(' b \na\nb\n\n', [{ op: 'trimLines' }, { op: 'removeEmpty' }, { op: 'dedupe' }, { op: 'sortAsc' }, { op: 'list', preset: 'sqlIn' }]), "('a', 'b')", '파이프라인')

// URL 직렬화: 사용자 문자열은 제외
const steps: Step[] = [{ op: 'snake' }, { op: 'replace', find: 'secret', repl: 'x', regex: false, flags: '' }, { op: 'list', preset: 'json' }, { op: 'shuffle', seed: 3 }]
eq(encodeSteps(steps), 'snake,list-json,shuffle', 'encode')
eq(decodeSteps('snake,list-json,bogus,list-nope,shuffle', 10), [{ op: 'snake' }, { op: 'list', preset: 'json' }, { op: 'shuffle', seed: 14 }], 'decode')
eq(decodeSteps(null), [], 'decode 빈 값')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('text-convert OK')
