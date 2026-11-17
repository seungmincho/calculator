import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/memoryGame.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/memoryGame.0027d64645553c02.json', ['memoryGame'])
  : import('../../../../messages/generated/en/ns/memoryGame.json').then(module => module.default))
