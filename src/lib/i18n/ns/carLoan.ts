import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/carLoan.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/carLoan.e61c8636e2bbffb0.json', ['carLoan'])
  : import('../../../../messages/generated/en/ns/carLoan.json').then(module => module.default))
