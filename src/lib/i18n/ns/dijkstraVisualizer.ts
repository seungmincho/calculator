import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dijkstraVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dijkstraVisualizer.4259237a6f304b4b.json', ['dijkstraVisualizer'])
  : import('../../../../messages/generated/en/ns/dijkstraVisualizer.json').then(module => module.default))
