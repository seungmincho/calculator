import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/yearEndTaxCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/yearEndTaxCalc.050b70b716030656.json', ['yearEndTaxCalc'])
  : import('../../../../messages/generated/en/ns/yearEndTaxCalc.json').then(module => module.default))
