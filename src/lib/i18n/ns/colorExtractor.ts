import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/colorExtractor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/colorExtractor.b6ef4ed66007eb93.json', ['colorExtractor'])
  : import('../../../../messages/generated/en/ns/colorExtractor.json').then(module => module.default))
