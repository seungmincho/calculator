import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/aabbVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/aabbVisualizer.051a7ec8b6313985.json', ['aabbVisualizer'])
  : import('../../../../messages/generated/en/ns/aabbVisualizer.json').then(module => module.default))
