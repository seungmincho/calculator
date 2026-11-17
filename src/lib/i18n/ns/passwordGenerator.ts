import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/passwordGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/passwordGenerator.25e6ed6b76abcba1.json', ['passwordGenerator'])
  : import('../../../../messages/generated/en/ns/passwordGenerator.json').then(module => module.default))
