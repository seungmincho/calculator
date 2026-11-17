import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/regexExtractor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/regexExtractor.d799b044d90639fe.json', ['regexExtractor'])
  : import('../../../../messages/generated/en/ns/regexExtractor.json').then(module => module.default))
