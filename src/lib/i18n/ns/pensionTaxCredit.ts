import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pensionTaxCredit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pensionTaxCredit.35112e2b998bf291.json', ['pensionTaxCredit'])
  : import('../../../../messages/generated/en/ns/pensionTaxCredit.json').then(module => module.default))
