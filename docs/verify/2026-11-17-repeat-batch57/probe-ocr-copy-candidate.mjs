import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { fixture } from './ocr-baseline-harness.mjs'

const observations = []
for (const mode of ['apiRejected', 'missingApiLegacyFalse']) {
  const f = await fixture()
  try {
    await f.add(); await f.complete(0, 'Synthetic OCR result')
    if (mode === 'apiRejected') f.io.copyReject = true
    else delete f.navigator.clipboard.writeText
    await f.click('copy')
    assert.ok(f.h.text().includes(f.label('copied')))
    if (mode === 'missingApiLegacyFalse') assert.equal(f.io.legacyCalls, 1)
    observations.push({ mode, claimsCopied: true, legacyCalls: f.io.legacyCalls, explicitRecoveryField: false })
  } finally { f.cleanup() }
}
const report = { actualParent: true, controlledClipboard: true, candidate: 58, modelDownload: false, sourceSha256: createHash('sha256').update(fs.readFileSync('src/components/ImageOcr.tsx')).digest('hex'), observations }
if (process.argv.includes('--record')) { const target = 'docs/verify/2026-11-17-repeat-batch57/copy-before-fix.json'; if (fs.existsSync(target)) throw Error('Preserve original copy observation'); fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n') }
console.log(JSON.stringify(report, null, 2))
