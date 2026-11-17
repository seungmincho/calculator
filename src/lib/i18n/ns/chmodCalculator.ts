import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/chmodCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/chmodCalculator.0fee3c6b112accff.json', ['chmodCalculator'])
  : import('../../../../messages/generated/en/ns/chmodCalculator.json').then(module => module.default))
