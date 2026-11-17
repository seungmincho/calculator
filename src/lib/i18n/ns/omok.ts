import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/omok.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/omok.ea2c6d72d90f052c.json', ['omok'])
  : import('../../../../messages/generated/en/ns/omok.json').then(module => module.default))
