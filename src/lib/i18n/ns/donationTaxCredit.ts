import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/donationTaxCredit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/donationTaxCredit.91da500e55a0f317.json', ['donationTaxCredit'])
  : import('../../../../messages/generated/en/ns/donationTaxCredit.json').then(module => module.default))
