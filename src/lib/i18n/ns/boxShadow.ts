import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/boxShadow.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/boxShadow.1b3dda5d952e2265.json', ['boxShadow'])
  : import('../../../../messages/generated/en/ns/boxShadow.json').then(module => module.default))
