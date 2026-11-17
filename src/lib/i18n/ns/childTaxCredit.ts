import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/childTaxCredit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/childTaxCredit.bc7af8d6c34881e7.json', ['childTaxCredit'])
  : import('../../../../messages/generated/en/ns/childTaxCredit.json').then(module => module.default))
