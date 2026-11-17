import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/selectionSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/selectionSortVisualizer.5e7d0c17ac3640d0.json', ['selectionSortVisualizer'])
  : import('../../../../messages/generated/en/ns/selectionSortVisualizer.json').then(module => module.default))
