import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/rentalYield.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/rentalYield.164e7191fc137611.json', ['rentalYield'])
  : import('../../../../messages/generated/en/ns/rentalYield.json').then(module => module.default))
