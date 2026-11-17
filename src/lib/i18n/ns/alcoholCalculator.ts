import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/alcoholCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/alcoholCalculator.26f6bf31b9bac3cb.json', ['alcoholCalculator'])
  : import('../../../../messages/generated/en/ns/alcoholCalculator.json').then(module => module.default))
