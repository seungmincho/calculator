import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/cardDeduction.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/cardDeduction.be714b02526a51d4.json', ['cardDeduction'])
  : import('../../../../messages/generated/en/ns/cardDeduction.json').then(module => module.default))
