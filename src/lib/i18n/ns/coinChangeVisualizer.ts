import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/coinChangeVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/coinChangeVisualizer.4f090de7e5ff4bde.json', ['coinChangeVisualizer'])
  : import('../../../../messages/generated/en/ns/coinChangeVisualizer.json').then(module => module.default))
