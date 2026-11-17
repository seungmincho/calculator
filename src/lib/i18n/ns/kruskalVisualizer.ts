import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kruskalVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kruskalVisualizer.610f7ebdc7b663dc.json', ['kruskalVisualizer'])
  : import('../../../../messages/generated/en/ns/kruskalVisualizer.json').then(module => module.default))
