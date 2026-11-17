import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/manito.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/manito.f4a575d4e15a9b59.json', ['manito'])
  : import('../../../../messages/generated/en/ns/manito.json').then(module => module.default))
