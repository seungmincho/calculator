import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/codingPatterns.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/codingPatterns.1e7c9aafc1281dae.json', ['codingPatterns'])
  : import('../../../../messages/generated/en/ns/codingPatterns.json').then(module => module.default))
