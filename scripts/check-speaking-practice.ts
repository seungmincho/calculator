// node --experimental-strip-types scripts/check-speaking-practice.ts
import assert from 'node:assert/strict'
import { basicSpeakingCheck, speakingMetrics, parseFeedback, summaryFromParams, isSpeakingSession, feedbackPrompt, groundedFeedbackSchema } from '../src/lib/speaking/core.ts'

const original = '저는 개발자입니다. 프로젝트 2개를 완료했습니다.'
const feedback = { strengthQuote: '저는 개발자입니다.', strength: '역할을 먼저 밝혔습니다.', improveQuote: '', improve: '경험을 구체적으로 설명해 보세요.', rewrite: original, next: '역할을 먼저 말해 보세요.' }
const checks: [string, () => void][] = [
  ['fillers use exact words, not syllables inside real words', () => {
    const check = basicSpeakingCheck('report', '다음 업무입니다. 음, 어… 음. 저기 그러니까 이야기입니다.', 60)
    assert.equal(check.fillerCount, 5)
    assert.deepEqual(check.fillers.find(item => item.word === '음'), { word: '음', count: 2 })
    assert.equal(basicSpeakingCheck('intro', '다음은 음악에 관한 이야기입니다.', 60).fillerCount, 0)
  }],
  ['repeated words ignore punctuation, common words and numeric tokens', () => {
    const check = basicSpeakingCheck('intro', '프로젝트, 프로젝트. 프로젝트! 저는 저는 저는 123 123 123', null)
    assert.deepEqual(check.repeats, [{ word: '프로젝트', count: 3 }])
    assert.deepEqual(basicSpeakingCheck('intro', '성과 성과', null).repeats, [])
  }],
  ['typed and empty answers are not treated as timed or complete', () => {
    const check = basicSpeakingCheck('intro', '', null)
    assert.equal(check.hasText, false)
    assert.equal(check.durationStatus, 'unknown')
    assert.ok(check.structure.every(item => !item.found))
  }],
  ['practice duration ranges include 45 and 75 seconds', () => {
    for (const [seconds, expected] of [[44, 'short'], [45, 'onTarget'], [75, 'onTarget'], [76, 'long']] as const)
      assert.equal(basicSpeakingCheck('intro', original, seconds).durationStatus, expected)
  }],
  ['structure cues differ between introduction and report', () => {
    assert.ok(basicSpeakingCheck('intro', '저는 개발자입니다. 최근 도구를 개선했습니다. 분석이 강점입니다.', 60).structure.every(item => item.found))
    const report = basicSpeakingCheck('report', '개편을 완료했습니다. 현재 점검 중이며 내일 배포할 예정입니다.', 60)
    assert.ok(report.structure.every(item => item.found))
    assert.deepEqual(report.structure.map(item => item.id), ['completed', 'status', 'nextStep'])
  }],
  ['measured pace and time gap', () => assert.deepEqual(speakingMetrics(' 하나  둘\n셋 ', 30), { words: 3, seconds: 30, pace: 6, targetGap: 30 })],
  ['typed answers never invent timing', () => assert.deepEqual(speakingMetrics('하나 둘', null), { words: 2, seconds: null, pace: null, targetGap: null })],
  ['grounded Korean feedback accepted', () => assert.equal(parseFeedback(JSON.stringify(feedback), original, 'test').rewrite, original)],
  ['invented quotation rejected', () => assert.throws(() => parseFeedback(JSON.stringify({ ...feedback, strengthQuote: '성적이 우수합니다.' }), original, 'test'), /ungroundedFeedback/)],
  ['invented numeric result rejected', () => assert.throws(() => parseFeedback(JSON.stringify({ ...feedback, rewrite: '프로젝트 20개를 완료했습니다.' }), original, 'test'), /ungroundedFeedback/)],
  ['completed work cannot be replaced by newly invented ongoing work', () => assert.throws(() => parseFeedback(JSON.stringify({ ...feedback, rewrite: '프로젝트 2개를 진행 중입니다.' }), original, 'test'), /ungroundedFeedback/)],
  ['English-only feedback rejected', () => assert.throws(() => parseFeedback(JSON.stringify({ ...feedback, strength: 'Good job.' }), original, 'test'), /invalidFeedback/)],
  ['missing required field rejected', () => assert.throws(() => parseFeedback(JSON.stringify({ ...feedback, next: undefined }), original, 'test'), /invalidFeedback/)],
  ['model preamble can be removed safely', () => assert.equal(parseFeedback('<think>test</think>\n```json\n' + JSON.stringify(feedback) + '\n```', original, 'test').model, 'test')],
  ['summary URL contains only validated numeric fields', () => {
    assert.deepEqual(summaryFromParams(new URLSearchParams('summary=1&mode=report&seconds=60&words=90&text=secret')), { mode: 'report', seconds: 60, words: 90 })
    for (const input of ['summary=1', 'summary=1&words=-1', 'summary=1&words=2&seconds=100', 'summary=1&words=foo']) assert.equal(summaryFromParams(new URLSearchParams(input)), null)
  }],
  ['corrupt history and oversized inputs rejected', () => {
    const session = { version: 1, id: 's', mode: 'intro', createdAt: 1, updatedAt: 2, takes: [{ id: 't', createdAt: 1, seconds: null, transcript: original }] }
    assert.ok(isSpeakingSession(session))
    assert.equal(isSpeakingSession({ ...session, mode: 'random' }), false)
    assert.equal(isSpeakingSession({ ...session, takes: Array(6).fill(session.takes[0]) }), false)
    assert.equal(isSpeakingSession({ ...session, takes: [{ ...session.takes[0], transcript: '가'.repeat(1201) }] }), false)
  }],
  ['each mode supplies its own coaching objective', () => {
    assert.match(feedbackPrompt('intro', original)[0].content, /자기소개/)
    assert.match(feedbackPrompt('report', original)[0].content, /업무 보고/)
    assert.ok(feedbackPrompt('report', '가'.repeat(5000)).at(-1)!.content.length < 1400)
  }],
  ['constrained quotes and next exercise cannot invent source claims', () => {
    const schema = groundedFeedbackSchema(original, 'intro')
    assert.ok(schema.properties.strengthQuote.enum.every(q => original.includes(q)))
    assert.ok(schema.properties.next.enum.every(q => q.endsWith('보세요.')))
    assert.equal(isSpeakingSession({ version: 1, id: 's', mode: 'intro', createdAt: 1, updatedAt: 2, takes: [null] }), false)
  }],
]
for (const [name, run] of checks) { run(); console.log('PASS', name) }
console.log(`${checks.length} speaking checks passed`)
