import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pensionCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pensionCalculator.95bdd67d5b20c651.json', ['pensionCalculator'])
  : import('../../../../messages/generated/en/ns/pensionCalculator.json').then(module => module.default))
