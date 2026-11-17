import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/adminFeedback.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/adminFeedback.dae4c8fe6aae8c2c.json', ['adminFeedback'])
  : import('../../../../messages/generated/en/ns/adminFeedback.json').then(module => module.default))
