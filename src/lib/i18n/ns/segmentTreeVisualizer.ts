import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/segmentTreeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/segmentTreeVisualizer.11610829dc16b8bd.json', ['segmentTreeVisualizer'])
  : import('../../../../messages/generated/en/ns/segmentTreeVisualizer.json').then(module => module.default))
