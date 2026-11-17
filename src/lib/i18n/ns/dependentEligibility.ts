import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dependentEligibility.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dependentEligibility.0c811bdf535a9cf6.json', ['dependentEligibility'])
  : import('../../../../messages/generated/en/ns/dependentEligibility.json').then(module => module.default))
