import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/eulerPathVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/eulerPathVisualizer.0c18d33e5cac8f54.json', ['eulerPathVisualizer'])
  : import('../../../../messages/generated/en/ns/eulerPathVisualizer.json').then(module => module.default))
