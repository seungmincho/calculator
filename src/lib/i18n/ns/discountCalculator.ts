import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/discountCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/discountCalculator.7c4b5f2e30f40f97.json', ['discountCalculator'])
  : import('../../../../messages/generated/en/ns/discountCalculator.json').then(module => module.default))
