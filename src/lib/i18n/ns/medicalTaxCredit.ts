import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/medicalTaxCredit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/medicalTaxCredit.9f154f3f8e5d03dc.json', ['medicalTaxCredit'])
  : import('../../../../messages/generated/en/ns/medicalTaxCredit.json').then(module => module.default))
