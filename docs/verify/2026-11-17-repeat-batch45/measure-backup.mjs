import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FONT_BY_ID } from '../../../src/utils/fontPreview.ts'
import { parseFontPairProfiles, FONT_PAIR_PROFILE_LIMIT, FONT_PAIR_PROFILE_NAME_LIMIT } from '../../../src/utils/fontPairProfiles.ts'

// Synthetic catalog-only data; never reads storage, manuscript text or font files.
const fontId = [...FONT_BY_ID.keys()].sort((a, b) => b.length - a.length)[0]
const profiles = Array.from({ length: FONT_PAIR_PROFILE_LIMIT }, (_, index) => ({
  id: String(index).padEnd(80, 'x'), name: '\uD800'.repeat(FONT_PAIR_PROFILE_NAME_LIMIT - 1) + index,
  styles: { title: { fontId, size: 96, weight: 900 }, body: { fontId, size: 40, weight: 900 } },
}))
const raw = JSON.stringify({ version: 1, profiles })
assert.equal(parseFontPairProfiles(raw).status, 'ready')
const proposed = { app: 'toolhub-font-pair-profiles', version: 1, exportedAt: '2026-11-17T00:00:00.000Z', profiles }
const backup = JSON.stringify(proposed, null, 2)
assert.deepEqual(JSON.parse(backup).profiles, profiles)
assert.ok(Buffer.byteLength(backup) < 64 * 1024)
const report = { kind: 'synthetic proposed wrapper size; not product backup implementation', profiles: profiles.length,
  nameCodeUnits: FONT_PAIR_PROFILE_NAME_LIMIT, idCharacters: 80, longestCurrentFontId: fontId,
  storageCodeUnits: raw.length, storageUtf8Bytes: Buffer.byteLength(raw), proposedPrettyBackupUtf8Bytes: Buffer.byteLength(backup),
  proposedReadLimit: 64 * 1024, exactProfileRoundTrip: true, realUserStorageReads: 0 }
fs.writeFileSync('docs/verify/2026-11-17-repeat-batch45/backup-size-measurement.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
