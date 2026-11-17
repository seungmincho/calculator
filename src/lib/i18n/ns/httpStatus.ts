import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/httpStatus.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/httpStatus.ffb810680f4f051f.json', ['httpStatus'])
  : import('../../../../messages/generated/en/ns/httpStatus.json').then(module => module.default))
