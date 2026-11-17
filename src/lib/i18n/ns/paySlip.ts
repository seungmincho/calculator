import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/paySlip.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/paySlip.1dbe1e4197d1176d.json', ['paySlip'])
  : import('../../../../messages/generated/en/ns/paySlip.json').then(module => module.default))
