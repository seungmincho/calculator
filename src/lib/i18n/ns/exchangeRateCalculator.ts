import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/exchangeRateCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/exchangeRateCalculator.70cfc890529cdee1.json', ['exchangeRateCalculator'])
  : import('../../../../messages/generated/en/ns/exchangeRateCalculator.json').then(module => module.default))
