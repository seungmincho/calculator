import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/electricityCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/electricityCalculator.eea530dc6f986933.json', ['electricityCalculator'])
  : import('../../../../messages/generated/en/ns/electricityCalculator.json').then(module => module.default))
