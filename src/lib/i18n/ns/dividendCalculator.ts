import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dividendCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dividendCalculator.ec0024c8fb6b5d3f.json', ['dividendCalculator'])
  : import('../../../../messages/generated/en/ns/dividendCalculator.json').then(module => module.default))
