import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csInterview.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csInterview.0390186afb240441.json', ['csInterview'])
  : import('../../../../messages/generated/en/ns/csInterview.json').then(module => module.default))
