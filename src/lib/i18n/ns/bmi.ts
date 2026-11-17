import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bmi.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bmi.1b5adfeceb05edd8.json', ['bmi'])
  : import('../../../../messages/generated/en/ns/bmi.json').then(module => module.default))
