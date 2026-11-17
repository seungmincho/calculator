import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/freelancerTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/freelancerTax.bd78397f1bb0b571.json', ['freelancerTax'])
  : import('../../../../messages/generated/en/ns/freelancerTax.json').then(module => module.default))
