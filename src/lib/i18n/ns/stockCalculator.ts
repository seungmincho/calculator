import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/stockCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/stockCalculator.5c5908df0216932e.json', ['stockCalculator'])
  : import('../../../../messages/generated/en/ns/stockCalculator.json').then(module => module.default))
