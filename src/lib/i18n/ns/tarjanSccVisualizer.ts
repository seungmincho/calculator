import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/tarjanSccVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/tarjanSccVisualizer.11100fb3ff6e8ca3.json', ['tarjanSccVisualizer'])
  : import('../../../../messages/generated/en/ns/tarjanSccVisualizer.json').then(module => module.default))
