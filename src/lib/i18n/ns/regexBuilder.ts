import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/regexBuilder.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/regexBuilder.45fb3a79b95a6b3d.json', ['regexBuilder'])
  : import('../../../../messages/generated/en/ns/regexBuilder.json').then(module => module.default))
