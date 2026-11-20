import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/scientificCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/scientificCalculator.d6beee8d961f8c19.json', ['scientificCalculator'])
  : import('../../../../messages/generated/en/ns/scientificCalculator.json').then(module => module.default))
