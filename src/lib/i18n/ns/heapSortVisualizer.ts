import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/heapSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/heapSortVisualizer.79b6e3d2f195bac7.json', ['heapSortVisualizer'])
  : import('../../../../messages/generated/en/ns/heapSortVisualizer.json').then(module => module.default))
