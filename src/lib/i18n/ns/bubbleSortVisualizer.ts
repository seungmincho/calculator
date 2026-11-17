import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bubbleSortVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bubbleSortVisualizer.0b455421a5a29ff0.json', ['bubbleSortVisualizer'])
  : import('../../../../messages/generated/en/ns/bubbleSortVisualizer.json').then(module => module.default))
