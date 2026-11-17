import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/salary.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/salary.bed0cb3460469234.json', ['salary'])
  : import('../../../../messages/generated/en/ns/salary.json').then(module => module.default))
