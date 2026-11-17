// node scripts/check-number-to-korean-batch.ts
import assert from 'node:assert/strict'
import {
  convertNumberToKoreanBatch, serializeNumberToKoreanBatch, protectSpreadsheetCell,
  type NumberBatchExportText,
} from '../src/utils/numberToKoreanBatch.ts'

const defaults = { prefix: '금 ', spacing: false }
const convert = (raw: string) => convertNumberToKoreanBatch(raw, defaults)
const exportText: NumberBatchExportText = {
  headers: ['줄', '항목', '원문', '정규 숫자', '읽기', '계약서식', '상태'],
  valid: '완료', unavailableFormal: '계약서식 불가', error: (error) => `오류:${error}`,
}
let count = 0
const check = (name: string, run: () => void) => { run(); count++; console.log(`PASS ${name}`) }

// Independent delimited-text reader checks that quoting round-trips to exactly seven columns.
function readTable(text: string, separator: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++ }
      else if (char === '"') quoted = false
      else value += char
    } else if (char === '"' && value === '') quoted = true
    else if (char === separator) { row.push(value); value = '' }
    else if (char === '\r' && text[i + 1] === '\n') {
      row.push(value); rows.push(row); row = []; value = ''; i++
    } else value += char
  }
  assert.equal(quoted, false)
  row.push(value); rows.push(row)
  return rows
}

