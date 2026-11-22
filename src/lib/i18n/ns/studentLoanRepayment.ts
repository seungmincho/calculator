import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/studentLoanRepayment.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/studentLoanRepayment.0cce1ca21c82f07e.json', ['studentLoanRepayment'])
  : import('../../../../messages/generated/en/ns/studentLoanRepayment.json').then(module => module.default))
