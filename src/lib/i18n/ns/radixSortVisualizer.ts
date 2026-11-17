import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/radixSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/radixSortVisualizer.2a8ea4c0ef7d4524.json', ['radixSortVisualizer'])
  : import('../../../../messages/generated/en/ns/radixSortVisualizer.json').then(module => module.default))
