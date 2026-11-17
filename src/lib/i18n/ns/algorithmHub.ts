import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/algorithmHub.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/algorithmHub.a6fa251143f2588b.json', ['algorithmHub'])
  : import('../../../../messages/generated/en/ns/algorithmHub.json').then(module => module.default))
