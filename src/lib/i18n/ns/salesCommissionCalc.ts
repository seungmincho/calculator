import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/salesCommissionCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/salesCommissionCalc.265b0714b58ef0de.json', ['salesCommissionCalc'])
  : import('../../../../messages/generated/en/ns/salesCommissionCalc.json').then(module => module.default))
