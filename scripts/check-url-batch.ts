// node scripts/check-url-batch.ts
import assert from 'node:assert/strict'
import { convertUrlBatch, urlBatchText, urlBatchTsv, type UrlBatchTableText } from '../src/utils/urlBatch.ts'

const text: UrlBatchTableText = {
  headers: ['줄', '상태', '원문', '결과', '오류'], success: '성공', blank: '빈 줄', error: '오류',
  errorDescription: (error) => error,
}
let count = 0
const check = (name: string, run: () => void) => { run(); count++; console.log(`PASS ${name}`) }

function readTsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { value += '"'; i++ }
      else if (char === '"') quoted = false
      else value += char
    } else if (char === '"' && value === '') quoted = true
    else if (char === '\t') { row.push(value); value = '' }
    else if (char === '\r' && input[i + 1] === '\n') { row.push(value); rows.push(row); row = []; value = ''; i++ }
    else value += char
  }
  assert.equal(quoted, false)
  row.push(value); rows.push(row)
  return rows
}

check('empty input has no result rows and exports nothing', () => {
  const result = convertUrlBatch('', 'encode')
  assert.equal(result.rows.length, 0)
  assert.equal(urlBatchText(result), '')
  assert.equal(urlBatchTsv(result, text), '')
})
check('Korean and emoji encode and decode exactly once', () => {
  const encoded = convertUrlBatch('한글\n😀', 'encode')
  assert.deepEqual(encoded.rows.map((row) => row.result), ['%ED%95%9C%EA%B8%80', '%F0%9F%98%80'])
  assert.equal(urlBatchText(convertUrlBatch(urlBatchText(encoded), 'decode')), '한글\n😀')
})
check('each whole line uses component encoding, including URL delimiters', () => {
  assert.equal(urlBatchText(convertUrlBatch('https://example.com/a?q=한글&x=1#hash', 'encode')), 'https%3A%2F%2Fexample.com%2Fa%3Fq%3D%ED%95%9C%EA%B8%80%26x%3D1%23hash')
})
check('spaces and tabs are preserved, and plus signs do not become spaces on decode', () => {
  const encoded = convertUrlBatch(' a\tb \n+\n ', 'encode')
  assert.deepEqual(encoded.rows.map((row) => row.result), ['%20a%09b%20', '%2B', '%20'])
  assert.equal(encoded.blankRows, 0)
  assert.equal(urlBatchText(convertUrlBatch('a+b\n%2B\n%20', 'decode')), 'a+b\n+\n ')
})
check('internal and leading blank lines stay in the result with original positions', () => {
  const result = convertUrlBatch('\n안녕\n\n끝', 'encode')
  assert.deepEqual(result.rows.map((row) => [row.line, row.status]), [[1, 'blank'], [2, 'success'], [3, 'blank'], [4, 'success']])
  assert.equal(result.blankRows, 2)
  assert.equal(urlBatchText(result), '\n%EC%95%88%EB%85%95\n\n%EB%81%9D')
})
check('one terminal newline is a terminator; additional final blanks are retained', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    assert.equal(convertUrlBatch(`a${newline}`, 'encode').rows.length, 1)
    const result = convertUrlBatch(`a${newline}${newline}`, 'encode')
    assert.equal(result.rows.length, 2)
    assert.equal(result.blankRows, 1)
    assert.equal(urlBatchText(result), 'a\n')
  }
  assert.equal(convertUrlBatch('\n', 'encode').blankRows, 1)
})
check('mixed line endings are split without leaking carriage returns into text', () => {
  const result = convertUrlBatch('a\r\nb\rc\nd\r\n', 'encode')
  assert.deepEqual(result.rows.map((row) => row.source), ['a', 'b', 'c', 'd'])
})
check('double-encoded strings are decoded only one layer', () => {
  const result = convertUrlBatch('%2520\n%252F\n%25EC%2595%2588', 'decode')
  assert.deepEqual(result.rows.map((row) => row.result), ['%20', '%2F', '%EC%95%88'])
})
check('invalid percent escapes and UTF-8 errors retain source rows between successes', () => {
  const input = '%41\n%\n%GG\n%E0%A4%A\n%C0%AF\n%ED%A0%80\n%42'
  const result = convertUrlBatch(input, 'decode')
  assert.equal(result.successRows, 2)
  assert.equal(result.errorRows, 5)
  assert.deepEqual(result.rows.map((row) => row.line), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(urlBatchText(result), 'A\n%\n%GG\n%E0%A4%A\n%C0%AF\n%ED%A0%80\nB')
  assert.ok(result.rows.slice(1, 6).every((row) => row.status === 'error' && row.result === row.source && row.error === 'decodeError'))
})
check('unpaired surrogates produce per-row encode errors without dropping later rows', () => {
  const result = convertUrlBatch('ok\n\ud800\n\udc00\n끝', 'encode')
  assert.equal(result.errorRows, 2)
  assert.equal(result.rows[1].result, '\ud800')
  assert.equal(result.rows[2].error, 'encodeError')
  assert.equal(result.rows[3].result, '%EB%81%9D')
})
check('decoding embedded CRLF/tab preserves string meaning and flags multiline results', () => {
  const result = convertUrlBatch('%0A\nline%0D%0Abreak\n%09\n%00', 'decode')
  assert.deepEqual(result.rows.map((row) => row.result), ['\n', 'line\r\nbreak', '\t', '\u0000'])
  assert.equal(result.multilineRows, 2)
  assert.equal(urlBatchText(result), '\n\nline\r\nbreak\n\t\n\u0000')
})
check('dangerous-looking URL schemes remain opaque unchanged text when decoding', () => {
  const source = 'javascript:alert(1)\ndata:text/html,<script>alert(1)</script>\nhttps://example.com/a/../b'
  assert.equal(urlBatchText(convertUrlBatch(source, 'decode')), source)
})
check('100 rows with a terminal newline are accepted and 101 rows block all output', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    const result = convertUrlBatch(Array(100).fill('a').join(newline) + newline, 'encode')
    assert.equal(result.limit, null)
    assert.equal(result.successRows, 100)
  }
  const limited = convertUrlBatch(Array(101).fill('a').join('\n'), 'encode')
  assert.equal(limited.limit, 'tooManyLines')
  assert.equal(limited.rows.length, 0)
  assert.equal(urlBatchText(limited), '')
  assert.equal(urlBatchTsv(limited, text), '')
})
check('overall 30000-character limit preserves the boundary and rejects partial conversion', () => {
  assert.equal(convertUrlBatch('a'.repeat(30000), 'encode').rows[0].result.length, 30000)
  const limited = convertUrlBatch(`ok\n${'a'.repeat(29998)}`, 'encode')
  assert.equal(limited.limit, 'tooManyCharacters')
  assert.equal(limited.rows.length, 0)
})
check('TSV keeps all status/source/result/error cells and blank source line numbers', () => {
  const result = convertUrlBatch('%41\n\n%GG\n%42', 'decode')
  const table = readTsv(urlBatchTsv(result, text))
  assert.equal(table.length, 5)
  assert.ok(table.every((row) => row.length === 5))
  assert.deepEqual(table[2], ['2', '빈 줄', '', '', ''])
  assert.deepEqual(table[3], ['3', '오류', "'%GG", "'%GG", 'decodeError'])
  assert.deepEqual(table[4], ['4', '성공', "'%42", "'B", ''])
})
check('TSV quotes embedded tabs, CRLF and quotes without creating extra columns or rows', () => {
  const result = convertUrlBatch('a%09b\n%22quoted%22\nline%0D%0Abreak\na\tb', 'decode')
  const table = readTsv(urlBatchTsv(result, text))
  assert.equal(table.length, 5)
  assert.ok(table.every((row) => row.length === 5))
  assert.equal(table[1][3], "'a\tb")
  assert.equal(table[2][3], "'\"quoted\"")
  assert.equal(table[3][3], "'line\r\nbreak")
  assert.equal(table[4][2], "'a\tb")
})
check('TSV protects formula-looking text and long numbers while plain results remain untouched', () => {
  const source = '=1+1\n+SUM(1,2)\n-1\n@cmd\n \u200B=cmd\n12345678901234567890\n%3D1%2B1'
  const result = convertUrlBatch(source, 'decode')
  const table = readTsv(urlBatchTsv(result, text))
  assert.ok(table.slice(1).every((row) => row[2][0] === "'" && row[3][0] === "'"))
  assert.equal(table[6][3], "'12345678901234567890")
  assert.equal(table[7][3], "'=1+1")
  assert.equal(urlBatchText(result), source.replace('%3D1%2B1', '=1+1'))
})

console.log(`${count} URL batch checks passed`)
