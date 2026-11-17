import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jsonFormatter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jsonFormatter.441484eec1798cba.json', ['jsonFormatter'])
  : import('../../../../messages/generated/en/ns/jsonFormatter.json').then(module => module.default))
