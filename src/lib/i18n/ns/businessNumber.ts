import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/businessNumber.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/businessNumber.8215d91f10fe8371.json', ['businessNumber'])
  : import('../../../../messages/generated/en/ns/businessNumber.json').then(module => module.default))
