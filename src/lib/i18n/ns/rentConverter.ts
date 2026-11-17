import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/rentConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/rentConverter.a6d941dc715de575.json', ['rentConverter'])
  : import('../../../../messages/generated/en/ns/rentConverter.json').then(module => module.default))
