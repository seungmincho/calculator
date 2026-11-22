import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/llmTokenCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/llmTokenCalculator.b6925dda4c4c7777.json', ['llmTokenCalculator'])
  : import('../../../../messages/generated/en/ns/llmTokenCalculator.json').then(module => module.default))
