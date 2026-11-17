import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/colorBlindnessSimulator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/colorBlindnessSimulator.d5e7d9d4a27d5a78.json', ['colorBlindnessSimulator'])
  : import('../../../../messages/generated/en/ns/colorBlindnessSimulator.json').then(module => module.default))
