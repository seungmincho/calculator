import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/subnetCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/subnetCalculator.0b635fd17284bbfd.json', ['subnetCalculator'])
  : import('../../../../messages/generated/en/ns/subnetCalculator.json').then(module => module.default))
