import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fibonacciDpVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fibonacciDpVisualizer.c0d4bc5e790fe49d.json', ['fibonacciDpVisualizer'])
  : import('../../../../messages/generated/en/ns/fibonacciDpVisualizer.json').then(module => module.default))
