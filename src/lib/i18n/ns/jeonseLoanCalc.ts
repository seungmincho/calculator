import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jeonseLoanCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jeonseLoanCalc.f95ed892839ec350.json', ['jeonseLoanCalc'])
  : import('../../../../messages/generated/en/ns/jeonseLoanCalc.json').then(module => module.default))
