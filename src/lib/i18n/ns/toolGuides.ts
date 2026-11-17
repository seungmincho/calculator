import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/toolGuides.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/toolGuides.6a376619a33f830e.json', ['toolGuides'])
  : import('../../../../messages/generated/en/ns/toolGuides.json').then(module => module.default))
