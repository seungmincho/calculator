import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/emailTemplate.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/emailTemplate.bb92d5ca74557a7d.json', ['emailTemplate'])
  : import('../../../../messages/generated/en/ns/emailTemplate.json').then(module => module.default))
