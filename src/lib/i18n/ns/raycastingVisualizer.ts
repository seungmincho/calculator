import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/raycastingVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/raycastingVisualizer.c42656411e8077f4.json', ['raycastingVisualizer'])
  : import('../../../../messages/generated/en/ns/raycastingVisualizer.json').then(module => module.default))
