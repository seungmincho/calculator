import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bellmanFordVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bellmanFordVisualizer.ae3ac3c6c106a2ae.json', ['bellmanFordVisualizer'])
  : import('../../../../messages/generated/en/ns/bellmanFordVisualizer.json').then(module => module.default))
