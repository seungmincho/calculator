import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/medianIncome.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/medianIncome.c3c1c041ed93db63.json', ['medianIncome'])
  : import('../../../../messages/generated/en/ns/medianIncome.json').then(module => module.default))
