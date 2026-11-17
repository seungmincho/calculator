import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jsonCsvConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jsonCsvConverter.c7dde5f7b5d625df.json', ['jsonCsvConverter'])
  : import('../../../../messages/generated/en/ns/jsonCsvConverter.json').then(module => module.default))
