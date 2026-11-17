import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dueDateCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dueDateCalculator.5d3c13873e44bbd2.json', ['dueDateCalculator'])
  : import('../../../../messages/generated/en/ns/dueDateCalculator.json').then(module => module.default))
