import fs from 'node:fs'
import { TEXTS, streamText, topMissed } from '../../../src/utils/typingTest.ts'
import { createCustomTypingAttempt, updateCustomTypingAttempt } from '../../../src/utils/customTyping.ts'

const sizes = Object.fromEntries(['ko', 'en'].map(lang => [lang, {
  shortCount: TEXTS[lang].short.length,
  shortMaxCodePoints: Math.max(...TEXTS[lang].short.map(text => [...text].length)),
  longMaxCodePoints: Math.max(...TEXTS[lang].long.map(text => [...text].length)),
  timeCodePoints: [...streamText(lang, 1)].length,
}]))
let attempt = createCustomTypingAttempt('alpha beta gamma', 'en')
attempt = updateCustomTypingAttempt(attempt, 'xlpha', false, 1000)
attempt = updateCustomTypingAttempt(attempt, 'alpha beta gamma', false, 4000)
const evidence = {
  sizes,
  correctedPositionRemainsInAttempt: Object.keys(attempt.mistakes),
  currentResultFields: Object.keys(attempt.result),
  missedIsAggregateNotPosition: topMissed([['a', 'x'], ['a', 'z']]),
  scope: 'Existing pure functions only; no product changes, browser or new feature implemented.',
}
fs.writeFileSync(new URL('existing-typing-observations.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n')
console.log(JSON.stringify(evidence, null, 2))
