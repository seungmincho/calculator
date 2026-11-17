import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/budgetCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/budgetCalculator.4b06453e77004bd2.json', ['budgetCalculator'])
  : import('../../../../messages/generated/en/ns/budgetCalculator.json').then(module => module.default))
