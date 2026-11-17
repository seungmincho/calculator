import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/base64Converter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/base64Converter.78f686a2b6e3c08a.json', ['base64Converter'])
  : import('../../../../messages/generated/en/ns/base64Converter.json').then(module => module.default))
