import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/quickSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/quickSortVisualizer.9e1d542ddc5a98a3.json', ['quickSortVisualizer'])
  : import('../../../../messages/generated/en/ns/quickSortVisualizer.json').then(module => module.default))
