import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/weeklyHolidayPay.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/weeklyHolidayPay.91e9b4d2c4a77bbb.json', ['weeklyHolidayPay'])
  : import('../../../../messages/generated/en/ns/weeklyHolidayPay.json').then(module => module.default))
