import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/voronoiVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/voronoiVisualizer.cf582ce066739e19.json', ['voronoiVisualizer'])
  : import('../../../../messages/generated/en/ns/voronoiVisualizer.json').then(module => module.default))
