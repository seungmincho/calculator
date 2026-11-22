import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csatDiscounts.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csatDiscounts.9940ca2a34a75697.json', ['csatDiscounts'])
  : import('../../../../messages/generated/en/ns/csatDiscounts.json').then(module => module.default))
