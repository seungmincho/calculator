import assert from 'node:assert/strict'
import { chunkText } from '../src/utils/tts.ts'
import { canRetryTtsRecovery, captureTtsRecovery, isTtsCancellation, type TtsRecoveryContext } from '../src/utils/ttsRecovery.ts'

let checks = 0
const check = (label: string, run: () => void) => { run(); checks++; console.log(`PASS ${label}`) }
const text = '첫 문장입니다. 두 번째 😀 문장입니다. 마지막 문장입니다.'
const context: TtsRecoveryContext = { text, segments: chunkText(text), generation: 7, repeat: true, repeatStart: 0, repeatEnd: 2, repeatCount: 3, repeatGap: 2 }
const failed = captureTtsRecovery(context, 1, 2)
check('captures exact failing sentence and second pass', () => { assert.ok(failed); assert.equal(failed.sentenceIndex, 1); assert.equal(failed.pass, 2); assert.equal(failed.sentence.text, '두 번째 😀 문장입니다.'); assert.equal(failed.text, text); assert.equal(failed.generation, 7) })
check('same context permits retry', () => assert.ok(canRetryTtsRecovery(failed, context)))
check('body edit outside failing sentence invalidates snapshot', () => { const edited = text.replace('첫', '전'); assert.equal(canRetryTtsRecovery(failed, { ...context, text: edited, segments: chunkText(edited) }), false) })
check('new playback generation invalidates stale retry', () => assert.equal(canRetryTtsRecovery(failed, { ...context, generation: 8 }), false))
check('same body but changed sentence offsets invalidates', () => assert.equal(canRetryTtsRecovery(failed, { ...context, segments: context.segments.map((segment, index) => index === 1 ? { ...segment, start: segment.start + 1 } : segment) }), false))
for (const settings of [{ repeat: false }, { repeatStart: 1 }, { repeatEnd: 1 }, { repeatCount: 5 }, { repeatGap: 0 }]) check(`repeat setting changed ${JSON.stringify(settings)}`, () => assert.equal(canRetryTtsRecovery(failed, { ...context, ...settings }), false))
check('final pass is preserved without adding another pass', () => { const final = captureTtsRecovery(context, 2, 3); assert.ok(final); assert.equal(final.settings.repeatCount - final.pass, 0); assert.ok(canRetryTtsRecovery(final, context)) })
check('nonrepeat context works with untouched default repeat fields', () => assert.ok(captureTtsRecovery({ ...context, repeat: false, repeatEnd: 0 }, 2, 1)))
check('snapshot does not share mutable segment/settings', () => { const isolated = structuredClone(context); const snapshot = captureTtsRecovery(isolated, 1, 2)!; isolated.segments[1].text = 'changed'; isolated.repeatCount = 10; assert.equal(snapshot.sentence.text, '두 번째 😀 문장입니다.'); assert.equal(snapshot.settings.repeatCount, 3) })
for (const index of [-1, 3, 1.5, NaN]) check(`invalid sentence index ${index}`, () => assert.equal(captureTtsRecovery(context, index, 1), null))
for (const pass of [0, 4, 1.5, Infinity]) check(`invalid pass ${pass}`, () => assert.equal(captureTtsRecovery(context, 1, pass), null))
check('outside repeat range cannot silently clamp to different sentence', () => assert.equal(captureTtsRecovery({ ...context, repeatStart: 2 }, 1, 1), null))
check('empty manuscript cannot make a retry', () => assert.equal(captureTtsRecovery({ ...context, text: '', segments: [] }, 0, 1), null))
check('absent recovery cannot retry', () => assert.equal(canRetryTtsRecovery(null, context), false))
check('user cancellation is separate from synthesis errors', () => { assert.ok(isTtsCancellation('canceled')); assert.ok(isTtsCancellation('interrupted')); assert.equal(isTtsCancellation('network'), false); assert.equal(isTtsCancellation('synthesis-failed'), false) })
console.log(`TTS recovery: ${checks} checks passed`)
