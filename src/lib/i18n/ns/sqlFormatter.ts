import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/sqlFormatter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/sqlFormatter.2c147c4c86f68a15.json', ['sqlFormatter'])
  : import('../../../../messages/generated/en/ns/sqlFormatter.json').then(module => module.default))
