import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jwtDecoder.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jwtDecoder.a80b165e4cb56c2c.json', ['jwtDecoder'])
  : import('../../../../messages/generated/en/ns/jwtDecoder.json').then(module => module.default))
