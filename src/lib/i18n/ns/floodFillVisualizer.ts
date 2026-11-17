import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/floodFillVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/floodFillVisualizer.7fc6e8de60ed909a.json', ['floodFillVisualizer'])
  : import('../../../../messages/generated/en/ns/floodFillVisualizer.json').then(module => module.default))
