import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/checkers.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/checkers.a0b1eb52d89ed23d.json', ['checkers'])
  : import('../../../../messages/generated/en/ns/checkers.json').then(module => module.default))