check('empty input returns no rows or export', () => {
  const result = convert('')
  assert.equal(result.totalLines, 0)
  assert.equal(result.rows.length, 0)
  assert.equal(serializeNumberToKoreanBatch(result, 'csv', exportText), '')
})
check('single-column comma amounts and tab-separated labels remain distinct', () => {
  const result = convert('1,234,500\n보증금\t100,000,000')
  assert.equal(result.validRows, 2)
  assert.deepEqual(result.rows[0], { line: 1, raw: '1,234,500', label: '', status: 'valid', number: '1234500', reading: '백이십삼만사천오백', formal: '금 일백이십삼만사천오백원정' })
  assert.equal(result.rows[1].label, '보증금')
  assert.equal(result.rows[1].status === 'valid' && result.rows[1].number, '100000000')
})
check('empty physical lines are counted and original nonblank line numbers survive', () => {
  const result = convert('\n100\n \t\n항목\t200\n')
  assert.equal(result.totalLines, 4)
  assert.equal(result.skippedLines, 2)
  assert.deepEqual(result.rows.map((row) => row.line), [2, 4])
  const blank = convert('\n\n')
  assert.equal(blank.skippedLines, 2)
  assert.equal(blank.rows.length, 0)
})
check('CRLF, LF and CR line endings preserve logical row numbers', () => {
  for (const delimiter of ['\r\n', '\n', '\r']) {
    const result = convert(`10${delimiter}${delimiter}20${delimiter}`)
    assert.deepEqual(result.rows.map((row) => row.line), [1, 3])
    assert.equal(result.skippedLines, 1)
  }
})
check('malformed rows stay in order alongside valid results', () => {
  const result = convert('A\t100\nB\t\nC\t1\t2\nnot a number\nD\t200')
  assert.equal(result.validRows, 2)
  assert.equal(result.invalidRows, 3)
  assert.deepEqual(result.rows.map((row) => row.status === 'invalid' ? row.error : row.number), ['100', 'emptyAmount', 'tooManyColumns', 'invalidAmount', '200'])
  assert.equal(result.rows[2].raw, 'C\t1\t2')
})
check('comma-separated CSV-like rows are not silently split or combined', () => {
  for (const input of ['label,1000', '1,000,2,000', '1,2', '1234,567', ',1000', '1000,', '1,,000', '1.2,345', '1,000원,200']) {
    assert.equal(convert(input).invalidRows, 1, input)
  }
  assert.equal(convert('₩1,234.5원\n3억 5,000만\n1,234,567').validRows, 3)
})
check('zero, negative and fractional amounts keep readings but no contract format', () => {
  const result = convert('0\n-100\n12.5\n−0.25')
  assert.equal(result.validRows, 4)
  assert.equal(result.unavailableFormalRows, 4)
  assert.deepEqual(result.rows.map((row) => row.status === 'valid' ? [row.reading, row.formal] : []), [
    ['영', ''], ['마이너스 백', ''], ['십이점오', ''], ['마이너스 영점이오', ''],
  ])
})
check('twenty-digit amounts and integers above 2^53 never pass through Number', () => {
  const result = convert('99999999999999999999\n9007199254740993\n-9007199254740993.123456789')
  assert.equal(result.validRows, 3)
  assert.deepEqual(result.rows.map((row) => row.status === 'valid' && row.number), ['99999999999999999999', '9007199254740993', '-9007199254740993.123456789'])
  assert.equal(result.rows[0].status === 'valid' && result.rows[0].reading, '구천구백구십구경구천구백구십구조구천구백구십구억구천구백구십구만구천구백구십구')
  assert.equal(convert('100000000000000000000').invalidRows, 1)
})
check('existing Korean amount parsing remains available', () => {
  const result = convert('일금 오만원정\n3억 5천만')
  assert.deepEqual(result.rows.map((row) => row.status === 'valid' && row.number), ['50000', '350000000'])
})
check('parent prefix and spacing options apply to every result', () => {
  const result = convertNumberToKoreanBatch('12345\n-12345', { prefix: '일금 ', spacing: true })
  assert.equal(result.rows[0].status === 'valid' && result.rows[0].formal, '일금 일만 이천삼백사십오원정')
  assert.equal(result.rows[0].status === 'valid' && result.rows[0].reading, '만 이천삼백사십오')
  assert.equal(result.rows[1].status === 'valid' && result.rows[1].reading, '마이너스 만 이천삼백사십오')
  assert.equal(convertNumberToKoreanBatch('10000', { prefix: '', spacing: false }).rows[0].status, 'valid')
})
check('100 spreadsheet rows with a final line terminator are accepted', () => {
  for (const suffix of ['', '\n', '\r\n', '\r']) {
    const result = convert(Array(100).fill('1000').join('\n') + suffix)
    assert.equal(result.limit, null, JSON.stringify(suffix))
    assert.equal(result.validRows, 100)
    assert.equal(result.totalLines, 100)
  }
})
check('101 physical lines including intentional blanks block all output', () => {
  for (const raw of [Array(101).fill('1000').join('\n'), '\n'.repeat(100) + '1000']) {
    const result = convert(raw)
    assert.equal(result.limit, 'tooManyLines')
    assert.equal(result.rows.length, 0)
    assert.equal(serializeNumberToKoreanBatch(result, 'tsv', exportText), '')
  }
})
check('300-character rows are accepted; longer rows remain visible as errors', () => {
  const accepted = `${'a'.repeat(298)}\t1`
  const rejected = `${'b'.repeat(299)}\t1`
  const result = convert(`${accepted}\n${rejected}\n100`)
  assert.equal(result.validRows, 2)
  assert.equal(result.invalidRows, 1)
  assert.equal(result.rows[1].raw, rejected)
  assert.equal(result.rows[1].status === 'invalid' && result.rows[1].error, 'lineTooLong')
})
check('30000-character overall boundary does not truncate or partially process', () => {
  assert.equal(convert('x'.repeat(30000)).limit, null)
  const result = convert(`1\n${'x'.repeat(29999)}`)
  assert.equal(result.limit, 'tooManyCharacters')
  assert.equal(result.rows.length, 0)
  assert.equal(serializeNumberToKoreanBatch(result, 'csv', exportText), '')
})
check('both exports include errors and preserve original row order and line gaps', () => {
  const result = convert('A\t100\n\ninvalid\nB\t-12.5')
  for (const format of ['tsv', 'csv'] as const) {
    const table = readTable(serializeNumberToKoreanBatch(result, format, exportText), format === 'tsv' ? '\t' : ',')
    assert.equal(table.length, 4)
    assert.ok(table.every((row) => row.length === 7))
    assert.deepEqual(table.slice(1).map((row) => row[0]), ['1', '3', '4'])
    assert.deepEqual(table[2], ['3', '', "'invalid", '', '', '', '오류:invalidAmount'])
    assert.equal(table[3][6], '계약서식 불가')
  }
})
check('CSV and TSV safely round-trip quotes, commas and extra tabs in error source', () => {
  const raw = 'A,"quoted"\t1,000\nextra\tcolumn\t100'
  const result = convert(raw)
  for (const format of ['tsv', 'csv'] as const) {
    const table = readTable(serializeNumberToKoreanBatch(result, format, exportText), format === 'tsv' ? '\t' : ',')
    assert.ok(table.every((row) => row.length === 7))
    assert.equal(table[1][1], "'A,\"quoted\"")
    assert.equal(table[1][2], "'A,\"quoted\"\t1,000")
    assert.equal(table[2][2], "'extra\tcolumn\t100")
  }
})
check('formula-leading labels and error sources remain text in every exported cell', () => {
  const result = convert('=HYPERLINK("https://example.test")\t100\n  +SUM(1,2)\t200\n@cmd\n-123\n\u200B=1+1')
  for (const format of ['tsv', 'csv'] as const) {
    const table = readTable(serializeNumberToKoreanBatch(result, format, exportText), format === 'tsv' ? '\t' : ',')
    assert.equal(table[1][1][0], "'")
    assert.equal(table[2][1][0], "'")
    assert.equal(table[3][2], "'@cmd")
    assert.equal(table[4][3], "'-123")
    assert.ok(table.flat().every((cell) => !/^[\s\uFEFF\u200B-\u200D]*[=+\-@]/.test(cell)))
  }
  for (const prefix of ['=', '+', '-', '@', ' \t=', '\uFEFF+', '\u200B@']) assert.equal(protectSpreadsheetCell(`${prefix}test`)[0], "'")
})
check('exported twenty-digit numbers and original text explicitly stay text', () => {
  const result = convert('12345678901234567890')
  for (const format of ['tsv', 'csv'] as const) {
    const row = readTable(serializeNumberToKoreanBatch(result, format, exportText), format === 'tsv' ? '\t' : ',')[1]
    assert.equal(row[2], "'12345678901234567890")
    assert.equal(row[3], "'12345678901234567890")
  }
})

console.log(`${count} number-to-Korean batch checks passed`)
