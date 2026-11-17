import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/installmentCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/installmentCalc.dbf8ac236dbb1ee9.json', ['installmentCalc'])
  : import('../../../../messages/generated/en/ns/installmentCalc.json').then(module => module.default))
