import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/redBlackTreeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/redBlackTreeVisualizer.ff43dc2ccff97288.json', ['redBlackTreeVisualizer'])
  : import('../../../../messages/generated/en/ns/redBlackTreeVisualizer.json').then(module => module.default))
