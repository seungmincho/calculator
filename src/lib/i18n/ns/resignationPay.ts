import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/resignationPay.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/resignationPay.5bfc2b940c20511c.json', ['resignationPay'])
  : import('../../../../messages/generated/en/ns/resignationPay.json').then(module => module.default))
