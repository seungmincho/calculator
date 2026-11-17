import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/annualCarTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/annualCarTax.f09aabd6f2b46064.json', ['annualCarTax'])
  : import('../../../../messages/generated/en/ns/annualCarTax.json').then(module => module.default))
