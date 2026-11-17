import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/shippingCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/shippingCalc.04de1d01886ff06a.json', ['shippingCalc'])
  : import('../../../../messages/generated/en/ns/shippingCalc.json').then(module => module.default))
