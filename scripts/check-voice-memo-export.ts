import assert from 'node:assert/strict'
import { buildVoiceMemoTranscriptBundle, formatVoiceTranscriptDuration, formatVoiceTranscriptLocalTime, isExportableVoiceTranscript, selectVoiceMemoTranscripts, VOICE_TRANSCRIPT_EXPORT_LIMIT, VOICE_TRANSCRIPT_TEXT_LIMIT, VOICE_TRANSCRIPT_TOTAL_LIMIT, type VoiceTranscriptItem } from '../src/utils/voiceMemoExport.ts'

let checks = 0
const check = (label: string, run: () => void) => { run(); checks++; console.log(`PASS ${label}`) }
const labels = { title: '제목', recordedAt: '녹음 시각', duration: '길이' }
const first: VoiceTranscriptItem = { id: 'first', name: '첫 메모 한글 😀', timestamp: Date.UTC(2026, 10, 16, 1, 2, 3), duration: 64.99, transcript: ' 원문 한글 😀\n두번째 줄\r\n<script>literal</script> ' }
const second: VoiceTranscriptItem = { id: 'second', name: '다음 메모', timestamp: first.timestamp + 60000, duration: 3602, transcript: '수정된 최신 전사문' }
const items = [second, first]
check('newest first regardless of selection order', () => assert.deepEqual(selectVoiceMemoTranscripts(items, ['first', 'second']).map(item => item.id), ['second', 'first']))
check('stable source order for equal timestamps', () => assert.deepEqual(selectVoiceMemoTranscripts([second, { ...first, timestamp: second.timestamp }], ['first', 'second']).map(item => item.id), ['second', 'first']))
const output = buildVoiceMemoTranscriptBundle(items, ['first', 'second'], labels)
check('BOM, delimiters, names and current transcript preserved', () => { assert.ok(output.text.startsWith('\uFEFF========== 1 / 2 ==========')); assert.ok(output.text.includes(first.name)); assert.ok(output.text.includes(first.transcript)); assert.ok(output.text.includes('길이: 1:00:02')); assert.ok(output.text.indexOf(second.transcript) < output.text.indexOf(first.transcript)) })
check('latest unsaved edits are used at download time', () => { const changed = items.map(item => ({ ...item, transcript: item.id === 'first' ? '저장 전 수정 내용' : item.transcript })); const result = buildVoiceMemoTranscriptBundle(changed, ['first'], labels); assert.ok(result.text.includes('저장 전 수정 내용')); assert.ok(!result.text.includes(first.transcript)) })
check('text and count totals reflect all selected items', () => { assert.equal(output.count, 2); assert.equal(output.characters, first.transcript.length + second.transcript.length) })
check('body markup stays literal text', () => assert.ok(output.text.includes('<script>literal</script>')))
check('no source metadata mutation', () => { const before = structuredClone(items); buildVoiceMemoTranscriptBundle(items, ['first'], labels); assert.deepEqual(items, before) })
check('audio Blob is never accessed/copied', () => { const record = { ...first, get blob(): never { throw new Error('audio accessed') } }; assert.equal(buildVoiceMemoTranscriptBundle([record], ['first'], labels).count, 1) })
check('output projection excludes audio and unrelated fields', () => assert.deepEqual(Object.keys(selectVoiceMemoTranscripts([{ ...first, extra: 'not exported' } as VoiceTranscriptItem], ['first'])[0]), ['id', 'name', 'timestamp', 'duration', 'transcript']))
check('empty selection fails', () => assert.throws(() => buildVoiceMemoTranscriptBundle(items, [], labels), /emptySelection/))
check('missing item rejects entire bundle', () => assert.throws(() => buildVoiceMemoTranscriptBundle(items, ['first', 'deleted'], labels), /staleSelection/))
check('empty transcript rejects entire bundle', () => assert.throws(() => buildVoiceMemoTranscriptBundle([first, { ...second, transcript: '' }], ['first', 'second'], labels), /staleSelection/))
check('whitespace transcript is not exportable', () => assert.equal(isExportableVoiceTranscript({ ...first, transcript: ' \r\n' }), false))
check('duplicate selection rejected', () => assert.throws(() => selectVoiceMemoTranscripts(items, ['first', 'first']), /invalidSelection/))
check('duplicate source ID rejected', () => assert.throws(() => selectVoiceMemoTranscripts([first, first], ['first']), /staleSelection/))
check('selected count limit', () => assert.throws(() => selectVoiceMemoTranscripts(items, Array.from({ length: 21 }, (_, index) => `id-${index}`)), /selectionLimit/))
check('per transcript limit refuses truncation', () => assert.throws(() => selectVoiceMemoTranscripts([{ ...first, transcript: '가'.repeat(12001) }], ['first']), /textLimit/))
for (const patch of [{ name: '' }, { name: 'a'.repeat(121) }, { timestamp: NaN }, { timestamp: 0 }, { timestamp: 8640000000000001 }, { duration: -1 }, { duration: Infinity }]) check(`metadata invalid ${checks}`, () => assert.throws(() => selectVoiceMemoTranscripts([{ ...first, ...patch }], ['first']), /staleSelection/))
check('unselected invalid item does not interfere', () => assert.equal(selectVoiceMemoTranscripts([first, { ...second, transcript: '' }], ['first']).length, 1))
check('20x12000 exact maximum without losing Unicode', () => {
  const maximal = Array.from({ length: VOICE_TRANSCRIPT_EXPORT_LIMIT }, (_, index) => ({ ...first, id: `id-${index}`, transcript: '😀'.repeat(VOICE_TRANSCRIPT_TEXT_LIMIT / 2), timestamp: first.timestamp + index }))
  const result = buildVoiceMemoTranscriptBundle(maximal, maximal.map(item => item.id), labels)
  assert.equal(result.count, 20); assert.equal(result.characters, VOICE_TRANSCRIPT_TOTAL_LIMIT); assert.equal(result.text.split('😀').length - 1, 120000 + 20)
})
check('duration formats same displayed second precision', () => { assert.equal(formatVoiceTranscriptDuration(0), '00:00'); assert.equal(formatVoiceTranscriptDuration(64.99), '01:04'); assert.equal(formatVoiceTranscriptDuration(3662), '1:01:02') })
check('local timestamp uses device date and UTC offset', () => {
  const date = new Date(first.timestamp); const text = formatVoiceTranscriptLocalTime(first.timestamp)
  assert.ok(text.startsWith(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)); assert.match(text, /\(UTC[+-]\d{2}:\d{2}\)$/)
})
check('invalid time fails explicitly', () => assert.throws(() => formatVoiceTranscriptLocalTime(NaN), /staleSelection/))
console.log(`Voice memo transcript export: ${checks} checks passed`)
