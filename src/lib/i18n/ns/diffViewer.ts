import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/diffViewer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/diffViewer.1fbc9dff3e994458.json', ['diffViewer'])
  : import('../../../../messages/generated/en/ns/diffViewer.json').then(module => module.default))
