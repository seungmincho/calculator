import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/crossword.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/crossword.ed953e15bc9a0dd1.json', ['crossword'])
  : import('../../../../messages/generated/en/ns/crossword.json').then(module => module.default))
