import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/smeTaxExemption.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/smeTaxExemption.556e1d24cd5de025.json', ['smeTaxExemption'])
  : import('../../../../messages/generated/en/ns/smeTaxExemption.json').then(module => module.default))
