import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/aiNotes.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/aiNotes.cc03c13ab7164ed6.json', ['aiNotes'])
  : import('../../../../messages/generated/en/ns/aiNotes.json').then(module => module.default))
