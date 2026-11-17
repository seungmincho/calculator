import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/picross.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/picross.31885fe53c303c8b.json', ['picross'])
  : import('../../../../messages/generated/en/ns/picross.json').then(module => module.default))
