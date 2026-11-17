import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bogeumjariLoan.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bogeumjariLoan.20253d8cec4bce8f.json', ['bogeumjariLoan'])
  : import('../../../../messages/generated/en/ns/bogeumjariLoan.json').then(module => module.default))
