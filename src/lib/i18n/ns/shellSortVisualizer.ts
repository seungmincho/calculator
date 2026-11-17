import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/shellSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/shellSortVisualizer.80e18b95190b8d90.json', ['shellSortVisualizer'])
  : import('../../../../messages/generated/en/ns/shellSortVisualizer.json').then(module => module.default))
