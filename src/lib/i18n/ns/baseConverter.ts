import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/baseConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/baseConverter.20a3fc58187c76a1.json', ['baseConverter'])
  : import('../../../../messages/generated/en/ns/baseConverter.json').then(module => module.default))
