import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/huffmanCodingVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/huffmanCodingVisualizer.6788d00da43819df.json', ['huffmanCodingVisualizer'])
  : import('../../../../messages/generated/en/ns/huffmanCodingVisualizer.json').then(module => module.default))
