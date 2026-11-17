import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/investmentCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/investmentCalculator.d2bc3e0f1c495296.json', ['investmentCalculator'])
  : import('../../../../messages/generated/en/ns/investmentCalculator.json').then(module => module.default))
