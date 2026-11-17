import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/llmTokenCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/llmTokenCalculator.1bfbf3c1179f447c.json', ['llmTokenCalculator'])
  : import('../../../../messages/generated/en/ns/llmTokenCalculator.json').then(module => module.default))
