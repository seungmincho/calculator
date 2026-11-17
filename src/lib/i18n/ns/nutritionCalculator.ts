import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/nutritionCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/nutritionCalculator.fd44781539de5be8.json', ['nutritionCalculator'])
  : import('../../../../messages/generated/en/ns/nutritionCalculator.json').then(module => module.default))
