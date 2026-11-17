import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/floydWarshallVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/floydWarshallVisualizer.c3e8c4bba49391a1.json', ['floydWarshallVisualizer'])
  : import('../../../../messages/generated/en/ns/floydWarshallVisualizer.json').then(module => module.default))
