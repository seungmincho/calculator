import fs from 'node:fs'
import assert from 'node:assert/strict'
import { chunkText } from '../../../src/utils/tts.ts'

const rawText = '\uD800'.repeat(29999) + '가'
const records = Array.from({ length: 8 }, (_, index) => ({
  id: String(index).padEnd(80, 'x'), name: '\uD800'.repeat(39) + index, text: rawText,
  position: { start: 29960, end: 30000, text: rawText.slice(29960) },
  settings: { voiceName: 'synthetic-voice', rate: 2, pitch: 2, volume: 1, localVoicesOnly: true },
}))
const proposedRaw = JSON.stringify({ version: 1, records })
assert.deepEqual(JSON.parse(proposedRaw).records, records)
const text = 'a'.repeat(139) + '😀' + 'b'.repeat(200)
const chunks = chunkText(text)
assert.equal(chunks.map(chunk => chunk.text).join(''), text)
const splitPairs = chunks.slice(0, -1).filter(chunk => /[\uD800-\uDBFF]$/.test(chunk.text)).map(chunk => chunk.end)
const result = { syntheticOnly: true, realStorageReads: 0, proposedProfiles: records.length,
  textCodeUnitsEach: rawText.length, proposedRawUtf8Bytes: Buffer.byteLength(proposedRaw), proposedBudgetBytes: 2 * 1024 * 1024,
  currentChunkBoundaryObservation: { inputCodeUnits: text.length, chunks: chunks.map(chunk => ({ start: chunk.start, end: chunk.end })), splitSurrogateBoundaries: splitPairs },
  limitation: 'Proposed record schema measurement, not implemented storage. Boundary observation is original product code; no fix applied.' }
assert.ok(Buffer.byteLength(proposedRaw) < result.proposedBudgetBytes)
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch46/preparation-measurements.json', JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
