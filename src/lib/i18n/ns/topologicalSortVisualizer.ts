import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/topologicalSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/topologicalSortVisualizer.77c76033a2076e61.json', ['topologicalSortVisualizer'])
  : import('../../../../messages/generated/en/ns/topologicalSortVisualizer.json').then(module => module.default))
