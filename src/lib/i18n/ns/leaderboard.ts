import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/leaderboard.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/leaderboard.198a2780650d22dc.json', ['leaderboard'])
  : import('../../../../messages/generated/en/ns/leaderboard.json').then(module => module.default))
