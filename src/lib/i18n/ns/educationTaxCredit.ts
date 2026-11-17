import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/educationTaxCredit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/educationTaxCredit.483f4e0db64cc38c.json', ['educationTaxCredit'])
  : import('../../../../messages/generated/en/ns/educationTaxCredit.json').then(module => module.default))
