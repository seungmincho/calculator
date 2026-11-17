import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/decisionTools.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/decisionTools.d5ce5c7fbd1d6780.json', ['decisionTools'])
  : import('../../../../messages/generated/en/ns/decisionTools.json').then(module => module.default))
