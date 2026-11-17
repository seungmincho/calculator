import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/aStarVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/aStarVisualizer.f267777ea4a19f96.json', ['aStarVisualizer'])
  : import('../../../../messages/generated/en/ns/aStarVisualizer.json').then(module => module.default))
