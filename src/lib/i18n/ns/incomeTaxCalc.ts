import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/incomeTaxCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/incomeTaxCalc.4200d8a93b87c950.json', ['incomeTaxCalc'])
  : import('../../../../messages/generated/en/ns/incomeTaxCalc.json').then(module => module.default))
