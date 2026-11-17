import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mancala.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mancala.e95e7d4ead06e4e2.json', ['mancala'])
  : import('../../../../messages/generated/en/ns/mancala.json').then(module => module.default))
