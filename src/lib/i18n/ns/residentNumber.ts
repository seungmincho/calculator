import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/residentNumber.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/residentNumber.a56797f8938d8383.json', ['residentNumber'])
  : import('../../../../messages/generated/en/ns/residentNumber.json').then(module => module.default))
