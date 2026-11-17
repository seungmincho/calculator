import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bfsDfsVisualizer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bfsDfsVisualizer.d63c692f7fe2af61.json', ['bfsDfsVisualizer'])
  : import('../../../../messages/generated/en/ns/bfsDfsVisualizer.json').then(module => module.default))
