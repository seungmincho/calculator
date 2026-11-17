import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/binarySearchVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/binarySearchVisualizer.d102c66e5ead893e.json', ['binarySearchVisualizer'])
  : import('../../../../messages/generated/en/ns/binarySearchVisualizer.json').then(module => module.default))
