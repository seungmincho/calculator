import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/studentLoanRepayment.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/studentLoanRepayment.2ce6acc07d9249d1.json', ['studentLoanRepayment'])
  : import('../../../../messages/generated/en/ns/studentLoanRepayment.json').then(module => module.default))
