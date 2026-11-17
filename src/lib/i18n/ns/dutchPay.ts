import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dutchPay.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dutchPay.19eb7c246c9fe54e.json', ['dutchPay'])
  : import('../../../../messages/generated/en/ns/dutchPay.json').then(module => module.default))
