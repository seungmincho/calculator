import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mergeSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mergeSortVisualizer.368ef578b1437bf5.json', ['mergeSortVisualizer'])
  : import('../../../../messages/generated/en/ns/mergeSortVisualizer.json').then(module => module.default))
