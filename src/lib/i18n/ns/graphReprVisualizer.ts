import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/graphReprVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/graphReprVisualizer.498658c757d5dccd.json', ['graphReprVisualizer'])
  : import('../../../../messages/generated/en/ns/graphReprVisualizer.json').then(module => module.default))
