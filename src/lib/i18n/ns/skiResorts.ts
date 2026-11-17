import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/skiResorts.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/skiResorts.1ce74edd74865574.json', ['skiResorts'])
  : import('../../../../messages/generated/en/ns/skiResorts.json').then(module => module.default))
