import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/pwa.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/pwa.577ebe9ac8522c28.json', ['pwa'])
  : import('../../../../messages/generated/en/ns/pwa.json').then(module => module.default))
