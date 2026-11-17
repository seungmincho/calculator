import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/windChill.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/windChill.d70f4ad8cbced310.json', ['windChill'])
  : import('../../../../messages/generated/en/ns/windChill.json').then(module => module.default))
