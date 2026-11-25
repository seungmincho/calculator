import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/manito.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/manito.16d142ae7c4565cb.json', ['manito'])
  : import('../../../../messages/generated/en/ns/manito.json').then(module => module.default))
