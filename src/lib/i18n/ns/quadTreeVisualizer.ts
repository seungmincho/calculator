import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/quadTreeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/quadTreeVisualizer.fcd498d4912a817c.json', ['quadTreeVisualizer'])
  : import('../../../../messages/generated/en/ns/quadTreeVisualizer.json').then(module => module.default))
