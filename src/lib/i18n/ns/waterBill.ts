import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/waterBill.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/waterBill.f0534bac24c32775.json', ['waterBill'])
  : import('../../../../messages/generated/en/ns/waterBill.json').then(module => module.default))
