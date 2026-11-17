// Read-only product probes and an in-memory proposed-schema size calculation.
// This does not import/implement the future records module or access browser storage.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { chunkText, splitLong } from '../../../src/utils/tts.ts'

const ttsSource = fs.readFileSync('src/utils/tts.ts', 'utf8')
const text = 'a'.repeat(139) + '😀' + 'b'.repeat(200)
const chunks = chunkText(text)
assert.equal(chunks.map(segment => segment.text).join(''), text)
assert.ok(chunks.some(segment => /[\uD800-\uDBFF]$/.test(segment.text)))
const safeObservations = [1, 1.5, NaN, Infinity].map(max => {
  const value = chunkText('A😀BCD', max)
  return { max: String(max), segments: value, integerOffsets: value.every(segment => Number.isInteger(segment.start) && Number.isInteger(segment.end)) }
})
assert.equal(safeObservations[1].integerOffsets, false)
assert.equal(safeObservations[2].segments.length, 1)
assert.equal(safeObservations[3].segments.length, 1)
assert.equal(splitLong({ text: 'ABCD', start: 0, end: 4 }, NaN).length, 1)
// Do not execute zero/negative: on non-whitespace 'ABCD', cut=max and start+=max
// cannot advance toward end. This is source inference, not a timeout observation.

const limits = { records: 8, text: 30000, name: 40, voiceName: 512, segmentText: 140, asciiId: 80, asciiRevision: 80, rawBytes: 2 * 1024 * 1024 }
const rawText = '\uD800'.repeat(limits.text - 1) + '가'
const records = Array.from({ length: limits.records }, (_, index) => ({
  id: String(index).padEnd(limits.asciiId, 'x'), name: '\uD800'.repeat(limits.name - 1) + index,
  text: rawText, createdAt: 8640000000000000,
  position: { index: 214, start: 29960, end: 30000, text: rawText.slice(29960) },
  settings: { voiceName: '\uD800'.repeat(limits.voiceName), rate: 0.5000000000000001, pitch: 1.9999999999999998, volume: 0.0000010000000000000002, localVoicesOnly: true },
}))
const proposed = { version: 1, revision: 'r'.repeat(limits.asciiRevision), records }
const raw = JSON.stringify(proposed)
assert.deepEqual(JSON.parse(raw), proposed)
assert.equal(chunkText(records[0].text)[214].text, records[0].position.text)
const emptyRecord = { id: '', name: '', text: '', createdAt: 0, position: { index: 0, start: 0, end: 0, text: '' }, settings: { voiceName: '', rate: 0, pitch: 0, volume: 0, localVoicesOnly: false } }
const baseBytes = Buffer.byteLength(JSON.stringify({ version: 1, revision: '', records: Array.from({ length: 8 }, () => emptyRecord) }))
// JSON.stringify escapes each UTF-16 unit to at most six ASCII bytes. IDs/revision
// are ASCII. Seven numeric fields per record receive a deliberately loose 64B bound.
// Booleans use false (the longer spelling) in baseBytes. This overcounts numeric 0s.
const conservativeSerializerBound = baseBytes + limits.asciiRevision + limits.records * (limits.asciiId + 6 * (limits.name + limits.text + limits.segmentText + limits.voiceName) + 7 * 64)
assert.ok(Buffer.byteLength(raw) <= conservativeSerializerBound)
assert.ok(conservativeSerializerBound < limits.rawBytes)
const report = {
  productSourceSha256: crypto.createHash('sha256').update(ttsSource).digest('hex'),
  productWrites: 0, browserStorageReads: 0, publicRpcCalls: 0,
  currentSurrogateSplit: chunks.map(segment => ({ start: segment.start, end: segment.end, isolatedHighAtEnd: /[\uD800-\uDBFF]$/.test(segment.text) })),
  safeObservations,
  notExecuted: [{ max: 0, reason: 'Source inference: start never advances on ABCD.' }, { max: -1, reason: 'Source inference: start decreases on ABCD.' }],
  proposedSchema: { limits, actualSyntheticBytes: Buffer.byteLength(raw), conservativeSerializerBound, exactRoundTrip: true, implementationExists: false },
}
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch46/design-observations.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ safeProbeCases: safeObservations.length, actualSyntheticBytes: Buffer.byteLength(raw), conservativeSerializerBound, rawBudget: limits.rawBytes, zeroNegativeExecuted: false }))
