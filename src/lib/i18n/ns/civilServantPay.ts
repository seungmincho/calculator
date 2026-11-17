import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/civilServantPay.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/civilServantPay.4009a3522821ec3d.json', ['civilServantPay'])
  : import('../../../../messages/generated/en/ns/civilServantPay.json').then(module => module.default))
