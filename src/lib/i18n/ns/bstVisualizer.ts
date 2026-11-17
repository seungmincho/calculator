import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bstVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bstVisualizer.fdfc08430fce7067.json', ['bstVisualizer'])
  : import('../../../../messages/generated/en/ns/bstVisualizer.json').then(module => module.default))
