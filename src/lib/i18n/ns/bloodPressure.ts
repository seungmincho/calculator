import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bloodPressure.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bloodPressure.653bcc5f4f72424a.json', ['bloodPressure'])
  : import('../../../../messages/generated/en/ns/bloodPressure.json').then(module => module.default))
