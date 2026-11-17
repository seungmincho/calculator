import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/sleepCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/sleepCalculator.86e0e29c4aaea499.json', ['sleepCalculator'])
  : import('../../../../messages/generated/en/ns/sleepCalculator.json').then(module => module.default))
