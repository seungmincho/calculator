import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/passportName.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/passportName.2c824ab06721942c.json', ['passportName'])
  : import('../../../../messages/generated/en/ns/passportName.json').then(module => module.default))
