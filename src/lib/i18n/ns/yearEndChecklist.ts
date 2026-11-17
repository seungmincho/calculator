import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/yearEndChecklist.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/yearEndChecklist.0e81e24f9b80b943.json', ['yearEndChecklist'])
  : import('../../../../messages/generated/en/ns/yearEndChecklist.json').then(module => module.default))
