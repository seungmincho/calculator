import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/insertionSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/insertionSortVisualizer.25a38125089b33f8.json', ['insertionSortVisualizer'])
  : import('../../../../messages/generated/en/ns/insertionSortVisualizer.json').then(module => module.default))
