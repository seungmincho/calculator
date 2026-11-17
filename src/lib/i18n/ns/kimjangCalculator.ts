import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kimjangCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kimjangCalculator.7311572394001956.json', ['kimjangCalculator'])
  : import('../../../../messages/generated/en/ns/kimjangCalculator.json').then(module => module.default))
