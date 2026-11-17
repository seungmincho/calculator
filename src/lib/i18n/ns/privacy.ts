import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/privacy.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/privacy.0ac66cb93d09fd15.json', ['privacy'])
  : import('../../../../messages/generated/en/ns/privacy.json').then(module => module.default))
