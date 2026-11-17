import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/carTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/carTax.1b14c69b112ec4a1.json', ['carTax'])
  : import('../../../../messages/generated/en/ns/carTax.json').then(module => module.default))
