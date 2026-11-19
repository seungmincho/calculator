import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kimjangCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kimjangCalculator.c2b249b171dfccc1.json', ['kimjangCalculator'])
  : import('../../../../messages/generated/en/ns/kimjangCalculator.json').then(module => module.default))
