import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/minimaxVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/minimaxVisualizer.2a25675a6b6ea0c5.json', ['minimaxVisualizer'])
  : import('../../../../messages/generated/en/ns/minimaxVisualizer.json').then(module => module.default))
