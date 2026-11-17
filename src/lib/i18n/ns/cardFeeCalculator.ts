import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/cardFeeCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/cardFeeCalculator.89dfc8faa862b544.json', ['cardFeeCalculator'])
  : import('../../../../messages/generated/en/ns/cardFeeCalculator.json').then(module => module.default))
