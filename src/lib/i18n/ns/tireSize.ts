import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/tireSize.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/tireSize.21302a1bd88c7cb9.json', ['tireSize'])
  : import('../../../../messages/generated/en/ns/tireSize.json').then(module => module.default))
