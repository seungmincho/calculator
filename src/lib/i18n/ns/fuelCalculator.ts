import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fuelCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fuelCalculator.c29f1953abf3f5a7.json', ['fuelCalculator'])
  : import('../../../../messages/generated/en/ns/fuelCalculator.json').then(module => module.default))
